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
  process.env.SMTP_SECURE === 'false'
    ? false
    : smtpPort() === 465 || process.env.SMTP_SECURE === 'true';

const brevoKey = () =>
  String(process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || '').trim();
const resendKey = () => String(process.env.RESEND_API_KEY || '').trim();
const sendgridKey = () => String(process.env.SENDGRID_API_KEY || '').trim();

const senderEmail = () => {
  const from = fromAddress();
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim();
};

const smtpAllowed = () =>
  process.env.ALLOW_SMTP === 'true' || process.env.NODE_ENV !== 'production';

const activeTransport = () => {
  if (brevoKey()) return 'brevo';
  if (resendKey()) return 'resend';
  if (sendgridKey()) return 'sendgrid';
  if (smtpUser() && smtpPass() && smtpAllowed()) return 'smtp';
  if (smtpUser() && smtpPass()) return 'smtp-blocked';
  return 'none';
};

const isEmailConfigured = () => activeTransport() !== 'none';

const isProduction = () => process.env.NODE_ENV === 'production';

const SEND_TIMEOUT_MS = 12000;

const fromAddress = () => {
  const from = String(process.env.SMTP_FROM || process.env.EMAIL_FROM || '')
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

const readJson = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text.slice(0, 240) };
  }
};

const sendViaBrevo = async (mail) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': brevoKey(),
    },
    body: JSON.stringify({
      sender: { name: 'TrustLink AI', email: senderEmail() },
      to: [{ email: mail.to, name: mail.to }],
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(body.message || body.error || `Brevo HTTP ${response.status}`);
  }
  return { sent: true, mode: 'brevo', previewUrl: null };
};

const sendViaResend = async (mail) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress().includes('<') ? fromAddress() : `TrustLink AI <${senderEmail()}>`,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(body.message || body.name || `Resend HTTP ${response.status}`);
  }
  return { sent: true, mode: 'resend', previewUrl: null };
};

const sendViaSendgrid = async (mail) => {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sendgridKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: mail.to }] }],
      from: { email: senderEmail(), name: 'TrustLink AI' },
      subject: mail.subject,
      content: [
        { type: 'text/plain', value: mail.text },
        { type: 'text/html', value: mail.html },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 202 || response.ok) {
    return { sent: true, mode: 'sendgrid', previewUrl: null };
  }
  const body = await readJson(response);
  const nested = body.errors?.[0]?.message;
  throw new Error(nested || body.message || `SendGrid HTTP ${response.status}`);
};

const sendViaSmtp = async (mail) => {
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
        `[TrustLink] Password reset email sent via SMTP:${attempt.port} to ${mail.to}`
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

const sendPasswordResetEmail = async ({ to, resetUrl, name }) => {
  const mode = activeTransport();
  if (mode === 'none' || mode === 'smtp-blocked') {
    const error =
      mode === 'smtp-blocked'
        ? 'Railway Hobby blocks Gmail SMTP. Add a free BREVO_API_KEY (HTTPS) in Railway Variables, then redeploy.'
        : 'Password reset email is not configured. Set BREVO_API_KEY or SMTP_USER / SMTP_PASS.';
    console.error(`[TrustLink] ${error}`);
    return { sent: false, mode, previewUrl: null, error };
  }

  const mail = buildMail({ to, resetUrl, name });

  try {
    if (mode === 'brevo') {
      const result = await sendViaBrevo(mail);
      console.log(`[TrustLink] Password reset email sent via Brevo to ${to}`);
      return result;
    }
    if (mode === 'resend') {
      const result = await sendViaResend(mail);
      console.log(`[TrustLink] Password reset email sent via Resend to ${to}`);
      return result;
    }
    if (mode === 'sendgrid') {
      const result = await sendViaSendgrid(mail);
      console.log(`[TrustLink] Password reset email sent via SendGrid to ${to}`);
      return result;
    }
  } catch (error) {
    console.error(`[TrustLink] ${mode} send failed:`, error.message);
    return {
      sent: false,
      mode: `${mode}_failed`,
      previewUrl: null,
      error: error.message,
    };
  }

  return sendViaSmtp(mail);
};

const verifySmtp = async () => {
  const mode = activeTransport();
  if (mode === 'none') {
    return {
      ok: false,
      configured: false,
      message: 'No email transport configured',
    };
  }
  if (mode === 'smtp-blocked') {
    return {
      ok: false,
      configured: true,
      message:
        'SMTP is set but blocked on Railway Hobby. Add BREVO_API_KEY (HTTPS).',
    };
  }
  if (mode !== 'smtp') {
    return {
      ok: true,
      configured: true,
      message: `${mode} HTTPS`,
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
  activeTransport,
};
