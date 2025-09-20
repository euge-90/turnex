import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

function parseOrigins(list) {
  if (!list) return [];
  return list.split(',').map(s => s.trim()).filter(Boolean);
}

export function applySecurity(app) {
  // Detrás de proxy (Render/Heroku)
  app.set('trust proxy', 1);

  // Helmet
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS dinámico
  const allowed = new Set([
    ...parseOrigins(process.env.CORS_ALLOWED_ORIGINS || ''),
    process.env.FRONTEND_ORIGIN || '',
  ].filter(Boolean));

  const corsOptions = {
    credentials: true,
    origin: (origin, cb) => {
      // Permitir no-browser/curl (sin Origin) y mismo origen
      if (!origin || origin === 'null') return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization'],
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // Rate limit en API
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const max = Number(process.env.RATE_LIMIT_MAX || 100);
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}