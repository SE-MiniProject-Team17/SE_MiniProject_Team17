
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const AppError = require('../utils/AppError');

async function listAvailableQuizzes(studentId) {
  const quizzes = await Quiz.find()
    .select('title questions createdBy createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const attempts = await Attempt.find({ student: studentId })
    .select('quiz')
    .lean();

  const attemptedQuizIds = new Set(
    attempts.map((attempt) => String(attempt.quiz))
  );

  return quizzes.map((quiz) => ({
    id: String(quiz._id),
    title: quiz.title,
    totalQuestions: quiz.questions.length,
    attempted: attemptedQuizIds.has(String(quiz._id)),
  }));
}

async function getQuizForAttempt(quizId, studentId) {
  if (!mongoose.isValidObjectId(quizId)) {
    throw AppError.notFound('Quiz not found');
  }

  const quiz = await Quiz.findById(quizId).populate({
    path: 'questions',
    select: 'text options',
  });

  if (!quiz || !quiz.questions.length) {
    throw AppError.notFound('Quiz not found');
  }

  const existingAttempt = await Attempt.exists({
    student: studentId,
    quiz: quiz._id,
  });

  if (existingAttempt) {
    throw AppError.validation(
      'quiz',
      'You have already submitted this quiz'
    );
  }

  return {
    id: String(quiz._id),
    title: quiz.title,
    questions: quiz.questions.map((question) => ({
      id: String(question._id),
      text: question.text,
      options: question.options,
    })),
  };
}

module.exports = {
  listAvailableQuizzes,
  getQuizForAttempt,
};
