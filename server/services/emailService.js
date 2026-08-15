const dns = require('node:dns');
const nodemailer = require('nodemailer');

const smtpUser = () =>
  String(process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
const smtpPass = () =>
  String(process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '');
const smtpHost = () => String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const smtpPort = () => Number(process.env.SMTP_PORT || 465);
const smtpSecure = () =>
  process.env.SMTP_SECURE === 'false' ? false : smtpPort() === 465 || process.env.SMTP_SECURE === 'true';

const isEmailConfigured = () => Boolean(smtpUser() && smtpPass());

const isProduction = () => process.env.NODE_ENV === 'production';

const SEND_TIMEOUT_MS = 12000;

const fromAddress = () => {
  const from = String(process.env.SMTP_FROM || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (from) return from;
  const user = smtpUser();
  return user ? `TrustLink AI <${user}>` : 'TrustLink AI <noreply@trustlink.ai>';
};

/** Cloud hosts often hang on IPv6 to smtp.gmail.com — force IPv4. */
const lookupIpv4 = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
};

const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      setTimeout(() => reject(err), ms);
    }),
  ]);

const transportOptions = ({ port, secure }) => ({
  host: smtpHost(),
  port,
  secure,
  requireTLS: !secure,
  auth: { user: smtpUser(), pass: smtpPass() },
  connectionTimeout: 10000,
  greetingTimeout: 8000,
  socketTimeout: 15000,
  dnsTimeout: 4000,
  family: 4,
  lookup: lookupIpv4,
  tls: { minVersion: 'TLSv1.2', servername: smtpHost() },
});

const createTransporter = (override = {}) => {
  const host = smtpHost();
  const user = smtpUser();
  const isGmail = /gmail\.com$/i.test(host) || /@gmail\.com$/i.test(user);
  const port = Number(override.port || (isGmail ? 465 : smtpPort()));
  const secure =
    override.secure !== undefined
      ? override.secure
      : isGmail
        ? port === 465
        : smtpSecure();

  return nodemailer.createTransport(transportOptions({ port, secure }));
};

const buildMail = ({ to, resetUrl, name }) => ({
  from: fromAddress(),
  to,
  subject: 'Reset your TrustLink AI password',
  text: `Hi ${name || 'there'},

Reset your password using this link (valid 60 minutes):
${resetUrl}

If you did not request this, ignore this email.

— TrustLink AI
`,
  html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#07262c">
        <h2 style="color:#1f8a7a;margin:0 0 12px">TrustLink AI</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Reset your password with this link (valid for <strong>60 minutes</strong>):</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}"
             style="background:#1f8a7a;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">
            Reset my password
          </a>
        </p>
        <p style="word-break:break-all;font-size:12px;color:#555">${resetUrl}</p>
        <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>
      </div>
    `,
});

const trySend = async (transporter, mail) => {
  await withTimeout(transporter.sendMail(mail), SEND_TIMEOUT_MS, 'SMTP send');
};

const sendPasswordResetEmail = async ({ to, resetUrl, name }) => {
  if (!isEmailConfigured()) {
    console.error('[TrustLink] SMTP is not configured. Password reset emails cannot be sent.');
    return { sent: false, mode: 'unconfigured', previewUrl: null };
  }

  const mail = buildMail({ to, resetUrl, name });
  const isGmail =
    /gmail\.com$/i.test(smtpHost()) || /@gmail\.com$/i.test(smtpUser());
  const attempts = isGmail
    ? [
        { port: 465, secure: true },
        { port: 587, secure: false },
      ]
    : [{ port: smtpPort(), secure: smtpSecure() }];

  let lastError = 'unknown SMTP error';
  for (const attempt of attempts) {
    try {
      const transporter = createTransporter(attempt);
      await trySend(transporter, mail);
      console.log(
        `[TrustLink] Password reset email sent via SMTP:${attempt.port} to ${to}`
      );
      return { sent: true, mode: 'smtp', previewUrl: null };
    } catch (error) {
      lastError = error.message;
      console.error(
        `[TrustLink] SMTP send failed on port ${attempt.port}:`,
        error.message
      );
    }
  }

  return {
    sent: false,
    mode: 'smtp_failed',
    previewUrl: null,
    error: lastError,
  };
};

const verifySmtp = async () => {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      configured: false,
      message: 'SMTP_USER / SMTP_PASS not set',
    };
  }

  const isGmail =
    /gmail\.com$/i.test(smtpHost()) || /@gmail\.com$/i.test(smtpUser());
  const attempts = isGmail
    ? [
        { port: 465, secure: true },
        { port: 587, secure: false },
      ]
    : [{ port: smtpPort(), secure: smtpSecure() }];

  let lastError = 'SMTP verify failed';
  for (const attempt of attempts) {
    try {
      const transporter = createTransporter(attempt);
      await withTimeout(transporter.verify(), 12000, `SMTP verify :${attempt.port}`);
      return {
        ok: true,
        configured: true,
        message: `${smtpUser()} (:${attempt.port})`,
      };
    } catch (error) {
      lastError = error.message;
    }
  }

  return {
    ok: false,
    configured: true,
    message: lastError,
  };
};

module.exports = {
  sendPasswordResetEmail,
  isEmailConfigured,
  isProduction,
  verifySmtp,
};
