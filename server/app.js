// ...existing code moved from index.js (sin app.listen)...
try { require('dotenv').config(); } catch {}

const express = require('express');
const app = express();
const { logger } = require('./lib/logger');

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
  } catch (e) {
    logger?.warn?.({ err: e }, 'Sentry init failed; continuing without Sentry');
    Sentry = null;
  }
}

let applySecurity;
try { ({ applySecurity } = require('./middlewares/security')); } catch {}
if (applySecurity) applySecurity(app);

app.use(express.json());

// Health
const version = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev';
app.get('/api/health', (req, res) => res.json({ ok: true, version }));

const { validate } = require('./middlewares/validate');
const { createBookingSchema } = require('./schemas/booking');
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

app.post('/api/bookings', validate(createBookingSchema), (req, res) => {
  return res.status(501).json({ error: 'Not implemented' });
});

if (Sentry) app.use(Sentry.Handlers.errorHandler());

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger?.error?.({ err, path: req.path }, 'Unhandled error');
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

module.exports = app;