const mongoose = require('mongoose');
const { Question } = require('../models/Question');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * Question Bank Service (SAD 3.4) – the business rules for questions.
 */

/**
 * #13 – create a question. Only the allowed fields are copied from the request,
 * so a client can never set `owner` or any other server-controlled field (REQ-QB-03).
 */
async function createQuestion(data, ownerId) {
  return Question.create({
    text: data.text,
    options: data.options.map((o) => o.trim()),
    correctOption: data.correctOption,
    topic: data.topic,
    difficulty: data.difficulty,
    explanation: data.explanation || '',
    owner: ownerId,
  });
}

/** Escapes characters that have a special meaning in regular expressions, so user input is matched literally. */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * #14 – search and filter the question bank (REQ-QB-04).
 * - q: keyword anywhere in the question text (case-insensitive)
 * - topic: exact topic (case-insensitive)
 * - difficulty: Easy | Medium | Hard
 * Newest questions first, paged. Returns { questions, total, page, limit }.
 */
async function searchQuestions({ q, topic, difficulty, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (q && q.trim()) filter.text = { $regex: escapeRegex(q.trim()), $options: 'i' };
  if (topic && topic.trim()) filter.topic = { $regex: `^${escapeRegex(topic.trim())}$`, $options: 'i' };
  if (difficulty) filter.difficulty = difficulty;

  const [docs, total] = await Promise.all([
    Question.find(filter)
      .select('text topic difficulty owner createdAt')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Question.countDocuments(filter),
  ]);

  // Look up owner names in one query. If an owner account no longer exists, the name is null.
  const ownerIds = [...new Set(docs.map((d) => d.owner.toString()))];
  const owners = await User.find({ _id: { $in: ownerIds } }).select('fullName').lean();
  const nameById = new Map(owners.map((u) => [u._id.toString(), u.fullName]));

  const questions = docs.map((d) => ({
    id: d._id.toString(),
    text: d.text,
    topic: d.topic,
    difficulty: d.difficulty,
    owner: { id: d.owner.toString(), name: nameById.get(d.owner.toString()) || null },
    createdAt: d.createdAt,
  }));
  return { questions, total, page, limit };
}

/** #14 – the distinct topics in the bank, for the topic filter drop-down. */
async function listTopics() {
  const topics = await Question.distinct('topic');
  return topics.sort((a, b) => a.localeCompare(b));
}

/** Fields an owner may change (REQ-QB-05). `owner` is never editable. */
const EDITABLE_FIELDS = ['text', 'options', 'correctOption', 'topic', 'difficulty', 'explanation'];

const unavailable = () => AppError.notFound('Question unavailable');

/** #15 / #44 – finds a question or throws 404 "Question unavailable" (also for malformed ids). */
async function getQuestion(id) {
  if (!mongoose.isValidObjectId(id)) throw unavailable();
  const question = await Question.findById(id);
  if (!question) throw unavailable();
  return question;
}

/** #15 / #41 – the question, but only if `userId` owns it (REQ-QB-07: otherwise "Access denied"). */
async function getOwnQuestion(id, userId) {
  const question = await getQuestion(id);
  if (question.owner.toString() !== String(userId)) throw AppError.accessDenied();
  return question;
}

/** The full question as sent to Faculty (includes the answer key – the bank is Faculty-only). */
function toFullQuestion(q) {
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    correctOption: q.correctOption,
    topic: q.topic,
    difficulty: q.difficulty,
    explanation: q.explanation,
    owner: q.owner.toString(),
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

/**
 * Returns the question's current editable values with the requested changes applied.
 * Used before validation so a partial edit is checked with the same rules as a new question.
 */
function mergeEdits(question, changes) {
  const merged = {};
  EDITABLE_FIELDS.forEach((f) => {
    const current = question[f];
    merged[f] = Array.isArray(current) ? [...current] : current;
    if (Object.prototype.hasOwnProperty.call(changes || {}, f)) merged[f] = changes[f];
  });
  return merged;
}

/** #15 – saves already-validated values on a question the caller owns. */
async function updateQuestion(question, values) {
  question.text = values.text;
  question.options = values.options.map((o) => o.trim());
  question.correctOption = values.correctOption;
  question.topic = values.topic;
  question.difficulty = values.difficulty;
  question.explanation = values.explanation || '';
  await question.save();
  return question;
}

/**
 * #15 – removes a question the caller owns (REQ-QB-06).
 * Published quizzes keep their own copy of the question (SAD ADR-2), so they are not affected.
 */
async function removeQuestion(question) {
  await Question.deleteOne({ _id: question._id });
}

module.exports = {
  createQuestion,
  searchQuestions,
  listTopics,
  getQuestion,
  getOwnQuestion,
  toFullQuestion,
  mergeEdits,
  updateQuestion,
  removeQuestion,
};
