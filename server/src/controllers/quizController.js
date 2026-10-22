const quizService = require('../services/quizService');

/** #16 – POST /api/quizzes -> 201 { id, status: "Draft" } */
async function create(req, res, next) {
  try {
    const quiz = await quizService.createQuiz(req.body, req.user.id);
    return res.status(201).json({ id: quiz.id, status: quiz.status });
  } catch (err) {
    return next(err);
  }
}

/** #16 – GET /api/quizzes/mine -> 200 { quizzes: [...] } (the Faculty user's own quizzes) */
async function listMine(req, res, next) {
  try {
    return res.json({ quizzes: await quizService.listOwnQuizzes(req.user.id) });
  } catch (err) {
    return next(err);
  }
}

/** #16 – GET /api/quizzes/:id -> 200 full quiz (owner only) */
async function getOne(req, res, next) {
  try {
    return res.json(await quizService.toOwnerView(req.quiz));
  } catch (err) {
    return next(err);
  }
}

/** #16 – PUT /api/quizzes/:id -> 200 { id } (owner, Draft only) */
async function update(req, res, next) {
  try {
    const quiz = await quizService.updateQuiz(req.quiz, req.body);
    return res.json({ id: quiz.id });
  } catch (err) {
    return next(err);
  }
}

/** #16 – POST /api/quizzes/:id/publish -> 200 { id, status: "Published" } */
async function publish(req, res, next) {
  try {
    const quiz = await quizService.publishQuiz(req.quiz);
    return res.json({ id: quiz.id, status: quiz.status });
  } catch (err) {
    return next(err);
  }
}

module.exports = { create, listMine, getOne, update, publish };
