const mongoose = require('mongoose');

/**
 * Quiz (SRS REQ-QZ-01 to REQ-QZ-05, SAD ADR-2).
 *
 * Draft:     `questionIds` points at questions in the bank; it can still be edited.
 * Published: `questions` holds a COPY of each selected question (text, options, correct option,
 *            explanation, topic, difficulty) made at publication, so later edits or removal of bank
 *            questions do not change the published quiz or any attempt (REQ-QZ-04).
 *
 * Shared with the quiz-taking part (#17ΓÇô#19, VedhV): read `status`, `availableFrom`, `availableUntil`,
 * `timeLimitMinutes` and the `questions` copies. Never send `correctOption`/`explanation` to Students
 * before they submit (SEC-QZ-02).
 */
const LIMITS = Object.freeze({
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 300,
  TIME_MIN: 5,
  TIME_MAX: 180,
  QUESTIONS_MIN: 1,
  QUESTIONS_MAX: 50,
});
const STATUS = Object.freeze({ DRAFT: 'Draft', PUBLISHED: 'Published' });

const questionCopySchema = new mongoose.Schema(
  {
    sourceQuestion: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    position: { type: Number, required: true, min: 1 },
    text: { type: String, required: true },
    options: { type: [String], required: true },
    correctOption: { type: String, required: true, enum: ['A', 'B', 'C', 'D'] },
    topic: { type: String, required: true },
    difficulty: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: LIMITS.TITLE_MAX },
    description: { type: String, trim: true, maxlength: LIMITS.DESCRIPTION_MAX, default: '' },
    timeLimitMinutes: { type: Number, required: true, min: LIMITS.TIME_MIN, max: LIMITS.TIME_MAX },
    availableFrom: { type: Date, required: true },
    availableUntil: { type: Date, required: true },
    questionIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      validate: {
        validator: (v) => v.length >= LIMITS.QUESTIONS_MIN && v.length <= LIMITS.QUESTIONS_MAX,
        message: `A quiz must have between ${LIMITS.QUESTIONS_MIN} and ${LIMITS.QUESTIONS_MAX} questions`,
      },
    },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.DRAFT, index: true },
    questions: { type: [questionCopySchema], default: [] },
    publishedAt: { type: Date, default: null },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

quizSchema.index({ status: 1, availableUntil: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = { Quiz, LIMITS, STATUS };
