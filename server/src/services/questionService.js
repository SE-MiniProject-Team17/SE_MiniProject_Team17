const mongoose = require('mongoose');
const { Question } = require('../models/Question');

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

  let find = Question.find(filter)
    .select('text topic difficulty owner createdAt')
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  // Show the owner's name once the User model from #4 exists.
  if (mongoose.modelNames().includes('User')) find = find.populate('owner', 'fullName');

  const [docs, total] = await Promise.all([find, Question.countDocuments(filter)]);

  const questions = docs.map((d) => {
    const owner = d.owner && d.owner._id ? d.owner : { _id: d.owner };
    return {
      id: d._id.toString(),
      text: d.text,
      topic: d.topic,
      difficulty: d.difficulty,
      owner: { id: owner._id.toString(), name: owner.fullName || null },
      createdAt: d.createdAt,
    };
  });
  return { questions, total, page, limit };
}

/** #14 – the distinct topics in the bank, for the topic filter drop-down. */
async function listTopics() {
  const topics = await Question.distinct('topic');
  return topics.sort((a, b) => a.localeCompare(b));
}

module.exports = { createQuestion, searchQuestions, listTopics };
