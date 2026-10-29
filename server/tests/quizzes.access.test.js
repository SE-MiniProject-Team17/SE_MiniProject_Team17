/**
 * #43 – Role- and ownership-based access to quizzes, attempts and results
 * SRS REQ-QZ-17 (only the quiz owner views submissions), SEC-QZ-03; depends on A05 (access-control
 * middleware) and V13 (results and submitted attempts).
 *
 * This file records the positive AND negative authorization checks for every quiz-related endpoint
 * in one place, at the API layer (direct requests, no UI). A rejected request must not change any
 * data and must not reveal protected details (answer keys, scores, another student's answers).
 */
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
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
const ACCESS_DENIED = { error: { code: 'ACCESS_DENIED', message: 'Access denied' } };
const ATTEMPT_UNAVAILABLE = { error: { code: 'NOT_FOUND', message: 'Attempt unavailable' } };

let owner;
let otherFaculty;
let student;
let otherStudent;
let admin;
let quiz; // Published and open, owned by `owner`
let draft; // Draft, owned by `owner`

async function makeQuiz(status, title) {
  const questions = await Question.insertMany([
    { text: 'What is 2 + 2?', options: ['1', '3', '4', '5'], correctOption: 'C', topic: 'Maths', difficulty: 'Easy', owner: owner.id },
    { text: 'Capital of France?', options: ['Paris', 'Rome', 'Oslo', 'Bern'], correctOption: 'A', topic: 'Geography', difficulty: 'Easy', owner: owner.id },
  ]);
  return Quiz.create({
    title,
    timeLimitMinutes: 10,
    availableFrom: new Date(Date.now() - HOUR),
    availableUntil: new Date(Date.now() + HOUR),
    questionIds: questions.map((q) => q._id),
    status,
    publishedAt: status === 'Published' ? new Date() : null,
    questions: status === 'Published'
      ? questions.map((q, i) => ({
        sourceQuestion: q._id,
        position: i + 1,
        text: q.text,
        options: q.options,
        correctOption: q.correctOption,
        topic: q.topic,
        difficulty: q.difficulty,
      }))
      : [],
    owner: owner.id,
  });
}

/** The Student starts the open quiz; returns the attempt id. */
async function startAttempt(user = student) {
  const res = await request(app).post(`/api/quizzes/${quiz.id}/attempts`).set(as(user));
  expect(res.status).toBe(201);
  return res.body.attempt.id;
}

/** The Student answers question 1 correctly, leaves question 2 empty and submits (score 1/2). */
async function completedAttempt(user = student) {
  const id = await startAttempt(user);
  await request(app).patch(`/api/quizzes/attempts/${id}/answers`).set(as(user))
    .send({ questionId: 1, selectedOption: 'C' });
  const res = await request(app).post(`/api/quizzes/attempts/${id}/submit`).set(as(user));
  expect(res.status).toBe(200);
  return id;
}

/** Every quiz, attempt and result endpoint (method, path). */
function allEndpoints(attemptId) {
  return [
    ['get', '/api/quizzes/available'],
    ['post', `/api/quizzes/${quiz.id}/attempts`],
    ['get', `/api/quizzes/attempts/${attemptId}`],
    ['patch', `/api/quizzes/attempts/${attemptId}/answers`],
    ['post', `/api/quizzes/attempts/${attemptId}/submit`],
    ['post', '/api/quizzes'],
    ['get', '/api/quizzes/mine'],
    ['get', `/api/quizzes/${quiz.id}`],
    ['put', `/api/quizzes/${draft.id}`],
    ['post', `/api/quizzes/${draft.id}/publish`],
    ['get', `/api/quizzes/${quiz.id}/submissions`],
    ['delete', `/api/quizzes/${draft.id}`],
    ['get', '/api/performance/mine'],
    ['get', '/api/performance/topics'],
  ];
}

/** Sends each request and lists every one that did not get `expected` (empty list = all good). */
async function wrongStatuses(endpoints, expected, headers = {}) {
  const wrong = [];
  for (const [method, path] of endpoints) {
    const res = await request(app)[method](path).set(headers).send({ questionId: 1, selectedOption: 'A' });
    if (res.status !== expected) wrong.push(`${method.toUpperCase()} ${path} -> ${res.status}`);
  }
  return wrong;
}

/** The parts of an attempt a rejected request must not change. */
async function attemptState(id) {
  const a = await Attempt.findById(id).lean();
  return {
    status: a.status,
    score: a.score,
    percentage: a.percentage,
    submittedAt: a.submittedAt,
    answers: a.answers.map(({ questionId, selectedOption }) => ({ questionId, selectedOption })),
  };
}

/** The parts of a quiz a rejected request must not change. */
async function quizState(id) {
  const q = await Quiz.findById(id).lean();
  return q && { title: q.title, status: q.status, questionCount: q.questions.length };
}

beforeAll(async () => {
  await startDB();
  await QuizAttemptClaim.init();
});

