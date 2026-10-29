const mongoose = require('mongoose');
const { Quiz } = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const QuizAttemptClaim = require('../models/QuizAttemptClaim');
const AppError = require('../utils/AppError');

function unavailableQuiz() {
  throw AppError.unavailable('Quiz');
}

function unavailableAttempt() {
  throw AppError.unavailable('Attempt');
}

function alreadyAttempted() {
  throw AppError.conflict(
    'QUIZ_ALREADY_ATTEMPTED',
    'You have already started or completed this quiz'
  );
}

function publicQuestion(question, completed = false, answers = []) {
  const result = {
    id: question.position,
    position: question.position,
    text: question.text,
    options: [...question.options],
  };

  const answer = answers.find((item) => item.questionId === question.position);
  result.selectedOption = answer?.selectedOption ?? null;

  if (completed) {
    result.correctOption = question.correctOption;
    result.explanation = question.explanation || '';
  }

  return result;
}

function deadlineFor(attempt, quiz) {
  const start = attempt.startedAt || attempt.createdAt;
  return new Date(Math.min(
    new Date(start).getTime() + quiz.timeLimitMinutes * 60 * 1000,
    new Date(quiz.availableUntil).getTime()
  ));
}

function attemptResponse(attempt, quiz, now = new Date()) {
  const completed = attempt.status === 'Completed';
  const questions = quiz.questions.map((question) =>
    publicQuestion(question, completed, attempt.answers)
  );

  return {
    id: attempt._id.toString(),
    quizId: quiz._id.toString(),
    title: attempt.quizTitle || quiz.title,
    status: attempt.status,
    startedAt: attempt.startedAt || attempt.createdAt,
    expiresAt: attempt.expiresAt || deadlineFor(attempt, quiz),
    remainingSeconds: completed
      ? 0
      : Math.max(0, Math.ceil(
          ((attempt.expiresAt || deadlineFor(attempt, quiz)).getTime() - now.getTime()) / 1000
        )),
    submittedAt: attempt.submittedAt,
    questions,
    unansweredQuestionIds: attempt.answers
      .filter((answer) => answer.selectedOption == null)
      .map((answer) => answer.questionId),
    ...(completed ? {
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.percentage,
    } : {}),
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
    const expiresAt = new Date(Math.min(
      now.getTime() + quiz.timeLimitMinutes * 60 * 1000,
      new Date(quiz.availableUntil).getTime()
    ));

    const attempt = await Attempt.create({
      student: studentId,
      quiz: quiz._id,
      quizTitle: quiz.title,
      startedAt: now,
      expiresAt,
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
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      questions: quiz.questions.map(publicQuestion),
    };
  } catch (err) {
    await QuizAttemptClaim.deleteOne({ _id: claim._id }).catch(() => {});
    throw err;
  }
}

async function findOwnedAttempt(attemptId, studentId) {
  if (!mongoose.isValidObjectId(attemptId)) unavailableAttempt();

  const attempt = await Attempt.findOne({
    _id: attemptId,
    student: studentId,
  });

  if (!attempt) unavailableAttempt();

  const quiz = await Quiz.findById(attempt.quiz).lean();
  if (!quiz) unavailableAttempt();

  return { attempt, quiz };
}

async function getAttempt(attemptId, studentId, now = new Date()) {
  const { attempt, quiz } = await findOwnedAttempt(attemptId, studentId);

  if (attempt.status === 'InProgress' &&
      now.getTime() >= (attempt.expiresAt || deadlineFor(attempt, quiz)).getTime()) {
    return submitAttempt(attemptId, studentId, now);
  }

  return attemptResponse(attempt, quiz, now);
}

async function saveAnswer(attemptId, studentId, questionId, selectedOption, now = new Date()) {
  if (!Number.isInteger(questionId) || questionId < 1) {
    throw AppError.validation('questionId', 'A valid question ID is required');
  }

  if (selectedOption !== null &&
      !['A', 'B', 'C', 'D'].includes(selectedOption)) {
    throw AppError.validation('selectedOption', 'Select A, B, C, D, or null');
  }

  const { attempt, quiz } = await findOwnedAttempt(attemptId, studentId);

  if (attempt.status !== 'InProgress') {
    throw AppError.conflict('ATTEMPT_SUBMITTED', 'This attempt has already been submitted');
  }

  const expiresAt = attempt.expiresAt || deadlineFor(attempt, quiz);
  if (now.getTime() >= expiresAt.getTime()) {
    throw AppError.conflict('ATTEMPT_EXPIRED', 'The time limit has expired');
  }

  if (!quiz.questions.some((question) => question.position === questionId)) {
    throw AppError.validation('questionId', 'Question does not belong to this quiz');
  }

  const updated = await Attempt.findOneAndUpdate(
    {
      _id: attempt._id,
      student: studentId,
      status: 'InProgress',
      expiresAt: { $gt: now },
      'answers.questionId': questionId,
    },
    {
      $set: { 'answers.$.selectedOption': selectedOption },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    const latest = await Attempt.findOne({ _id: attempt._id, student: studentId });
    if (!latest) unavailableAttempt();
    if (latest.status !== 'InProgress') {
      throw AppError.conflict('ATTEMPT_SUBMITTED', 'This attempt has already been submitted');
    }
    throw AppError.conflict('ATTEMPT_EXPIRED', 'The time limit has expired');
  }

  return {
    saved: true,
    questionId,
    selectedOption,
  };
}

async function submitAttempt(attemptId, studentId, now = new Date()) {
  for (let retry = 0; retry < 5; retry += 1) {
    const { attempt, quiz } = await findOwnedAttempt(attemptId, studentId);

    if (attempt.status === 'Completed') {
      return attemptResponse(attempt, quiz, now);
    }

    const correctByPosition = new Map(
      quiz.questions.map((question) => [question.position, question.correctOption])
    );

    const score = attempt.answers.reduce((total, answer) => (
      answer.selectedOption != null &&
      answer.selectedOption === correctByPosition.get(answer.questionId)
        ? total + 1
        : total
    ), 0);

    const percentage = Math.round((score / attempt.totalQuestions) * 10000) / 100;

    // The updatedAt condition prevents grading a stale answer snapshot if an answer
    // was changed concurrently. The status condition freezes the attempt on submission.
    const completed = await Attempt.findOneAndUpdate(
      {
        _id: attempt._id,
        student: studentId,
        status: 'InProgress',
        revision: attempt.revision || 0,
      },
      {
        $set: {
          status: 'Completed',
          submittedAt: now,
          score,
          percentage,
        },
        $inc: { revision: 1 },
      },
      { new: true, runValidators: true }
    );

    if (completed) {
      return attemptResponse(completed, quiz, now);
    }
  }

  throw AppError.conflict(
    'ATTEMPT_UPDATE_CONFLICT',
    'The attempt changed while being submitted. Please try again.'
  );
}

module.exports = {
  listAvailableQuizzes,
  startAttempt,
  getAttempt,
  saveAnswer,
  submitAttempt,
};
