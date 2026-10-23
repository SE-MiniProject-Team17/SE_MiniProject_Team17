
const express = require('express');
const request = require('supertest');
const requireResourceAccess = require('../src/middleware/requireResourceAccess');
const { errorHandler } = require('../src/middleware/errorHandler');

describe('requireResourceAccess middleware', () => {
  function createApp({
    userId = 'user-1',
    resource = { owner: 'user-1' },
    hasAccess,
  } = {}) {
    const app = express();

    // Isolate resource authorization from authentication.
    app.use((req, res, next) => {
      req.user = userId ? { id: userId, role: 'Student' } : undefined;
      next();
    });

    app.get(
      '/resource',
      requireResourceAccess({
        getResource: async () => resource,
        hasAccess,
      }),
      (req, res) => {
        res.status(200).json({ allowed: true });
      }
    );

    app.use(errorHandler);
    return app;
  }

  test('allows the resource owner', async () => {
    const response = await request(createApp()).get('/resource');

    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(true);
  });

  test('denies a user who does not own the resource', async () => {
    const response = await request(
      createApp({
        userId: 'user-2',
        resource: { owner: 'user-1' },
      })
    ).get('/resource');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCESS_DENIED');
  });

  test('denies access when the resource does not exist', async () => {
    const response = await request(
      createApp({ resource: null })
    ).get('/resource');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCESS_DENIED');
  });

  test('denies access when there is no authenticated user', async () => {
    const response = await request(
      createApp({ userId: null })
    ).get('/resource');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCESS_DENIED');
  });

  test('allows a non-owner when an access grant authorizes them', async () => {
    const response = await request(
      createApp({
        userId: 'user-2',
        resource: { owner: 'user-1' },
        hasAccess: async (req) => req.user.id === 'user-2',
      })
    ).get('/resource');

    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(true);
  });

  test('denies a non-owner when an access grant rejects them', async () => {
    const response = await request(
      createApp({
        userId: 'user-2',
        resource: { owner: 'user-1' },
        hasAccess: async () => false,
      })
    ).get('/resource');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCESS_DENIED');
  });

  
  test('supports a Mongoose-style owner object', async () => {
    const response = await request(
      createApp({
        userId: 'user-1',
        resource: { owner: { _id: 'user-1' } },
      })
    ).get('/resource');

    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(true);
  });

  test('forwards access-grant errors to the error handler', async () => {
    const response = await request(
      createApp({
        userId: 'user-2',
        resource: { owner: 'user-1' },
        hasAccess: async () => {
          throw new Error('Access lookup failed');
        },
      })
    ).get('/resource');

    expect(response.status).toBe(500);
  });
});
