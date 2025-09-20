// Cargar env si aplica
try { require('dotenv').config(); } catch {}

// Express app
const express = require('express');
const app = express();

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

// Elimina placeholders 501 de auth (ya cubiertos por router)
// app.post('/api/auth/login', validate(loginSchema), (req, res) => res.status(501).json({ error: 'Not implemented' }));
// app.post('/api/auth/signup', validate(signupSchema), (req, res) => res.status(501).json({ error: 'Not implemented' }));

// Placeholder booking (se implementará luego)
app.post('/api/bookings', validate(createBookingSchema), (req, res) => {
  return res.status(501).json({ error: 'Not implemented' });
});

// Start (si este archivo hace el listen)
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API on :${port}`));