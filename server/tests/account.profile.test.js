
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');
const bcrypt = require('bcryptjs');

const URL = '/api/account/profile';

let student;

const profileRequest = (user) => {
  const req = request(app).get(URL);

  if (user) {
    req.set('Authorization', `Bearer ${user.token}`);
  }

  return req;
};

beforeAll(startDB);

beforeEach(async () => {
    student = await tokenFor('Student');

    await User.create({
      _id: student.id,
      fullName: 'Test Student',
      email: `student-${student.id}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'Student',
      institution: 'Original Institution',
      profilePicture: '',
    });
  });

afterEach(clearDB);
afterAll(stopDB);

describe('Issue #6 — User Profile Management', () => {
  test('authenticated user can view their own profile', async () => {
    const res = await profileRequest(student);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(
      expect.objectContaining({
        id: student.id,
        fullName: expect.any(String),
        email: expect.any(String),
        role: 'Student',
      })
    );

    expect(res.body.user).toHaveProperty('institution');
    expect(res.body.user).toHaveProperty('profilePicture');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('unauthenticated user cannot view a profile', async () => {
    const res = await profileRequest(null);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('user can update their name and institution', async () => {
    const res = await request(app)
      .patch(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        fullName: 'Updated Student',
        institution: 'Example University',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.fullName).toBe('Updated Student');
    expect(res.body.user.institution).toBe('Example University');
    expect(res.body.user.email).toBeDefined();
    expect(res.body.user.role).toBe('Student');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    const savedUser = await User.findById(student.id);
    expect(savedUser.fullName).toBe('Updated Student');
    expect(savedUser.institution).toBe('Example University');
  });

  test.each([
    ['', 'empty name'],
    ['   ', 'whitespace-only name'],
  ])('rejects %s (%s)', async (fullName) => {
    const res = await request(app)
      .patch(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ fullName });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('fullName');
  });

  test.each(['email', 'role'])(
    'rejects attempts to change %s',
    async (field) => {
      const value = field === 'email'
        ? 'changed@example.com'
        : 'Admin';

      const res = await request(app)
        .patch(URL)
        .set('Authorization', `Bearer ${student.token}`)
        .send({ [field]: value });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.field).toBe(field);

      const savedUser = await User.findById(student.id);
      expect(savedUser[field]).not.toBe(value);
    }
  );

  test('rejects an unauthenticated profile update', async () => {
    const res = await request(app)
      .patch(URL)
      .send({ fullName: 'Unauthorized Change' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });


  test('does not allow a client-supplied user ID to select another account', async () => {
    const anotherStudent = await tokenFor('Student');

    await User.create({
      _id: anotherStudent.id,
      fullName: 'Another Student',
      email: `student-${anotherStudent.id}@example.com`,
      passwordHash: 'test-password-hash',
      role: 'Student',
      institution: 'Other Institution',
      profilePicture: '',
    });

    const res = await request(app)
      .patch(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .send({
        userId: anotherStudent.id,
        fullName: 'Changed Someone Else',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const otherUser = await User.findById(anotherStudent.id);

    expect(otherUser).not.toBeNull();
    expect(otherUser.fullName).toBe('Another Student');
  });


  test('accepts a JPEG-signature upload and persists it as a data URL', async () => {
    const jpegSignature = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

    const res = await request(app)
      .patch(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .attach('profilePicture', jpegSignature, {
        filename: 'profile.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
    expect(res.body.user.profilePicture).toMatch(
      /^data:image\/jpeg;base64,/
    );

    const savedUser = await User.findById(student.id);
    expect(savedUser.profilePicture).toBe(res.body.user.profilePicture);
  });

  test('rejects a profile picture larger than 2 MiB', async () => {
    const oversizedImage = Buffer.alloc(2 * 1024 * 1024 + 1, 0);

    const res = await request(app)
      .patch(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .attach('profilePicture', oversizedImage, {
        filename: 'large.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('profilePicture');
  });

  test('rejects image content that does not match its declared type', async () => {
    const invalidImage = Buffer.from('this is not a real image');

    const res = await request(app)
      .patch(URL)
      .set('Authorization', `Bearer ${student.token}`)
      .attach('profilePicture', invalidImage, {
        filename: 'fake.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('profilePicture');
  });
});
