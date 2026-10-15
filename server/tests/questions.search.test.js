/**
 * #14 – Question bank search and filtering
 * STP: TC-QB-05 (keyword + filters + empty result), TC-QB-08 (Students denied),
 *      TC-QP-02 / NFR-PERF-05 (results within 2 s for 1,000 questions).
 */
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { Question } = require('../src/models/Question');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/questions';
const faculty = tokenFor('Faculty');
const otherFaculty = tokenFor('Faculty');
const student = tokenFor('Student');

const get = (query = {}, user = faculty, path = URL) =>
  request(app).get(path).query(query).set('Authorization', `Bearer ${user.token}`);

/** Builds a question document; `minutesAgo` controls createdAt so ordering is predictable. */
let counter = 0;
function makeQuestion({ text, topic = 'General', difficulty = 'Easy', owner = faculty.id, minutesAgo }) {
  counter += 1;
  const createdAt = new Date(Date.now() - (minutesAgo ?? counter) * 60 * 1000);
  return {
    text: text || `Question number ${counter}?`,
    options: ['w', 'x', 'y', 'z'],
    correctOption: 'A',
    topic,
    difficulty,
    explanation: '',
    owner: new mongoose.Types.ObjectId(owner),
    createdAt,
    updatedAt: createdAt,
  };
}
const seed = (docs) => Question.insertMany(docs, { timestamps: false });

beforeAll(startDB);
afterEach(clearDB);
afterAll(stopDB);

describe('TC-QB-05 – list, keyword search and filters', () => {
  beforeEach(async () => {
    // A bank of 20 questions with mixed topics and difficulties (as in the STP precondition).
    const docs = [
      makeQuestion({ text: 'What is photosynthesis?', topic: 'Biology', difficulty: 'Medium', minutesAgo: 1 }),
      makeQuestion({ text: 'Where does photosynthesis happen in a plant?', topic: 'Biology', difficulty: 'Easy', minutesAgo: 2 }),
      makeQuestion({ text: 'Which gas is released by Photosynthesis?', topic: 'Chemistry', difficulty: 'Medium', minutesAgo: 3, owner: otherFaculty.id }),
      makeQuestion({ text: 'What is a cell membrane made of?', topic: 'Biology', difficulty: 'Medium', minutesAgo: 4 }),
      makeQuestion({ text: 'What is 2 + 2?', topic: 'Arithmetic', difficulty: 'Easy', minutesAgo: 5 }),
    ];
    for (let i = 0; i < 15; i += 1) {
      docs.push(makeQuestion({ topic: ['Physics', 'History', 'Arithmetic'][i % 3], difficulty: ['Easy', 'Medium', 'Hard'][i % 3], minutesAgo: 10 + i }));
    }
    await seed(docs);
  });

  test('lists questions with text, topic, difficulty and owner, newest first', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(20);
    expect(res.body.page).toBe(1);
    expect(res.body.questions).toHaveLength(20);
    const first = res.body.questions[0];
    expect(first).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        text: 'What is photosynthesis?',
        topic: 'Biology',
        difficulty: 'Medium',
        owner: expect.objectContaining({ id: faculty.id }),
      })
    );
  });

  test('the list does not include the options or the correct answer', async () => {
    const res = await get();
    expect(res.body.questions[0]).not.toHaveProperty('options');
    expect(res.body.questions[0]).not.toHaveProperty('correctOption');
  });

  test('keyword "photosynthesis" returns only matching questions (case-insensitive)', async () => {
    const res = await get({ q: 'photosynthesis' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    res.body.questions.forEach((q) => expect(q.text.toLowerCase()).toContain('photosynthesis'));
  });

  test('topic = Biology and difficulty = Medium returns only matching questions', async () => {
    const res = await get({ topic: 'Biology', difficulty: 'Medium' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    res.body.questions.forEach((q) => {
      expect(q.topic).toBe('Biology');
      expect(q.difficulty).toBe('Medium');
    });
  });

  test('keyword and filters combine', async () => {
    const res = await get({ q: 'photosynthesis', topic: 'Biology', difficulty: 'Medium' });
    expect(res.body.total).toBe(1);
    expect(res.body.questions[0].text).toBe('What is photosynthesis?');
  });

  test('topic filter is case-insensitive but must match the whole topic', async () => {
    expect((await get({ topic: 'biology' })).body.total).toBe(3);
    expect((await get({ topic: 'Bio' })).body.total).toBe(0);
  });

  test('special characters in the keyword are matched literally', async () => {
    const res = await get({ q: '2 + 2' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect((await get({ q: '.*' })).body.total).toBe(0);
  });

  test('keyword "zzzz" returns an empty list (the page shows "No questions found")', async () => {
    const res = await get({ q: 'zzzz' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ questions: [], total: 0 }));
  });

  test('paging: limit 5, page 2 returns questions 6–10', async () => {
    const all = (await get()).body.questions.map((q) => q.id);
    const res = await get({ limit: 5, page: 2 });
    expect(res.body.total).toBe(20);
    expect(res.body.questions.map((q) => q.id)).toEqual(all.slice(5, 10));
  });

  test('GET /api/questions/topics returns each topic once, sorted', async () => {
    const res = await get({}, faculty, `${URL}/topics`);
    expect(res.status).toBe(200);
    expect(res.body.topics).toEqual(['Arithmetic', 'Biology', 'Chemistry', 'History', 'Physics']);
  });
});

describe('Invalid search parameters are rejected with the field named', () => {
  test.each([
    ['difficulty', { difficulty: 'Expert' }],
    ['limit', { limit: 500 }],
    ['page', { page: 0 }],
    ['q', { q: 'k'.repeat(101) }],
    ['topic', { topic: 't'.repeat(51) }],
  ])('%s', async (field, query) => {
    const res = await get(query);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe(field);
  });
});

describe('TC-QB-08 – Students and logged-out users cannot see the question bank', () => {
  test('Student gets 403 on the list', async () => {
    const res = await get({}, student);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  test('Student gets 403 on the topics list', async () => {
    expect((await get({}, student, `${URL}/topics`)).status).toBe(403);
  });

  test('no login gets 401', async () => {
    expect((await request(app).get(URL)).status).toBe(401);
  });
});

describe('TC-QP-02 / NFR-PERF-05 – 1,000 questions', () => {
  test('search and filters return within 2 seconds', async () => {
    const docs = [];
    for (let i = 0; i < 1000; i += 1) {
      docs.push(
        makeQuestion({
          text: i % 50 === 0 ? `Explain photosynthesis step ${i}` : `General knowledge question ${i}`,
          topic: ['Biology', 'Physics', 'History', 'Arithmetic'][i % 4],
          difficulty: ['Easy', 'Medium', 'Hard'][i % 3],
          minutesAgo: i,
        })
      );
    }
    await seed(docs);
    await Question.syncIndexes();

    const start = Date.now();
    const res = await get({ q: 'photosynthesis', topic: 'Biology', difficulty: 'Easy' });
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });
});
