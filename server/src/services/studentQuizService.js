const mongoose = require('mongoose');
const { Quiz } = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const QuizAttemptClaim = require('../models/QuizAttemptClaim');
const AppError = require('../utils/AppError');

function unavailableQuiz() {
  throw AppError.unavailable('Quiz');
}

function alreadyAttempted() {
  throw AppError.conflict(
    'QUIZ_ALREADY_ATTEMPTED',
    'You have already started or completed this quiz'
  );
}

function publicQuestion(question) {
  return {
    id: question.position,
    position: question.position,
    text: question.text,
    options: [...question.options],
  };
}

async function listAvailableQuizzes(now = new Date()) {
  const quizzes = await Quiz.find({
    status: 'Published',
    availableUntil: { $gt: now },
  })
    .select('title description timeLimitMinutes availableFrom availableUntil questions')
    .sort({ availableFrom: 1, title: 1 })
    .lean();

  return quizzes.map((quiz) => ({
    id: quiz._id.toString(),
    title: quiz.title,
    description: quiz.description,
    timeLimitMinutes: quiz.timeLimitMinutes,
    availableFrom: quiz.availableFrom,
    availableUntil: quiz.availableUntil,
    questionCount: quiz.questions.length,
    availability: quiz.availableFrom > now ? 'Upcoming' : 'Open',
  }));
}

async function startAttempt(quizId, studentId, now = new Date()) {
  if (!mongoose.isValidObjectId(quizId)) unavailableQuiz();

  const quiz = await Quiz.findOne({
    _id: quizId,
    status: 'Published',
    availableFrom: { $lte: now },
    availableUntil: { $gt: now },
  }).lean();

  if (!quiz) unavailableQuiz();

  const existing = await Attempt.findOne({
    student: studentId,
    quiz: quiz._id,
  }).lean();

  if (existing) alreadyAttempted();

  let claim;
  try {
    claim = await QuizAttemptClaim.create({
      student: studentId,
      quiz: quiz._id,
    });
  } catch (err) {
    if (err && err.code === 11000) alreadyAttempted();
    throw err;
  }

  try {
    const attempt = await Attempt.create({
      student: studentId,
      quiz: quiz._id,
      quizTitle: quiz.title,
      answers: quiz.questions.map((question) => ({
        questionId: question.position,
        selectedOption: null,
      })),
      score: 0,
      totalQuestions: quiz.questions.length,
      percentage: 0,
      status: 'InProgress',
      submittedAt: null,
    });

    return {
      id: attempt._id.toString(),
      quizId: quiz._id.toString(),
      title: quiz.title,
      timeLimitMinutes: quiz.timeLimitMinutes,
      startedAt: attempt.createdAt,
      questions: quiz.questions.map(publicQuestion),
    };
  } catch (err) {
    await QuizAttemptClaim.deleteOne({ _id: claim._id }).catch(() => {});
    throw err;
  }
}

module.exports = { listAvailableQuizzes, startAttempt };
