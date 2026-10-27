
const mongoose = require('mongoose');
const StudyGroup = require('../models/StudyGroup');
const AppError = require('../utils/AppError');

const GROUP_NAME_MAX = 100;
const DESCRIPTION_MAX = 500;

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

  if (name.length > GROUP_NAME_MAX) {
    throw AppError.validation(
      'name',
      `Group name must be at most ${GROUP_NAME_MAX} characters`
    );
  }

  if (description.length > DESCRIPTION_MAX) {
    throw AppError.validation(
      'description',
      `Description must be at most ${DESCRIPTION_MAX} characters`
    );
  }

  return StudyGroup.create({
    name,
    description,
    createdBy: studentId,
    members: [studentId],
  });
}

async function joinGroup(groupId, studentId) {
  // Invalid IDs are handled like unavailable groups.
  if (!mongoose.isValidObjectId(groupId)) {
    throw AppError.notFound();
  }

  // Join only if the group is active and the student is not
  // already a member.
  const group = await StudyGroup.findOneAndUpdate(
    {
      _id: groupId,
      members: { $ne: studentId },
      moderationStatus: 'Active',
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

  // Check availability before checking membership so hidden
  // groups do not reveal their details.
  const existing = await StudyGroup.findById(groupId)
    .select('_id members moderationStatus')
    .lean();

  if (!existing || existing.moderationStatus !== 'Active') {
    throw AppError.notFound();
  }

  const alreadyMember = existing.members.some(
    (memberId) => memberId.toString() === studentId.toString()
  );

  if (alreadyMember) {
    throw AppError.conflict(
      'ALREADY_MEMBER',
      'You are already a member of this study group'
    );
  }

  // Return the same generic unavailable response for other cases.
  throw AppError.notFound();
}

async function listMyGroups(studentId) {
  return StudyGroup.find({
    members: studentId,
    moderationStatus: 'Active',
  })
    .sort({ createdAt: -1 })
    .select('name description createdBy members createdAt updatedAt')
    .lean();
}

module.exports = {
  createGroup,
  joinGroup,
  listMyGroups,
  GROUP_NAME_MAX,
  DESCRIPTION_MAX,
};
