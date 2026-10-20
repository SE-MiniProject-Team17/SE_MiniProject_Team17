const { Question } = require('../models/Question');

/**
 * Question Bank Service (SAD 3.4) – the business rules for questions.
 * Only the allowed fields are copied from the request, so a client can never
 * set `owner` or any other server-controlled field (REQ-QB-03).
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

module.exports = { createQuestion };
