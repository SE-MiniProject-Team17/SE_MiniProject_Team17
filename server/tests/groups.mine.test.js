const request = require('supertest');
const app = require('../src/app');
const StudyGroup = require('../src/models/StudyGroup');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/groups/mine';

let student;
let anotherStudent;

const getMine = (user) => {
  const req = request(app).get(URL);

  if (user) {
    req.set('Authorization', `Bearer ${user.token}`);
  }

  return req;
};

beforeAll(startDB);

beforeEach(async () => {
  student = await tokenFor('Student');
  anotherStudent = await tokenFor('Student');
});

afterEach(clearDB);
afterAll(stopDB);

describe('REQ-COL-04 — View my study groups', () => {
  test('returns only groups the current student belongs to', async () => {
    await StudyGroup.create({
      name: 'My Group',
      description: 'My revision group',
      createdBy: student.id,
      members: [student.id],
    });

    await StudyGroup.create({
      name: 'Another Student Group',
      description: 'A different group',
      createdBy: anotherStudent.id,
      members: [anotherStudent.id],
    });

    const res = await getMine(student);

    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(1);

    expect(res.body.groups[0]).toEqual({
      id: expect.any(String),
      name: 'My Group',
      description: 'My revision group',
      createdBy: student.id,
    });
  });

  test('includes groups the student joined, not just groups they created', async () => {
    const group = await StudyGroup.create({
      name: 'Joined Group',
      description: 'Open study session',
      createdBy: anotherStudent.id,
      members: [anotherStudent.id, student.id],
    });

    const res = await getMine(student);

    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.groups[0].id).toBe(group.id);
    expect(res.body.groups[0].name).toBe('Joined Group');
  });

  test('returns an empty list when the student has no groups', async () => {
    const res = await getMine(student);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ groups: [] });
  });

  test('an unauthenticated request is rejected', async () => {
    const res = await getMine(null);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('a Faculty user cannot list Student groups through this endpoint', async () => {
    const faculty = await tokenFor('Faculty');

    const res = await getMine(faculty);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });
});