
const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const authenticate = require('../src/middleware/authenticate');
const Session = require('../src/models/Session');
const { errorHandler } = require('../src/middleware/errorHandler');
const { startDB, clearDB, stopDB } = require('./helpers/db');
const { tokenFor } = require('./helpers/auth');

describe('Session management - Issue #48', () => {
  beforeAll(async () => {
    await startDB();
  });

  afterEach(async () => {
    await clearDB();
  });

  afterAll(async () => {
    await stopDB();
  });

  test('active session permits an authenticated request', async () => {
    const user = await tokenFor('Student');

    const testApp = express();
    testApp.get('/protected', authenticate, (req, res) => res.json(req.user));
    testApp.use(errorHandler);

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: user.id, role: 'Student' });
  });

  test('inactive session is rejected after 30 minutes', async () => {
    const user = await tokenFor('Student');

    await Session.updateOne(
      { tokenId: user.tokenId },
      { $set: { lastActivityAt: new Date(Date.now() - 30 * 60 * 1000) } }
    );

    const testApp = express();
    testApp.get('/protected', authenticate, (req, res) => res.json(req.user));
    testApp.use(errorHandler);

    const res = await request(testApp)
      .get('/protected')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Session expired. Please log in again.');
  });

  test('logout invalidates the token for later requests', async () => {
    const user = await tokenFor('Student');

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${user.token}`);

    expect(logout.status).toBe(200);
    expect(logout.body.message).toBe('Logout successful');

    const later = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${user.token}`);

    expect(later.status).toBe(401);
  });
});
