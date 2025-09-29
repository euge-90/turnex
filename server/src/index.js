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

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Rutas: pasar la instancia de prisma a los factories de rutas
// Helper to mount either a router or a factory that returns a router
function mountRoute(path, routeExport) {
  if (typeof routeExport === 'function') {
    app.use(path, routeExport({ prisma }));
  } else {
    app.use(path, routeExport);
  }
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
          businessHours: JSON.stringify({
            tuesday: { start: '09:00', end: '18:00' },
            wednesday: { start: '09:00', end: '18:00' },
            thursday: { start: '09:00', end: '18:00' },
            friday: { start: '09:00', end: '18:00' },
            saturday: { start: '09:00', end: '18:00' }
          }),
          blockedDates: JSON.stringify([]),
          blockedTimes: JSON.stringify([])
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