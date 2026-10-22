const request = require('supertest');
const app = require('../src/app');
const StudyGroup = require('../src/models/StudyGroup');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/groups';

let student;
let anotherStudent;
let group;

const post = (path, user) =>
  request(app)
    .post(`${URL}${path}`)
    .set('Authorization', `Bearer ${user.token}`);

beforeAll(startDB);

beforeEach(async () => {
  student = await tokenFor('Student');
  anotherStudent = await tokenFor('Student');

  group = await StudyGroup.create({
    name: 'Study Buddies',
    description: 'Exam preparation',
    createdBy: student.id,
    members: [student.id],
  });
});

afterEach(clearDB);
afterAll(stopDB);

describe('REQ-COL-02 and REQ-COL-03 — Join a study group', () => {
  test('a student can join an existing group', async () => {
    const res = await post(`/${group.id}/join`, anotherStudent);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(group.id);

    const saved = await StudyGroup.findById(group.id);

    expect(saved.members.map(String)).toContain(anotherStudent.id);
  });

  test('joining the same group twice returns 409', async () => {
    const res = await post(`/${group.id}/join`, student);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');

    const saved = await StudyGroup.findById(group.id);

    const membershipCount = saved.members
      .map(String)
      .filter((id) => id === student.id).length;

    expect(membershipCount).toBe(1);
  });

  test('joining an unavailable group returns 404', async () => {
    const unavailableId = '507f1f77bcf86cd799439011';

    const res = await post(`/${unavailableId}/join`, anotherStudent);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('an unauthenticated student cannot join a group', async () => {
    const res = await request(app).post(`${URL}/${group.id}/join`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('a Faculty user cannot join a group', async () => {
    const faculty = await tokenFor('Faculty');

    const res = await post(`/${group.id}/join`, faculty);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');

    const saved = await StudyGroup.findById(group.id);

    expect(saved.members.map(String)).not.toContain(faculty.id);
  });
});