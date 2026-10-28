const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: Number,
      required: true,
    },
    selectedOption: {
      type: String,
      enum: ['A', 'B', 'C', 'D', null],
      default: null,
    },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
      index: true,
    },
    quizTitle: {
      type: String,
      trim: true,
      default: '',
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['InProgress', 'Completed'],
      default: 'InProgress',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: function () {
        const start = this.startedAt || new Date();
        return new Date(start.getTime() + 180 * 60 * 1000);
      },
      required: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    revision: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

attemptSchema.index({ student: 1, status: 1, submittedAt: -1 });

module.exports = mongoose.model('Attempt', attemptSchema);
