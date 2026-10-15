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
