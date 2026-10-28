const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { Quiz } = require('../src/models/Quiz');
const { Question } = require('../src/models/Question');
const Attempt = require('../src/models/Attempt');
const QuizAttemptClaim = require('../src/models/QuizAttemptClaim');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const HOUR = 60 * 60 * 1000;
const as = (user) => ({ Authorization: `Bearer ${user.token}` });

let student;
let faculty;
let question;
let openQuiz;
let upcomingQuiz;
let expiredQuiz;
let draftQuiz;

async function makeQuiz(title, status, from, until) {
  return Quiz.create({
    title,
    description: 'Test description',
    timeLimitMinutes: 10,
    availableFrom: from,
    availableUntil: until,
    questionIds: [question._id],
    status,
    publishedAt: status === 'Published' ? new Date() : null,
    questions: status === 'Published' ? [{
      sourceQuestion: question._id,
      position: 1,
      text: question.text,
      options: question.options,
      correctOption: question.correctOption,
      topic: question.topic,
      difficulty: question.difficulty,
      explanation: question.explanation,
    }] : [],
    owner: faculty.id,
  });
}

beforeAll(async () => {
  await startDB();
  await QuizAttemptClaim.init();
});
beforeEach(async () => {
  student = await tokenFor('Student');
  faculty = await tokenFor('Faculty');

  question = await Question.create({
    text: 'What is 2 + 2?',
    options: ['1', '3', '4', '5'],
    correctOption: 'C',
    topic: 'Maths',
    difficulty: 'Easy',
    explanation: 'Two plus two equals four.',
    owner: faculty.id,
  });

  const now = Date.now();
  openQuiz = await makeQuiz('Open quiz', 'Published',
    new Date(now - HOUR), new Date(now + HOUR));
  upcomingQuiz = await makeQuiz('Upcoming quiz', 'Published',
    new Date(now + HOUR), new Date(now + 2 * HOUR));
  expiredQuiz = await makeQuiz('Expired quiz', 'Published',
    new Date(now - 2 * HOUR), new Date(now - HOUR));
  draftQuiz = await makeQuiz('Draft quiz', 'Draft',
    new Date(now - HOUR), new Date(now + HOUR));
});
afterEach(clearDB);
afterAll(stopDB);

describe('Issue #17: student quiz listing and attempt initiation', () => {
  test('lists open and upcoming published quizzes, never drafts or expired quizzes', async () => {
    const res = await request(app).get('/api/quizzes/available').set(as(student));

    expect(res.status).toBe(200);
    expect(res.body.quizzes.map((q) => q.title)).toEqual(
      expect.arrayContaining(['Open quiz', 'Upcoming quiz'])
    );
    expect(res.body.quizzes.map((q) => q.title)).not.toEqual(
      expect.arrayContaining(['Draft quiz', 'Expired quiz'])
    );
    expect(res.body.quizzes.find((q) => q.title === 'Upcoming quiz').availability).toBe('Upcoming');
    expect(JSON.stringify(res.body)).not.toMatch(/correctOption|explanation|What is 2/);
  });

  test('allows starting an open quiz and hides answer keys', async () => {
    const res = await request(app)
      .post(`/api/quizzes/${openQuiz.id}/attempts`)
      .set(as(student));

    expect(res.status).toBe(201);
    expect(res.body.attempt).toMatchObject({
      quizId: openQuiz.id,
      title: 'Open quiz',
      questions: [{
        position: 1,
        text: 'What is 2 + 2?',
        options: ['1', '3', '4', '5'],
      }],
    });
    expect(res.body.attempt.id).toBeTruthy();
    expect(JSON.stringify(res.body)).not.toMatch(/correctOption|explanation|Two plus two/);
    expect(await Attempt.countDocuments({ student: student.id, quiz: openQuiz._id })).toBe(1);
  });

  test.each([
    ['upcoming', () => upcomingQuiz],
    ['expired', () => expiredQuiz],
    ['draft', () => draftQuiz],
  ])('rejects starting a %s quiz', async (_label, getQuiz) => {
    const res = await request(app)
      .post(`/api/quizzes/${getQuiz().id}/attempts`)
      .set(as(student));

    expect(res.status).toBe(404);
    expect(await Attempt.countDocuments({ student: student.id, quiz: getQuiz()._id })).toBe(0);
  });

  test('rejects a second attempt by the same student', async () => {
    const first = await request(app)
      .post(`/api/quizzes/${openQuiz.id}/attempts`)
      .set(as(student));
    const second = await request(app)
      .post(`/api/quizzes/${openQuiz.id}/attempts`)
      .set(as(student));

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(await Attempt.countDocuments({ student: student.id, quiz: openQuiz._id })).toBe(1);
  });

  test('concurrent starts create only one attempt', async () => {
    const results = await Promise.all([
      request(app)
        .post(`/api/quizzes/${openQuiz.id}/attempts`)
        .set(as(student)),
      request(app)
        .post(`/api/quizzes/${openQuiz.id}/attempts`)
        .set(as(student)),
    ]);

    expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(await Attempt.countDocuments({
      student: student.id,
      quiz: openQuiz._id,
    })).toBe(1);
    expect(await QuizAttemptClaim.countDocuments({
      student: student.id,
      quiz: openQuiz._id,
    })).toBe(1);
  });

  test('only students may use student listing and start endpoints', async () => {
    const listing = await request(app).get('/api/quizzes/available').set(as(faculty));
    const start = await request(app)
      .post(`/api/quizzes/${openQuiz.id}/attempts`)
      .set(as(faculty));

    expect(listing.status).toBe(403);
    expect(start.status).toBe(403);
  });

  test('requires authentication', async () => {
    expect((await request(app).get('/api/quizzes/available')).status).toBe(401);
    expect((await request(app).post(`/api/quizzes/${openQuiz.id}/attempts`)).status).toBe(401);
  });
});
