require('dotenv').config();

const { webcrypto } = require('node:crypto');
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = webcrypto;
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const { connectDB, getDbError, setDbError } = require('./config/db');
const { getPublicClientUrl } = require('./utils/helpers');
const errorHandler = require('./middleware/errorHandler');
const { isEmailConfigured, verifySmtp, activeTransport } = require('./services/emailService');
const {
  initSentry,
  setupSentryErrorHandler,
  isSentryEnabled,
} = require('./config/sentry');
const { getOpenApiSpec } = require('./docs/openapi');

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
      // Swagger UI is hosted on the API itself
      if (
        origin === 'https://trustlink-ai-api-production.up.railway.app' ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
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

const healthPayload = () => {
  const dbReady = mongoose.connection.readyState === 1;
  return {
    status: dbReady ? 'ok' : 'degraded',
    name: 'TrustLink AI API',
    env: process.env.NODE_ENV || 'development',
    db: dbReady ? 'connected' : 'disconnected',
    dbError: dbReady ? null : getDbError() || null,
    mongoUriSet: Boolean(String(process.env.MONGODB_URI || '').trim()),
    email: {
      configured: isEmailConfigured(),
      transport: activeTransport(),
      sendable: !['none', 'smtp-blocked'].includes(activeTransport()),
      resetOrigin: getPublicClientUrl(),
    },
    git: process.env.RAILWAY_GIT_COMMIT_SHA || null,
    sentry: { configured: isSentryEnabled() },
    ai: {
      openai: Boolean(String(process.env.OPENAI_API_KEY || '').trim()),
      gemini: Boolean(String(process.env.GEMINI_API_KEY || '').trim()),
    },
    docs: '/api/docs',
  };
};

// Railway defaults healthcheck to `/` — keep both routes 200 while process is up.
app.get('/', (req, res) => res.status(200).json(healthPayload()));
app.get('/api/health', (req, res) => res.status(200).json(healthPayload()));

app.get('/api/docs.json', (req, res) => res.json(getOpenApiSpec(req)));
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(null, {
    explorer: true,
    customSiteTitle: 'TrustLink AI API docs',
    swaggerOptions: {
      url: '/api/docs.json',
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  })
);

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
    setDbError(err);
    console.error('MongoDB connect failed — API is up but db is disconnected:', err.message);
  }

  verifySmtp().then((smtp) => {
    const mode = activeTransport();
    if (smtp.ok) {
      console.log(`[TrustLink] Reset emails via ${mode} (${smtp.message})`);
      return;
    }
    if (!smtp.configured) {
      console.warn('[TrustLink] Email not configured — forgot password will not send mail.');
      console.warn('[TrustLink] Local: SMTP_USER + SMTP_PASS. Railway Hobby: BREVO_API_KEY (HTTPS).');
      return;
    }
    console.error(`[TrustLink] Email verify failed (${mode}): ${smtp.message}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
