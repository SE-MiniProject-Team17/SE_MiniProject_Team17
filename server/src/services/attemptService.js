
const mongoose = require('mongoose');
const { Quiz, STATUS } = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const AppError = require('../utils/AppError');

async function submitAttempt(quizId, studentId, submittedAnswers) {
  if (!mongoose.isValidObjectId(quizId)) {
    throw AppError.notFound('Quiz not found');
  }

  if (!Array.isArray(submittedAnswers)) {
    throw AppError.validation('answers', 'Answers must be an array');
  }

  const now = new Date();
  const quiz = await Quiz.findOne({
    _id: quizId,
    status: STATUS.PUBLISHED,
    availableFrom: { $lte: now },
    availableUntil: { $gt: now },
  }).lean();

  if (!quiz || !quiz.questions.length) {
    throw AppError.notFound('Quiz not found or unavailable');
  }

  const questionIds = new Set(
    quiz.questions.map((q) => String(q.sourceQuestion))
  );
  const answerMap = new Map();

  for (const answer of submittedAnswers) {
    if (
      !answer ||
      !mongoose.isValidObjectId(answer.questionId) ||
      !questionIds.has(String(answer.questionId))
    ) {
      throw AppError.validation(
        'answers',
        'An answer references a question outside this quiz'
      );
    }

    const id = String(answer.questionId);

    if (answerMap.has(id)) {
      throw AppError.validation('answers', 'Duplicate answers are not allowed');
    }

    const selected = answer.selectedOption ?? null;
    if (selected !== null && !['A', 'B', 'C', 'D'].includes(selected)) {
      throw AppError.validation(
        'answers',
        'Selected option must be A, B, C, D, or null'
      );
    }

    answerMap.set(id, selected);
  }

  const answers = quiz.questions.map((q) => {
    const selectedOption = answerMap.get(String(q.sourceQuestion)) ?? null;
    return {
      questionId: q.sourceQuestion,
      questionText: q.text,
      options: q.options,
      correctOption: q.correctOption,
      explanation: q.explanation || '',
      selectedOption,
      isCorrect: selectedOption === q.correctOption,
    };
  });

  const score = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = answers.length;
  const percentage = Number(((score / totalQuestions) * 100).toFixed(2));

  let attempt;
  try {
    const attemptDocument = {
      student: new mongoose.Types.ObjectId(studentId),
      quiz: quiz._id,
      answers,
      score,
      totalQuestions,
      percentage,
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const result = await Attempt.collection.insertOne(attemptDocument);
    attempt = { _id: result.insertedId, ...attemptDocument };
  } catch (error) {
    if (error.code === 11000) {
      throw AppError.validation('quiz', 'You have already submitted this quiz');
    }
    throw error;
  }

  return formatAttempt(attempt);
}

async function getAttemptResult(attemptId, studentId) {
  if (!mongoose.isValidObjectId(attemptId)) {
    throw AppError.notFound('Result not found');
  }

  const attempt = await Attempt.findOne({
    _id: attemptId,
    student: studentId,
  });

  if (!attempt) {
    throw AppError.notFound('Result not found');
  }

  return formatAttempt(attempt);
}

function formatAttempt(attempt) {
  return {
    id: String(attempt._id),
    quizId: String(attempt.quiz),
    score: attempt.score,
    totalQuestions: attempt.totalQuestions,
    percentage: attempt.percentage,
    submittedAt: attempt.submittedAt,
    answers: attempt.answers.map((a) => ({
      questionId: String(a.questionId),
      questionText: a.questionText,
      options: a.options,
      selectedOption: a.selectedOption,
      correctOption: a.correctOption,
      isCorrect: a.isCorrect,
      explanation: a.explanation,
    })),
  };
}

module.exports = { submitAttempt, getAttemptResult };
