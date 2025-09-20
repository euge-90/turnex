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

// Start (si este archivo hace el listen)
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API on :${port}`));