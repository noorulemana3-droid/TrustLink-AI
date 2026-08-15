const jwt = require('jsonwebtoken');

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** First usable frontend origin — never the whole comma-separated CLIENT_URL list. */
const getPublicClientUrl = () => {
  const origins = String(process.env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const vercel = origins.find((o) => /^https:\/\/.+\.vercel\.app$/i.test(o));
  if (vercel) return vercel;

  const https = origins.find((o) => o.startsWith('https://'));
  if (https) return https;

  if (process.env.NODE_ENV === 'production') {
    return 'https://trustlink-ai.vercel.app';
  }

  return origins[0] || 'http://localhost:5173';
};

module.exports = { signToken, slugify, getPublicClientUrl };
