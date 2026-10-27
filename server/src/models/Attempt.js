const mongoose = require('mongoose');

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
      type: [
        new mongoose.Schema(
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
        ),
      ],
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
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

attemptSchema.index({ student: 1, status: 1, submittedAt: -1 });

module.exports = mongoose.model('Attempt', attemptSchema);