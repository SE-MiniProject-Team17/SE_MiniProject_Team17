/**
 * #50 – Faculty view of the submissions on a quiz (SRS REQ-QZ-16, REQ-QZ-17; UC-QZ-07)
 * "The quiz owner views each Student's name, score, percentage and submission time";
 * "only the quiz owner views submissions", every other request is "Access denied".
 */
const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { Quiz } = require('../src/models/Quiz');
const { Question } = require('../src/models/Question');
const User = require('../src/models/User');
const Attempt = require('../src/models/Attempt');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const OWNER_ID = new mongoose.Types.ObjectId().toString();
const HOUR = 60 * 60 * 1000;
const as = (user) => ({ Authorization: `Bearer ${user.token}` });
const submissions = (id, user) => request(app).get(`/api/quizzes/${id}/submissions`).set(as(user));

let owner;
let otherFaculty;
let student;
let quiz;
let otherQuiz;

async function makeQuiz(title) {
  const question = await Question.create({
    text: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctOption: 'B',
    topic: 'Maths',
    difficulty: 'Easy',
    owner: OWNER_ID,
  });
  return Quiz.create({
    title,
    timeLimitMinutes: 10,
    availableFrom: new Date(Date.now() - HOUR),
    availableUntil: new Date(Date.now() + HOUR),
    questionIds: [question._id],
    status: 'Published',
    publishedAt: new Date(),
    questions: [
      {
        sourceQuestion: question._id,
        position: 1,
        text: question.text,
        options: question.options,
        correctOption: 'B',
        topic: 'Maths',
        difficulty: 'Easy',
      },
    ],
    owner: OWNER_ID,
  });
}

/** A Student who exists in the user collection (insert directly: no password needed here). */
async function makeStudent(fullName) {
  const _id = new mongoose.Types.ObjectId();
  await User.collection.insertOne({ _id, fullName, email: `${_id}@test.com`, role: 'Student' });
  return _id;
}

const makeAttempt = (studentId, forQuiz, fields = {}) =>
  Attempt.create({
    student: studentId,
    quiz: forQuiz._id,
    quizTitle: forQuiz.title,
    answers: [{ questionId: 1, selectedOption: 'B' }],
    score: 1,
    totalQuestions: 2,
    percentage: 50,
    status: 'Completed',
    submittedAt: new Date(),
    ...fields,
  });

beforeAll(startDB);
beforeEach(async () => {
  owner = await tokenFor('Faculty', OWNER_ID);
  otherFaculty = await tokenFor('Faculty');
  student = await tokenFor('Student');
  quiz = await makeQuiz('Unit 1 test');
  otherQuiz = await makeQuiz('Another quiz');
});
afterEach(clearDB);
afterAll(stopDB);

describe('REQ-QZ-16 – the owner sees each Student\'s name, score, percentage and submission time', () => {
  test('lists the completed attempts, newest first', async () => {
    const asha = await makeStudent('Asha Rao');
    const ben = await makeStudent('Ben Cole');
    await makeAttempt(asha, quiz, { score: 2, totalQuestions: 2, percentage: 100, submittedAt: new Date(Date.now() - 2 * HOUR) });
    await makeAttempt(ben, quiz, { score: 1, totalQuestions: 2, percentage: 50, submittedAt: new Date(Date.now() - HOUR) });

    const res = await submissions(quiz.id, owner);
    expect(res.status).toBe(200);
    expect(res.body.quiz).toEqual({ id: quiz.id, title: 'Unit 1 test' });
    expect(res.body.submissions).toHaveLength(2);
    expect(res.body.submissions[0]).toMatchObject({ studentName: 'Ben Cole', score: 1, totalQuestions: 2, percentage: 50 });
    expect(res.body.submissions[1]).toMatchObject({ studentName: 'Asha Rao', score: 2, totalQuestions: 2, percentage: 100 });
    expect(new Date(res.body.submissions[0].submittedAt).getTime()).toBeGreaterThan(
      new Date(res.body.submissions[1].submittedAt).getTime()
    );
  });

  test('only name, score, percentage and time are sent – no answers, e-mail or student ids', async () => {
    const asha = await makeStudent('Asha Rao');
    await makeAttempt(asha, quiz);
    const res = await submissions(quiz.id, owner);
    expect(Object.keys(res.body.submissions[0]).sort()).toEqual(
      ['id', 'percentage', 'score', 'studentName', 'submittedAt', 'totalQuestions']
    );
    expect(JSON.stringify(res.body)).not.toMatch(/@test\.com|selectedOption|answers|correctOption/);
  });

  test('attempts that are not completed and attempts on other quizzes are not listed', async () => {
    const asha = await makeStudent('Asha Rao');
    const ben = await makeStudent('Ben Cole');
    await makeAttempt(asha, quiz, { status: 'InProgress', submittedAt: null });
    await makeAttempt(ben, otherQuiz);
    const res = await submissions(quiz.id, owner);
    expect(res.status).toBe(200);
    expect(res.body.submissions).toEqual([]);
  });

  test('a quiz with no submissions gives an empty list ("No submissions yet" in the app)', async () => {
    const res = await submissions(quiz.id, owner);
    expect(res.status).toBe(200);
    expect(res.body.submissions).toEqual([]);
  });

  test('a Student who no longer exists is shown as "Student unavailable"', async () => {
    await makeAttempt(new mongoose.Types.ObjectId(), quiz);
    const res = await submissions(quiz.id, owner);
    expect(res.body.submissions[0].studentName).toBe('Student unavailable');
  });
});

describe('REQ-QZ-17 – only the quiz owner sees the submissions', () => {
  beforeEach(async () => {
    await makeAttempt(await makeStudent('Asha Rao'), quiz);
  });

  test('another Faculty member gets "Access denied" and no result information', async () => {
    const res = await submissions(quiz.id, otherFaculty);
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: 'ACCESS_DENIED', message: 'Access denied' } });
    expect(JSON.stringify(res.body)).not.toMatch(/Asha|score|percentage/);
  });

  test('a Student gets "Access denied"', async () => {
    const res = await submissions(quiz.id, student);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: 'ACCESS_DENIED', message: 'Access denied' });
  });

  test('without login the answer is 401', async () => {
    expect((await request(app).get(`/api/quizzes/${quiz.id}/submissions`)).status).toBe(401);
  });

  test.each([
    ['unknown id', () => new mongoose.Types.ObjectId().toString()],
    ['malformed id', () => 'nope'],
  ])('%s gives 404 "Quiz unavailable"', async (_n, makeId) => {
    const res = await submissions(makeId(), owner);
    expect(res.status).toBe(404);
    expect(res.body.error).toEqual({ code: 'NOT_FOUND', message: 'Quiz unavailable' });
  });
});
