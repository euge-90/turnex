// Cargar env si aplica
try { require('dotenv').config(); } catch {}

// Express app
const express = require('express');
const app = express();
const { logger } = require('./lib/logger');

// Sentry (opcional)
let Sentry = null;
const sentryDsn = process.env.SENTRY_DSN;
if (sentryDsn) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
      release: process.env.GIT_SHA || process.env.GITHUB_SHA || undefined,
    });
    app.use(Sentry.Handlers.requestHandler());
    // app.use(Sentry.Handlers.tracingHandler()); // habilitar si necesitás trazas
  } catch (e) {
    logger.warn({ err: e }, 'Sentry init failed; continuing without Sentry');
    Sentry = null;
  }
}

// Seguridad (helmet, cors, rate-limit)
let applySecurity;
try {
  // Compatibilidad ESM/CJS
  ({ applySecurity } = require('./middlewares/security'));
} catch {
  // ESM import fallback
}
// Si el proyecto usa ESM, importá y llamá a applySecurity(app) en el bootstrap correspondiente
if (applySecurity) applySecurity(app);

// Parsers
app.use(express.json());

// Health antes de otras rutas
const version = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev';
app.get('/api/health', (req, res) => {
  res.json({ ok: true, version });
});

// Rutas API existentes aquí
const { validate } = require('./middlewares/validate');
const { loginSchema, signupSchema } = require('./schemas/auth');
const { createBookingSchema } = require('./schemas/booking');

// Rutas API
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// Placeholder booking (se implementará luego)
app.post('/api/bookings', validate(createBookingSchema), (req, res) => {
  return res.status(501).json({ error: 'Not implemented' });
});

// Sentry error handler primero (si está habilitado)
if (Sentry) {
  app.use(Sentry.Handlers.errorHandler());
}

// Error handler centralizado
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path }, 'Unhandled error');
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
  });
});

// Start (si este archivo hace el listen)
const port = process.env.PORT || 3000;
app.listen(port, () => logger.info({ port }, 'API listening'));