/**
 * #16 – Quiz creation and Draft management
 * STP: TC-QZ-01 (create Draft), TC-QZ-02 (validation failures), TC-QZ-03 (boundaries),
 *      TC-QZ-04 (publish; copies independent of bank edits), TC-QZ-05 (edit Draft only – the
 *      "after an attempt started" part is #42), plus Faculty-only / owner-only access (REQ-QZ-17).
 */
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { Quiz } = require('../src/models/Quiz');
const { Question } = require('../src/models/Question');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const OWNER_ID = new mongoose.Types.ObjectId().toString();
let owner;
let otherFaculty;
let student;
let qids; // ids of 3 questions in the bank

const HOUR = 60 * 60 * 1000;
const inHours = (h) => new Date(Date.now() + h * HOUR).toISOString();

const makeQuestion = (i) => ({
  text: `Question ${i}?`,
  options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`],
  correctOption: 'C',
  topic: 'Testing',
  difficulty: 'Easy',
  explanation: `Because ${i}`,
  owner: OWNER_ID,
});

const validQuiz = (overrides = {}) => ({
  title: 'Unit 1 test',
  description: 'Covers chapter 1',
  timeLimitMinutes: 30,
  availableFrom: inHours(1),
  availableUntil: inHours(48),
  questionIds: qids,
  ...overrides,
});

const as = (user) => ({ Authorization: `Bearer ${user.token}` });
const create = (body, user = owner) => request(app).post('/api/quizzes').set(as(user)).send(body);

beforeAll(startDB);
beforeEach(async () => {
  owner = await tokenFor('Faculty', OWNER_ID);
  otherFaculty = await tokenFor('Faculty');
  student = await tokenFor('Student');
  const docs = await Question.insertMany([1, 2, 3].map(makeQuestion));
  qids = docs.map((d) => d.id);
});
afterEach(clearDB);
afterAll(stopDB);

describe('TC-QZ-01 – Faculty creates a quiz, saved as Draft', () => {
  test('returns 201 { id, status: "Draft" } and records the owner', async () => {
    const res = await create(validQuiz());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), status: 'Draft' });
    const saved = await Quiz.findById(res.body.id).lean();
    expect(saved.owner.toString()).toBe(OWNER_ID);
    expect(saved.questionIds.map(String)).toEqual(qids);
    expect(saved.questions).toEqual([]); // nothing copied until publication
  });

  test('the client cannot set the owner or the status', async () => {
    const res = await create(validQuiz({ owner: otherFaculty.id, status: 'Published' }));
    const saved = await Quiz.findById(res.body.id).lean();
    expect(saved.owner.toString()).toBe(OWNER_ID);
    expect(saved.status).toBe('Draft');
  });

  test('the quiz appears in the owner\'s "My quizzes" list only', async () => {
    await create(validQuiz());
    const mine = await request(app).get('/api/quizzes/mine').set(as(owner));
    expect(mine.status).toBe(200);
    expect(mine.body.quizzes).toHaveLength(1);
    expect(mine.body.quizzes[0]).toEqual(
      expect.objectContaining({ title: 'Unit 1 test', status: 'Draft', questionCount: 3, timeLimitMinutes: 30 })
    );
    const theirs = await request(app).get('/api/quizzes/mine').set(as(otherFaculty));
    expect(theirs.body.quizzes).toEqual([]);
  });
});

describe('TC-QZ-02 – invalid quizzes are rejected with the field and rule named', () => {
  test.each([
    ['title', { title: '' }, 'required'],
    ['title', { title: 't'.repeat(101) }, '100'],
    ['description', { description: 'd'.repeat(301) }, '300'],
    ['timeLimitMinutes', { timeLimitMinutes: 4 }, 'between 5 and 180'],
    ['timeLimitMinutes', { timeLimitMinutes: 181 }, 'between 5 and 180'],
    ['timeLimitMinutes', { timeLimitMinutes: 'abc' }, 'between 5 and 180'],
    ['availableFrom', { availableFrom: 'not a date' }, 'valid date'],
    ['availableUntil', { availableUntil: undefined }, 'required'],
    ['questionIds', { questionIds: [] }, 'between 1 and 50'],
  ])('%s: %o', async (field, override, rule) => {
    const body = validQuiz(override);
    if (override.availableUntil === undefined && 'availableUntil' in override) delete body.availableUntil;
    const res = await create(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe(field);
    expect(res.body.error.message).toContain(rule);
    expect(await Quiz.countDocuments()).toBe(0);
  });

  test('end equal to start is rejected', async () => {
    const t = inHours(5);
    const res = await create(validQuiz({ availableFrom: t, availableUntil: t }));
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('availableUntil');
    expect(res.body.error.message).toContain('later than');
  });

  test('end before start is rejected', async () => {
    const res = await create(validQuiz({ availableFrom: inHours(10), availableUntil: inHours(5) }));
    expect(res.body.error.field).toBe('availableUntil');
  });

  test('more than 50 questions is rejected', async () => {
    const ids = Array.from({ length: 51 }, () => new mongoose.Types.ObjectId().toString());
    const res = await create(validQuiz({ questionIds: ids }));
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('questionIds');
    expect(res.body.error.message).toContain('between 1 and 50');
  });

  test('the same question twice is rejected', async () => {
    const res = await create(validQuiz({ questionIds: [qids[0], qids[0]] }));
    expect(res.body.error.field).toBe('questionIds');
    expect(res.body.error.message).toContain('twice');
  });

  test('a question that is not in the bank gives 404 and nothing is saved', async () => {
    const res = await create(validQuiz({ questionIds: [qids[0], new mongoose.Types.ObjectId().toString()] }));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual(
      expect.objectContaining({ code: 'NOT_FOUND', field: 'questionIds', message: expect.stringContaining('unavailable') })
    );
    expect(await Quiz.countDocuments()).toBe(0);
  });
});

describe('TC-QZ-03 – boundary values are accepted', () => {
  test('1 question, 5 minutes, title of 100 and description of 300 characters', async () => {
    const res = await create(
      validQuiz({ questionIds: [qids[0]], timeLimitMinutes: 5, title: 't'.repeat(100), description: 'd'.repeat(300) })
    );
    expect(res.status).toBe(201);
  });

  test('50 questions and 180 minutes', async () => {
    const more = await Question.insertMany(Array.from({ length: 47 }, (_, i) => makeQuestion(i + 10)));
    const ids = [...qids, ...more.map((d) => d.id)];
    expect(ids).toHaveLength(50);
    const res = await create(validQuiz({ questionIds: ids, timeLimitMinutes: 180 }));
    expect(res.status).toBe(201);
  });
});

describe('TC-QZ-05 (Draft part) – the owner edits a Draft', () => {
  let quizId;
  beforeEach(async () => {
    quizId = (await create(validQuiz())).body.id;
  });

  test('changing only the title works and keeps everything else', async () => {
    const res = await request(app).put(`/api/quizzes/${quizId}`).set(as(owner)).send({ title: 'Unit 1 – revised' });
    expect(res.status).toBe(200);
    const saved = await Quiz.findById(quizId).lean();
    expect(saved.title).toBe('Unit 1 – revised');
    expect(saved.timeLimitMinutes).toBe(30);
    expect(saved.questionIds.map(String)).toEqual(qids);
  });

  test('changing the selected questions works', async () => {
    const res = await request(app).put(`/api/quizzes/${quizId}`).set(as(owner)).send({ questionIds: [qids[2]] });
    expect(res.status).toBe(200);
    expect((await Quiz.findById(quizId).lean()).questionIds.map(String)).toEqual([qids[2]]);
  });

  test('invalid changes are rejected with the same rules and nothing changes', async () => {
    const res = await request(app).put(`/api/quizzes/${quizId}`).set(as(owner)).send({ timeLimitMinutes: 200 });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('timeLimitMinutes');
    expect((await Quiz.findById(quizId).lean()).timeLimitMinutes).toBe(30);
  });

  test('the owner can view the Draft with its selected questions', async () => {
    const res = await request(app).get(`/api/quizzes/${quizId}`).set(as(owner));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Draft');
    expect(res.body.questions.map((q) => q.id)).toEqual(qids);
    expect(res.body.questions[0]).toEqual(expect.objectContaining({ position: 1, text: 'Question 1?' }));
  });
});

describe('TC-QZ-04 – publish a quiz; the copies do not change when the bank changes', () => {
  let quizId;
  beforeEach(async () => {
    quizId = (await create(validQuiz())).body.id;
  });

  const publish = (user = owner) => request(app).post(`/api/quizzes/${quizId}/publish`).set(as(user));

  test('publishing returns 200 { status: "Published" } and copies the questions in order', async () => {
    const res = await publish();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: quizId, status: 'Published' });
    const saved = await Quiz.findById(quizId).lean();
    expect(saved.publishedAt).not.toBeNull();
    expect(saved.questions).toHaveLength(3);
    expect(saved.questions[0]).toEqual(
      expect.objectContaining({ position: 1, text: 'Question 1?', options: ['a1', 'b1', 'c1', 'd1'], correctOption: 'C', explanation: 'Because 1' })
    );
  });

  test('editing or removing bank questions afterwards does not change the published quiz', async () => {
    await publish();
    await Question.updateOne({ _id: qids[0] }, { text: 'CHANGED in the bank' });
    await Question.deleteOne({ _id: qids[1] });
    const res = await request(app).get(`/api/quizzes/${quizId}`).set(as(owner));
    expect(res.body.questions.map((q) => q.text)).toEqual(['Question 1?', 'Question 2?', 'Question 3?']);
  });

  test('a published quiz cannot be edited or published again (409 QUIZ_NOT_DRAFT)', async () => {
    await publish();
    const edit = await request(app).put(`/api/quizzes/${quizId}`).set(as(owner)).send({ title: 'New' });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('QUIZ_NOT_DRAFT');
    expect((await publish()).status).toBe(409);
  });

  test('publishing is refused when the availability end has already passed', async () => {
    const old = await create(validQuiz({ availableFrom: inHours(-48), availableUntil: inHours(-1) }));
    const res = await request(app).post(`/api/quizzes/${old.body.id}/publish`).set(as(owner));
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('availableUntil');
    expect((await Quiz.findById(old.body.id).lean()).status).toBe('Draft');
  });

  test('publishing is refused if a selected question was removed from the bank meanwhile', async () => {
    await Question.deleteOne({ _id: qids[1] });
    const res = await publish();
    expect(res.status).toBe(404);
    expect(res.body.error.field).toBe('questionIds');
    expect((await Quiz.findById(quizId).lean()).status).toBe('Draft');
  });
});

describe('REQ-QZ-17 / SEC-QZ-01 – only Faculty, and only the owner, manage a quiz', () => {
  let quizId;
  beforeEach(async () => {
    quizId = (await create(validQuiz())).body.id;
  });

  test('a Student cannot create, view, edit or publish quizzes (403)', async () => {
    expect((await create(validQuiz(), student)).status).toBe(403);
    expect((await request(app).get('/api/quizzes/mine').set(as(student))).status).toBe(403);
    expect((await request(app).get(`/api/quizzes/${quizId}`).set(as(student))).status).toBe(403);
    expect((await request(app).put(`/api/quizzes/${quizId}`).set(as(student)).send({ title: 'X' })).status).toBe(403);
    expect((await request(app).post(`/api/quizzes/${quizId}/publish`).set(as(student))).status).toBe(403);
  });

  test('another Faculty member gets "Access denied" and nothing changes', async () => {
    for (const res of [
      await request(app).get(`/api/quizzes/${quizId}`).set(as(otherFaculty)),
      await request(app).put(`/api/quizzes/${quizId}`).set(as(otherFaculty)).send({ title: 'Hacked' }),
      await request(app).post(`/api/quizzes/${quizId}/publish`).set(as(otherFaculty)),
    ]) {
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({ code: 'ACCESS_DENIED', message: 'Access denied' });
    }
    const saved = await Quiz.findById(quizId).lean();
    expect(saved.title).toBe('Unit 1 test');
    expect(saved.status).toBe('Draft');
  });

  test('no login gets 401', async () => {
    expect((await request(app).post('/api/quizzes').send(validQuiz())).status).toBe(401);
  });

  test.each([
    ['unknown id', () => new mongoose.Types.ObjectId().toString()],
    ['malformed id', () => 'nope'],
  ])('%s gives 404 "Quiz unavailable"', async (_n, makeId) => {
    const res = await request(app).get(`/api/quizzes/${makeId()}`).set(as(owner));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Quiz unavailable' });
  });
});
