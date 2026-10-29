
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
const EXTENSION_BY_TYPE = Object.freeze({
  'application/pdf': '.pdf',
  [DOCX_TYPE]: '.docx',
  [PPTX_TYPE]: '.pptx',
  'image/png': '.png',
});

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

async function inspectMaterialFile(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw AppError.validation('file', 'A non-empty file is required');
  }

  validateFileSignature(file);
  await validateOfficeFile(file);

  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension !== EXTENSION_BY_TYPE[file.mimetype]) {
    throw AppError.validation(
      'file',
      'File extension does not match its type'
    );
  }

  return {
    originalName: path.basename(file.originalname),
    mimeType: file.mimetype,
    size: file.buffer.length,
    checksum: checksum(file.buffer),
    extension,
  };
}

async function createMaterial(data, file, userId) {
  const metadata = validateMaterialMetadata(data);
  const fileMetadata = await inspectMaterialFile(file);

  await fs.mkdir(STORAGE_DIR, { recursive: true });

  const filename = `${randomUUID()}${fileMetadata.extension}`;
  const storagePath = path.join(STORAGE_DIR, filename);
  let savedFile = false;

  try {
    savedFile = true;
    await fs.writeFile(storagePath, file.buffer, { flag: 'wx' });

    const material = await Material.create({
      ...metadata,
      originalName: fileMetadata.originalName,
      mimeType: fileMetadata.mimeType,
      size: fileMetadata.size,
      storagePath,
      checksum: fileMetadata.checksum,
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

async function updateMaterial(id, userId, data, replacementFile) {
  const material = await getOwnedMaterial(id, userId);

  const metadata = validateMaterialMetadata({
    title: data.title ?? material.title,
    subject: data.subject ?? material.subject,
    description: data.description ?? material.description,
  });

  const fileMetadata = replacementFile
    ? await inspectMaterialFile(replacementFile)
    : null;
  let replacementPath;
  let replacementStored = false;
  const previousPath = path.resolve(material.storagePath);
  const storageRoot = path.resolve(STORAGE_DIR);

  try {
    if (fileMetadata) {
      await fs.mkdir(STORAGE_DIR, { recursive: true });
      replacementPath = path.join(
        STORAGE_DIR,
        `${randomUUID()}${fileMetadata.extension}`
      );
      replacementStored = true;
      await fs.writeFile(replacementPath, replacementFile.buffer, { flag: 'wx' });
    }

    Object.assign(material, metadata);
    if (fileMetadata) {
      Object.assign(material, {
        originalName: fileMetadata.originalName,
        mimeType: fileMetadata.mimeType,
        size: fileMetadata.size,
        storagePath: replacementPath,
        checksum: fileMetadata.checksum,
      });
    }

    await material.save();
  } catch (error) {
    if (replacementStored) await fs.unlink(replacementPath).catch(() => {});
    throw error;
  }

  if (
    fileMetadata &&
    previousPath.startsWith(`${storageRoot}${path.sep}`) &&
    previousPath !== replacementPath
  ) {
    await fs.unlink(previousPath).catch((error) => {
      if (error.code !== 'ENOENT') {
        // The record now points at the verified replacement, so cleanup is
        // recoverable and must not turn a committed update into a false 500.
        console.error('Failed to remove superseded material file after update.');
      }
    });
  }

  return material;
}

async function deleteMaterial(id, userId) {
  const material = await getOwnedMaterial(id, userId);
  const filePath = path.resolve(material.storagePath);
  const storageRoot = path.resolve(STORAGE_DIR);
  const stagedFilePath = path.join(
    storageRoot,
    `.deleting-${randomUUID()}-${path.basename(filePath)}`
  );
  const storedShares = await MaterialShare.find({ material: material._id }).lean();
  const shouldStageFile = filePath.startsWith(`${storageRoot}${path.sep}`);
  let fileStaged = false;

  try {
    if (shouldStageFile) {
      try {
        await fs.rename(filePath, stagedFilePath);
        fileStaged = true;
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }

    await MaterialShare.deleteMany({ material: material._id });
    const deletion = await Material.deleteOne({ _id: material._id });
    if (deletion.deletedCount !== 1) {
      throw AppError.unavailable('Material');
    }

    if (fileStaged) {
      await fs.unlink(stagedFilePath);
      fileStaged = false;
    }
  } catch (error) {
    // Compensate in-process failures so a failed DELETE does not leave the
    // database or file store partially removed. A process crash still needs
    // deployment-level recovery/backup coverage (Issue #11 / TC-AN-01).
    const rollbackErrors = [];

    try {
      if (!(await Material.exists({ _id: material._id }))) {
        await Material.create(material.toObject());
      }
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }

    try {
      if (storedShares.length) {
        await MaterialShare.bulkWrite(
          storedShares.map((share) => ({
            replaceOne: {
              filter: { _id: share._id },
              replacement: share,
              upsert: true,
            },
          }))
        );
      }
    } catch (rollbackError) {
      rollbackErrors.push(rollbackError);
    }

    if (fileStaged) {
      try {
        await fs.rename(stagedFilePath, filePath);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }

    if (rollbackErrors.length) {
      const rollbackFailure = new Error('Material removal failed and rollback was incomplete');
      rollbackFailure.cause = error;
      throw rollbackFailure;
    }

    throw error;
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
