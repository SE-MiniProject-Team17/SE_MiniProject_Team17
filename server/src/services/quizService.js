const mongoose = require('mongoose');
const { Quiz, STATUS } = require('../models/Quiz');
const { Question } = require('../models/Question');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Quiz Engine – authoring part (SAD 3.4): create, edit Draft, publish (#16).
 * Deleting quizzes and the "after an attempt has started" rules are #42.
 */

const unavailable = () => AppError.unavailable('Quiz');
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

/**
 * #42 – has any Student started an attempt on this quiz? (SRS REQ-QZ-05)
 * The Attempt model belongs to the attempts module (#18/#19). It is looked up lazily so the quiz
 * module works before and after that module is merged; no model means no attempts yet.
 */
function attemptModel() {
  if (mongoose.models.Attempt) return mongoose.models.Attempt;
  try {
    // eslint-disable-next-line global-require
    return require('../models/Attempt');
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') return null;
    throw err;
  }
}

async function hasAttempts(quizId) {
  const Attempt = attemptModel();
  return Attempt ? Boolean(await Attempt.exists({ quiz: quizId })) : false;
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

/**
 * #42 – REQ-QZ-05: the owner deletes a quiz (the confirmation prompt is in the client).
 * Refused with 409 QUIZ_HAS_ATTEMPTS once any Student has started an attempt; nothing is changed then.
 */
async function deleteQuiz(quiz) {
  if (await hasAttempts(quiz._id)) {
    throw AppError.conflict('QUIZ_HAS_ATTEMPTS', 'This quiz cannot be deleted because a Student has started an attempt');
  }
  await Quiz.deleteOne({ _id: quiz._id });
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

/**
 * #50 – REQ-QZ-16: the owner's view of the submissions on a quiz: each Student's name, score,
 * percentage and submission time, newest first. Only completed attempts count. Answers, e-mail
 * addresses and ids of Students are never sent. The caller has already checked ownership
 * (loadOwnQuiz); no submissions is not an error, the client shows "No submissions yet".
 */
async function listSubmissions(quiz) {
  const Attempt = attemptModel();
  const attempts = Attempt
    ? await Attempt.find({ quiz: quiz._id, status: 'Completed', submittedAt: { $ne: null } })
        .select('student score totalQuestions percentage submittedAt')
        .sort({ submittedAt: -1 })
        .lean()
    : [];

  const students = attempts.length
    ? await User.find({ _id: { $in: attempts.map((a) => a.student) } }).select('fullName').lean()
    : [];
  const nameById = new Map(students.map((u) => [u._id.toString(), u.fullName]));

  return {
    quiz: { id: quiz.id, title: quiz.title },
    submissions: attempts.map((a) => ({
      id: a._id.toString(),
      studentName: nameById.get(a.student.toString()) || 'Student unavailable',
      score: a.score,
      totalQuestions: a.totalQuestions,
      percentage: a.percentage,
      submittedAt: a.submittedAt,
    })),
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
  deleteQuiz,
  listSubmissions,
  hasAttempts,
  listOwnQuizzes,
  toOwnerView,
};
