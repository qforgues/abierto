/**
 * Tests for the /download acquisition endpoint.
 *
 * The download router is a plain express.Router, so it can be mounted on a throwaway app
 * here — no server is started and app.js's initAndStart() never runs.
 *
 * Run just this suite:  cd backend && npx jest tests/download.test.js
 */

const express = require('express');
const request = require('supertest');

const downloadRouter = require('../routes/download');
const {
  normalizeCampaign, detectPlatform, androidUrlFor, isAbiertoApp, ANDROID_PACKAGE,
} = require('../config/appLinks');
const db = require('../db/database');

const app = express();
app.use('/', downloadRouter);

const UA = {
  android:  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  iphone:   'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipad:     'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
  mac:      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  windows:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  bot:      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  whatsapp: 'WhatsApp/2.23.20.0 A',
  unknown:  'SomeRandomScanner/1.0',
  empty:    '',
};

const PLAY = 'https://play.google.com/store/apps/details?id=com.abierto.app';

describe('platform detection', () => {
  test.each([
    ['android',  UA.android,  'android'],
    ['iphone',   UA.iphone,   'ios'],
    ['ipad',     UA.ipad,     'ios'],
    ['mac',      UA.mac,      'desktop'],
    ['windows',  UA.windows,  'desktop'],
    ['googlebot',UA.bot,      'bot'],
    ['whatsapp', UA.whatsapp, 'bot'],
    ['unknown',  UA.unknown,  'other'],
    ['empty',    UA.empty,    'other'],
  ])('classifies %s', (_name, ua, expected) => {
    expect(detectPlatform(ua)).toBe(expected);
  });

  test('handles a missing user-agent without throwing', () => {
    expect(detectPlatform(undefined)).toBe('other');
    expect(detectPlatform(null)).toBe('other');
    expect(detectPlatform(12345)).toBe('other');
  });
});

describe('“Already Had Abierto” (installed TWA) detection', () => {
  test('recognises our own package in X-Requested-With', () => {
    expect(ANDROID_PACKAGE).toBe('com.abierto.app');
    expect(isAbiertoApp('com.abierto.app')).toBe(true);
    expect(isAbiertoApp('  COM.ABIERTO.APP  ')).toBe(true);
  });

  test('does not match other apps or junk', () => {
    expect(isAbiertoApp('com.other.app')).toBe(false);
    expect(isAbiertoApp('com.abierto.app.evil')).toBe(false);
    expect(isAbiertoApp('XMLHttpRequest')).toBe(false);
    expect(isAbiertoApp(undefined)).toBe(false);
    expect(isAbiertoApp(null)).toBe(false);
    expect(isAbiertoApp(123)).toBe(false);
  });

  test('wins over the Android user-agent — an installed user is never a new Android scan', () => {
    expect(detectPlatform(UA.android, 'com.abierto.app')).toBe('twa');
    expect(detectPlatform(UA.android, undefined)).toBe('android');
  });

  test('is NOT sent to Google Play — it opens the app content instead', async () => {
    const res = await request(app)
      .get('/go/ceiba-ferry')
      .set('User-Agent', UA.android)
      .set('X-Requested-With', 'com.abierto.app');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/vieques');
    expect(res.headers.location).not.toContain('play.google.com');
  });

  test('a normal Android scan still goes to Play', async () => {
    const res = await request(app).get('/go/ceiba-ferry').set('User-Agent', UA.android);
    expect(res.headers.location).toContain('play.google.com');
  });
});

describe('campaign normalisation', () => {
  test('defaults to "direct" when absent', () => {
    expect(normalizeCampaign(undefined)).toEqual({ campaign: 'direct', known: true, rejected: false });
    expect(normalizeCampaign('')).toEqual({ campaign: 'direct', known: true, rejected: false });
  });

  test('accepts registered campaigns', () => {
    expect(normalizeCampaign('ceiba-ferry')).toEqual({ campaign: 'ceiba-ferry', known: true, rejected: false });
  });

  test('accepts an unregistered but well-formed slug so new posters still track', () => {
    expect(normalizeCampaign('brand-new-poster')).toEqual({
      campaign: 'brand-new-poster', known: false, rejected: false,
    });
  });

  test('lowercases and trims', () => {
    expect(normalizeCampaign('  Ceiba-Ferry  ').campaign).toBe('ceiba-ferry');
  });

  test.each([
    ["'; DROP TABLE download_clicks; --"],
    ['<script>alert(1)</script>'],
    ['../../etc/passwd'],
    ['a'.repeat(500)],
    ['has spaces'],
    ['-leading-dash'],
    ['emoji-🚀'],
    ['%00null'],
  ])('rejects garbage: %s', (garbage) => {
    const out = normalizeCampaign(garbage);
    expect(out.campaign).toBe('invalid');
    expect(out.rejected).toBe(true);
  });

  test('takes the first value when the param is repeated', () => {
    expect(normalizeCampaign(['ceiba-ferry', 'social']).campaign).toBe('ceiba-ferry');
  });
});

