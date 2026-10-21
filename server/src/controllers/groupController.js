const groupService = require('../services/groupService');

async function create(req, res, next) {
  try {
    const group = await groupService.createGroup(
      req.body || {},
      req.user.id
    );

    return res.status(201).json({
      id: group._id.toString(),
      name: group.name,
      description: group.description,
      createdBy: group.createdBy.toString(),
    });
  } catch (err) {
    return next(err);
  }
}

async function join(req, res, next) {
  try {
    const group = await groupService.joinGroup(
      req.params.groupId,
      req.user.id
    );

    return res.status(200).json({
      id: group._id.toString(),
      name: group.name,
      description: group.description,
      createdBy: group.createdBy.toString(),
    });
  } catch (err) {
    return next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const groups = await groupService.getMyGroups(req.user.id);

    return res.status(200).json({
      groups: groups.map((group) => ({
        id: group._id.toString(),
        name: group.name,
        description: group.description,
        createdBy: group.createdBy.toString(),
      })),
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  join,
  getMine,
};