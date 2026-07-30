/**
 * WhatsApp / SMS status-update tests.
 *
 * This feature shipped broken twice over — the phone lookup could never match, and the
 * status it wrote was silently overruled by the schedule. Both were invisible: the owner
 * got a plausible reply either way. These tests exist so neither can come back quietly.
 */

const express = require('express');
const request = require('supertest');

const webhookRouter = require('../routes/webhooks');
const { phoneDigits } = require('../routes/webhooks');
const { computeStatus, getViequesNow } = require('../utils/status');
const db = require('../db/database');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/api/webhooks', webhookRouter);

const send = (From, Body) =>
  request(app).post('/api/webhooks/twilio').type('form').send({ From, Body });

// A display-formatted number, exactly as the signup form stores it.
const STORED_PHONE = '(787) 555-0142';
const WA_FROM = 'whatsapp:+17875550142';
const BIZ = 'Jest Probe Cantina';
let bizId;

describe('phoneDigits', () => {
  test.each([
    ['whatsapp:+17875550142', '7875550142'],
    ['+1 (787) 555-0142',     '7875550142'],
    ['(787) 555-0142',        '7875550142'],
    ['787.555.0142',          '7875550142'],
    ['7875550142',            '7875550142'],
    ['sms:+17875550142',      '7875550142'],
  ])('normalises %s', (input, expected) => {
    expect(phoneDigits(input)).toBe(expected);
  });

  test('rejects anything too short to be a number', () => {
    expect(phoneDigits('12345')).toBeNull();
    expect(phoneDigits('')).toBeNull();
    expect(phoneDigits(undefined)).toBeNull();
    expect(phoneDigits(null)).toBeNull();
  });

  test('the stored display format and the Twilio format normalise to the same thing', () => {
    // This is the exact mismatch that made the feature a no-op.
    expect(phoneDigits(STORED_PHONE)).toBe(phoneDigits(WA_FROM));
  });
});

