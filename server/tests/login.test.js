
const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const User = require('../src/models/User');
const Session = require('../src/models/Session');
const ROLES = require('../src/config/roles');
const { startDB, clearDB, stopDB } = require('./helpers/db');

describe('POST /api/auth/login', () => {
  let user;

  beforeAll(async () => {
    await startDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  afterAll(async () => {
    await stopDB();
  });

  async function createUser() {
    const passwordHash = await bcrypt.hash('ValidPass123', 4);

    user = await User.create({
      fullName: 'Test Student',
      email: 'student@example.com',
      passwordHash,
      role: ROLES.STUDENT,
    });

    return user;
  }

  test('successful login returns a token and user details', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'ValidPass123',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful');
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('student@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');

    expect(await Session.countDocuments({ user: user._id })).toBe(1);
  });

  test('unknown email returns generic invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'unknown@example.com',
        password: 'WrongPass123',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  test('wrong password returns generic invalid credentials', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'WrongPass123',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.failedLoginAttempts).toBe(1);
  });

  test('fifth consecutive failed attempt locks the account', async () => {
    await createUser();

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@example.com',
          password: 'WrongPass123',
        });

      if (attempt < 5) {
        expect(res.status).toBe(401);
        expect(res.body.error.message).toBe('Invalid email or password');
      } else {
        expect(res.status).toBe(423);
        expect(res.body.error.message).toBe(
          'Account temporarily locked. Try again in 15 minutes.'
        );
      }
    }

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.failedLoginAttempts).toBe(5);
    expect(updatedUser.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    expect(updatedUser.lockedUntil.getTime()).toBeLessThanOrEqual(
      Date.now() + 15 * 60 * 1000
    );
  });

  test('correct password is rejected while the account is locked', async () => {
    await createUser();

    user.failedLoginAttempts = 5;
    user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'ValidPass123',
      });

    expect(res.status).toBe(423);
    expect(res.body.error.message).toBe(
      'Account temporarily locked. Try again in 15 minutes.'
    );
    expect(await Session.countDocuments({ user: user._id })).toBe(0);
  });

  test('expired lock allows successful login and resets the counter', async () => {
    await createUser();

    user.failedLoginAttempts = 5;
    user.lockedUntil = new Date(Date.now() - 1000);
    await user.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'ValidPass123',
      });

    expect(res.status).toBe(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.failedLoginAttempts).toBe(0);
    expect(updatedUser.lockedUntil).toBeNull();
  });

  test('successful login resets earlier failed attempts', async () => {
    await createUser();

    user.failedLoginAttempts = 3;
    await user.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'student@example.com',
        password: 'ValidPass123',
      });

    expect(res.status).toBe(200);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.failedLoginAttempts).toBe(0);
    expect(updatedUser.lockedUntil).toBeNull();
  });
});
