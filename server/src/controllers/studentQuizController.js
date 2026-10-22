
const quizService = require('../services/studentQuizService');
async function list(req, res, next) {
  try {
    const quizzes = await quizService.listAvailableQuizzes(req.user.id);
    return res.status(200).json({ quizzes });
  } catch (error) {
    return next(error);
  }
}

async function getForAttempt(req, res, next) {
  try {
    const quiz = await quizService.getQuizForAttempt(
      req.params.quizId,
      req.user.id
    );
    return res.status(200).json(quiz);
  } catch (error) {
    return next(error);
  }
}

module.exports = { list, getForAttempt };