describe('WhatsApp status commands', () => {
  beforeAll(async () => {
    await db.run(`DELETE FROM business_status WHERE business_id IN
                    (SELECT id FROM businesses WHERE name = ?)`, [BIZ]);
    await db.run('DELETE FROM businesses WHERE name = ?', [BIZ]);
    const r = await db.run(
      `INSERT INTO businesses (name, category, code, phone, is_active, island)
       VALUES (?, 'Restaurant', 'JPC', ?, 1, 'vieques')`,
      [BIZ, STORED_PHONE]
    );
    bizId = r.id;
    await db.run(
      `INSERT INTO business_status (business_id, status, quick_override)
       VALUES (?, 'Closed', 0)`, [bizId]
    );
    // Hours for EVERY day, open 09:00-17:00 — this is what silently overruled the owner.
    for (let d = 0; d < 7; d++) {
      await db.run(
        `INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, '09:00', '17:00', 0)`, [bizId, d]
      );
    }
  });

  afterAll(async () => {
    await db.run('DELETE FROM business_hours  WHERE business_id = ?', [bizId]);
    await db.run('DELETE FROM business_status WHERE business_id = ?', [bizId]);
    await db.run('DELETE FROM businesses      WHERE id = ?', [bizId]);
    await db.close();
  });

  test('finds the business despite the stored number being display-formatted', async () => {
    const res = await send(WA_FROM, 'STATUS');
    expect(res.status).toBe(200);
    expect(res.text).toContain(BIZ);
    expect(res.text).not.toMatch(/not linked/i);
  });

  test.each([
    ['OPEN', 'Open'], ['ABIERTO', 'Open'],
    ['CLOSED', 'Closed'], ['CERRADO', 'Closed'], ['CLOSE', 'Closed'],
    ['LUNCH', 'Out to Lunch'], ['ALMUERZO', 'Out to Lunch'],
    ['SEASON', 'Closed for the Season'], ['TEMPORADA', 'Closed for the Season'],
  ])('"%s" sets the status to %s', async (cmd, expected) => {
    const res = await send(WA_FROM, cmd);
    expect(res.text).toContain(`is now: ${expected}`);
    const row = await db.get('SELECT status FROM business_status WHERE business_id = ?', [bizId]);
    expect(row.status).toBe(expected);
  });

  test('is case- and whitespace-insensitive', async () => {
    await send(WA_FROM, '  open  ');
    const row = await db.get('SELECT status FROM business_status WHERE business_id = ?', [bizId]);
    expect(row.status).toBe('Open');
  });

  test('sets quick_override so the schedule cannot overrule the owner', async () => {
    // The regression: without quick_override, computeStatus discards `stored` entirely
    // whenever hours exist for today — and this business has hours every day.
    await send(WA_FROM, 'CLOSED');
    const row = await db.get(
      `SELECT status, quick_override, updated_at FROM business_status WHERE business_id = ?`,
      [bizId]
    );
    expect(row.status).toBe('Closed');
    expect(row.quick_override).toBe(1);

    const { dayOfWeek, timeStr } = getViequesNow();
    const hours = await db.get(
      `SELECT open_time, close_time, is_closed FROM business_hours
       WHERE business_id = ? AND day_of_week = ?`, [bizId, dayOfWeek]
    );
    // What the public would actually see.
    const shown = computeStatus('Closed', null, hours, timeStr, row.quick_override, row.updated_at);
    expect(shown).toBe('Closed');

    // Proof the guard is what's doing the work: with quick_override off, the schedule wins.
    const withoutOverride = computeStatus('Closed', null, hours, timeStr, 0, row.updated_at);
    const inHours = timeStr >= '09:00' && timeStr < '17:00';
    expect(withoutOverride).toBe(inHours ? 'Open' : 'Closed');
  });

  test('STATUS reports the computed public status, not the raw stored value', async () => {
    await send(WA_FROM, 'OPEN');
    const res = await send(WA_FROM, 'STATUS');
    expect(res.text).toMatch(/is currently: (Open|Closed)/);
  });

  test('HELP and AYUDA list the commands', async () => {
    for (const cmd of ['HELP', 'AYUDA']) {
      const res = await send(WA_FROM, cmd);
      expect(res.text).toMatch(/OPEN \/ ABIERTO/);
    }
  });

  test('an unknown command explains itself without changing anything', async () => {
    await send(WA_FROM, 'OPEN');
    const res = await send(WA_FROM, 'PIZZA');
    expect(res.text).toMatch(/Unknown command/);
    expect(res.text).toMatch(/HELP/);
    const row = await db.get('SELECT status FROM business_status WHERE business_id = ?', [bizId]);
    expect(row.status).toBe('Open');
  });

  test('an unrecognised number is told so, and changes nothing', async () => {
    const res = await send('whatsapp:+15550001111', 'CLOSED');
    expect(res.text).toMatch(/not linked/i);
    const row = await db.get('SELECT status FROM business_status WHERE business_id = ?', [bizId]);
    expect(row.status).toBe('Open');
  });

  test('a junk From is handled without a crash', async () => {
    const res = await send('whatsapp:+1', 'OPEN');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Could not identify/);
  });

  test('replies are valid, escaped TwiML even when the body contains XML', async () => {
    const res = await send(WA_FROM, '<Message>&"bad"</Message>');
    expect(res.headers['content-type']).toMatch(/xml/);
    expect(res.text).toMatch(/^<\?xml/);
    // The echoed body must be escaped or Twilio delivers nothing.
    expect(res.text).toContain('&lt;Message&gt;');
    expect(res.text).toContain('&amp;');
    // Exactly one real <Message> element — the injected one must not have opened another.
    expect(res.text.match(/<Message>/g)).toHaveLength(1);
  });

  test('an inactive business is not reachable', async () => {
    await db.run('UPDATE businesses SET is_active = 0 WHERE id = ?', [bizId]);
    const res = await send(WA_FROM, 'OPEN');
    expect(res.text).toMatch(/not linked/i);
    await db.run('UPDATE businesses SET is_active = 1 WHERE id = ?', [bizId]);
  });

  test('creates a status row if the business somehow has none', async () => {
    await db.run('DELETE FROM business_status WHERE business_id = ?', [bizId]);
    const res = await send(WA_FROM, 'OPEN');
    expect(res.text).toContain('is now: Open');
    const row = await db.get('SELECT status, quick_override FROM business_status WHERE business_id = ?', [bizId]);
    expect(row).not.toBeNull();
    expect(row.status).toBe('Open');
    expect(row.quick_override).toBe(1);
  });
});

describe('Twilio signature validation', () => {
  const OLD = process.env.TWILIO_AUTH_TOKEN;
  afterAll(() => {
    if (OLD === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = OLD;
  });

  test('rejects a request with no signature once a token is configured', async () => {
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    const res = await send(WA_FROM, 'OPEN');
    expect(res.status).toBe(403);
    expect(res.text).toMatch(/Unauthorized/);
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  test('a short signature is a clean 403, not a crash', async () => {
    // timingSafeEqual throws on a length mismatch; that must not surface as success.
    process.env.TWILIO_AUTH_TOKEN = 'test-token';
    const res = await request(app)
      .post('/api/webhooks/twilio').type('form')
      .set('X-Twilio-Signature', 'abc')
      .send({ From: WA_FROM, Body: 'OPEN' });
    expect(res.status).toBe(403);
    expect(res.text).not.toMatch(/went wrong/i);
    delete process.env.TWILIO_AUTH_TOKEN;
  });
});
