/**
 * Tests for the shared base: health check, error format, authentication and
 * role middleware. Authentication tests use an in-memory MongoDB session store.
 */
const { startDB, clearDB, stopDB } = require('./helpers/db');
const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const authenticate = require('../src/middleware/authenticate');
const requireRole = require('../src/middleware/requireRole');
const { errorHandler } = require('../src/middleware/errorHandler');
const ROLES = require('../src/config/roles');
const { tokenFor } = require('./helpers/auth');

describe('API base', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('unknown route returns 404 in the standard error format', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  test('malformed JSON returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"bad json"');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test.each([
    '/api/auth/register',
    '/api/auth/login',
    '/api/materials',
  ])('malformed JSON at %s returns a safe error and the app continues responding', async (path) => {
    const res = await request(app)
      .post(path)
      .set('Content-Type', 'application/json')
      .send('{"incomplete":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' },
    });
    expect(JSON.stringify(res.body)).not.toContain('incomplete');

    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: 'ok' });
  });

  test('unexpected errors return a generic 500 without leaking internal details', async () => {
    const testApp = express();

    testApp.get('/trigger-error', (req, res, next) => {
      const err = new Error('secret database connection string');
      err.stack = 'SECRET_STACK_TRACE';
      next(err);
    });

    testApp.use(errorHandler);

    const res = await request(testApp).get('/trigger-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
      },
    });
    expect(JSON.stringify(res.body)).not.toContain('secret database');
    expect(JSON.stringify(res.body)).not.toContain('SECRET_STACK_TRACE');
  });

  test('security headers are set (helmet)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('authenticate + requireRole middleware', () => {
  beforeAll(async () => {
    await startDB();
  });
  afterEach(async () => {
    await clearDB();
  });
  afterAll(async () => {
    await stopDB();
  });
  const testApp = express();
  testApp.get('/faculty-only', authenticate, requireRole(ROLES.FACULTY), (req, res) => res.json(req.user));
  testApp.use(errorHandler);

  test('no token -> 401 NOT_AUTHENTICATED', async () => {
    const res = await request(testApp).get('/faculty-only');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
  });

  test('invalid token -> 401', async () => {
    const res = await request(testApp).get('/faculty-only').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });

  test('wrong role -> 403 ACCESS_DENIED', async () => {
    const student = await tokenFor(ROLES.STUDENT);
    const res = await request(testApp).get('/faculty-only').set('Authorization', `Bearer ${student.token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toEqual({ code: 'ACCESS_DENIED', message: 'Access denied' });
  });

  test('right role -> passes and req.user = { id, role }', async () => {
    const faculty = await tokenFor(ROLES.FACULTY);
    const res = await request(testApp).get('/faculty-only').set('Authorization', `Bearer ${faculty.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: faculty.id, role: 'Faculty' });
  });
});
