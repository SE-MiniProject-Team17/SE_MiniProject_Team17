const request = require('supertest');
const app = require('../src/app');
const { Quiz } = require('../src/models/Quiz');
const Attempt = require('../src/models/Attempt');
const { Question } = require('../src/models/Question');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/attempts';

let student;
let otherStudent;
let faculty;
let quiz;
let questions;

beforeAll(startDB);

beforeEach(async () => {
  student = await tokenFor('Student');
  otherStudent = await tokenFor('Student');
  faculty = await tokenFor('Faculty');

  questions = await Question.create([
    {
      text: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctOption: 'B',
      topic: 'Math',
      difficulty: 'Easy',
      explanation: 'Two plus two equals four.',
      owner: faculty.id,
    },
    {
      text: 'Which is a programming language?',
      options: ['HTML', 'CSS', 'JavaScript', 'JPEG'],
      correctOption: 'C',
      topic: 'Programming',
      difficulty: 'Easy',
      explanation: 'JavaScript is a programming language.',
      owner: faculty.id,
    },
    {
      text: 'What is the capital of France?',
      options: ['Rome', 'Berlin', 'Madrid', 'Paris'],
      correctOption: 'D',
      topic: 'Geography',
      difficulty: 'Easy',
      explanation: 'Paris is the capital of France.',
      owner: faculty.id,
    },
  ]);

  quiz = await Quiz.create({
    title: 'Test Quiz',
    questionIds: questions.map((question) => question._id),
    owner: faculty.id,
    timeLimitMinutes: 30,
    availableFrom: new Date(Date.now() - 60000),
    availableUntil: new Date(Date.now() + 3600000),
    status: 'Published',
    publishedAt: new Date(),
    questions: questions.map((question, index) => ({
      sourceQuestion: question._id,
      position: index + 1,
      text: question.text,
      options: question.options,
      correctOption: question.correctOption,
      topic: question.topic,
      difficulty: question.difficulty,
      explanation: question.explanation || '',
    })),
  });
});

afterEach(clearDB);
afterAll(stopDB);

const submit = (body, user = student) =>
  request(app)
    .post(`${URL}/${quiz._id}/submit`)
    .set('Authorization', `Bearer ${user.token}`)
    .send(body);