beforeEach(async () => {
  owner = await tokenFor('Faculty');
  otherFaculty = await tokenFor('Faculty');
  student = await tokenFor('Student');
  otherStudent = await tokenFor('Student');
  admin = await tokenFor('Admin');
  quiz = await makeQuiz('Published', 'Open quiz');
  draft = await makeQuiz('Draft', 'Draft quiz');
});

afterEach(clearDB);
afterAll(stopDB);

describe('#43 positive – each role can use what the SRS allows', () => {
  test('a Student lists published quizzes without seeing any answer key or Draft', async () => {
    const res = await request(app).get('/api/quizzes/available').set(as(student));

    expect(res.status).toBe(200);
    expect(res.body.quizzes.map((q) => q.id)).toEqual([quiz.id]);
    expect(JSON.stringify(res.body)).not.toMatch(/correctOption|explanation/);
  });

  test('a Student takes a quiz, then reads their own result with score and correct answers', async () => {
    const id = await startAttempt();
    const inProgress = await request(app).get(`/api/quizzes/attempts/${id}`).set(as(student));
    expect(inProgress.status).toBe(200);
    expect(JSON.stringify(inProgress.body)).not.toMatch(/correctOption/); // no answer key before submitting

    await request(app).patch(`/api/quizzes/attempts/${id}/answers`).set(as(student))
      .send({ questionId: 1, selectedOption: 'C' });
    await request(app).post(`/api/quizzes/attempts/${id}/submit`).set(as(student));
    const result = await request(app).get(`/api/quizzes/attempts/${id}`).set(as(student));

    expect(result.status).toBe(200);
    expect(result.body.attempt).toMatchObject({ status: 'Completed', score: 1, totalQuestions: 2, percentage: 50 });
    expect(result.body.attempt.questions.map((q) => q.correctOption)).toEqual(['C', 'A']);
  });

  test("a Student's performance history contains only their own results", async () => {
    const mine = await completedAttempt(student);
    const theirs = await completedAttempt(otherStudent);

    const res = await request(app).get('/api/performance/mine').set(as(student));

    expect(res.status).toBe(200);
    expect(res.body.attempts.map((a) => a.id)).toEqual([mine]);
    expect(JSON.stringify(res.body)).not.toContain(theirs);
  });

  test('the quiz owner reads their quiz with its answer key and the submissions on it', async () => {
    await completedAttempt();

    const view = await request(app).get(`/api/quizzes/${quiz.id}`).set(as(owner));
    const subs = await request(app).get(`/api/quizzes/${quiz.id}/submissions`).set(as(owner));

    expect(view.status).toBe(200);
    expect(JSON.stringify(view.body)).toMatch(/correctOption/);
    expect(subs.status).toBe(200);
    expect(subs.body.submissions).toHaveLength(1);
    expect(subs.body.submissions[0]).toMatchObject({ score: 1, totalQuestions: 2, percentage: 50 });
  });
});

describe('#43 negative – Students cannot reach Faculty-only quiz data', () => {
  test("a Student cannot read a quiz's answer key, its submissions or the Faculty quiz list", async () => {
    await completedAttempt();

    for (const path of [`/api/quizzes/${quiz.id}`, `/api/quizzes/${quiz.id}/submissions`, '/api/quizzes/mine']) {
      const res = await request(app).get(path).set(as(student));
      expect(res.status).toBe(403);
      expect(res.body).toEqual(ACCESS_DENIED); // nothing else in the body: no questions, no scores
    }
  });

  test('a Student cannot create, edit, publish or delete quizzes, and nothing changes', async () => {
    const before = { quiz: await quizState(quiz.id), draft: await quizState(draft.id), count: await Quiz.countDocuments() };

    const results = [
      await request(app).post('/api/quizzes').set(as(student)).send({ title: 'Mine now', timeLimitMinutes: 5 }),
      await request(app).put(`/api/quizzes/${draft.id}`).set(as(student)).send({ title: 'Changed' }),
      await request(app).post(`/api/quizzes/${draft.id}/publish`).set(as(student)),
      await request(app).delete(`/api/quizzes/${quiz.id}`).set(as(student)),
    ];

    expect(results.map((r) => r.status)).toEqual([403, 403, 403, 403]);
    expect({ quiz: await quizState(quiz.id), draft: await quizState(draft.id), count: await Quiz.countDocuments() })
      .toEqual(before);
  });

  test('a Student cannot start a Draft quiz: it is "Quiz unavailable" and no attempt is created', async () => {
    const res = await request(app).post(`/api/quizzes/${draft.id}/attempts`).set(as(student));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Quiz unavailable' } });
    expect(await Attempt.countDocuments()).toBe(0);
  });
});

