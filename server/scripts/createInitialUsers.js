import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creando usuarios iniciales...\n');

  // Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@turnex.com' },
    update: {},
    create: {
      email: 'admin@turnex.com',
      password: adminPassword,
      role: 'ADMIN',
      name: 'Super Administrador',
      phone: '1234567890'
    }
  });
  console.log('✅ Admin creado:', admin.email);

  // Business Owner
  const businessPassword = await bcrypt.hash('business123', 10);
  const business = await prisma.user.upsert({
    where: { email: 'negocio@turnex.com' },
    update: {},
    create: {
      email: 'negocio@turnex.com',
      password: businessPassword,
      role: 'BUSINESS',
      name: 'María Pérez',
      phone: '1123456789',
      businessName: 'Peluquería Elegance',
      businessAddress: 'Av. Corrientes 1234, CABA',
      businessPhone: '011-4567-8900'
    }
  });
  console.log('✅ Business creado:', business.email);

  // Cliente de prueba
  const clientPassword = await bcrypt.hash('cliente123', 10);
  const client = await prisma.user.upsert({
    where: { email: 'cliente@example.com' },
    update: {},
    create: {
      email: 'cliente@example.com',
      password: clientPassword,
      role: 'CLIENT',
      name: 'Juan Rodríguez',
      phone: '1198765432'
    }
  });
  console.log('✅ Cliente creado:', client.email);

  // Crear configuración inicial
  const config = await prisma.config.upsert({
    where: { id: '1' },
    update: {},
    create: {
      id: '1',
      workingDays: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      startTime: '09:00',
      endTime: '18:00',
      slotDuration: 30,
      lunchBreakStart: '13:00',
      lunchBreakEnd: '14:00',
      blockedDates: []
    }
  });
  console.log('✅ Configuración creada');

  console.log('\n📋 Credenciales de prueba:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Admin:    admin@turnex.com / admin123');
  console.log('🏢 Business: negocio@turnex.com / business123');
  console.log('👥 Cliente:  cliente@example.com / cliente123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });