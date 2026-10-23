const {
  submitAttempt,
  getAttemptResult,
  getStudentAttemptHistory,
} = require('../services/attemptService');

async function submit(req, res, next) {
  try {
    const result = await submitAttempt(
      req.params.quizId,
      req.user.id,
      req.body.answers
    );

    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

async function result(req, res, next) {
  try {
    const attempt = await getAttemptResult(
      req.params.attemptId,
      req.user.id
    );

    return res.status(200).json(attempt);
  } catch (err) {
    return next(err);
  }
}

async function history(req, res, next) {
  try {
    const attempts = await getStudentAttemptHistory(req.user.id);
    return res.status(200).json(attempts);
  } catch (err) {
    return next(err);
  }
}

module.exports = { submit, result, history };
