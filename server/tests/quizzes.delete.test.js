/**
 * #42 – quiz deletion and the "attempt started" rule (SRS REQ-QZ-05, STP TC-QZ-05)
 * The Attempt model belongs to the attempts module (#18/#19). Until it is merged, these tests
 * register a minimal stand-in with the same name and the same `quiz` field.
 */
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { Quiz } = require('../src/models/Quiz');
const { Question } = require('../src/models/Question');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const Attempt =
  mongoose.models.Attempt ||
  mongoose.model(
    'Attempt',
    new mongoose.Schema({
      student: { type: mongoose.Schema.Types.ObjectId, required: true },
      quiz: { type: mongoose.Schema.Types.ObjectId, required: true },
    })
  );

const OWNER_ID = new mongoose.Types.ObjectId().toString();
const HOUR = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * HOUR).toISOString();
const as = (user) => ({ Authorization: `Bearer ${user.token}` });

let owner;
let otherFaculty;
let student;
let qids;

const validQuiz = () => ({
  title: 'Unit 1 test',
  description: '',
  timeLimitMinutes: 30,
  availableFrom: inHours(1),
  availableUntil: inHours(48),
  questionIds: qids,
});
const createQuiz = async () => (await request(app).post('/api/quizzes').set(as(owner)).send(validQuiz())).body.id;
const publish = (id) => request(app).post(`/api/quizzes/${id}/publish`).set(as(owner));
const remove = (id, user = owner) => request(app).delete(`/api/quizzes/${id}`).set(as(user));

beforeAll(startDB);
beforeEach(async () => {
  owner = await tokenFor('Faculty', OWNER_ID);
  otherFaculty = await tokenFor('Faculty');
  student = await tokenFor('Student');
  const docs = await Question.insertMany(
    [1, 2].map((i) => ({
      text: `Question ${i}?`,
      options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`],
      correctOption: 'A',
      topic: 'Testing',
      difficulty: 'Easy',
      owner: OWNER_ID,
    }))
  );
  qids = docs.map((d) => d.id);
});
afterEach(clearDB);
afterAll(stopDB);

describe('TC-QZ-05 (deletion part) – the owner deletes a quiz', () => {
  test('a Draft quiz is deleted (204) and is then unavailable', async () => {
    const id = await createQuiz();
    expect((await remove(id)).status).toBe(204);
    expect(await Quiz.findById(id)).toBeNull();
    const res = await request(app).get(`/api/quizzes/${id}`).set(as(owner));
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Quiz unavailable');
  });

  test('a published quiz with no attempts can be deleted', async () => {
    const id = await createQuiz();
    expect((await publish(id)).status).toBe(200);
    expect((await remove(id)).status).toBe(204);
    expect(await Quiz.countDocuments()).toBe(0);
  });

  test('deleting a quiz does not delete the questions in the bank', async () => {
    const id = await createQuiz();
    await remove(id);
    expect(await Question.countDocuments()).toBe(2);
  });

  test('the deleted quiz disappears from "My quizzes"', async () => {
    const id = await createQuiz();
    await remove(id);
    const res = await request(app).get('/api/quizzes/mine').set(as(owner));
    expect(res.body.quizzes).toEqual([]);
  });
});

describe('REQ-QZ-05 – deletion and editing are refused once an attempt has started', () => {
  let id;
  beforeEach(async () => {
    id = await createQuiz();
    await publish(id);
    await Attempt.create({ student: new mongoose.Types.ObjectId(), quiz: id });
  });

  test('delete is refused with 409 QUIZ_HAS_ATTEMPTS and the quiz is unchanged', async () => {
    const res = await remove(id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUIZ_HAS_ATTEMPTS');
    const saved = await Quiz.findById(id).lean();
    expect(saved).not.toBeNull();
    expect(saved.status).toBe('Published');
    expect(saved.questions).toHaveLength(2);
  });

  test('editing the published quiz is refused too and nothing changes', async () => {
    const res = await request(app).put(`/api/quizzes/${id}`).set(as(owner)).send({ title: 'Changed' });
    expect(res.status).toBe(409);
    expect((await Quiz.findById(id).lean()).title).toBe('Unit 1 test');
  });

  test('an attempt on another quiz does not block deleting this one', async () => {
    const other = await createQuiz();
    expect((await remove(other)).status).toBe(204);
  });
});

describe('REQ-QZ-17 – only the owner deletes, and unknown quizzes are unavailable', () => {
  test('a Student or another Faculty member gets "Access denied" and the quiz stays', async () => {
    const id = await createQuiz();
    for (const user of [student, otherFaculty]) {
      const res = await remove(id, user);
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: 'ACCESS_DENIED', message: 'Access denied' });
    }
    expect(await Quiz.countDocuments()).toBe(1);
  });

  test('no login gives 401', async () => {
    const id = await createQuiz();
    expect((await request(app).delete(`/api/quizzes/${id}`)).status).toBe(401);
    expect(await Quiz.countDocuments()).toBe(1);
  });

  test.each([
    ['unknown id', () => new mongoose.Types.ObjectId().toString()],
    ['malformed id', () => 'nope'],
  ])('%s gives 404 "Quiz unavailable"', async (_n, makeId) => {
    const res = await remove(makeId());
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Quiz unavailable' });
  });
});
