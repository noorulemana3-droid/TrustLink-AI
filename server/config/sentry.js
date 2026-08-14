let enabled = false;

const initSentry = () => {
  const dsn = String(process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    console.warn('[TrustLink] SENTRY_DSN not set — Sentry error tracking is off');
    return false;
  }

  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  enabled = true;
  console.log('[TrustLink] Sentry error tracking enabled');
  return true;
};

const setupSentryErrorHandler = (app) => {
  if (!enabled) return;
  const Sentry = require('@sentry/node');
  if (typeof Sentry.setupExpressErrorHandler === 'function') {
    Sentry.setupExpressErrorHandler(app);
  }
};

const captureError = (err) => {
  if (!enabled || !err) return false;
  const Sentry = require('@sentry/node');
  Sentry.captureException(err);
  return true;
};

const isSentryEnabled = () => enabled;

module.exports = {
  initSentry,
  setupSentryErrorHandler,
  captureError,
  isSentryEnabled,
};
