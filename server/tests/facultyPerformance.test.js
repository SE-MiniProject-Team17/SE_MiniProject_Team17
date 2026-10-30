const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../src/app');
const { Quiz } = require('../src/models/Quiz');
const { Question } = require('../src/models/Question');
const User = require('../src/models/User');
const Attempt = require('../src/models/Attempt');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const ownerId = new mongoose.Types.ObjectId().toString();
const otherOwnerId = new mongoose.Types.ObjectId().toString();
const headers = (user) => ({ Authorization: `Bearer ${user.token}` });
const dashboard = (user) =>
  request(app).get('/api/performance/faculty').set(headers(user));

let faculty;
let otherFaculty;
let student;
let ownedQuiz;
let otherQuiz;

async function createQuiz(owner, title) {
  const question = await Question.create({
    text: 'What is 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctOption: 'B',
    topic: 'Maths',
    difficulty: 'Easy',
    owner,
  });

  return Quiz.create({
    title,
    timeLimitMinutes: 10,
    availableFrom: new Date(Date.now() - 60_000),
    availableUntil: new Date(Date.now() + 60_000),
    questionIds: [question._id],
    status: 'Published',
    publishedAt: new Date(),
    questions: [{
      sourceQuestion: question._id,
      position: 1,
      text: question.text,
      options: question.options,
      correctOption: 'B',
      topic: 'Maths',
      difficulty: 'Easy',
    }],
    owner,
  });
}

async function createStudent(name) {
  const id = new mongoose.Types.ObjectId();
  await User.collection.insertOne({
    _id: id,
    fullName: name,
    email: `${id}@test.com`,
    role: 'Student',
  });
  return id;
}

async function createAttempt(studentId, quiz, percentage, submittedAt = new Date()) {
  return Attempt.create({
    student: studentId,
    quiz: quiz._id,
    quizTitle: quiz.title,
    answers: [{ questionId: 1, selectedOption: 'B' }],
    score: percentage === 100 ? 2 : 1,
    totalQuestions: 2,
    percentage,
    status: 'Completed',
    submittedAt,
  });
}

beforeAll(startDB);
beforeEach(async () => {
  faculty = await tokenFor('Faculty', ownerId);
  otherFaculty = await tokenFor('Faculty', otherOwnerId);
  student = await tokenFor('Student');
  ownedQuiz = await createQuiz(ownerId, 'My quiz');
  otherQuiz = await createQuiz(otherOwnerId, 'Other faculty quiz');
});
afterEach(clearDB);
afterAll(stopDB);

test('faculty sees summaries for owned quizzes and completed submissions only', async () => {
  const asha = await createStudent('Asha Rao');
  const ben = await createStudent('Ben Cole');

  await createAttempt(asha, ownedQuiz, 100);
  await createAttempt(ben, ownedQuiz, 50);
  await createAttempt(asha, ownedQuiz, 0, null).then(async (attempt) => {
    attempt.status = 'InProgress';
    await attempt.save();
  });
  await createAttempt(asha, otherQuiz, 100);

  const res = await dashboard(faculty);

  expect(res.status).toBe(200);
  expect(res.body.summary).toEqual({
    totalQuizzes: 1,
    quizzesWithSubmissions: 1,
    totalSubmissions: 2,
    uniqueStudents: 2,
    averagePercentage: 75,
  });
  expect(res.body.quizzes).toHaveLength(1);
  expect(res.body.quizzes[0]).toMatchObject({
    title: 'My quiz',
    submissionCount: 2,
    averagePercentage: 75,
  });
  expect(res.body.students).toHaveLength(2);
  expect(res.body.students.map((s) => s.studentName).sort()).toEqual([
    'Asha Rao',
    'Ben Cole',
  ]);
  expect(JSON.stringify(res.body)).not.toMatch(/@test\.com|correctOption|selectedOption/);
});

test('faculty with a quiz but no submissions gets an empty performance summary', async () => {
  const res = await dashboard(otherFaculty);
  expect(res.status).toBe(200);
  expect(res.body.summary).toMatchObject({
    totalQuizzes: 1,
    quizzesWithSubmissions: 0,
    totalSubmissions: 0,
    uniqueStudents: 0,
    averagePercentage: 0,
  });
  expect(res.body.quizzes).toHaveLength(1);
  expect(res.body.quizzes[0].title).toBe('Other faculty quiz');
  expect(res.body.students).toEqual([]);
});

test('faculty with zero quizzes gets an empty dashboard', async () => {
  await Quiz.deleteMany({ owner: ownerId });

  const res = await dashboard(faculty);

  expect(res.status).toBe(200);
  expect(res.body.summary).toEqual({
    totalQuizzes: 0,
    quizzesWithSubmissions: 0,
    totalSubmissions: 0,
    uniqueStudents: 0,
    averagePercentage: 0,
  });
  expect(res.body.quizzes).toEqual([]);
  expect(res.body.students).toEqual([]);
});

test('students cannot access the faculty dashboard', async () => {
  const res = await dashboard(student);
  expect(res.status).toBe(403);
  expect(res.body.error.code).toBe('ACCESS_DENIED');
});

test('unauthenticated users cannot access the faculty dashboard', async () => {
  const res = await request(app).get('/api/performance/faculty');
  expect(res.status).toBe(401);
});
