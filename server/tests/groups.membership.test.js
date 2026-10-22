const request = require('supertest');
const app = require('../src/app');
const StudyGroup = require('../src/models/StudyGroup');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

const GROUPS_URL = '/api/groups';

let student;
let anotherStudent;
let group;

const auth = (user) => ({
  Authorization: `Bearer ${user.token}`,
});

const joinGroup = (groupId, user) =>
  request(app)
    .post(`${GROUPS_URL}/${groupId}/join`)
    .set(auth(user));

const listMyGroups = (user) =>
  request(app)
    .get(`${GROUPS_URL}/mine`)
    .set(auth(user));

beforeAll(startDB);

beforeEach(async () => {
  student = await tokenFor('Student');
  anotherStudent = await tokenFor('Student');

  group = await StudyGroup.create({
    name: 'Membership Test Group',
    description: 'Test group for Issue 26',
    createdBy: student.id,
    members: [student.id],
  });
});

afterEach(clearDB);
afterAll(stopDB);

describe('Issue #26 — Study-group membership management', () => {
  test('TC-COL-02: a Student can join an existing group', async () => {
    const res = await joinGroup(group.id, anotherStudent);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(group.id);

    const saved = await StudyGroup.findById(group.id).lean();

    expect(saved.members.map(String)).toContain(anotherStudent.id);
  });

  test('TC-COL-03: duplicate membership is rejected', async () => {
    const res = await joinGroup(group.id, student);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');

    const saved = await StudyGroup.findById(group.id).lean();
    const memberIds = saved.members.map(String);

    expect(memberIds.filter((id) => id === student.id)).toHaveLength(1);
  });

  test('TC-COL-04: a Student sees groups they belong to, including joined groups', async () => {
    const joinedGroup = await StudyGroup.create({
      name: 'Group I Joined',
      description: 'Owned by another student',
      createdBy: anotherStudent.id,
      members: [anotherStudent.id, student.id],
    });

    await StudyGroup.create({
      name: 'Not My Group',
      description: 'Student is not a member',
      createdBy: anotherStudent.id,
      members: [anotherStudent.id],
    });

    const res = await listMyGroups(student);

    expect(res.status).toBe(200);

    const names = res.body.groups.map((item) => item.name);

    expect(names).toContain('Membership Test Group');
    expect(names).toContain('Group I Joined');
    expect(names).not.toContain('Not My Group');

    const joined = res.body.groups.find(
      (item) => item.id === joinedGroup.id
    );

    expect(joined).toBeDefined();
    expect(joined.createdBy).toBe(anotherStudent.id);
  });

  test('listing returns an empty array when the Student has no memberships', async () => {
    const res = await listMyGroups(anotherStudent);

    // This student isn't a member of the fixture group yet.
    expect(res.status).toBe(200);
    expect(res.body.groups).toEqual([]);
  });

  test('TC-COL-07: an unavailable group returns a generic 404 response', async () => {
    const missingId = '507f1f77bcf86cd799439011';

    const res = await joinGroup(missingId, anotherStudent);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Item unavailable');
    expect(res.body.group).toBeUndefined();

    // Do not disclose group names, membership details, or other content.
    expect(JSON.stringify(res.body)).not.toContain(group.name);
    expect(JSON.stringify(res.body)).not.toContain(group.description);
  });

  test('a malformed group ID also returns a generic 404', async () => {
    const res = await joinGroup('not-a-valid-id', anotherStudent);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Item unavailable');
  });

  test('an unauthenticated Student cannot join a group', async () => {
    const res = await request(app)
      .post(`${GROUPS_URL}/${group.id}/join`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('an unauthenticated Student cannot list memberships', async () => {
    const res = await request(app).get(`${GROUPS_URL}/mine`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('a Faculty user cannot use Student membership operations', async () => {
    const faculty = await tokenFor('Faculty');

    const joinRes = await joinGroup(group.id, faculty);
    const listRes = await listMyGroups(faculty);

    expect(joinRes.status).toBe(403);
    expect(joinRes.body.error.code).toBe('ACCESS_DENIED');

    expect(listRes.status).toBe(403);
    expect(listRes.body.error.code).toBe('ACCESS_DENIED');

    const saved = await StudyGroup.findById(group.id).lean();

    expect(saved.members.map(String)).not.toContain(faculty.id);
  });
});