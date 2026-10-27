
const moderationService = require('../services/moderationService');

async function listGroups(req, res, next) {
  try {
    const groups = await moderationService.listGroups();
    return res.status(200).json({ groups });
  } catch (err) {
    return next(err);
  }
}

async function listMaterials(req, res, next) {
  try {
    const materials = await moderationService.listMaterials();
    return res.status(200).json({
      materials: materials.map((material) => ({
        id: material._id.toString(),
        title: material.title,
        subject: material.subject,
        description: material.description,
        uploadedBy: material.uploadedBy.toString(),
        moderationStatus: material.moderationStatus,
        createdAt: material.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function moderateGroup(req, res, next) {
  try {
    const group = await moderationService.moderateGroup(
      req.params.id,
      req.body?.moderationStatus
    );

    return res.status(200).json({
      id: group._id.toString(),
      name: group.name,
      moderationStatus: group.moderationStatus,
    });
  } catch (err) {
    return next(err);
  }
}

async function moderateMaterial(req, res, next) {
  try {
    const material = await moderationService.moderateMaterial(
      req.params.id,
      req.body?.moderationStatus
    );

    return res.status(200).json({
      id: material._id.toString(),
      title: material.title,
      moderationStatus: material.moderationStatus,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listGroups,
  listMaterials,
  moderateGroup,
  moderateMaterial,
};
