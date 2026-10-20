/**
 * #13 – Question creation and validation
 * STP: TC-QB-01 (valid question), TC-QB-02 (missing fields), TC-QB-03 (length limits),
 *      TC-QB-04 (option rules), plus role checks for REQ-QB-07 / SEC-QZ-01.
 */
const request = require('supertest');
const app = require('../src/app');
const { Question } = require('../src/models/Question');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/questions';
const faculty = tokenFor('Faculty');
const student = tokenFor('Student');

const validQuestion = () => ({
  text: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctOption: 'B',
  topic: 'Arithmetic',
  difficulty: 'Easy',
  explanation: '2 + 2 = 4',
});

const post = (body, user = faculty) =>
  request(app).post(URL).set('Authorization', `Bearer ${user.token}`).send(body);

beforeAll(startDB);
afterEach(clearDB);
afterAll(stopDB);

describe('TC-QB-01 – Faculty adds a valid question', () => {
  test('returns 201 with id, owner and createdAt, and saves the question', async () => {
    const res = await post(validQuestion());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), owner: faculty.id, createdAt: expect.any(String) });

    const saved = await Question.findById(res.body.id).lean();
    expect(saved.text).toBe('What is 2 + 2?');
    expect(saved.options).toEqual(['3', '4', '5', '6']);
    expect(saved.correctOption).toBe('B');
    expect(saved.owner.toString()).toBe(faculty.id);
  });

  test('explanation is optional', async () => {
    const { explanation, ...withoutExplanation } = validQuestion();
    expect((await post(withoutExplanation)).status).toBe(201);
  });

  test('REQ-QB-03: the owner is always the logged-in user, even if the client sends another owner', async () => {
    const other = tokenFor('Faculty');
    const res = await post({ ...validQuestion(), owner: other.id });
    expect(res.status).toBe(201);
    expect(res.body.owner).toBe(faculty.id);
  });
});

describe('TC-QB-02 – missing fields are rejected and the field is named', () => {
  test.each([
    ['text', 'Question text'],
    ['topic', 'Topic'],
    ['correctOption', 'Correct option'],
    ['difficulty', 'Difficulty'],
    ['options', 'Options'],
  ])('missing %s', async (field, label) => {
    const body = validQuestion();
    delete body[field];
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe(field);
    expect(res.body.error.message).toContain(label);
    expect(await Question.countDocuments()).toBe(0);
  });

  test('question text with only spaces counts as empty', async () => {
    const res = await post({ ...validQuestion(), text: '    ' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('text');
  });
});

describe('TC-QB-03 – length limits', () => {
  test('values exactly at the limits are accepted', async () => {
    const res = await post({
      text: 'q'.repeat(500),
      options: ['a', 'b', 'c', 'd'].map((c) => c.repeat(200)),
      correctOption: 'A',
      topic: 't'.repeat(50),
      difficulty: 'Medium',
      explanation: 'e'.repeat(300),
    });
    expect(res.status).toBe(201);
  });

  test.each([
    ['text', { text: 'q'.repeat(501) }, '500'],
    ['topic', { topic: 't'.repeat(51) }, '50'],
    ['explanation', { explanation: 'e'.repeat(301) }, '300'],
  ])('%s one character over the limit is rejected', async (field, override, limit) => {
    const res = await post({ ...validQuestion(), ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe(field);
    expect(res.body.error.message).toContain(limit);
  });

  test('an option of 201 characters is rejected', async () => {
    const res = await post({ ...validQuestion(), options: ['3', 'x'.repeat(201), '5', '6'] });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('options');
    expect(res.body.error.message).toMatch(/Option B.*200/);
  });
});

describe('TC-QB-04 – exactly four different options and a valid correct option', () => {
  test.each([
    ['three options', ['3', '4', '5']],
    ['five options', ['3', '4', '5', '6', '7']],
    ['an empty option', ['3', '', '5', '6']],
  ])('%s is rejected', async (_name, options) => {
    const res = await post({ ...validQuestion(), options });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('options');
  });

  test('two identical options are rejected', async () => {
    const res = await post({ ...validQuestion(), options: ['4', '4', '5', '6'] });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('options');
    expect(res.body.error.message).toMatch(/different/);
  });

  test.each(['E', 'b', '1', 2])('correct option %p is rejected', async (value) => {
    const res = await post({ ...validQuestion(), correctOption: value });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('correctOption');
  });

  test('difficulty other than Easy/Medium/Hard is rejected', async () => {
    const res = await post({ ...validQuestion(), difficulty: 'Expert' });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('difficulty');
    expect(res.body.error.message).toContain('Easy, Medium, Hard');
  });

  test('an object instead of text is rejected (injection attempt)', async () => {
    const res = await post({ ...validQuestion(), text: { $gt: '' } });
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('text');
  });
});

describe('Roles – REQ-QB-07, SEC-QZ-01', () => {
  test('a Student gets 403 and nothing is saved', async () => {
    const res = await post(validQuestion(), student);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
    expect(await Question.countDocuments()).toBe(0);
  });

  test('no login gets 401', async () => {
    const res = await request(app).post(URL).send(validQuestion());
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('the role check happens before validation (Student with empty body still gets 403)', async () => {
    expect((await post({}, student)).status).toBe(403);
  });
});
