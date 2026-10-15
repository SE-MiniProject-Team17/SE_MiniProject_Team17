const mongoose = require('mongoose');

/**
 * Question in the Faculty question bank (SRS REQ-QB-01).
 * The limits are exported so the request validators use exactly the same numbers.
 */
const LIMITS = Object.freeze({
  TEXT_MAX: 500,
  OPTION_COUNT: 4,
  OPTION_MAX: 200,
  TOPIC_MAX: 50,
  EXPLANATION_MAX: 300,
});
const OPTION_LABELS = Object.freeze(['A', 'B', 'C', 'D']);
const DIFFICULTIES = Object.freeze(['Easy', 'Medium', 'Hard']);

const questionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: LIMITS.TEXT_MAX },
    options: {
      type: [{ type: String, trim: true, required: true, maxlength: LIMITS.OPTION_MAX }],
      validate: {
        validator: (v) => Array.isArray(v) && v.length === LIMITS.OPTION_COUNT,
        message: `A question must have exactly ${LIMITS.OPTION_COUNT} options`,
      },
    },
    // Letter of the correct option: 'A' | 'B' | 'C' | 'D' (index 0..3 in `options`).
    correctOption: { type: String, required: true, enum: OPTION_LABELS },
    topic: { type: String, required: true, trim: true, maxlength: LIMITS.TOPIC_MAX },
    difficulty: { type: String, required: true, enum: DIFFICULTIES },
    explanation: { type: String, trim: true, maxlength: LIMITS.EXPLANATION_MAX, default: '' },
    // REQ-QB-03: the creator is the owner. Always set by the server, never by the client.
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

// #14 – indexes for filtering and newest-first listing (NFR-PERF-05: results within 2 s for 1,000 questions).
questionSchema.index({ topic: 1, difficulty: 1 });
questionSchema.index({ createdAt: -1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = { Question, LIMITS, OPTION_LABELS, DIFFICULTIES };
