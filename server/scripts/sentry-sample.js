const base = process.env.API_URL || 'http://127.0.0.1:5000';

(async () => {
  const res = await fetch(`${base}/api/debug/sentry`);
  const data = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ status: res.status, ...data }, null, 2));
  if (!data.sentry?.configured) {
    console.error('\nSentry is not configured. Add SENTRY_DSN to server/.env and restart the API.');
    process.exit(1);
  }
  if (!data.sentry?.captured) {
    console.error('\nSample error was not captured.');
    process.exit(1);
  }
  console.log('\nSample error sent. Open Sentry → Issues to verify.');
  process.exit(0);
})().catch((err) => {
  console.error('Could not reach API. Start the server first (`npm run dev`).');
  console.error(err.message);
  process.exit(1);
});
