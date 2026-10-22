/**
 * #44 – unavailable quizzes and questions (SRS REQ-QZ-18, STP TC-QZ-18)
 * "Inform the user when a quiz, question or attempt is unavailable; show no details."
 * Attempts do not exist yet (VedhV's #17/#18); they will use AppError.unavailable('Attempt').
 */
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const AppError = require('../src/utils/AppError');
const { Quiz } = require('../src/models/Quiz');
const { Question } = require('../src/models/Question');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const OWNER_ID = new mongoose.Types.ObjectId().toString();
const HOUR = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * HOUR).toISOString();
const as = (user) => ({ Authorization: `Bearer ${user.token}` });
const unknownId = () => new mongoose.Types.ObjectId().toString();

let owner;
let otherFaculty;
let student;
let qids;

const validQuiz = (overrides = {}) => ({
  title: 'Secret quiz title',
  description: 'Secret description',
  timeLimitMinutes: 30,
  availableFrom: inHours(1),
  availableUntil: inHours(48),
  questionIds: qids,
  ...overrides,
});
const createQuiz = (body = validQuiz()) => request(app).post('/api/quizzes').set(as(owner)).send(body);

beforeAll(startDB);
beforeEach(async () => {
  owner = await tokenFor('Faculty', OWNER_ID);
  otherFaculty = await tokenFor('Faculty');
  student = await tokenFor('Student');
  const docs = await Question.insertMany(
    [1, 2, 3].map((i) => ({
      text: `Question ${i}?`,
      options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`],
      correctOption: 'B',
      topic: 'Testing',
      difficulty: 'Easy',
      explanation: `Because ${i}`,
      owner: OWNER_ID,
    }))
  );
  qids = docs.map((d) => d.id);
});
afterEach(clearDB);
afterAll(stopDB);

describe('AppError.unavailable', () => {
  test.each(['Quiz', 'Question', 'Attempt'])('%s -> 404 "%s unavailable" and nothing else', (name) => {
    const err = AppError.unavailable(name);
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe(`${name} unavailable`);
    expect(err.field).toBeUndefined();
  });
});

describe('REQ-QZ-18 – unknown or malformed ids give the same plain "unavailable" response', () => {
  const quizCalls = [
    ['GET quiz', (id) => request(app).get(`/api/quizzes/${id}`)],
    ['PUT quiz', (id) => request(app).put(`/api/quizzes/${id}`).send({ title: 'X' })],
    ['publish quiz', (id) => request(app).post(`/api/quizzes/${id}/publish`)],
  ];
  const questionCalls = [
    ['GET question', (id) => request(app).get(`/api/questions/${id}`)],
    ['PUT question', (id) => request(app).put(`/api/questions/${id}`).send({ topic: 'X' })],
    ['DELETE question', (id) => request(app).delete(`/api/questions/${id}`)],
  ];

  describe.each([
    ['Quiz', quizCalls],
    ['Question', questionCalls],
  ])('%s routes', (resource, calls) => {
    test.each(calls.flatMap(([name, call]) => [
      [`${name} – unknown id`, call, unknownId],
      [`${name} – malformed id`, call, () => 'not-an-id'],
    ]))('%s', async (_name, call, makeId) => {
      const res = await call(makeId()).set(as(owner));
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: `${resource} unavailable` } });
      expect(JSON.stringify(res.body)).not.toMatch(/stack|mongoose|ObjectId|Cast/i);
    });
  });

  test('an unknown id looks the same to another Faculty member (nothing to probe)', async () => {
    const res = await request(app).get(`/api/quizzes/${unknownId()}`).set(as(otherFaculty));
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Quiz unavailable');
  });

  test('without login the answer is 401, never "unavailable" (existence is not revealed)', async () => {
    expect((await request(app).get(`/api/quizzes/${unknownId()}`)).status).toBe(401);
    expect((await request(app).get(`/api/questions/${unknownId()}`)).status).toBe(401);
  });

  test('an unknown route is a plain 404 without details', async () => {
    const res = await request(app).get('/api/attempts/anything').set(as(owner));
    expect(res.status).toBe(404);
    expect(Object.keys(res.body)).toEqual(['error']);
  });
});

describe('REQ-QZ-18 – protected details are not disclosed', () => {
  let quizId;
  beforeEach(async () => {
    quizId = (await createQuiz()).body.id;
  });

  test('a Student or another Faculty member gets only "Access denied" – no title, owner or questions', async () => {
    for (const user of [student, otherFaculty]) {
      const res = await request(app).get(`/api/quizzes/${quizId}`).set(as(user));
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
      expect(JSON.stringify(res.body)).not.toMatch(/Secret|Question 1|owner/);
    }
  });

  test('a Student asking for a question gets only "Access denied"', async () => {
    const res = await request(app).get(`/api/questions/${qids[0]}`).set(as(student));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
  });
});

describe('REQ-QZ-18 – failed requests leave no partial changes', () => {
  test('creating a quiz with a deleted question saves nothing', async () => {
    await Question.findByIdAndDelete(qids[1]);
    const res = await createQuiz();
    expect(res.status).toBe(404);
    expect(res.body.error.field).toBe('questionIds');
    expect(await Quiz.countDocuments()).toBe(0);
  });

  test('editing a Draft to use a deleted question changes nothing', async () => {
    const quizId = (await createQuiz()).body.id;
    const gone = unknownId();
    const res = await request(app)
      .put(`/api/quizzes/${quizId}`)
      .set(as(owner))
      .send({ title: 'Changed', questionIds: [qids[0], gone] });
    expect(res.status).toBe(404);
    const saved = await Quiz.findById(quizId).lean();
    expect(saved.title).toBe('Secret quiz title');
    expect(saved.questionIds.map(String)).toEqual(qids);
  });

  test('publishing after a selected question was deleted keeps the quiz a Draft', async () => {
    const quizId = (await createQuiz()).body.id;
    await Question.findByIdAndDelete(qids[2]);
    const res = await request(app).post(`/api/quizzes/${quizId}/publish`).set(as(owner));
    expect(res.status).toBe(404);
    const saved = await Quiz.findById(quizId).lean();
    expect(saved.status).toBe('Draft');
    expect(saved.questions).toHaveLength(0);
    expect(saved.publishedAt).toBeFalsy();
  });

  test('a published quiz keeps its own copies when a bank question is later deleted', async () => {
    const quizId = (await createQuiz()).body.id;
    expect((await request(app).post(`/api/quizzes/${quizId}/publish`).set(as(owner))).status).toBe(200);
    await Question.findByIdAndDelete(qids[0]);
    const res = await request(app).get(`/api/quizzes/${quizId}`).set(as(owner));
    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(3);
    expect(res.body.questions[0].text).toBe('Question 1?');
  });

  test('a Draft shows a deleted question as unavailable, without its text', async () => {
    const quizId = (await createQuiz()).body.id;
    await Question.findByIdAndDelete(qids[0]);
    const res = await request(app).get(`/api/quizzes/${quizId}`).set(as(owner));
    expect(res.status).toBe(200);
    expect(res.body.questions[0]).toEqual({ id: qids[0], position: 1, unavailable: true });
  });
});
