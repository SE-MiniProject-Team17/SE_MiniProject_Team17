const questionService = require('../services/questionService');

/**
 * #15 / #41 – loads the question in :id and checks that the logged-in user owns it.
 *   404 "Question unavailable" if it does not exist, 403 "Access denied" if it is someone else's.
 * Runs BEFORE validation, so a non-owner is always refused and nothing is changed.
 * Sets req.question.
 */
async function loadOwnQuestion(req, res, next) {
  try {
    req.question = await questionService.getOwnQuestion(req.params.id, req.user.id);
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * #15 – for edits: replaces req.body with the question's current values plus the requested
 * changes, so the normal question rules (REQ-QB-02) validate the result of a partial edit.
 */
function mergeQuestionEdits(req, res, next) {
  req.body = questionService.mergeEdits(req.question, req.body);
  return next();
}

module.exports = { loadOwnQuestion, mergeQuestionEdits };
