require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { isEmailConfigured, verifySmtp } = require('./services/emailService');
const {
  initSentry,
  setupSentryErrorHandler,
  isSentryEnabled,
} = require('./config/sentry');
const openapi = require('./docs/openapi');

initSentry();

const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const providerRoutes = require('./routes/providerRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const requestRoutes = require('./routes/requestRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const adminRoutes = require('./routes/adminRoutes');
const aiRoutes = require('./routes/aiRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const statsRoutes = require('./routes/statsRoutes');
const debugRoutes = require('./routes/debugRoutes');

const app = express();

/** Render / reverse proxies */
app.set('trust proxy', 1);

const allowedOrigins = String(process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser tools (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  // Always 200 when the process is up — Railway/Render healthchecks fail on 503.
  const dbReady = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: dbReady ? 'ok' : 'degraded',
    name: 'TrustLink AI API',
    env: process.env.NODE_ENV || 'development',
    db: dbReady ? 'connected' : 'disconnected',
    email: { configured: isEmailConfigured() },
    sentry: { configured: isSentryEnabled() },
    ai: {
      openai: Boolean(String(process.env.OPENAI_API_KEY || '').trim()),
      gemini: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
    },
    docs: '/api/docs',
  });
});

app.get('/api/docs.json', (req, res) => res.json(openapi));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { explorer: true }));

app.use('/api/stats', statsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);

setupSentryErrorHandler(app);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
  // Bind immediately so platform healthchecks succeed even while Mongo reconnects.
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TrustLink AI server running on port ${PORT}`);
    console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
  });

  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connect failed — API is up but db is disconnected:', err.message);
  }

  verifySmtp().then((smtp) => {
    if (smtp.ok) {
      console.log(`[TrustLink] SMTP ready — reset emails go to real inboxes (${smtp.message})`);
      return;
    }
    if (!smtp.configured) {
      console.warn('[TrustLink] SMTP not configured — forgot password will not send real email.');
      console.warn('[TrustLink] Set SMTP_USER + SMTP_PASS (Gmail App Password) in Variables');
      return;
    }
    console.error(`[TrustLink] SMTP verify failed: ${smtp.message}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
