
const request = require('supertest');
const { performance } = require('node:perf_hooks');
const app = require('../src/app');
const User = require('../src/models/User');
const { Quiz } = require('../src/models/Quiz');
const { Question } = require('../src/models/Question');
const Attempt = require('../src/models/Attempt');
const QuizAttemptClaim = require('../src/models/QuizAttemptClaim');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const STUDENT_COUNT = 100;
const QUESTION_COUNT = 50;
const MAX_SUBMISSION_MS = 2000;
const MAX_LAUNCH_WINDOW_MS = 5000;
const HOUR = 60 * 60 * 1000;

let faculty;
let quiz;
let students;

beforeAll(async () => {
  await startDB();
  await QuizAttemptClaim.init();
});

beforeEach(async () => {
  faculty = await tokenFor('Faculty');

  await User.create({
    _id: faculty.id,
    fullName: 'Performance Test Faculty',
    email: `faculty-${faculty.id}@example.com`,
    passwordHash: 'test-password-hash',
    role: 'Faculty',
    institution: 'Test Institution',
    profilePicture: '',
  });

  const now = Date.now();

  const questions = await Question.insertMany(
    Array.from({ length: QUESTION_COUNT }, (_, index) => ({
      text: `Performance question ${index + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOption: 'C',
      topic: 'Performance',
      difficulty: 'Easy',
      explanation: `Explanation ${index + 1}`,
      owner: faculty.id,
    }))
  );

  const questionCopies = questions.map((question, index) => ({
    sourceQuestion: question._id,
    position: index + 1,
    text: question.text,
    options: question.options,
    correctOption: question.correctOption,
    topic: question.topic,
    difficulty: question.difficulty,
    explanation: question.explanation,
  }));

  quiz = await Quiz.create({
    title: 'Issue 21 performance quiz',
    description: '50-question grading performance test',
    timeLimitMinutes: 10,
    availableFrom: new Date(now - HOUR),
    availableUntil: new Date(now + HOUR),
    questionIds: questions.map((question) => question._id),
    status: 'Published',
    publishedAt: new Date(now),
    questions: questionCopies,
    owner: faculty.id,
  });

  students = await Promise.all(
    Array.from({ length: STUDENT_COUNT }, async (_, index) => {
      const student = await tokenFor('Student');

      await User.create({
        _id: student.id,
        fullName: `Performance Student ${index + 1}`,
        email: `student-${student.id}@example.com`,
        passwordHash: 'test-password-hash',
        role: 'Student',
        institution: 'Test Institution',
        profilePicture: '',
      });

      return student;
    })
  );
}, 60000);

afterEach(clearDB);
afterAll(stopDB);

describe('Issue #21: quiz grading performance', () => {
  test('grades 100 submissions for a 50-question quiz and verifies persisted scores', async () => {
    // Prepare attempts before the measured submission workload.
    const startedAttempts = await Promise.all(
      students.map(async (student) => {
        const response = await request(app)
          .post(`/api/quizzes/${quiz.id}/attempts`)
          .set('Authorization', `Bearer ${student.token}`);

        expect(response.status).toBe(201);
        return { student, attempt: response.body.attempt };
      })
    );

    expect(startedAttempts).toHaveLength(STUDENT_COUNT);

    // Answer all 50 questions correctly through the real answer endpoint.
    // This setup is deliberately outside the submission timing measurement.
    const answerSetup = await Promise.all(
      startedAttempts.map(async ({ student, attempt }) => {
        const answers = await Promise.all(
          Array.from({ length: QUESTION_COUNT }, (_, index) =>
            request(app)
              .patch(`/api/quizzes/attempts/${attempt.id}/answers`)
              .set('Authorization', `Bearer ${student.token}`)
              .send({
                questionId: index + 1,
                selectedOption: 'C',
              })
          )
        );

        expect(answers.every((response) => response.status === 200)).toBe(true);
        return attempt.id;
      })
    );

    expect(answerSetup).toHaveLength(STUDENT_COUNT);

    // Launch the 100 actual HTTP submission requests concurrently.
    const launchTimes = [];

    const submissions = await Promise.all(
      startedAttempts.map(async ({ student, attempt }) => {
        const requestStartedAt = performance.now();
        launchTimes.push(requestStartedAt);

        const response = await request(app)
          .post(`/api/quizzes/attempts/${attempt.id}/submit`)
          .set('Authorization', `Bearer ${student.token}`);

        const elapsedMs = performance.now() - requestStartedAt;

        return { attemptId: attempt.id, response, elapsedMs };
      })
    );

    const launchWindowMs = Math.max(...launchTimes) - Math.min(...launchTimes);
    const submissionBatchMs = Math.max(...submissions.map(({ elapsedMs }) => elapsedMs));

    expect(submissions).toHaveLength(STUDENT_COUNT);
    expect(launchWindowMs).toBeLessThan(MAX_LAUNCH_WINDOW_MS);

    const failedResponses = submissions.filter(
      ({ response }) => response.status !== 200
    );

    expect(failedResponses.map(({ response }) => response.status)).toEqual([]);

    const slowSubmissions = submissions.filter(
      ({ elapsedMs }) => elapsedMs >= MAX_SUBMISSION_MS
    );

    // Include measurements in the Jest assertion output if the target is missed.
    expect({
      launchWindowMs: Number(launchWindowMs.toFixed(2)),
      maxSubmissionMs: Number(submissionBatchMs.toFixed(2)),
      slowSubmissionCount: slowSubmissions.length,
    }).toEqual({
      launchWindowMs: expect.any(Number),
      maxSubmissionMs: expect.any(Number),
      slowSubmissionCount: 0,
    });

    expect(launchWindowMs).toBeLessThan(MAX_LAUNCH_WINDOW_MS);

    for (const { response } of submissions) {
      expect(response.body.attempt.status).toBe('Completed');
      expect(response.body.attempt.score).toBe(QUESTION_COUNT);
      expect(response.body.attempt.totalQuestions).toBe(QUESTION_COUNT);
      expect(response.body.attempt.percentage).toBe(100);
    }

    const persistedAttempts = await Attempt.find({
      _id: { $in: startedAttempts.map(({ attempt }) => attempt.id) },
    }).lean();

    expect(persistedAttempts).toHaveLength(STUDENT_COUNT);

    for (const attempt of persistedAttempts) {
      expect(attempt.status).toBe('Completed');
      expect(attempt.score).toBe(QUESTION_COUNT);
      expect(attempt.totalQuestions).toBe(QUESTION_COUNT);
      expect(attempt.percentage).toBe(100);
      expect(attempt.submittedAt).toBeTruthy();
    }

    // Confirm all 100 attempts belong to distinct students.
    expect(
      new Set(persistedAttempts.map((attempt) => attempt.student.toString())).size
    ).toBe(STUDENT_COUNT);

    // Sanity-check that the quiz fixture has the expected workload.
    const persistedQuiz = await Quiz.findById(quiz._id).lean();
    expect(persistedQuiz.questions).toHaveLength(QUESTION_COUNT);
  }, 120000);
});
