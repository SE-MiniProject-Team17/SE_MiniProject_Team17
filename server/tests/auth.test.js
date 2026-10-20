const mongoose = require('mongoose');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const ROLES = require('../src/config/roles');
const { startDB, clearDB, stopDB } = require('./helpers/db');

beforeAll(async () => {
  await startDB();
  // Ensure the unique email index exists before duplicate-email tests.
  await User.init();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    await clearDB();
  }
});

afterAll(async () => {
  await stopDB();
});

describe('POST /api/auth/register', () => {
  const validUser = {
    fullName: 'Jagadeesh Reddy',
    email: 'jagadeesh@example.com',
    password: 'StrongPass1',
    role: ROLES.STUDENT,
  };

  test('registers a valid user and returns safe user data', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Registration successful');
    expect(res.body.user).toMatchObject({
      fullName: validUser.fullName,
      email: validUser.email,
      role: ROLES.STUDENT,
    });
    expect(res.body.user.id).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();

    const storedUser = await User.findOne({ email: validUser.email })
      .select('+passwordHash');

    expect(storedUser).not.toBeNull();
    expect(storedUser.passwordHash).not.toBe(validUser.password);
    expect(await bcrypt.compare(validUser.password, storedUser.passwordHash))
      .toBe(true);
  });

  test('normalizes email to lowercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'Jagadeesh@Example.com' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('jagadeesh@example.com');
  });

  test('rejects a missing full name', async () => {
    const { fullName, ...payload } = validUser;
    const res = await request(app)
      .post('/api/auth/register')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('fullName');
  });

  test('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('email');
  });

  test.each([
    ['short', 'Short1'],
    ['no uppercase', 'strongpass1'],
    ['no lowercase', 'STRONGPASS1'],
    ['no digit', 'StrongPass'],
  ])('rejects a weak password: %s', async (_case, password) => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('password');
  });

  test('rejects a duplicate email regardless of case', async () => {
    const first = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/auth/register')
      .send({
        ...validUser,
        email: 'JAGADEESH@EXAMPLE.COM',
      });

    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('VALIDATION_ERROR');
    expect(second.body.error.field).toBe('email');

    expect(await User.countDocuments()).toBe(1);
  });

  test('allows Student and Faculty registration but rejects Admin', async () => {
    for (const role of [ROLES.STUDENT, ROLES.FACULTY]) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUser,
          email: `${role.toLowerCase()}@example.com`,
          role,
        });
  
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe(role);
    }
  
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        ...validUser,
        email: 'admin@example.com',
        role: ROLES.ADMIN,
      });
  
    expect(adminRes.status).toBe(400);
    expect(adminRes.body.error.field).toBe('role');
  });

  test('rejects registration when role is missing', async () => {
    const { role, ...payload } = validUser;
  
    const res = await request(app)
      .post('/api/auth/register')
      .send(payload);
  
    expect(res.status).toBe(400);
    expect(res.body.error.field).toBe('role');
  });
});
