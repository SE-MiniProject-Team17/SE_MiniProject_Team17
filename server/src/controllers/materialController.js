
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

module.exports = { upload, getMine };
