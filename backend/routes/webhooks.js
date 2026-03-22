const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');

const router = express.Router();

// Validate the request actually came from Twilio
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

// Normalize a phone number to E.164 (+1XXXXXXXXXX)
function normalizePhone(raw) {
  return raw.replace(/^whatsapp:/, '').replace(/[^\d+]/g, '') || null;
}

const COMMANDS = {
  // English
  'OPEN':         'Open',
  'CLOSED':       'Closed',
  'CLOSE':        'Closed',
  'BACK SOON':    'Back Soon',
  'SOON':         'Back Soon',
  'OPENING LATE': 'Opening Late',
  'LATE':         'Opening Late',
  'SOLD OUT':     'Sold Out',
  // Spanish
  'ABIERTO':      'Open',
  'CERRADO':      'Closed',
  'PRONTO':       'Back Soon',
  'TARDE':        'Opening Late',
  'AGOTADO':      'Sold Out',
};

const HELP_TEXT =
  'Abierto commands:\n' +
  'OPEN / ABIERTO\n' +
  'CLOSED / CERRADO\n' +
  'BACK SOON / PRONTO\n' +
  'LATE / TARDE\n' +
  'SOLD OUT / AGOTADO\n' +
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

    const from  = normalizePhone(req.body.From || '');
    const body  = (req.body.Body || '').trim().toUpperCase();

    if (!from) return res.send(twiml('Could not identify your number.'));

    // Look up business by owner phone
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

    // STATUS query
    if (body === 'STATUS' || body === 'ESTADO') {
      return res.send(twiml(`${business.name} is currently: ${business.status || 'No status set'}`));
    }

    // HELP
    if (body === 'HELP' || body === 'AYUDA') {
      return res.send(twiml(HELP_TEXT));
    }

    // Match command
    const newStatus = COMMANDS[body];
    if (!newStatus) {
      return res.send(twiml(
        `Unknown command: "${req.body.Body}"\n\nReply HELP for a list of commands.`
      ));
    }

    // Update status
    await db.run(
      `UPDATE business_status SET status = ?, note = NULL, updated_at = datetime('now')
       WHERE business_id = ?`,
      [newStatus, business.id]
    );

    res.send(twiml(`✓ ${business.name} is now set to: ${newStatus}`));
  } catch (err) {
    console.error(err);
    res.send(twiml('Something went wrong. Please try again.'));
  }
});

module.exports = router;
