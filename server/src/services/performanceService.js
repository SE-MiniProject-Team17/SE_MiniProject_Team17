
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


async function getFacultyDashboard(facultyId) {
  if (!mongoose.isValidObjectId(facultyId)) {
    throw AppError.notAuthenticated();
  }

  // Start with quizzes owned by this faculty member only.
  const quizzes = await Quiz.find({ owner: facultyId })
    .select('_id title status')
    .sort({ createdAt: -1 })
    .lean();

  const quizIds = quizzes.map((quiz) => quiz._id);

  const attempts = quizIds.length
    ? await Attempt.find({
        quiz: { $in: quizIds },
        status: 'Completed',
        submittedAt: { $ne: null },
      })
        .select('quiz student score totalQuestions percentage submittedAt')
        .sort({ submittedAt: -1 })
        .lean()
    : [];

  const quizById = new Map(
    quizzes.map((quiz) => [
      quiz._id.toString(),
      {
        id: quiz._id.toString(),
        title: quiz.title,
        status: quiz.status,
        submissionCount: 0,
        averagePercentage: 0,
        _percentageTotal: 0,
      },
    ])
  );

  const studentStats = new Map();

  for (const attempt of attempts) {
    const quiz = quizById.get(attempt.quiz.toString());
    if (quiz) {
      quiz.submissionCount += 1;
      quiz._percentageTotal += attempt.percentage;
    }

    const studentId = attempt.student.toString();
    if (!studentStats.has(studentId)) {
      studentStats.set(studentId, {
        studentId,
        attempts: 0,
        percentageTotal: 0,
      });
    }

    const student = studentStats.get(studentId);
    student.attempts += 1;
    student.percentageTotal += attempt.percentage;
  }

  const quizResults = [...quizById.values()].map((quiz) => {
    const { _percentageTotal, ...result } = quiz;
    result.averagePercentage = result.submissionCount
      ? Math.round((_percentageTotal / result.submissionCount) * 100) / 100
      : 0;
    return result;
  });

  const studentIds = [...studentStats.keys()];
  const students = studentIds.length
    ? await require('../models/User').find({
        _id: { $in: studentIds },
      }).select('_id fullName').lean()
    : [];

  const nameById = new Map(
    students.map((student) => [student._id.toString(), student.fullName || 'Student unavailable'])
  );

  const studentResults = [...studentStats.values()]
    .map((student) => ({
      studentName: nameById.get(student.studentId) || 'Student unavailable',
      completedAttempts: student.attempts,
      averagePercentage:
        Math.round((student.percentageTotal / student.attempts) * 100) / 100,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));

  const totalSubmissions = attempts.length;
  const averagePercentage = totalSubmissions
    ? Math.round(
        (attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) /
          totalSubmissions) * 100
      ) / 100
    : 0;

  return {
    summary: {
      totalQuizzes: quizzes.length,
      quizzesWithSubmissions: quizResults.filter((quiz) => quiz.submissionCount > 0).length,
      totalSubmissions,
      uniqueStudents: studentResults.length,
      averagePercentage,
    },
    quizzes: quizResults,
    students: studentResults,
  };
}

module.exports = {
  getMyPerformance,
  getMyTopicPerformance,
  getFacultyDashboard,
};