describe("#43 negative – a Student cannot reach another Student's attempt or result", () => {
  test("another Student's result looks exactly like a missing attempt (nothing is revealed)", async () => {
    const id = await completedAttempt(student);
    const missing = new mongoose.Types.ObjectId().toString();

    const other = await request(app).get(`/api/quizzes/attempts/${id}`).set(as(otherStudent));
    const none = await request(app).get(`/api/quizzes/attempts/${missing}`).set(as(otherStudent));

    expect(other.status).toBe(404);
    expect(other.body).toEqual(ATTEMPT_UNAVAILABLE);
    expect(none.status).toBe(other.status);
    expect(none.body).toEqual(other.body); // same answer, so it does not even confirm the attempt exists
  });

  test("another Student cannot answer or submit someone else's attempt, and it stays unchanged", async () => {
    const id = await startAttempt(student);
    await request(app).patch(`/api/quizzes/attempts/${id}/answers`).set(as(student))
      .send({ questionId: 1, selectedOption: 'C' });
    const before = await attemptState(id);

    const save = await request(app).patch(`/api/quizzes/attempts/${id}/answers`).set(as(otherStudent))
      .send({ questionId: 1, selectedOption: 'A' });
    const submit = await request(app).post(`/api/quizzes/attempts/${id}/submit`).set(as(otherStudent));

    expect(save.status).toBe(404);
    expect(submit.status).toBe(404);
    expect(save.body).toEqual(ATTEMPT_UNAVAILABLE);
    expect(submit.body).toEqual(ATTEMPT_UNAVAILABLE);
    expect(await attemptState(id)).toEqual(before);

    // The real owner is not affected and can still finish normally.
    const own = await request(app).post(`/api/quizzes/attempts/${id}/submit`).set(as(student));
    expect(own.body.attempt).toMatchObject({ status: 'Completed', score: 1 });
  });
});

describe('#43 negative – Faculty and Admin are limited to what they own', () => {
  test("even the quiz owner cannot open, answer or submit a Student's attempt", async () => {
    const id = await startAttempt();
    const before = await attemptState(id);

    const results = [
      await request(app).get(`/api/quizzes/attempts/${id}`).set(as(owner)),
      await request(app).patch(`/api/quizzes/attempts/${id}/answers`).set(as(owner)).send({ questionId: 1, selectedOption: 'A' }),
      await request(app).post(`/api/quizzes/attempts/${id}/submit`).set(as(owner)),
    ];

    expect(results.map((r) => r.status)).toEqual([403, 403, 403]);
    results.forEach((r) => expect(r.body).toEqual(ACCESS_DENIED));
    expect(await attemptState(id)).toEqual(before);
  });

  test('another Faculty member cannot read, see submissions of, edit, publish or delete a quiz they do not own', async () => {
    await completedAttempt();
    const before = { quiz: await quizState(quiz.id), draft: await quizState(draft.id) };

    const results = [
      await request(app).get(`/api/quizzes/${quiz.id}`).set(as(otherFaculty)),
      await request(app).get(`/api/quizzes/${quiz.id}/submissions`).set(as(otherFaculty)),
      await request(app).put(`/api/quizzes/${draft.id}`).set(as(otherFaculty)).send({ title: 'Taken over' }),
      await request(app).post(`/api/quizzes/${draft.id}/publish`).set(as(otherFaculty)),
      await request(app).delete(`/api/quizzes/${draft.id}`).set(as(otherFaculty)),
    ];

    expect(results.map((r) => r.status)).toEqual([403, 403, 403, 403, 403]);
    results.forEach((r) => expect(r.body).toEqual(ACCESS_DENIED));
    expect({ quiz: await quizState(quiz.id), draft: await quizState(draft.id) }).toEqual(before);

    // Their own quiz list does not include it either.
    const mine = await request(app).get('/api/quizzes/mine').set(as(otherFaculty));
    expect(mine.status).toBe(200);
    expect(mine.body.quizzes).toEqual([]);
  });

  test("Faculty cannot read a Student's performance results", async () => {
    await completedAttempt();

    for (const path of ['/api/performance/mine', '/api/performance/topics']) {
      const res = await request(app).get(path).set(as(owner));
      expect(res.status).toBe(403);
      expect(res.body).toEqual(ACCESS_DENIED);
    }
  });

  test('an Admin has no access to any quiz, attempt or result endpoint, and nothing changes', async () => {
    const id = await startAttempt();
    const before = { attempt: await attemptState(id), draft: await quizState(draft.id) };

    expect(await wrongStatuses(allEndpoints(id), 403, as(admin))).toEqual([]);
    expect({ attempt: await attemptState(id), draft: await quizState(draft.id) }).toEqual(before);
  });
});

describe('#43 negative – requests without a valid login', () => {
  test('every quiz, attempt and result endpoint needs a login (401), and nothing changes', async () => {
    const id = await startAttempt();
    const before = { attempt: await attemptState(id), draft: await quizState(draft.id) };

    expect(await wrongStatuses(allEndpoints(id), 401)).toEqual([]);
    expect({ attempt: await attemptState(id), draft: await quizState(draft.id) }).toEqual(before);
  });

  test('a forged token (wrong signature) is refused on every endpoint', async () => {
    const id = await startAttempt();
    const forged = jwt.sign({ sub: owner.id, role: 'Faculty', jti: owner.tokenId }, 'not-the-server-secret');

    expect(await wrongStatuses(allEndpoints(id), 401, { Authorization: `Bearer ${forged}` })).toEqual([]);
  });
});
