
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const Attempt = require('../src/models/Attempt');
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
  test('returns only the authenticated student’s completed attempts', async () => {
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
      }),
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
