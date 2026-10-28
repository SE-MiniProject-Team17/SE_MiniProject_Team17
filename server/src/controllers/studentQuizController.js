const studentQuizService = require('../services/studentQuizService');

async function listAvailable(req, res, next) {
  try {
    const quizzes = await studentQuizService.listAvailableQuizzes();
    return res.json({ quizzes });
  } catch (err) {
    return next(err);
  }
}

async function startAttempt(req, res, next) {
  try {
    const attempt = await studentQuizService.startAttempt(
      req.params.id,
      req.user.id || req.user._id || req.user.sub
    );
    return res.status(201).json({ attempt });
  } catch (err) {
    return next(err);
  }
}

async function getAttempt(req, res, next) {
  try {
    const attempt = await studentQuizService.getAttempt(
      req.params.attemptId,
      req.user.id || req.user._id || req.user.sub
    );
    return res.json({ attempt });
  } catch (err) {
    return next(err);
  }
}

async function saveAnswer(req, res, next) {
  try {
    const result = await studentQuizService.saveAnswer(
      req.params.attemptId,
      req.user.id || req.user._id || req.user.sub,
      req.body.questionId,
      req.body.selectedOption
    );
    return res.json({ result });
  } catch (err) {
    return next(err);
  }
}

async function submitAttempt(req, res, next) {
  try {
    const attempt = await studentQuizService.submitAttempt(
      req.params.attemptId,
      req.user.id || req.user._id || req.user.sub
    );
    return res.json({ attempt });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAvailable,
  startAttempt,
  getAttempt,
  saveAnswer,
  submitAttempt,
};