describe('GET /download — device routing', () => {
  test('Android redirects to Google Play', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.android);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(PLAY);
  });

  test('iPhone gets the Abierto-controlled page, NOT a dead App Store link', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.iphone);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/iPhone is coming/i);
    expect(res.text).toMatch(/Add to Home Screen/i);
    expect(res.text).not.toMatch(/apps\.apple\.com/);
  });

  test('desktop gets the landing page with all three options', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.mac);
    expect(res.status).toBe(200);
    expect(res.text).toContain('/download/android');
    expect(res.text).toContain('/download/web');
    expect(res.text).toMatch(/iPhone/i);
  });

  test('unknown device falls back to the landing page', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.unknown);
    expect(res.status).toBe(200);
    expect(res.text).toContain('/download/android');
  });

  test('no user-agent at all still returns a usable page', async () => {
    const res = await request(app).get('/download').set('User-Agent', '');
    expect(res.status).toBe(200);
  });

  test('bots get the landing page, never a Play redirect (keeps Play attribution clean)', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.bot);
    expect(res.status).toBe(200);
    expect(res.headers.location).toBeUndefined();
  });
});

describe('GET /download — campaign attribution', () => {
  test('campaign rides along into the Play referrer', async () => {
    const res = await request(app).get('/download?src=ceiba-ferry').set('User-Agent', UA.android);
    const referrer = decodeURIComponent(new URL(res.headers.location).searchParams.get('referrer'));
    expect(referrer).toContain('utm_campaign=ceiba-ferry');
    expect(referrer).toContain('utm_source=abierto');
    expect(referrer).toContain('utm_medium=qr');
  });

  test('different campaigns stay distinguishable', async () => {
    const a = await request(app).get('/download?src=ceiba-ferry').set('User-Agent', UA.android);
    const b = await request(app).get('/download?src=ferry-wifi').set('User-Agent', UA.android);
    expect(a.headers.location).not.toBe(b.headers.location);
    expect(a.headers.location).toContain('ceiba-ferry');
    expect(b.headers.location).toContain('ferry-wifi');
  });

  test('a garbage campaign cannot reach the redirect URL', async () => {
    const res = await request(app)
      .get('/download?src=' + encodeURIComponent("'; DROP TABLE download_clicks; --"))
      .set('User-Agent', UA.android);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('utm_campaign%3Dinvalid');
    expect(res.headers.location).not.toMatch(/DROP TABLE/i);
  });

  test('a garbage campaign cannot be reflected into the landing page HTML', async () => {
    const res = await request(app)
      .get('/download?src=' + encodeURIComponent('<script>alert(1)</script>'))
      .set('User-Agent', UA.mac);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('<script>alert(1)</script>');
  });

  test('utm_source works as a fallback for ?src=', async () => {
    const res = await request(app).get('/download?utm_source=social').set('User-Agent', UA.android);
    expect(res.headers.location).toContain('utm_campaign%3Dsocial');
  });

  test('missing campaign becomes "direct"', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.android);
    expect(res.headers.location).toContain('utm_campaign%3Ddirect');
  });
});

describe('URL aliases', () => {
  test.each(['/app', '/get', '/go'])('%s behaves like /download', async (path) => {
    const res = await request(app).get(path).set('User-Agent', UA.android);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(PLAY);
  });

  test('/go/:campaign carries the campaign in the path', async () => {
    const res = await request(app).get('/go/ceiba-ferry').set('User-Agent', UA.android);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('utm_campaign%3Dceiba-ferry');
  });

  test('/go/:campaign sanitises garbage too', async () => {
    const res = await request(app).get('/go/NOT..A..SLUG').set('User-Agent', UA.android);
    expect(res.headers.location).toContain('utm_campaign%3Dinvalid');
  });
});

describe('explicit destination choices', () => {
  test('/download/android redirects a desktop visitor to Play', async () => {
    const res = await request(app).get('/download/android?src=social').set('User-Agent', UA.mac);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain(PLAY);
    expect(res.headers.location).toContain('utm_medium%3Dweb');
  });

  test('/download/web sends people into the web app', async () => {
    const res = await request(app).get('/download/web?src=social').set('User-Agent', UA.mac);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/vieques');
  });

  test('/download/ios shows the coming-soon page while there is no iOS app', async () => {
    const res = await request(app).get('/download/ios?src=social').set('User-Agent', UA.mac);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/iPhone is coming/i);
  });
});

describe('caching + headers', () => {
  test('redirects are never cached, so the destination can change at any time', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.android);
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.headers.vary).toMatch(/User-Agent/i);
  });

  test('uses 302, never a permanent 301', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.android);
    expect(res.status).toBe(302);
    expect(res.status).not.toBe(301);
  });

  test('HTML pages are also uncacheable', async () => {
    const res = await request(app).get('/download').set('User-Agent', UA.mac);
    expect(res.headers['cache-control']).toMatch(/no-store/);
  });
});

