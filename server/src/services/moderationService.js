
const mongoose = require('mongoose');
const StudyGroup = require('../models/StudyGroup');
const Material = require('../models/Material');
const AppError = require('../utils/AppError');

const VALID_STATUSES = ['Active', 'Hidden'];

function validateId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw AppError.unavailable('Item');
  }
}

function validateStatus(status) {
  if (!VALID_STATUSES.includes(status)) {
    throw AppError.validation(
      'moderationStatus',
      'Moderation status must be Active or Hidden'
    );
  }
}

async function listGroups() {
  return StudyGroup.find()
    .select('name description createdBy members moderationStatus createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();
}

async function listMaterials() {
  return Material.find()
    .select('-storagePath -checksum')
    .sort({ createdAt: -1 })
    .lean();
}

async function updateStatus(Model, id, status, resource) {
  validateId(id);
  validateStatus(status);

  const item = await Model.findByIdAndUpdate(
    id,
    { $set: { moderationStatus: status } },
    { returnDocument: 'after', runValidators: true }
  )
    .select('-storagePath -checksum')
    .lean();

  if (!item) {
    throw AppError.unavailable(resource);
  }

  return item;
}

async function moderateGroup(id, status) {
  return updateStatus(StudyGroup, id, status, 'Study group');
}

async function moderateMaterial(id, status) {
  return updateStatus(Material, id, status, 'Material');
}

module.exports = {
  listGroups,
  listMaterials,
  moderateGroup,
  moderateMaterial,
};
