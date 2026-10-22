const request = require('supertest');
const app = require('../src/app');
const StudyGroup = require('../src/models/StudyGroup');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const URL = '/api/groups';

let student;

const post = (body, user = student) => {
  const req = request(app).post(URL);

  if (user) {
    req.set('Authorization', `Bearer ${user.token}`);
  }

  return req.send(body);
};

beforeAll(startDB);

beforeEach(async () => {
  student = await tokenFor('Student');
});

afterEach(clearDB);
afterAll(stopDB);

describe('REQ-COL-01 — Create a study group', () => {
  test('valid name and description return 201 and save the group', async () => {
    const res = await post({
      name: 'Study Buddies',
      description: 'Preparing for exams',
    });

    expect(res.status).toBe(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      name: 'Study Buddies',
      description: 'Preparing for exams',
      createdBy: student.id,
    });

    const saved = await StudyGroup.findById(res.body.id).lean();

    expect(saved).not.toBeNull();
    expect(saved.name).toBe('Study Buddies');
    expect(saved.description).toBe('Preparing for exams');
    expect(saved.createdBy.toString()).toBe(student.id);
    expect(saved.members.map(String)).toContain(student.id);
  });

  test('description is optional', async () => {
    const res = await post({ name: 'Revision Group' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Revision Group');
    expect(res.body.description).toBe('');
    expect(res.body.createdBy).toBe(student.id);
  });

  test.each([
    ['missing name', {}],
    ['empty name', { name: '' }],
    ['whitespace-only name', { name: '   ' }],
  ])('%s is rejected without saving a group', async (_label, body) => {
    const res = await post(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('name');
    expect(await StudyGroup.countDocuments()).toBe(0);
  });

  test('an unauthenticated request is rejected', async () => {
    const res = await post({ name: 'Private Group' }, null);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
    expect(await StudyGroup.countDocuments()).toBe(0);
  });

  test('a Faculty user cannot create a group', async () => {
    const faculty = await tokenFor('Faculty');

    const res = await post({ name: 'Faculty Group' }, faculty);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
    expect(await StudyGroup.countDocuments()).toBe(0);
  });
});