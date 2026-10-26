const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const AppError = require('../utils/AppError');

async function getMyPerformance(studentId) {
  if (!mongoose.isValidObjectId(studentId)) {
    throw AppError.notAuthenticated();
  }

  const attempts = await Attempt.find({
    student: studentId,
    status: 'Completed',
    submittedAt: { $ne: null },
  })
    .select('quiz quizTitle score totalQuestions percentage submittedAt')
    .sort({ submittedAt: -1 })
    .lean();

  const totalAttempts = attempts.length;
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const totalQuestions = attempts.reduce(
    (sum, attempt) => sum + attempt.totalQuestions,
    0
  );

  return {
    summary: {
      totalAttempts,
      averagePercentage:
        totalAttempts === 0
          ? 0
          : Math.round(
              (attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) /
                totalAttempts) *
                100
            ) / 100,
      totalScore,
      totalQuestions,
    },
    attempts: attempts.map((attempt) => ({
      id: attempt._id.toString(),
      quizId: attempt.quiz.toString(),
      quizTitle: attempt.quizTitle,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.percentage,
      submittedAt: attempt.submittedAt,
    })),
  };
}

module.exports = { getMyPerformance };