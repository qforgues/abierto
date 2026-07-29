/**
 * QR Code Library tests — the admin-facing download interface.
 *
 * Covers the two things that matter: the listing is usable by a non-engineer, and the
 * file-serving route cannot be talked into serving something outside marketing/qr/.
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../middleware/auth');
const qrRouter = require('../routes/qr');
const { CAMPAIGNS } = require('../config/appLinks');

const app = express();
app.use(require('cookie-parser')());
app.use('/api/qr', qrRouter);

const adminToken = jwt.sign({ role: 'admin', username: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

const PRINTABLE = Object.entries(CAMPAIGNS)
  .filter(([, m]) => m.printable !== false)
  .map(([slug]) => slug);

describe('authentication', () => {
  test('the library requires an admin session', async () => {
    expect((await request(app).get('/api/qr')).status).toBe(401);
  });

  test('downloads require an admin session', async () => {
    expect((await request(app).get('/api/qr/ceiba-ferry/svg')).status).toBe(401);
  });

  test('a non-admin session is forbidden', async () => {
    const ownerToken = jwt.sign({ role: 'owner', businessId: 1 }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/qr').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/qr — the listing', () => {
  let body;
  beforeAll(async () => { body = (await asAdmin(request(app).get('/api/qr'))).body; });

  test('lists every printable campaign and excludes non-printable ones', () => {
    expect(body.codes.map(c => c.campaign).sort()).toEqual([...PRINTABLE].sort());
    expect(body.codes.map(c => c.campaign)).not.toContain('direct');
  });

  test('each entry is understandable without reading the repo', () => {
    for (const c of body.codes) {
      expect(c.label).toBeTruthy();
      expect(c.usage).toBeTruthy();          // where it goes, in plain language
      expect(c.url).toMatch(/^https?:\/\/.+\/go\/[a-z0-9-]+$/);
      expect(c.behaviour.android).toMatch(/Google Play/);
      expect(c.behaviour.ios).toBeTruthy();
      expect(c.behaviour.desktop).toBeTruthy();
      expect(c.behaviour.alreadyHadApp).toMatch(/not counted as a new download/i);
    }
  });

  test('download filenames are human-readable, not opaque ids', () => {
    for (const c of body.codes) {
      expect(c.filenames.svg).toBe(`abierto-qr-${c.campaign}.svg`);
      expect(c.filenames.png2048).toBe(`abierto-qr-${c.campaign}-2048.png`);
    }
  });

  test('no campaign URL points at an app store', () => {
    for (const c of body.codes) {
      expect(c.url).not.toMatch(/play\.google\.com|apps\.apple\.com/);
    }
  });

  test('reports the generated print spec', () => {
    for (const c of body.codes.filter(c => c.generated)) {
      expect(c.spec.errorCorrectionLevel).toBe('Q');
      expect(c.spec.quietZoneModules).toBe(4);
      expect(c.spec.modules).toBeGreaterThan(20);
    }
  });
});

describe('GET /api/qr/:campaign/:format — downloads', () => {
  test('serves the SVG with a human-readable filename', async () => {
    const res = await asAdmin(request(app).get('/api/qr/ceiba-ferry/svg'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/svg/);
    expect(res.headers['content-disposition']).toBe('attachment; filename="abierto-qr-ceiba-ferry.svg"');
    // supertest buffers image/* as binary, so the body is a Buffer rather than res.text.
    expect(res.body.toString('utf-8')).toContain('<svg');
  });

  test('serves PNGs', async () => {
    const res = await asAdmin(request(app).get('/api/qr/ceiba-ferry/png2048'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/png/);
    expect(res.headers['content-disposition']).toContain('abierto-qr-ceiba-ferry-2048.png');
  });

  test('every printable campaign has a downloadable SVG', async () => {
    for (const slug of PRINTABLE) {
      const res = await asAdmin(request(app).get(`/api/qr/${slug}/svg`));
      expect([slug, res.status]).toEqual([slug, 200]);
    }
  });

  test('rejects the non-printable "direct" bucket', async () => {
    expect((await asAdmin(request(app).get('/api/qr/direct/svg'))).status).toBe(404);
  });

  test('rejects unknown formats', async () => {
    expect((await asAdmin(request(app).get('/api/qr/ceiba-ferry/exe'))).status).toBe(404);
  });

  test.each([
    ['..%2f..%2f..%2fetc%2fpasswd'],
    ['..'],
    ['....%2f....%2fpackage.json'],
    ['%2e%2e%2f%2e%2e%2fbackend%2f.env'],
    ['ceiba-ferry%00'],
  ])('cannot be walked out of marketing/qr with %s', async (evil) => {
    const res = await asAdmin(request(app).get(`/api/qr/${evil}/svg`));
    expect(res.status).toBe(404);
    expect(res.text).not.toMatch(/root:|JWT_SECRET|TURSO/);
  });

  test('the served bytes match the file on disk', async () => {
    const res = await asAdmin(request(app).get('/api/qr/social/svg'));
    const onDisk = fs.readFileSync(
      path.join(__dirname, '..', '..', 'marketing', 'qr', 'social', 'abierto-social.svg'), 'utf-8'
    );
    expect(res.body.toString('utf-8')).toBe(onDisk);
  });
});
