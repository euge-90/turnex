import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

// Importar rutas
import authRoutes from '../routes/auth.js';
import servicesRoutes from '../routes/services.js';
import bookingsRoutes from '../routes/bookings.js';
import configRoutes from '../routes/config.js';
import adminRoutes from '../routes/admin.js';

// Configuración
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// CORS configuration
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Rutas: mount routers directly
// Note: All routes export express.Router() instances, not factories
function mountRoute(path, routeExport) {
  console.log(`📍 Montando ruta: ${path}`);
  // Express Router is a function, but we use it directly, not call it
  app.use(path, routeExport);
  console.log(`✅ Ruta montada: ${path}`);
}

mountRoute('/api/auth', authRoutes);
mountRoute('/api/services', servicesRoutes);
mountRoute('/api/bookings', bookingsRoutes);
mountRoute('/api/config', configRoutes);
mountRoute('/api/admin', adminRoutes);

// Función de inicialización
async function startup() {
  try {
    console.log('🔄 Verificando configuración inicial...');

    // Verificar/crear configuración por defecto
    const cfg = await prisma.config.findFirst();
    if (!cfg) {
      await prisma.config.create({
        data: {
          workingDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          startTime: '09:00',
          endTime: '18:00',
          slotDuration: 30,
          lunchBreakStart: '13:00',
          lunchBreakEnd: '14:00',
          blockedDates: []
        }
      });
      console.log('✅ Configuración inicial creada');
    }

    // Verificar si hay un usuario admin
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminExists) {
      console.log('⚠️  No hay usuarios ADMIN. Ejecuta: node scripts/createAdmin.js');
    }

    console.log('✅ Sistema inicializado correctamente');
  } catch (err) {
    console.error('❌ Error en startup:', err.message);
  }
}

// Iniciar servidor solo si no estamos en modo test
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    await startup();
    app.listen(PORT, () => {
      console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health\n`);
    });
  })();
}

// Exportar para tests
export { app };
export default app;