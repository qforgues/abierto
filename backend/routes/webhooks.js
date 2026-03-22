const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');

const router = express.Router();

function validateTwilioSignature(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // skip in dev if not set

  const signature = req.headers['x-twilio-signature'] || '';
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  const params = req.body;
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys.reduce((s, k) => s + k + params[k], '');

  const expected = crypto
    .createHmac('sha1', authToken)
    .update(url + paramString)
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function normalizePhone(raw) {
  return raw.replace(/^whatsapp:/, '').replace(/[^\d+]/g, '') || null;
}

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
  'STATUS — see current status';

function twiml(message) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
}

// POST /api/webhooks/twilio  (SMS + WhatsApp)
router.post('/twilio', async (req, res) => {
  res.set('Content-Type', 'text/xml');

  try {
    if (!validateTwilioSignature(req)) {
      return res.status(403).send(twiml('Unauthorized.'));
    }

    const from = normalizePhone(req.body.From || '');
    const body = (req.body.Body || '').trim().toUpperCase();

    if (!from) return res.send(twiml('Could not identify your number.'));

    const business = await db.get(
      `SELECT b.id, b.name, s.status
       FROM businesses b
       LEFT JOIN business_status s ON s.business_id = b.id
       WHERE b.phone = ? AND b.is_active = 1`,
      [from]
    );

    if (!business) {
      return res.send(twiml(
        'Your number is not linked to any business on Abierto. ' +
        'Ask your admin to add your number in the dashboard.'
      ));
    }

    if (body === 'STATUS' || body === 'ESTADO') {
      return res.send(twiml(`${business.name} is currently: ${business.status || 'No status set'}`));
    }

    if (body === 'HELP' || body === 'AYUDA') {
      return res.send(twiml(HELP_TEXT));
    }

    const newStatus = COMMANDS[body];
    if (!newStatus) {
      return res.send(twiml(
        `Unknown command: "${req.body.Body}"\n\nReply HELP for a list of commands.`
      ));
    }

    await db.run(
      `UPDATE business_status
       SET status = ?, note = NULL, return_time = NULL, return_date = NULL, updated_at = datetime('now')
       WHERE business_id = ?`,
      [newStatus, business.id]
    );

    res.send(twiml(`✓ ${business.name} is now: ${newStatus}`));
  } catch (err) {
    console.error(err);
    res.send(twiml('Something went wrong. Please try again.'));
  }
});

module.exports = router;
