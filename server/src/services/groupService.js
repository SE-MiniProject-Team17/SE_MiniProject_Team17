const mongoose = require('mongoose');
const StudyGroup = require('../models/StudyGroup');
const AppError = require('../utils/AppError');

async function createGroup(data, studentId) {
  const name =
    typeof data.name === 'string' ? data.name.trim() : '';

  const description =
    typeof data.description === 'string'
      ? data.description.trim()
      : '';

  if (!name) {
    throw AppError.validation('name', 'Group name is required');
  }

  const group = await StudyGroup.create({
    name,
    description,
    createdBy: studentId,
    members: [studentId],
  });

  return group;
}

async function joinGroup(groupId, studentId) {
  // Treat malformed IDs like unavailable groups.
  if (!mongoose.isValidObjectId(groupId)) {
    throw AppError.notFound();
  }

  // Atomically add the student only if they are not already a member.
  const group = await StudyGroup.findOneAndUpdate(
    {
      _id: groupId,
      members: { $ne: studentId },
    },
    {
      $addToSet: { members: studentId },
    },
    {
      returnDocument: 'after',
      runValidators: true,
    }
  );

  if (group) {
    return group;
  }

  // The update found no eligible group. Determine whether it was
  // unavailable or the student was already a member.
  const existingGroup = await StudyGroup.findById(groupId)
    .select('_id members')
    .lean();

  if (!existingGroup) {
    throw AppError.notFound();
  }

  const alreadyMember = existingGroup.members.some(
    (memberId) => memberId.toString() === studentId.toString()
  );

  if (alreadyMember) {
    throw AppError.conflict(
      'ALREADY_MEMBER',
      'You are already a member of this study group'
    );
  }

  throw AppError.notFound();
}

async function getMyGroups(studentId) {
  return StudyGroup.find({ members: studentId })
    .sort({ createdAt: -1 })
    .lean();
}

module.exports = {
  createGroup,
  joinGroup,
  getMyGroups,
};