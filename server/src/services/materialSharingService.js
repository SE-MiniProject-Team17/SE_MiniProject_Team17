const mongoose = require('mongoose');
const Material = require('../models/Material');
const MaterialShare = require('../models/MaterialShare');
const User = require('../models/User');
const AppError = require('../utils/AppError');

async function shareMaterial(materialId, ownerId, recipientEmail) {
  if (typeof recipientEmail !== 'string' || !recipientEmail.trim()) {
    throw AppError.validation('email', 'Recipient email is required');
  }

  if (!mongoose.isValidObjectId(materialId)) {
    throw AppError.unavailable('Material');
  }

  const material = await Material.findById(materialId);

  if (!material) throw AppError.unavailable('Material');
  if (material.uploadedBy.toString() !== ownerId) {
    throw AppError.accessDenied();
  }

  const email = recipientEmail.trim().toLowerCase();
  const recipient = await User.findOne({ email }).select('_id');

  if (!recipient) {
    throw AppError.validation('email', 'Recipient must be a registered user');
  }

  if (recipient._id.toString() === ownerId) {
    throw AppError.validation('email', 'You cannot share a material with yourself');
  }

  const existing = await MaterialShare.findOne({
    material: material._id,
    recipient: recipient._id,
  });

  if (existing && !existing.revokedAt) {
    throw AppError.conflict('ALREADY_SHARED', 'Material is already shared with this user');
  }

  if (existing) {
    existing.revokedAt = null;
    existing.owner = ownerId;
    await existing.save();
    return existing;
  }

  try {
    return await MaterialShare.create({
      material: material._id,
      owner: ownerId,
      recipient: recipient._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw AppError.conflict('ALREADY_SHARED', 'Material is already shared with this user');
    }
    throw err;
  }
}

async function revokeMaterialShare(materialId, ownerId, recipientId) {
  if (!mongoose.isValidObjectId(materialId) ||
      !mongoose.isValidObjectId(recipientId)) {
    throw AppError.unavailable('Material');
  }

  const material = await Material.findById(materialId);

  if (!material) throw AppError.unavailable('Material');
  if (material.uploadedBy.toString() !== ownerId) {
    throw AppError.accessDenied();
  }

  const share = await MaterialShare.findOne({
    material: material._id,
    recipient: recipientId,
    owner: ownerId,
    revokedAt: null,
  });

  if (!share) {
    throw AppError.notFound('Active share not found');
  }

  share.revokedAt = new Date();
  await share.save();

  return { revoked: true };
}

async function listSharedMaterials(userId) {
  const shares = await MaterialShare.find({
    recipient: userId,
    revokedAt: null,
  }).populate('material');

  return shares
    .filter((share) => share.material)
    .map((share) => ({
      id: share.material._id.toString(),
      title: share.material.title,
      subject: share.material.subject,
      description: share.material.description,
      originalName: share.material.originalName,
      mimeType: share.material.mimeType,
      size: share.material.size,
      uploadedBy: share.material.uploadedBy.toString(),
      createdAt: share.material.createdAt,
    }));
}

module.exports = { shareMaterial, revokeMaterialShare, listSharedMaterials };
