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
let otherStudent;
let faculty;
let quiz;

beforeAll(async () => {
  await startDB();
  await QuizAttemptClaim.init();
});

beforeEach(async () => {
  student = await tokenFor('Student');
  otherStudent = await tokenFor('Student');
  faculty = await tokenFor('Faculty');

  const question = await Question.create({
    text: 'What is 2 + 2?',
    options: ['1', '3', '4', '5'],
    correctOption: 'C',
    topic: 'Maths',
    difficulty: 'Easy',
    explanation: 'Two plus two equals four.',
    owner: faculty.id,
  });

  const now = Date.now();
  quiz = await Quiz.create({
    title: 'Timed quiz',
    description: 'Issue 18 test quiz',
    timeLimitMinutes: 10,
    availableFrom: new Date(now - HOUR),
    availableUntil: new Date(now + HOUR),
    questionIds: [question._id],
    status: 'Published',
    publishedAt: new Date(),
    questions: [{
      sourceQuestion: question._id,
      position: 1,
      text: question.text,
      options: question.options,
      correctOption: question.correctOption,
      topic: question.topic,
      difficulty: question.difficulty,
      explanation: question.explanation,
    }],
    owner: faculty.id,
  });
});

afterEach(clearDB);
afterAll(stopDB);

async function start() {
  const response = await request(app)
    .post(`/api/quizzes/${quiz.id}/attempts`)
    .set(as(student));
  expect(response.status).toBe(201);
  return response.body.attempt;
}

async function answer(attemptId, questionId, selectedOption, user = student) {
  return request(app)
    .patch(`/api/quizzes/attempts/${attemptId}/answers`)
    .set(as(user))
    .send({ questionId, selectedOption });
}

async function submit(attemptId, user = student) {
  return request(app)
    .post(`/api/quizzes/attempts/${attemptId}/submit`)
    .set(as(user));
}

