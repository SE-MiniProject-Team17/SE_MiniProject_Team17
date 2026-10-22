
const request = require('supertest');
const app = require('../src/app');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const auth = (user) => ({
  Authorization: `Bearer ${user.token}`,
});

let student;
let faculty;

beforeAll(startDB);

beforeEach(async () => {
  student = await tokenFor('Student');
  faculty = await tokenFor('Faculty');
});

afterEach(clearDB);
afterAll(stopDB);

describe('Cross-module authentication and authorization', () => {
  test('protected quiz and group endpoints reject unauthenticated requests', async () => {
    const responses = await Promise.all([
      request(app).get('/api/quizzes/mine'),
      request(app).get('/api/groups/mine'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401]);
    expect(responses[0].body.error.code).toBe('NOT_AUTHENTICATED');
    expect(responses[1].body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('quiz management and group membership enforce different roles', async () => {
    const studentQuizResponse = await request(app)
      .get('/api/quizzes/mine')
      .set(auth(student));

    const facultyGroupResponse = await request(app)
      .get('/api/groups/mine')
      .set(auth(faculty));

    expect(studentQuizResponse.status).toBe(403);
    expect(studentQuizResponse.body.error.code).toBe('ACCESS_DENIED');

    expect(facultyGroupResponse.status).toBe(403);
    expect(facultyGroupResponse.body.error.code).toBe('ACCESS_DENIED');
  });

  test('correct roles can access their own list endpoints', async () => {
    const facultyQuizResponse = await request(app)
      .get('/api/quizzes/mine')
      .set(auth(faculty));

    const studentGroupResponse = await request(app)
      .get('/api/groups/mine')
      .set(auth(student));

    expect(facultyQuizResponse.status).toBe(200);
    expect(facultyQuizResponse.body.quizzes).toEqual([]);

    expect(studentGroupResponse.status).toBe(200);
    expect(studentGroupResponse.body.groups).toEqual([]);
  });
});
