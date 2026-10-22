const mongoose = require('mongoose');
const { Quiz, STATUS } = require('../models/Quiz');
const { Question } = require('../models/Question');
const AppError = require('../utils/AppError');

/**
 * Quiz Engine – authoring part (SAD 3.4): create, edit Draft, publish (#16).
 * Deleting quizzes and the "after an attempt has started" rules are #42.
 */

const unavailable = () => AppError.notFound('Quiz unavailable');
const EDITABLE_FIELDS = ['title', 'description', 'timeLimitMinutes', 'availableFrom', 'availableUntil', 'questionIds'];

/** Checks that every selected bank question still exists (REQ-QZ-18); 404 "Question unavailable" otherwise. */
async function assertQuestionsExist(ids) {
  const count = await Question.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) {
    throw new AppError(404, 'NOT_FOUND', 'One or more selected questions are unavailable', 'questionIds');
  }
}

/** Only the allowed, already-validated fields are copied; owner and status are set by the server. */
function pickQuizFields(data) {
  return {
    title: data.title,
    description: data.description || '',
    timeLimitMinutes: Number(data.timeLimitMinutes),
    availableFrom: new Date(data.availableFrom),
    availableUntil: new Date(data.availableUntil),
    questionIds: data.questionIds,
  };
}

/** #16 – REQ-QZ-01/03: a valid new quiz is saved as Draft with the creator as owner. */
async function createQuiz(data, ownerId) {
  await assertQuestionsExist(data.questionIds);
  return Quiz.create({ ...pickQuizFields(data), status: STATUS.DRAFT, owner: ownerId });
}

/** Finds a quiz or throws 404 "Quiz unavailable" (also for malformed ids). */
async function getQuiz(id) {
  if (!mongoose.isValidObjectId(id)) throw unavailable();
  const quiz = await Quiz.findById(id);
  if (!quiz) throw unavailable();
  return quiz;
}

/** REQ-QZ-17: only the quiz owner may view, edit or publish it ("Access denied" otherwise). */
async function getOwnQuiz(id, userId) {
  const quiz = await getQuiz(id);
  if (quiz.owner.toString() !== String(userId)) throw AppError.accessDenied();
  return quiz;
}

/** REQ-QZ-05: only a Draft can be edited (or published). */
function assertDraft(quiz, action = 'edited') {
  if (quiz.status !== STATUS.DRAFT) {
    throw AppError.conflict('QUIZ_NOT_DRAFT', `Only Draft quizzes can be ${action}`);
  }
}

/** Current values + requested changes, so a partial edit is validated with the full quiz rules. */
function mergeEdits(quiz, changes) {
  const current = {
    title: quiz.title,
    description: quiz.description,
    timeLimitMinutes: quiz.timeLimitMinutes,
    availableFrom: quiz.availableFrom.toISOString(),
    availableUntil: quiz.availableUntil.toISOString(),
    questionIds: quiz.questionIds.map((id) => id.toString()),
  };
  EDITABLE_FIELDS.forEach((f) => {
    if (Object.prototype.hasOwnProperty.call(changes || {}, f)) current[f] = changes[f];
  });
  return current;
}

/** #16 – REQ-QZ-04: the owner edits a Draft. */
async function updateQuiz(quiz, data) {
  await assertQuestionsExist(data.questionIds);
  Object.assign(quiz, pickQuizFields(data));
  await quiz.save();
  return quiz;
}

/**
 * #16 – REQ-QZ-03/04: publish a Draft. Copies each selected question into the quiz, in the
 * selected order, so the published quiz no longer depends on the bank.
 */
async function publishQuiz(quiz) {
  assertDraft(quiz, 'published');
  if (quiz.availableUntil <= new Date()) {
    throw AppError.validation('availableUntil', 'Availability end has already passed; change it before publishing');
  }
  const bank = await Question.find({ _id: { $in: quiz.questionIds } }).lean();
  if (bank.length !== quiz.questionIds.length) {
    throw new AppError(404, 'NOT_FOUND', 'One or more selected questions are unavailable', 'questionIds');
  }
  const byId = new Map(bank.map((q) => [q._id.toString(), q]));
  quiz.questions = quiz.questionIds.map((id, i) => {
    const q = byId.get(id.toString());
    return {
      sourceQuestion: q._id,
      position: i + 1,
      text: q.text,
      options: [...q.options],
      correctOption: q.correctOption,
      topic: q.topic,
      difficulty: q.difficulty,
      explanation: q.explanation || '',
    };
  });
  quiz.status = STATUS.PUBLISHED;
  quiz.publishedAt = new Date();
  await quiz.save();
  return quiz;
}

/** #16 – the owner's own quizzes, newest first, for the Faculty "My quizzes" list. */
async function listOwnQuizzes(ownerId) {
  const quizzes = await Quiz.find({ owner: ownerId }).sort({ updatedAt: -1 }).lean();
  return quizzes.map((q) => ({
    id: q._id.toString(),
    title: q.title,
    status: q.status,
    questionCount: q.questionIds.length,
    timeLimitMinutes: q.timeLimitMinutes,
    availableFrom: q.availableFrom,
    availableUntil: q.availableUntil,
    publishedAt: q.publishedAt,
    updatedAt: q.updatedAt,
  }));
}

/** #16 – full quiz for its owner (Draft: selected bank questions; Published: the stored copies). */
async function toOwnerView(quiz) {
  let selected;
  if (quiz.status === STATUS.PUBLISHED) {
    selected = quiz.questions.map((c) => ({
      id: c.sourceQuestion.toString(),
      position: c.position,
      text: c.text,
      options: c.options,
      correctOption: c.correctOption,
      topic: c.topic,
      difficulty: c.difficulty,
      explanation: c.explanation,
    }));
  } else {
    const bank = await Question.find({ _id: { $in: quiz.questionIds } })
      .select('text topic difficulty')
      .lean();
    const byId = new Map(bank.map((q) => [q._id.toString(), q]));
    selected = quiz.questionIds.map((id, i) => {
      const q = byId.get(id.toString());
      return q
        ? { id: id.toString(), position: i + 1, text: q.text, topic: q.topic, difficulty: q.difficulty }
        : { id: id.toString(), position: i + 1, unavailable: true };
    });
  }
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    timeLimitMinutes: quiz.timeLimitMinutes,
    availableFrom: quiz.availableFrom,
    availableUntil: quiz.availableUntil,
    status: quiz.status,
    publishedAt: quiz.publishedAt,
    owner: quiz.owner.toString(),
    questions: selected,
  };
}

module.exports = {
  createQuiz,
  getQuiz,
  getOwnQuiz,
  assertDraft,
  mergeEdits,
  updateQuiz,
  publishQuiz,
  listOwnQuizzes,
  toOwnerView,
};
