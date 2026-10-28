const mongoose = require('mongoose');

const quizAttemptClaimSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    quiz: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quiz',
      required: true,
    },
  },
  { timestamps: true }
);

quizAttemptClaimSchema.index(
  { student: 1, quiz: 1 },
  { unique: true, name: 'uniq_student_quiz_attempt_claim' }
);

module.exports = mongoose.model('QuizAttemptClaim', quizAttemptClaimSchema);
