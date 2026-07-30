/**
 * webhooks.js — status updates by WhatsApp / SMS (Twilio).
 *
 * An owner texts "OPEN" (or "ABIERTO", "CLOSED", "LUNCH"…) to Abierto's WhatsApp number
 * and their public status changes instantly. That's a far easier ask of a busy restaurant
 * than logging into a dashboard, which is why status freshness lives or dies here.
 *
 * Setup is configuration, not code — see docs/WHATSAPP_STATUS.md.
 *
 * Two bugs were fixed here on 2026-07-30. Each one INDIVIDUALLY made the whole feature a
 * silent no-op, and both are easy to reintroduce:
 *
 *   1. PHONE MATCHING. The signup form stores a display-formatted number,
 *      "(787) 555-1234". Twilio sends "whatsapp:+17875551234". The old lookup was
 *      `WHERE b.phone = ?`, which can never match — so every owner got "your number is not
 *      linked to any business", forever. Matching is now on the last 10 digits, with
 *      formatting stripped on both sides.
 *
 *   2. quick_override. utils/status.js#computeStatus IGNORES the stored status whenever the
 *      business has hours for today (92% of them do) unless quick_override is set. The old
 *      code never set it, so an owner's "CLOSED" was accepted, stored, and then silently
 *      overruled by the schedule. Command-driven updates now set quick_override = 1,
 *      matching the dashboard's quick-toggle semantics.
 */

const express = require('express');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const { getViequesNow, computeStatus } = require('../utils/status');

const router = express.Router();

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function twiml(message) {
  // The owner's own message is echoed back on an unknown command, so it must be escaped —
  // an unescaped '&' or '<' produces invalid TwiML and Twilio delivers nothing at all.
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

// A public, unauthenticated endpoint. Twilio retries on failure, so a stuck loop or a
// spammer shouldn't be able to hammer the database.
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.set('Content-Type', 'text/xml');
    res.status(429).send(twiml('Too many messages. Please wait a moment and try again.'));
  },
});

/**
 * Verify the request really came from Twilio.
 * Returns false rather than throwing — timingSafeEqual raises on a length mismatch, and a
 * missing or truncated header must be a clean 403, not a 500 dressed up as success.
 */
function validateTwilioSignature(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // not configured yet (local dev)

  const signature = req.headers['x-twilio-signature'];
  if (typeof signature !== 'string' || !signature) return false;

  // Twilio signs the URL it was configured with. Behind Cloudflare + Render, req.protocol
  // reflects x-forwarded-proto (app.js sets 'trust proxy'), which is what we want.
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const params = req.body || {};
  const paramString = Object.keys(params).sort().reduce((s, k) => s + k + params[k], '');

  const expected = crypto
    .createHmac('sha1', authToken)
    .update(url + paramString)
    .digest('base64');

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Last 10 significant digits of a phone number, from any format.
 * "whatsapp:+1 (787) 555-1234" → "7875551234"
 * Comparing on 10 digits makes the match independent of country code and punctuation.
 */
function phoneDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

// Strips in SQL the same characters phoneDigits() strips in JS, so a stored
// "(787) 555-1234" can be compared against an incoming "7875551234".
const SQL_PHONE_DIGITS = `
  replace(replace(replace(replace(replace(replace(b.phone,
    '(',''), ')',''), '-',''), ' ',''), '+',''), '.','')
`;

const COMMANDS = {
  // English
  'OPEN':     'Open',
  'CLOSED':   'Closed',
  'CLOSE':    'Closed',
  'LUNCH':    'Out to Lunch',
  'SEASON':   'Closed for the Season',
  // Spanish
  'ABIERTO':  'Open',
  'CERRADO':  'Closed',
  'ALMUERZO': 'Out to Lunch',
  'TEMPORADA':'Closed for the Season',
};

const HELP_TEXT =
  'Abierto commands:\n' +
  'OPEN / ABIERTO — open now\n' +
  'CLOSED / CERRADO — closed\n' +
  'LUNCH / ALMUERZO — out to lunch\n' +
  'SEASON / TEMPORADA — closed for the season\n' +
  'STATUS / ESTADO — see current status';

/** What the public actually sees right now — hours and override expiry included. */
async function publicStatus(business) {
  const { dayOfWeek, timeStr } = getViequesNow();
  const todayHours = await db.get(
    `SELECT open_time, close_time, is_closed FROM business_hours
     WHERE business_id = ? AND day_of_week = ?`,
    [business.id, dayOfWeek]
  );
  return computeStatus(
    business.status, business.return_time, todayHours || null,
    timeStr, business.quick_override, business.status_updated_at
  );
}

// POST /api/webhooks/twilio  (WhatsApp + SMS)
router.post('/twilio', webhookRateLimiter, async (req, res) => {
  res.set('Content-Type', 'text/xml');

  try {
    if (!validateTwilioSignature(req)) {
      return res.status(403).send(twiml('Unauthorized.'));
    }

    const digits = phoneDigits(req.body?.From);
    const raw = (req.body?.Body || '').trim();
    const body = raw.toUpperCase();

    if (!digits) return res.send(twiml('Could not identify your number.'));

    const business = await db.get(
      `SELECT b.id, b.name, s.status, s.return_time, s.quick_override,
              s.updated_at AS status_updated_at
       FROM businesses b
       LEFT JOIN business_status s ON s.business_id = b.id
       WHERE b.is_active = 1 AND ${SQL_PHONE_DIGITS} = ?
       LIMIT 1`,
      [digits]
    );

    if (!business) {
      return res.send(twiml(
        'Your number is not linked to any business on Abierto. ' +
        'Ask your admin to add your number in the dashboard.'
      ));
    }

    if (body === 'STATUS' || body === 'ESTADO') {
      return res.send(twiml(`${business.name} is currently: ${await publicStatus(business)}`));
    }

    if (body === 'HELP' || body === 'AYUDA') {
      return res.send(twiml(HELP_TEXT));
    }

    const newStatus = COMMANDS[body];
    if (!newStatus) {
      return res.send(twiml(`Unknown command: "${raw}"\n\nReply HELP for a list of commands.`));
    }

    // quick_override = 1 so the schedule doesn't immediately overrule the owner.
    // computeStatus expires the override at the end of the Vieques day, so a business can
    // never be stuck "Open" indefinitely because of one forgotten message.
    const result = await db.run(
      `UPDATE business_status
          SET status = ?, quick_override = 1, note = NULL,
              return_time = NULL, return_date = NULL, updated_at = datetime('now')
        WHERE business_id = ?`,
      [newStatus, business.id]
    );

    // A business with no business_status row yet would otherwise get a cheerful
    // confirmation for an update that changed nothing.
    if (!result.changes) {
      await db.run(
        `INSERT INTO business_status (business_id, status, quick_override, updated_at)
         VALUES (?, ?, 1, datetime('now'))`,
        [business.id, newStatus]
      );
    }

    res.send(twiml(`${business.name} is now: ${newStatus}`));
  } catch (err) {
    console.error('Twilio webhook error:', err);
    res.send(twiml('Something went wrong. Please try again.'));
  }
});

module.exports = router;
module.exports.phoneDigits = phoneDigits;
module.exports.COMMANDS = COMMANDS;
