require('dotenv').config();

const { isEmailConfigured, verifySmtp, sendPasswordResetEmail } = require('../services/emailService');
const { getPublicClientUrl } = require('../utils/helpers');

(async () => {
  if (!isEmailConfigured()) {
    console.error('SMTP_USER / SMTP_PASS missing in server/.env');
    console.error('Create a Gmail App Password: https://myaccount.google.com/apppasswords');
    process.exit(1);
  }

  const check = await verifySmtp();
  if (!check.ok) {
    console.error('SMTP verify failed:', check.message);
    process.exit(1);
  }

  console.log(`SMTP ready as ${check.message}`);

  const to = String(process.argv[2] || '').trim();
  if (!to) {
    console.log('Optional: npm run test:smtp -- you@gmail.com  (sends a test reset email)');
    process.exit(0);
  }

  const clientUrl = getPublicClientUrl();
  const result = await sendPasswordResetEmail({
    to,
    name: 'Test',
    resetUrl: `${clientUrl}/reset-password/smtp-test-ignore`,
  });

  if (!result.sent) {
    console.error('Send failed:', result.error || result.mode);
    process.exit(1);
  }

  console.log(`Test email sent to ${to}. Check inbox and spam.`);
  process.exit(0);
})();
