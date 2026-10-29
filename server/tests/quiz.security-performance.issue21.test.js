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
const MAX_QUESTION_LOAD_MS = 3000;
const MAX_LAUNCH_WINDOW_MS = 5000;
const HOUR = 60 * 60 * 1000;

let faculty;
let quiz;
let students;

function summarizeLatencies(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (fraction) =>
    sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)];

  return {
    minMs: Number(sorted[0].toFixed(2)),
    p50Ms: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
  };
}

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
  test(
    'grades 100 submissions for a 50-question quiz and verifies persisted scores',
    async () => {
      // Start attempts and measure the response containing quiz questions.
      const startedAttempts = await Promise.all(
        students.map(async (student) => {
          const requestStartedAt = performance.now();

          const response = await request(app)
            .post(`/api/quizzes/${quiz.id}/attempts`)
            .set('Authorization', `Bearer ${student.token}`);

          const elapsedMs = performance.now() - requestStartedAt;

          return {
            student,
            response,
            attempt: response.body?.attempt,
            questionLoadMs: elapsedMs,
          };
        })
      );

      const maxQuestionLoadMs = Math.max(
        ...startedAttempts.map(({ questionLoadMs }) => questionLoadMs)
      );
      const failedStarts = startedAttempts.filter(
        ({ response, attempt }) =>
          response.status !== 201 ||
          !Array.isArray(attempt?.questions) ||
          attempt.questions.length !== QUESTION_COUNT
      );

      const slowQuestionLoads = startedAttempts.filter(
        ({ questionLoadMs }) => questionLoadMs >= MAX_QUESTION_LOAD_MS
      );

      console.log(`[TC-QP-03 local measurement] ${JSON.stringify({
        environment: {
          runtime: process.version,
          platform: process.platform,
          database: 'mongodb-memory-server',
          client: 'Supertest in one Jest process',
        },
        concurrency: STUDENT_COUNT,
        questionsPerQuiz: QUESTION_COUNT,
        successfulResponses: startedAttempts.length - failedStarts.length,
        failedResponses: failedStarts.length,
        failureRatePercent: Number((failedStarts.length / startedAttempts.length * 100).toFixed(2)),
        apiResponseLatency: summarizeLatencies(
          startedAttempts.map(({ questionLoadMs }) => questionLoadMs)
        ),
      })}`);

      expect(startedAttempts).toHaveLength(STUDENT_COUNT);
      expect(failedStarts).toHaveLength(0);
      expect(slowQuestionLoads).toHaveLength(0);
      expect(maxQuestionLoadMs).toBeLessThan(MAX_QUESTION_LOAD_MS);

      // Submit all 50 answers per student.
      // Answer preparation is outside the grading measurement.
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

          expect(answers.every((response) => response.status === 200)).toBe(
            true
          );

          return attempt.id;
        })
      );

      expect(answerSetup).toHaveLength(STUDENT_COUNT);

      // Launch all 100 submission requests concurrently.
      const submissionStarts = [];

      const submissions = await Promise.all(
        startedAttempts.map(async ({ student, attempt }) => {
          const requestStartedAt = performance.now();
          submissionStarts.push(requestStartedAt);

          const response = await request(app)
            .post(`/api/quizzes/attempts/${attempt.id}/submit`)
            .set('Authorization', `Bearer ${student.token}`);

          const elapsedMs = performance.now() - requestStartedAt;

          return {
            attemptId: attempt.id,
            response,
            elapsedMs,
            completedAt: performance.now(),
          };
        })
      );

      const launchWindowMs = Math.max(...submissionStarts) - Math.min(...submissionStarts);
      const submissionBatchMs = Math.max(...submissions.map(({ elapsedMs }) => elapsedMs));
      const submissionBatchElapsedMs =
        Math.max(...submissions.map(({ completedAt }) => completedAt)) -
        Math.min(...submissionStarts);

      const slowSubmissions = submissions.filter(
        ({ elapsedMs }) => elapsedMs >= MAX_SUBMISSION_MS
      );

      expect(submissions).toHaveLength(STUDENT_COUNT);
      expect(launchWindowMs).toBeLessThan(MAX_LAUNCH_WINDOW_MS);
      expect(submissionBatchMs).toBeLessThan(MAX_SUBMISSION_MS);
      expect(slowSubmissions).toHaveLength(0);

      const failedResponses = submissions.filter(
        ({ response }) => response.status !== 200
      );

      expect(
        failedResponses.map(({ response }) => response.status)
      ).toEqual([]);

      console.log(`[TC-QP-01 local measurement] ${JSON.stringify({
        environment: {
          runtime: process.version,
          platform: process.platform,
          database: 'mongodb-memory-server',
          client: 'Supertest in one Jest process',
        },
        concurrency: STUDENT_COUNT,
        questionsPerQuiz: QUESTION_COUNT,
        successfulResponses: submissions.length - failedResponses.length,
        failedResponses: failedResponses.length,
        failureRatePercent: Number((failedResponses.length / submissions.length * 100).toFixed(2)),
        throughputRequestsPerSecond: Number((submissions.length / (submissionBatchElapsedMs / 1000)).toFixed(2)),
        launchWindowMs: Number(launchWindowMs.toFixed(2)),
        batchElapsedMs: Number(submissionBatchElapsedMs.toFixed(2)),
        apiResponseLatency: summarizeLatencies(submissions.map(({ elapsedMs }) => elapsedMs)),
        overTwoSecondResponses: slowSubmissions.length,
      })}`);

      // Verify every response reports the correct completed score.
      for (const { response } of submissions) {
        expect(response.body.attempt.status).toBe('Completed');
        expect(response.body.attempt.score).toBe(QUESTION_COUNT);
        expect(response.body.attempt.totalQuestions).toBe(QUESTION_COUNT);
        expect(response.body.attempt.percentage).toBe(100);
      }

      // Verify results were persisted correctly in the database.
      const persistedAttempts = await Attempt.find({
        _id: {
          $in: startedAttempts.map(({ attempt }) => attempt.id),
        },
      }).lean();

      expect(persistedAttempts).toHaveLength(STUDENT_COUNT);

      for (const attempt of persistedAttempts) {
        expect(attempt.status).toBe('Completed');
        expect(attempt.score).toBe(QUESTION_COUNT);
        expect(attempt.totalQuestions).toBe(QUESTION_COUNT);
        expect(attempt.percentage).toBe(100);
        expect(attempt.submittedAt).toBeTruthy();
      }

      // Verify the 100 attempts belong to 100 distinct students.
      const distinctStudents = new Set(
        persistedAttempts.map((attempt) => attempt.student.toString())
      );

      expect(distinctStudents.size).toBe(STUDENT_COUNT);

      // Confirm the quiz contains all 50 questions.
      const persistedQuiz = await Quiz.findById(quiz._id).lean();

      expect(persistedQuiz.questions).toHaveLength(QUESTION_COUNT);
    },
    120000
  );
});
