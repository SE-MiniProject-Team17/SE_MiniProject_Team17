const questionService = require('../services/questionService');

/** #13 – POST /api/questions -> 201 { id, owner, createdAt }  (SAD 4.3) */
async function create(req, res, next) {
  try {
    const q = await questionService.createQuestion(req.body, req.user.id);
    return res.status(201).json({ id: q.id, owner: q.owner, createdAt: q.createdAt });
  } catch (err) {
    return next(err);
  }
}

/** #14 – GET /api/questions?q=&topic=&difficulty=&page=&limit= -> 200 { questions, total, page, limit } */
async function search(req, res, next) {
  try {
    const { q, topic, difficulty, page, limit } = req.query;
    const result = await questionService.searchQuestions({ q, topic, difficulty, page, limit });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

/** #14 – GET /api/questions/topics -> 200 { topics: [...] } */
async function topics(req, res, next) {
  try {
    return res.json({ topics: await questionService.listTopics() });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, search, topics };

/** #15 – GET /api/questions/:id -> 200 full question (any Faculty; 404 if unavailable) */
async function getOne(req, res, next) {
  try {
    const q = await questionService.getQuestion(req.params.id);
    return res.json(questionService.toFullQuestion(q));
  } catch (err) {
    return next(err);
  }
}

/** #15 – PUT /api/questions/:id (owner only, fields already merged + validated) -> 200 { id, updatedAt } */
async function update(req, res, next) {
  try {
    const q = await questionService.updateQuestion(req.question, req.body);
    return res.json({ id: q.id, updatedAt: q.updatedAt });
  } catch (err) {
    return next(err);
  }
}

/** #15 – DELETE /api/questions/:id (owner only) -> 204 */
async function remove(req, res, next) {
  try {
    await questionService.removeQuestion(req.question);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
}

module.exports.getOne = getOne;
module.exports.update = update;
module.exports.remove = remove;
