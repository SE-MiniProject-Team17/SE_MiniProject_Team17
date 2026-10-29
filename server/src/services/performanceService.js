
const mongoose = require('mongoose');
const Attempt = require('../models/Attempt');
const { Quiz } = require('../models/Quiz');
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
  const totalScore = attempts.reduce(
    (sum, attempt) => sum + attempt.score,
    0
  );
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
              (attempts.reduce(
                (sum, attempt) => sum + attempt.percentage,
                0
              ) /
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

async function getMyTopicPerformance(studentId) {
  if (!mongoose.isValidObjectId(studentId)) {
    throw AppError.notAuthenticated();
  }

  const attempts = await Attempt.find({
    student: studentId,
    status: 'Completed',
    submittedAt: { $ne: null },
  })
    .select('quiz answers')
    .lean();

  if (attempts.length === 0) {
    return { topics: [] };
  }

  const quizIds = [
    ...new Set(attempts.map((attempt) => attempt.quiz.toString())),
  ];

  const quizzes = await Quiz.find({ _id: { $in: quizIds } })
    .select('questions')
    .lean();

  const quizById = new Map(
    quizzes.map((quiz) => [quiz._id.toString(), quiz])
  );

  const topicStats = new Map();

  for (const attempt of attempts) {
    const quiz = quizById.get(attempt.quiz.toString());

    if (!quiz) continue;

    const questionByPosition = new Map(
      (quiz.questions || []).map((question) => [
        question.position,
        question,
      ])
    );

    for (const answer of attempt.answers || []) {
      // Exclude unanswered questions from the accuracy denominator.
      if (!answer.selectedOption) continue;

      // Assumption: questionId stores the 1-based position
      // in the published quiz snapshot.
      const question = questionByPosition.get(answer.questionId);

      if (!question || !question.topic?.trim()) continue;

      const topic = question.topic.trim();

      if (!topicStats.has(topic)) {
        topicStats.set(topic, {
          topic,
          totalQuestions: 0,
          correctAnswers: 0,
        });
      }

      const stats = topicStats.get(topic);
      stats.totalQuestions += 1;

      if (answer.selectedOption === question.correctOption) {
        stats.correctAnswers += 1;
      }
    }
  }

  const topics = [...topicStats.values()]
    .map((stats) => ({
      ...stats,
      accuracy:
        stats.totalQuestions === 0
          ? 0
          : Math.round(
              (stats.correctAnswers / stats.totalQuestions) * 10000
            ) / 100,
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));

  return { topics };
}

module.exports = {
  getMyPerformance,
  getMyTopicPerformance,
};
