const { Question } = require('../models/Question');
const User = require('../models/User');

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

module.exports = { createQuestion, searchQuestions, listTopics };
