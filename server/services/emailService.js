const nodemailer = require('nodemailer');

const smtpUser = () =>
  String(process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
const smtpPass = () =>
  String(process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');
const smtpHost = () => String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const smtpPort = () => Number(process.env.SMTP_PORT || 587);
const smtpSecure = () =>
  process.env.SMTP_SECURE === 'true' || smtpPort() === 465;

const isEmailConfigured = () => Boolean(smtpUser() && smtpPass());

const isProduction = () => process.env.NODE_ENV === 'production';

const fromAddress = () => {
  const from = String(process.env.SMTP_FROM || '').trim();
  if (from) return from;
  const user = smtpUser();
  return user ? `TrustLink AI <${user}>` : 'TrustLink AI <noreply@trustlink.ai>';
};

const createTransporter = () => {
  const host = smtpHost();
  const user = smtpUser();
  const pass = smtpPass();
  const isGmail = /gmail\.com$/i.test(host) || /@gmail\.com$/i.test(user);

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  const port = smtpPort();
  const secure = smtpSecure();
  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
  });
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

const sendPasswordResetEmail = async ({ to, resetUrl, name }) => {
  if (!isEmailConfigured()) {
    console.error('[TrustLink] SMTP is not configured. Password reset emails cannot be sent.');
    return { sent: false, mode: 'unconfigured', previewUrl: null };
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail(buildMail({ to, resetUrl, name }));
    console.log(`[TrustLink] Password reset email sent via SMTP to ${to}`);
    return { sent: true, mode: 'smtp', previewUrl: null };
  } catch (error) {
    console.error('[TrustLink] SMTP send failed:', error.message);
    return {
      sent: false,
      mode: 'smtp_failed',
      previewUrl: null,
      error: error.message,
    };
  }
};

const verifySmtp = async () => {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      configured: false,
      message: 'SMTP_USER / SMTP_PASS not set',
    };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      ok: true,
      configured: true,
      message: smtpUser(),
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      message: error.message,
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
  isEmailConfigured,
  isProduction,
  verifySmtp,
};
