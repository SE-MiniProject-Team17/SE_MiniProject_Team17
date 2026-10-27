
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const yauzl = require('yauzl');
const Material = require('../models/Material');
const MaterialShare = require('../models/MaterialShare');
const AppError = require('../utils/AppError');
const { validateFileSignature } = require('../middleware/materialUpload');
const { validateMaterialMetadata } = require('../validators/materialValidators');

const STORAGE_DIR = path.resolve(
  process.env.MATERIAL_STORAGE_DIR ||
    path.join(__dirname, '../../uploads/materials')
);

const DOCX_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX_TYPE =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

function checksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function validateOfficeFile(file) {
  if (file.mimetype !== DOCX_TYPE && file.mimetype !== PPTX_TYPE) return;

  const requiredEntry =
    file.mimetype === DOCX_TYPE
      ? 'word/document.xml'
      : 'ppt/presentation.xml';

  await new Promise((resolve, reject) => {
    let zipfile;
    let settled = false;
    const entries = new Set();

    const fail = () => {
      if (settled) return;
      settled = true;
      if (zipfile) zipfile.close();
      reject(
        AppError.validation(
          'file',
          'Invalid or corrupted DOCX/PPTX archive'
        )
      );
    };

    yauzl.fromBuffer(file.buffer, { lazyEntries: true }, (err, openedZip) => {
      if (err || !openedZip) return fail();

      zipfile = openedZip;
      zipfile.on('error', fail);

      zipfile.on('entry', (entry) => {
        entries.add(entry.fileName);
        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        if (settled) return;

        if (
          entries.has('[Content_Types].xml') &&
          entries.has(requiredEntry)
        ) {
          settled = true;
          resolve();
        } else {
          fail();
        }
      });

      zipfile.readEntry();
    });
  });
}

async function createMaterial(data, file, userId) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.size === 0) {
    throw AppError.validation('file', 'A non-empty file is required');
  }

  validateFileSignature(file);
  await validateOfficeFile(file);

  const metadata = validateMaterialMetadata(data);
  const digest = checksum(file.buffer);
  const extension = path.extname(file.originalname || '').toLowerCase();

  const extensionByType = {
    'application/pdf': '.pdf',
    [DOCX_TYPE]: '.docx',
    [PPTX_TYPE]: '.pptx',
    'image/png': '.png',
  };

  if (extension !== extensionByType[file.mimetype]) {
    throw AppError.validation(
      'file',
      'File extension does not match its type'
    );
  }

  await fs.mkdir(STORAGE_DIR, { recursive: true });

  const filename = `${randomUUID()}${extension}`;
  const storagePath = path.join(STORAGE_DIR, filename);
  let savedFile = false;

  try {
    await fs.writeFile(storagePath, file.buffer, { flag: 'wx' });
    savedFile = true;

    const material = await Material.create({
      ...metadata,
      originalName: path.basename(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      storagePath,
      checksum: digest,
      uploadedBy: userId,
    });

    return material;
  } catch (error) {
    if (savedFile) await fs.unlink(storagePath).catch(() => {});
    throw error;
  }
}

async function listMyMaterials(userId) {
  return Material.find({
    uploadedBy: userId,
    moderationStatus: 'Active',
  })
    .sort({ createdAt: -1 })
    .select('-storagePath -checksum')
    .lean();
}

async function listSharedMaterials(userId) {
  const shares = await MaterialShare.find({
    recipient: userId,
    revokedAt: null,
  })
    .sort({ createdAt: -1 })
    .populate({
      path: 'material',
      select:
        'title subject description originalName mimeType size uploadedBy createdAt moderationStatus',
    })
    .lean();

  return shares
    .filter(
      (share) =>
        share.material &&
        share.material.moderationStatus === 'Active'
    )
    .map((share) => ({
      shareId: share._id.toString(),
      ...share.material,
      id: share.material._id.toString(),
    }));
}

async function getMaterialForUser(id, userId) {
  const material = await Material.findById(id);

  // Treat missing and hidden materials identically so their
  // existence and details are not disclosed.
  if (!material || material.moderationStatus !== 'Active') {
    throw AppError.unavailable('Material');
  }

  const isOwner =
    material.uploadedBy.toString() === userId.toString();

  if (!isOwner) {
    const activeShare = await MaterialShare.findOne({
      material: material._id,
      owner: material.uploadedBy,
      recipient: userId,
      revokedAt: null,
    });

    if (!activeShare) throw AppError.accessDenied();
  }

  return material;
}

async function getOwnedMaterial(id, userId) {
  const material = await Material.findById(id);

  if (!material) throw AppError.unavailable('Material');

  if (material.uploadedBy.toString() !== userId.toString()) {
    throw AppError.accessDenied();
  }

  return material;
}

async function updateMaterial(id, userId, data) {
  const material = await getOwnedMaterial(id, userId);

  const metadata = validateMaterialMetadata({
    title: data.title ?? material.title,
    subject: data.subject ?? material.subject,
    description: data.description ?? material.description,
  });

  Object.assign(material, metadata);
  await material.save();

  return material;
}

async function deleteMaterial(id, userId) {
  const material = await getOwnedMaterial(id, userId);
  const filePath = path.resolve(material.storagePath);
  const storageRoot = path.resolve(STORAGE_DIR);

  await MaterialShare.deleteMany({ material: material._id });
  await Material.deleteOne({ _id: material._id });

  if (filePath.startsWith(`${storageRoot}${path.sep}`)) {
    await fs.unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  return { id: material._id.toString() };
}

async function readVerifiedMaterialFile(material) {
  const storageRoot = path.resolve(STORAGE_DIR);
  const filePath = path.resolve(material.storagePath);

  if (!filePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw AppError.unavailable('Material');
  }

  let buffer;

  try {
    buffer = await fs.readFile(filePath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw AppError.unavailable('Material');
    }

    throw error;
  }

  if (
    checksum(buffer) !== material.checksum ||
    buffer.length !== material.size
  ) {
    throw AppError.unavailable('Material');
  }

  return buffer;
}

module.exports = {
  createMaterial,
  listMyMaterials,
  listSharedMaterials,
  getMaterialForUser,
  updateMaterial,
  deleteMaterial,
  readVerifiedMaterialFile,
  checksum,
  STORAGE_DIR,
};
