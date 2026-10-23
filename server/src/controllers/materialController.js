const materialService = require('../services/materialService');

async function upload(req, res, next) {
  try {
    const material = await materialService.createMaterial(
      req.body || {},
      req.file,
      req.user.id
    );

    return res.status(201).json({
      id: material._id.toString(),
      title: material.title,
      subject: material.subject,
      description: material.description,
      originalName: material.originalName,
      mimeType: material.mimeType,
      size: material.size,
      checksum: material.checksum,
      uploadedBy: material.uploadedBy.toString(),
      createdAt: material.createdAt,
    });
  } catch (err) {
    return next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const materials = await materialService.listMyMaterials(req.user.id);

    return res.status(200).json({
      materials: materials.map((material) => ({
        id: material._id.toString(),
        title: material.title,
        subject: material.subject,
        description: material.description,
        originalName: material.originalName,
        mimeType: material.mimeType,
        size: material.size,
        checksum: material.checksum,
        uploadedBy: material.uploadedBy.toString(),
        createdAt: material.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}


async function getShared(req, res, next) {
  try {
    const materials = await materialService.listSharedMaterials(req.user.id);
    return res.status(200).json({
      materials: materials.map((material) => ({
        shareId: material.shareId,
        id: material.id,
        title: material.title,
        subject: material.subject,
        description: material.description,
        originalName: material.originalName,
        mimeType: material.mimeType,
        size: material.size,
        uploadedBy: material.uploadedBy.toString(),
        createdAt: material.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}
async function getById(req, res, next) {
  try {
    const material = await materialService.getMaterialForUser(
      req.params.id,
      req.user.id
    );

    return res.status(200).json({
      id: material._id.toString(),
      title: material.title,
      subject: material.subject,
      description: material.description,
      originalName: material.originalName,
      mimeType: material.mimeType,
      size: material.size,
      checksum: material.checksum,
      uploadedBy: material.uploadedBy.toString(),
      createdAt: material.createdAt,
    });
  } catch (err) {
    return next(err);
  }
}

async function download(req, res, next) {
  try {
    const material = await materialService.getMaterialForUser(
      req.params.id,
      req.user.id
    );
    const buffer = await materialService.readVerifiedMaterialFile(material);

    res.set('Content-Length', String(buffer.length));
    res.type(material.mimeType);
    res.attachment(material.originalName);
    return res.status(200).send(buffer);
  } catch (err) {
    return next(err);
  }
}

module.exports = { upload, getMine, getShared, getById, download };
