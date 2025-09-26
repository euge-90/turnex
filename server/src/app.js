import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();

// CORS: configurable by env (comma-separated origins). Fallback to localhost patterns.
const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
const defaultCorsOrigins = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];
const corsOrigins = allowedOriginsEnv
  ? allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean)
  : defaultCorsOrigins;
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// API index
app.get('/api', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.json({ name: 'Turnex API', base });
});

// Friendly root page
app.get('/', (req, res) => res.type('html').send('<h1>Turnex API</h1>'));

// Routes
import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import bookingsRoutes from './routes/bookings.js';
import configRoutes from './routes/config.js';
import adminRoutes from './routes/admin.js';

// Instantiate Prisma (PostgreSQL)
const prisma = new PrismaClient();

app.use('/api/auth', authRoutes({ prisma }));
app.use('/api/services', servicesRoutes({ prisma }));
app.use('/api/bookings', bookingsRoutes({ prisma }));
app.use('/api/config', configRoutes({ prisma }));
app.use('/api/admin', adminRoutes({ prisma }));

export { app, prisma };
