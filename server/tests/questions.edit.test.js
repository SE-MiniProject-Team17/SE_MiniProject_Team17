/**
 * #15 – Question editing and removal, #41 – owner-only edit/removal access
 * STP: TC-QB-06 (edit own question, valid and invalid), TC-QB-07 (remove own question),
 *      TC-QB-09 (non-owner Faculty cannot edit or remove), TC-QB-08 (Students denied),
 *      plus unavailable questions (UC-QB-03 A3, #44).
 */
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { Question } = require('../src/models/Question');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const OWNER_ID = new mongoose.Types.ObjectId().toString();
let owner;
let otherFaculty;
let student;
let question;

const original = () => ({
  text: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctOption: 'B',
  topic: 'Arithmetic',
  difficulty: 'Easy',
  explanation: '2 + 2 = 4',
});

const url = (id = question.id) => `/api/questions/${id}`;
const as = (user) => ({ Authorization: `Bearer ${user.token}` });
const reload = () => Question.findById(question.id).lean();

beforeAll(startDB);
beforeEach(async () => {
  owner = await tokenFor('Faculty', OWNER_ID);
  otherFaculty = await tokenFor('Faculty');
  student = await tokenFor('Student');
  question = await Question.create({ ...original(), owner: OWNER_ID });
});
afterEach(clearDB);
afterAll(stopDB);

describe('GET /api/questions/:id – view one question', () => {
  test('the owner gets the full question including options and the correct answer', async () => {
    const res = await request(app).get(url()).set(as(owner));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ ...original(), id: question.id, owner: OWNER_ID }));
  });

  test('another Faculty member can view it too (the bank is shared between Faculty)', async () => {
    expect((await request(app).get(url()).set(as(otherFaculty))).status).toBe(200);
  });

  test('a Student gets 403', async () => {
    expect((await request(app).get(url()).set(as(student))).status).toBe(403);
  });
});

describe('TC-QB-06 – owner edits own question', () => {
  test('changing only the topic works and keeps the other fields', async () => {
    const res = await request(app).put(url()).set(as(owner)).send({ topic: 'Maths' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: question.id, updatedAt: expect.any(String) });
    const saved = await reload();
    expect(saved.topic).toBe('Maths');
    expect(saved.text).toBe('What is 2 + 2?');
    expect(saved.options).toEqual(['3', '4', '5', '6']);
  });

  test('changing every field works', async () => {
    const changes = {
      text: 'What is 3 + 3?',
      options: ['5', '6', '7', '8'],
      correctOption: 'B',
      topic: 'Maths',
      difficulty: 'Medium',
      explanation: '3 + 3 = 6',
    };
    const res = await request(app).put(url()).set(as(owner)).send(changes);
    expect(res.status).toBe(200);
    expect(await reload()).toEqual(expect.objectContaining(changes));
  });

  test.each([
    ['text', { text: 'q'.repeat(501) }, '500'],
    ['text', { text: '   ' }, 'required'],
    ['options', { options: ['4', '4', '5', '6'] }, 'different'],
    ['options', { options: ['1', '2', '3'] }, 'exactly 4'],
    ['correctOption', { correctOption: 'E' }, 'A, B, C, D'],
    ['topic', { topic: 't'.repeat(51) }, '50'],
    ['difficulty', { difficulty: 'Expert' }, 'Easy, Medium, Hard'],
    ['explanation', { explanation: 'e'.repeat(301) }, '300'],
  ])('invalid %s is rejected with the field and rule named, and nothing changes', async (field, change, rule) => {
    const res = await request(app).put(url()).set(as(owner)).send(change);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe(field);
    expect(res.body.error.message).toContain(rule);
    expect(await reload()).toEqual(expect.objectContaining(original()));
  });

  test('the owner cannot be changed through an edit', async () => {
    const res = await request(app).put(url()).set(as(owner)).send({ owner: otherFaculty.id, topic: 'Maths' });
    expect(res.status).toBe(200);
    expect((await reload()).owner.toString()).toBe(OWNER_ID);
  });
});

describe('TC-QB-07 – owner removes own question', () => {
  test('returns 204 and the question is gone', async () => {
    const res = await request(app).delete(url()).set(as(owner));
    expect(res.status).toBe(204);
    expect(await reload()).toBeNull();
  });

  test('after removal the question is unavailable (404)', async () => {
    await request(app).delete(url()).set(as(owner));
    const res = await request(app).get(url()).set(as(owner));
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Question unavailable' });
    expect((await request(app).delete(url()).set(as(owner))).status).toBe(404);
  });
});

describe('TC-QB-09 / #41 – non-owners cannot edit or remove', () => {
  test('another Faculty member gets 403 "Access denied" on edit, and nothing changes', async () => {
    const res = await request(app).put(url()).set(as(otherFaculty)).send({ topic: 'Hacked' });
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: 'ACCESS_DENIED', message: 'Access denied' });
    expect((await reload()).topic).toBe('Arithmetic');
  });

  test('another Faculty member gets 403 on remove, and the question still exists', async () => {
    const res = await request(app).delete(url()).set(as(otherFaculty));
    expect(res.status).toBe(403);
    expect(await reload()).not.toBeNull();
  });

  test('ownership is checked before validation (non-owner with invalid data still gets 403)', async () => {
    const res = await request(app).put(url()).set(as(otherFaculty)).send({ text: '' });
    expect(res.status).toBe(403);
  });

  test('TC-QB-08: a Student gets 403 on edit and remove', async () => {
    expect((await request(app).put(url()).set(as(student)).send({ topic: 'X' })).status).toBe(403);
    expect((await request(app).delete(url()).set(as(student))).status).toBe(403);
    expect(await reload()).toEqual(expect.objectContaining(original()));
  });

  test('no login gets 401', async () => {
    expect((await request(app).put(url()).send({ topic: 'X' })).status).toBe(401);
    expect((await request(app).delete(url())).status).toBe(401);
  });
});

describe('Unavailable questions (UC-QB-03 A3, #44)', () => {
  test.each([
    ['an id that does not exist', new mongoose.Types.ObjectId().toString()],
    ['a malformed id', 'not-an-id'],
  ])('%s gives 404 "Question unavailable" for view, edit and remove', async (_name, id) => {
    for (const res of [
      await request(app).get(url(id)).set(as(owner)),
      await request(app).put(url(id)).set(as(owner)).send({ topic: 'X' }),
      await request(app).delete(url(id)).set(as(owner)),
    ]) {
      expect(res.status).toBe(404);
      expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Question unavailable' });
    }
  });
});