describe('Automatic grading and detailed results', () => {
  test('grades all correct answers and calculates 100 percent', async () => {
    const res = await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'B' },
        { questionId: String(questions[1]._id), selectedOption: 'C' },
        { questionId: String(questions[2]._id), selectedOption: 'D' },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(3);
    expect(res.body.totalQuestions).toBe(3);
    expect(res.body.percentage).toBe(100);
    expect(res.body.answers.every((answer) => answer.isCorrect)).toBe(true);
    expect(await Attempt.countDocuments()).toBe(1);
  });

  test('grades incorrect and unanswered questions without negative marking', async () => {
    const res = await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'A' },
        { questionId: String(questions[1]._id), selectedOption: null },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(0);
    expect(res.body.totalQuestions).toBe(3);
    expect(res.body.percentage).toBe(0);
    expect(res.body.answers).toHaveLength(3);
    expect(res.body.answers[2].selectedOption).toBeNull();
  });

  test('calculates partial scores correctly', async () => {
    const res = await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'B' },
        { questionId: String(questions[1]._id), selectedOption: 'A' },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(1);
    expect(res.body.totalQuestions).toBe(3);
    expect(res.body.percentage).toBe(33.33);
  });

  test('returns question details, correct answers and explanations', async () => {
    const submitted = await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'B' },
      ],
    });

    expect(submitted.status).toBe(201);

    const result = await request(app)
      .get(`${URL}/${submitted.body.id}/result`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(result.status).toBe(200);
    expect(result.body.answers[0]).toMatchObject({
      questionId: String(questions[0]._id),
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      selectedOption: 'B',
      correctOption: 'B',
      isCorrect: true,
      explanation: 'Two plus two equals four.',
    });
  });

  test('preserves historical results when a question is edited', async () => {
    const submitted = await submit({
      answers: [
        {
          questionId: String(questions[0]._id),
          selectedOption: 'B',
        },
      ],
    });

    expect(submitted.status).toBe(201);

    await Question.findByIdAndUpdate(questions[0]._id, {
      text: 'Edited question text',
      options: ['New A', 'New B', 'New C', 'New D'],
      correctOption: 'A',
      explanation: 'Updated explanation',
    });

    const result = await request(app)
      .get(`${URL}/${submitted.body.id}/result`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(result.status).toBe(200);
    expect(result.body.answers[0]).toMatchObject({
      questionText: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      selectedOption: 'B',
      correctOption: 'B',
      isCorrect: true,
      explanation: 'Two plus two equals four.',
    });
  });

  test('a student cannot view another student’s result', async () => {
    const submitted = await submit({
      answers: [
        {
          questionId: String(questions[0]._id),
          selectedOption: 'B',
        },
      ],
    });

    expect(submitted.status).toBe(201);

    const result = await request(app)
      .get(`${URL}/${submitted.body.id}/result`)
      .set('Authorization', `Bearer ${otherStudent.token}`);

    expect(result.status).toBe(404);
    expect(result.body.error.code).toBe('NOT_FOUND');
  });

  test('rejects answers for questions outside the quiz', async () => {
    const outsideQuestion = await Question.create({
      text: 'Outside question?',
      options: ['A', 'B', 'C', 'D'],
      correctOption: 'A',
      topic: 'Testing',
      difficulty: 'Easy',
      owner: faculty.id,
    });

    const res = await submit({
      answers: [
        {
          questionId: String(outsideQuestion._id),
          selectedOption: 'A',
        },
      ],
    });

    expect(res.status).toBe(400);
    expect(await Attempt.countDocuments()).toBe(0);
  });

  test('rejects duplicate answers for the same question', async () => {
    const res = await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'B' },
        { questionId: String(questions[0]._id), selectedOption: 'A' },
      ],
    });

    expect(res.status).toBe(400);
    expect(await Attempt.countDocuments()).toBe(0);
  });

  test('rejects client-supplied scores and does not trust them', async () => {
    const res = await submit({
      score: 999,
      percentage: 100,
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'A' },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.score).toBe(0);
    expect(res.body.percentage).toBe(0);
  });

  test('requires a logged-in student', async () => {
    const res = await request(app)
      .post(`${URL}/${quiz._id}/submit`)
      .send({ answers: [] });

    expect(res.status).toBe(401);
  });

  test('denies faculty access to student attempt routes', async () => {
    const res = await request(app)
      .post(`${URL}/${quiz._id}/submit`)
      .set('Authorization', `Bearer ${faculty.token}`)
      .send({ answers: [] });

    expect(res.status).toBe(403);
  });

  test('prevents a second attempt for the same student and quiz', async () => {
    const first = await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'B' },
      ],
    });

    expect(first.status).toBe(201);

    const second = await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'A' },
      ],
    });

    expect(second.status).toBe(400);
    expect(await Attempt.countDocuments({
      student: student.id,
      quiz: quiz._id,
    })).toBe(1);
  });

  test('grades 50 questions across 100 concurrent submissions within 2 seconds', async () => {
    const manyQuestions = await Question.create(
      Array.from({ length: 50 }, (_, i) => ({
        text: `Performance question ${i + 1}`,
        options: ['A', 'B', 'C', 'D'],
        correctOption: 'B',
        topic: 'Performance',
        difficulty: 'Easy',
        explanation: 'Option B is correct.',
        owner: faculty.id,
      }))
    );

    const performanceQuiz = await Quiz.create({
      title: 'Performance Test Quiz',
      questionIds: manyQuestions.map((q) => q._id),
      owner: faculty.id,
      timeLimitMinutes: 30,
      availableFrom: new Date(Date.now() - 60000),
      availableUntil: new Date(Date.now() + 3600000),
      status: 'Published',
      publishedAt: new Date(),
      questions: manyQuestions.map((q, i) => ({
        sourceQuestion: q._id,
        position: i + 1,
        text: q.text,
        options: q.options,
        correctOption: q.correctOption,
        topic: q.topic,
        difficulty: q.difficulty,
        explanation: q.explanation,
      })),
    });

    const users = await Promise.all(
      Array.from({ length: 100 }, () => tokenFor('Student'))
    );

    const startedAt = Date.now();

    const responses = await Promise.all(
      users.map((user) =>
        request(app)
          .post(`${URL}/${performanceQuiz._id}/submit`)
          .set('Authorization', `Bearer ${user.token}`)
          .send({
            answers: manyQuestions.map((q) => ({
              questionId: String(q._id),
              selectedOption: 'B',
            })),
          })
      )
    );

    const elapsedMs = Date.now() - startedAt;

    expect(responses.every((res) => res.status === 201)).toBe(true);
    expect(responses.every((res) => res.body.score === 50)).toBe(true);
    expect(await Attempt.countDocuments({ quiz: performanceQuiz._id })).toBe(100);

    console.log(`100 submissions × 50 questions: ${elapsedMs} ms`);
    expect(elapsedMs).toBeLessThan(2000);
  });
});
describe('Student attempt history', () => {
  test('returns submitted attempts with quiz and score details', async () => {
    await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'B' },
        { questionId: String(questions[1]._id), selectedOption: 'C' },
        { questionId: String(questions[2]._id), selectedOption: 'D' },
      ],
    });

    const res = await request(app)
      .get(`${URL}/history`)
      .set('Authorization', `Bearer ${student.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      quizTitle: 'Test Quiz',
      score: 3,
      totalQuestions: 3,
      percentage: 100,
    });
    expect(res.body[0].id).toBeDefined();
    expect(res.body[0].submittedAt).toBeDefined();
  });

  test('does not show another student�s attempts', async () => {
    await submit({
      answers: [
        { questionId: String(questions[0]._id), selectedOption: 'B' },
        { questionId: String(questions[1]._id), selectedOption: 'C' },
        { questionId: String(questions[2]._id), selectedOption: 'D' },
      ],
    });

    const res = await request(app)
      .get(`${URL}/history`)
      .set('Authorization', `Bearer ${otherStudent.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('denies faculty access to student attempt history', async () => {
    const res = await request(app)
      .get(`${URL}/history`)
      .set('Authorization', `Bearer ${faculty.token}`);

    expect(res.status).toBe(403);
  });
});
