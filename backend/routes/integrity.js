const express = require('express');
const { GoogleAuth } = require('google-auth-library');
const router = express.Router();

const PACKAGE_NAME = 'com.abierto.app';
const INTEGRITY_URL = `https://playintegrity.googleapis.com/v1/${PACKAGE_NAME}:decodeIntegrityToken`;

let authClient = null;

async function getAuthClient() {
  if (authClient) return authClient;
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!json) return null;
  const credentials = JSON.parse(json);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/playintegrity'],
  });
  authClient = await auth.getClient();
  return authClient;
}

// POST /api/integrity/verify
// Called by the web app immediately after launch with the token passed from the Android app.
// Fire-and-forget from the client's perspective — failures are silent.
router.post('/verify', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.length > 6000) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  const client = await getAuthClient().catch(() => null);
  if (!client) {
    // Service account not configured — skip verification (dev / unlinked env)
    return res.json({ verified: false, reason: 'not_configured' });
  }

  try {
    const response = await client.request({
      url: INTEGRITY_URL,
      method: 'POST',
      data: { integrity_token: token },
    });

    const payload = response.data?.tokenPayloadExternal;
    const appVerdict = payload?.appIntegrity?.appRecognitionVerdict;
    const deviceVerdicts = payload?.deviceIntegrity?.deviceRecognitionVerdict ?? [];
    const licenseVerdict = payload?.accountDetails?.appLicensingVerdict;

    const appRecognized = appVerdict === 'PLAY_RECOGNIZED';
    const deviceSafe = deviceVerdicts.includes('MEETS_DEVICE_INTEGRITY');

    if (!appRecognized) {
      console.warn(`[integrity] unrecognized app — verdict: ${appVerdict}`);
    }

    res.json({
      verified: appRecognized,
      appVerdict,
      deviceSafe,
      licenseVerdict,
    });
  } catch (err) {
    console.error('[integrity] verify error:', err.message);
    res.status(502).json({ error: 'Verification failed' });
  }
});

module.exports = router;
