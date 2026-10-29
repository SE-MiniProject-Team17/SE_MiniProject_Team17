
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Attempt = require('../src/models/Attempt');
const { Quiz } = require('../src/models/Quiz');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

let student;
let anotherStudent;
let faculty;
let quizId;
let otherQuizId;

const as = (user) => ({
  Authorization: `Bearer ${user.token}`,
});

async function createAttempt(overrides = {}) {
  return Attempt.create({
    student: new mongoose.Types.ObjectId(student.id),
    quiz: quizId,
    quizTitle: 'Unit 1 Test',
    answers: [],
    score: 8,
    totalQuestions: 10,
    percentage: 80,
    status: 'Completed',
    submittedAt: new Date('2026-10-20T10:00:00.000Z'),
    ...overrides,
  });
}

async function createQuizWithTopics(ownerId, questions, overrides = {}) {
  return Quiz.create({
    title: 'Topic Analytics Test',
    description: 'Test quiz for topic analytics',
    timeLimitMinutes: 30,
    availableFrom: new Date('2026-10-01T00:00:00.000Z'),
    availableUntil: new Date('2027-10-01T00:00:00.000Z'),
    questionIds: questions.map(() => new mongoose.Types.ObjectId()),
    status: 'Published',
    publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    owner: new mongoose.Types.ObjectId(ownerId),
    questions: questions.map((question, index) => ({
      sourceQuestion: new mongoose.Types.ObjectId(),
      position: index + 1,
      text: `Question ${index + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOption: question.correctOption,
      topic: question.topic,
      difficulty: 'Medium',
      explanation: '',
    })),
    ...overrides,
  });
}

beforeAll(startDB);

beforeEach(async () => {
  student = await tokenFor('Student');
  anotherStudent = await tokenFor('Student');
  faculty = await tokenFor('Faculty');

  quizId = new mongoose.Types.ObjectId();
  otherQuizId = new mongoose.Types.ObjectId();
});

afterEach(clearDB);
afterAll(stopDB);

describe('Issue #22 - Student performance history', () => {
  test("returns only the authenticated student's completed attempts", async () => {
    await createAttempt({ score: 8, percentage: 80 });

    await createAttempt({
      student: new mongoose.Types.ObjectId(anotherStudent.id),
      quizTitle: 'Another Student Test',
      score: 2,
      percentage: 20,
    });

    await createAttempt({
      status: 'InProgress',
      submittedAt: null,
      quiz: otherQuizId,
      quizTitle: 'Unfinished Test',
    });

    const response = await request(app)
      .get('/api/performance/mine')
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body.attempts).toHaveLength(1);
    expect(response.body.attempts[0]).toEqual(
      expect.objectContaining({
        quizId: quizId.toString(),
        quizTitle: 'Unit 1 Test',
        score: 8,
        totalQuestions: 10,
        percentage: 80,
      })
    );
    expect(response.body.attempts[0]).not.toHaveProperty('student');
    expect(response.body.attempts[0]).not.toHaveProperty('answers');
  });

  test('calculates summary values from completed attempts', async () => {
    await createAttempt({
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      submittedAt: new Date('2026-10-20T10:00:00.000Z'),
    });

    await createAttempt({
      quiz: otherQuizId,
      quizTitle: 'Unit 2 Test',
      score: 6,
      totalQuestions: 10,
      percentage: 60,
      submittedAt: new Date('2026-10-21T10:00:00.000Z'),
    });

    const response = await request(app)
      .get('/api/performance/mine')
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body.summary).toEqual({
      totalAttempts: 2,
      averagePercentage: 70,
      totalScore: 14,
      totalQuestions: 20,
    });

    expect(response.body.attempts[0].quizTitle).toBe('Unit 2 Test');
  });

  test('returns an empty history and zeroed summary when no attempts exist', async () => {
    const response = await request(app)
      .get('/api/performance/mine')
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      summary: {
        totalAttempts: 0,
        averagePercentage: 0,
        totalScore: 0,
        totalQuestions: 0,
      },
      attempts: [],
    });
  });

  test('rejects requests without authentication', async () => {
    const response = await request(app).get('/api/performance/mine');

    expect(response.status).toBe(401);
  });

  test('rejects Faculty access', async () => {
    const response = await request(app)
      .get('/api/performance/mine')
      .set(as(faculty));

    expect(response.status).toBe(403);
  });
});

describe('Issue #23 - Topic-level performance analytics', () => {
  async function createAnalyticsQuiz() {
    const quiz = await createQuizWithTopics(faculty.id, [
      { topic: 'Data Structures', correctOption: 'A' },
      { topic: 'Data Structures', correctOption: 'B' },
      { topic: 'Algorithms', correctOption: 'C' },
      { topic: 'Algorithms', correctOption: 'D' },
    ]);

    quizId = quiz._id;
    return quiz;
  }

  test('groups completed answers by topic and calculates accuracy', async () => {
    const quiz = await createAnalyticsQuiz();

    await createAttempt({
      quiz: quiz._id,
      answers: [
        { questionId: 1, selectedOption: 'A' },
        { questionId: 2, selectedOption: 'B' },
        { questionId: 3, selectedOption: 'A' },
        { questionId: 4, selectedOption: 'D' },
      ],
    });

    const response = await request(app)
      .get('/api/performance/topics')
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body.topics).toEqual([
      {
        topic: 'Algorithms',
        totalQuestions: 2,
        correctAnswers: 1,
        accuracy: 50,
      },
      {
        topic: 'Data Structures',
        totalQuestions: 2,
        correctAnswers: 2,
        accuracy: 100,
      },
    ]);
  });

  test("does not include another student's answers", async () => {
    const quiz = await createAnalyticsQuiz();

    await createAttempt({
      answers: [{ questionId: 1, selectedOption: 'A' }],
    });

    await createAttempt({
      student: new mongoose.Types.ObjectId(anotherStudent.id),
      quiz: quiz._id,
      answers: [
        { questionId: 3, selectedOption: 'C' },
        { questionId: 4, selectedOption: 'D' },
      ],
    });

    const response = await request(app)
      .get('/api/performance/topics')
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body.topics).toEqual([
      {
        topic: 'Data Structures',
        totalQuestions: 1,
        correctAnswers: 1,
        accuracy: 100,
      },
    ]);
  });

  test('ignores in-progress attempts and attempts without submission timestamps', async () => {
    const quiz = await createAnalyticsQuiz();

    await createAttempt({
      quiz: quiz._id,
      status: 'InProgress',
      submittedAt: null,
      answers: [{ questionId: 1, selectedOption: 'A' }],
    });

    await createAttempt({
      quiz: quiz._id,
      submittedAt: null,
      answers: [{ questionId: 2, selectedOption: 'B' }],
    });

    const response = await request(app)
      .get('/api/performance/topics')
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ topics: [] });
  });

  test('returns an empty topic list when no completed attempts exist', async () => {
    const response = await request(app)
      .get('/api/performance/topics')
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ topics: [] });
  });

  test('excludes unanswered questions from the accuracy denominator', async () => {
    const quiz = await createAnalyticsQuiz();

    await createAttempt({
      quiz: quiz._id,
      answers: [
        { questionId: 1, selectedOption: 'A' },
        { questionId: 2, selectedOption: null },
      ],
    });

    const response = await request(app)
      .get('/api/performance/topics')
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body.topics).toEqual([
      {
        topic: 'Data Structures',
        totalQuestions: 1,
        correctAnswers: 1,
        accuracy: 100,
      },
    ]);
  });

  test('rejects requests without authentication', async () => {
    const response = await request(app).get('/api/performance/topics');

    expect(response.status).toBe(401);
  });

  test('rejects Faculty access', async () => {
    const response = await request(app)
      .get('/api/performance/topics')
      .set(as(faculty));

    expect(response.status).toBe(403);
  });
});
