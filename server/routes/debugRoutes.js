const express = require('express');
const { captureError, isSentryEnabled } = require('../config/sentry');

const router = express.Router();

/**
 * Assignment helper: capture one sample error so Sentry Issues can be verified.
 * GET /api/debug/sentry
 */
router.get('/sentry', (req, res) => {
  const err = new Error('TrustLink AI sample Sentry error — assignment verification');
  err.statusCode = 500;
  const captured = captureError(err);

  res.status(500).json({
    message: 'Sample error captured for Sentry verification',
    sentry: {
      configured: isSentryEnabled(),
      captured,
      hint: captured
        ? 'Open Sentry → Issues. You should see “TrustLink AI sample Sentry error — assignment verification”.'
        : 'Set SENTRY_DSN in server/.env, restart the API, then open this URL again.',
    },
  });
});

module.exports = router;
