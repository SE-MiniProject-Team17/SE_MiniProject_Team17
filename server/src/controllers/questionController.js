const questionService = require('../services/questionService');

/** POST /api/questions -> 201 { id, owner, createdAt }  (SAD 4.3) */
async function create(req, res, next) {
  try {
    const q = await questionService.createQuestion(req.body, req.user.id);
    return res.status(201).json({ id: q.id, owner: q.owner, createdAt: q.createdAt });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create };
