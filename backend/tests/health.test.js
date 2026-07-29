/**
 * Health check tests.
 *
 * Replaces the old suite, which imported the now-deleted backend/server.js — a dead
 * second Express app that started listening on import (EADDRINUSE) and queried an
 * `owners` table that no longer exists. This mounts the real router the way app.js does,
 * without starting a server.
 */

const express = require('express');
const request = require('supertest');
const healthRouter = require('../routes/health');

const app = express();
app.use('/api', healthRouter);
app.use('/', healthRouter);
// Stand-in for the SPA fallback, to prove /health is matched BEFORE it.
app.get('*', (req, res) => res.status(200).type('html').send('<!DOCTYPE html><html></html>'));

describe.each(['/api/health', '/health'])('GET %s', (path) => {
  test('returns 200 with a healthy status and ISO timestamp', async () => {
    const res = await request(app).get(path);
    expect(res.status).toBe(200);
    expect(res.type).toBe('application/json');
    expect(res.body.status).toBe('healthy');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  test('is JSON, not the SPA HTML fallback', async () => {
    // The Dockerfile HEALTHCHECK curls this path. If the SPA fallback answers it, the
    // check passes with 200 forever even when the app is completely broken.
    const res = await request(app).get(path);
    expect(res.text).not.toMatch(/<!DOCTYPE html>/i);
  });
});
