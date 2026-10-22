const quizService = require('../services/quizService');

/** Loads the quiz in :id if the logged-in user owns it (404 "Quiz unavailable" / 403 "Access denied"). Sets req.quiz. */
async function loadOwnQuiz(req, res, next) {
  try {
    req.quiz = await quizService.getOwnQuiz(req.params.id, req.user.id);
    return next();
  } catch (err) {
    return next(err);
  }
}

/** For edits: only Drafts (409 QUIZ_NOT_DRAFT), then merge current values + changes for validation. */
function prepareQuizEdit(req, res, next) {
  try {
    quizService.assertDraft(req.quiz, 'edited');
    req.body = quizService.mergeEdits(req.quiz, req.body);
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { loadOwnQuiz, prepareQuizEdit };
