import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('🚀 Creando usuarios de prueba...\n');

    // 1. ADMIN
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@turnex.com' },
      update: {},
      create: {
        email: 'admin@turnex.com',
        password: adminPassword,
        name: 'Administrador',
        role: 'ADMIN'
      }
    });
    console.log('✅ Admin:', admin.email, '/ admin123');

    // 2. BUSINESS
    const businessPassword = await bcrypt.hash('business123', 10);
    const business = await prisma.user.upsert({
      where: { email: 'negocio@turnex.com' },
      update: {},
      create: {
        email: 'negocio@turnex.com',
        password: businessPassword,
        name: 'María García',
        role: 'BUSINESS',
        businessName: 'Peluquería Moderna',
        businessId: `biz_${Date.now()}`
      }
    });
    console.log('✅ Business:', business.email, '/ business123');

    // 3. CLIENT
    const clientPassword = await bcrypt.hash('client123', 10);
    const client = await prisma.user.upsert({
      where: { email: 'cliente@turnex.com' },
      update: {},
      create: {
        email: 'cliente@turnex.com',
        password: clientPassword,
        name: 'Juan Pérez',
        role: 'CLIENT'
      }
    });
    console.log('✅ Client:', client.email, '/ client123');

    console.log('\n🎉 ¡Usuarios creados exitosamente!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();