describe('GET /download/status', () => {
  test('reports the live configuration', async () => {
    const res = await request(app).get('/download/status');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.androidDestination).toContain(PLAY);
    expect(res.body.iosAppExists).toBe(false);
    expect(res.body.campaigns).toContain('ceiba-ferry');
  });
});

describe('the iOS switch-over', () => {
  test('setting one value flips iPhone traffic to the App Store — no QR reprint', () => {
    jest.resetModules();
    process.env.IOS_APP_STORE_URL = 'https://apps.apple.com/us/app/abierto/id123456789';
    const fresh = require('../config/appLinks');
    expect(fresh.iosAppExists()).toBe(true);
    expect(fresh.iosUrlFor('ceiba-ferry')).toContain('apps.apple.com');
    expect(fresh.iosUrlFor('ceiba-ferry')).toContain('ct=ceiba-ferry');
    delete process.env.IOS_APP_STORE_URL;
    jest.resetModules();
  });

  test('androidUrlFor builds a valid absolute URL', () => {
    const url = new URL(androidUrlFor('ceiba-ferry'));
    expect(url.hostname).toBe('play.google.com');
    expect(url.searchParams.get('id')).toBe('com.abierto.app');
  });
});

describe('tracking writes', () => {
  const TEST_CAMPAIGN = 'jest-tracking-probe';

  beforeAll(async () => {
    await db.run(`CREATE TABLE IF NOT EXISTS download_clicks (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign    TEXT NOT NULL,
      platform    TEXT NOT NULL,
      destination TEXT NOT NULL,
      date        TEXT NOT NULL,
      ip_hash     TEXT,
      referer     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await db.run(`DELETE FROM download_clicks WHERE campaign = ?`, [TEST_CAMPAIGN]);
  });

  afterAll(async () => {
    await db.run(`DELETE FROM download_clicks WHERE campaign = ?`, [TEST_CAMPAIGN]);
    await db.close();
  });

  test('records campaign, platform and destination for each device class', async () => {
    await request(app).get(`/download?src=${TEST_CAMPAIGN}`).set('User-Agent', UA.android);
    await request(app).get(`/download?src=${TEST_CAMPAIGN}`).set('User-Agent', UA.iphone);
    await request(app).get(`/download?src=${TEST_CAMPAIGN}`).set('User-Agent', UA.mac);
    await request(app).get(`/download?src=${TEST_CAMPAIGN}`).set('User-Agent', UA.bot);
    await request(app).get(`/download?src=${TEST_CAMPAIGN}`)
      .set('User-Agent', UA.android).set('X-Requested-With', 'com.abierto.app');

    // Tracking is fire-and-forget after the response — give the writes a moment.
    await new Promise(r => setTimeout(r, 250));

    const rows = await db.all(
      `SELECT platform, destination FROM download_clicks WHERE campaign = ? ORDER BY id`,
      [TEST_CAMPAIGN]
    );
    expect(rows).toHaveLength(5);
    expect(rows.map(r => `${r.platform}:${r.destination}`)).toEqual([
      'android:play',
      'ios:ios_coming_soon',
      'desktop:landing',
      'bot:landing',
      'twa:already_installed',
    ]);
  });

  test('an installed-app scan is never counted as an Android acquisition', async () => {
    const rows = await db.all(
      `SELECT platform FROM download_clicks WHERE campaign = ? AND destination = 'play'`,
      [TEST_CAMPAIGN]
    );
    expect(rows.every(r => r.platform === 'android')).toBe(true);
    const twa = await db.all(
      `SELECT destination FROM download_clicks WHERE campaign = ? AND platform = 'twa'`,
      [TEST_CAMPAIGN]
    );
    expect(twa.every(r => r.destination === 'already_installed')).toBe(true);
  });

  test('the pre-print verifier does not write fake scans', async () => {
    const before = await db.get(
      `SELECT COUNT(*) AS c FROM download_clicks WHERE campaign = ?`, [TEST_CAMPAIGN]
    );
    await request(app)
      .get(`/download?src=${TEST_CAMPAIGN}`)
      .set('User-Agent', UA.android)
      .set('X-Abierto-Check', '1');
    await new Promise(r => setTimeout(r, 250));
    const after = await db.get(
      `SELECT COUNT(*) AS c FROM download_clicks WHERE campaign = ?`, [TEST_CAMPAIGN]
    );
    expect(after.c).toBe(before.c);
  });

  test('the check header still returns a real, correct redirect', async () => {
    const res = await request(app)
      .get('/download?src=ceiba-ferry')
      .set('User-Agent', UA.android)
      .set('X-Abierto-Check', '1');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('utm_campaign%3Dceiba-ferry');
  });

  test('stores no raw IP and no user-agent string', async () => {
    const row = await db.get(
      `SELECT * FROM download_clicks WHERE campaign = ? LIMIT 1`, [TEST_CAMPAIGN]
    );
    expect(row.ip_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(Object.keys(row)).not.toContain('user_agent');
    expect(Object.keys(row)).not.toContain('ip');
  });
});