describe('Issue #18: timed quiz attempts and answer submission', () => {
  test('returns an active attempt without exposing the answer key', async () => {
    const started = await start();

    const response = await request(app)
      .get(`/api/quizzes/attempts/${started.id}`)
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body.attempt.status).toBe('InProgress');
    expect(response.body.attempt.expiresAt).toBeTruthy();
    expect(response.body.attempt.questions[0].selectedOption).toBeNull();
    expect(JSON.stringify(response.body)).not.toMatch(/correctOption|explanation|Two plus two/);
  });

  test('saves an answer and permits changing it before submission', async () => {
    const started = await start();

    const first = await answer(started.id, 1, 'A');
    const changed = await answer(started.id, 1, 'C');

    expect(first.status).toBe(200);
    expect(changed.status).toBe(200);

    const response = await request(app)
      .get(`/api/quizzes/attempts/${started.id}`)
      .set(as(student));

    expect(response.body.attempt.questions[0].selectedOption).toBe('C');
    expect(JSON.stringify(response.body)).not.toMatch(/correctOption|explanation/);
  });

  test('rejects invalid question IDs and invalid answer options', async () => {
    const started = await start();

    expect((await answer(started.id, 99, 'A')).status).toBe(400);
    expect((await answer(started.id, 1, 'Z')).status).toBe(400);
  });

  test('prevents another student from reading or modifying an attempt', async () => {
    const started = await start();

    const read = await request(app)
      .get(`/api/quizzes/attempts/${started.id}`)
      .set(as(otherStudent));
    const save = await answer(started.id, 1, 'C', otherStudent);
    const finish = await submit(started.id, otherStudent);

    expect(read.status).toBe(404);
    expect(save.status).toBe(404);
    expect(finish.status).toBe(404);
  });

  test('grades server-side, reports unanswered questions, and reveals answers only after submission', async () => {
    const started = await start();

    const before = await request(app)
      .get(`/api/quizzes/attempts/${started.id}`)
      .set(as(student));

    expect(before.body.attempt.unansweredQuestionIds).toContain(1);
    expect(JSON.stringify(before.body)).not.toMatch(/correctOption|explanation/);

    await answer(started.id, 1, 'C');
    const response = await submit(started.id);

    expect(response.status).toBe(200);
    expect(response.body.attempt).toMatchObject({
      status: 'Completed',
      score: 1,
      totalQuestions: 1,
      percentage: 100,
    });
    expect(response.body.attempt.submittedAt).toBeTruthy();
    expect(response.body.attempt.questions[0]).toMatchObject({
      selectedOption: 'C',
      correctOption: 'C',
      explanation: 'Two plus two equals four.',
    });
  });

  test('submitting unanswered questions gives no points', async () => {
    const started = await start();
    const response = await submit(started.id);

    expect(response.status).toBe(200);
    expect(response.body.attempt.status).toBe('Completed');
    expect(response.body.attempt.score).toBe(0);
    expect(response.body.attempt.percentage).toBe(0);
    expect(response.body.attempt.unansweredQuestionIds).toContain(1);
  });

  test('does not allow changing answers after submission', async () => {
    const started = await start();
    await answer(started.id, 1, 'C');
    const submitted = await submit(started.id);
    const changed = await answer(started.id, 1, 'A');

    expect(submitted.status).toBe(200);
    expect(changed.status).toBe(409);
    expect(changed.body.error?.code || changed.body.code).toBeTruthy();

    const response = await request(app)
      .get(`/api/quizzes/attempts/${started.id}`)
      .set(as(student));

    expect(response.body.attempt.questions[0].selectedOption).toBe('C');
    expect(response.body.attempt.score).toBe(1);
  });

  test('repeat submission does not change the completed result', async () => {
    const started = await start();
    await answer(started.id, 1, 'C');

    const first = await submit(started.id);
    const second = await submit(started.id);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.attempt.status).toBe('Completed');
    expect(second.body.attempt.score).toBe(first.body.attempt.score);
    expect(second.body.attempt.submittedAt).toBe(first.body.attempt.submittedAt);
  });

  test('requires student authentication for attempt endpoints', async () => {
    const started = await start();

    expect((await request(app).get(`/api/quizzes/attempts/${started.id}`)).status).toBe(401);
    expect((await request(app).patch(`/api/quizzes/attempts/${started.id}/answers`)
      .send({ questionId: 1, selectedOption: 'A' })).status).toBe(401);
    expect((await request(app).post(`/api/quizzes/attempts/${started.id}/submit`)).status).toBe(401);
  });

  test('rejects answer changes after the server-side deadline', async () => {
    const started = await start();

    await Attempt.findByIdAndUpdate(started.id, {
      $set: { expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await answer(started.id, 1, 'C');

    expect(response.status).toBe(409);
    expect(response.body.error?.code || response.body.code).toBeTruthy();

    const saved = await Attempt.findById(started.id);
    expect(saved.answers[0].selectedOption).toBeNull();
    expect(saved.status).toBe('InProgress');
  });

  test('automatically finalizes an attempt when fetched after expiry', async () => {
    const started = await start();

    await answer(started.id, 1, 'C');
    await Attempt.findByIdAndUpdate(started.id, {
      $set: { expiresAt: new Date(Date.now() - 1000) },
    });

    const response = await request(app)
      .get(`/api/quizzes/attempts/${started.id}`)
      .set(as(student));

    expect(response.status).toBe(200);
    expect(response.body.attempt.status).toBe('Completed');
    expect(response.body.attempt.score).toBe(1);
    expect(response.body.attempt.submittedAt).toBeTruthy();
    expect(response.body.attempt.questions[0].correctOption).toBe('C');
  });

  test('caps the attempt deadline at the quiz availability end', async () => {
    const now = Date.now();
    quiz.availableUntil = new Date(now + 2 * 60 * 1000);
    await quiz.save();

    const started = await start();

    expect(new Date(started.expiresAt).getTime())
      .toBeLessThanOrEqual(new Date(quiz.availableUntil).getTime());
    expect(new Date(started.expiresAt).getTime())
      .toBeGreaterThan(Date.now());
  });});
