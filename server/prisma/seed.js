import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Verificar si ya existen servicios
  const count = await prisma.service.count();
  if (count > 0) {
    console.log('✅ Ya existen servicios, saltando seed.');
    return;
  }

  // Crear servicios por defecto
  const services = [
    {
      name: 'Corte de Pelo',
      description: 'Corte clásico o moderno según tu estilo',
      duration: 30,
      price: 5000,
      category: 'HAIR'
    },
    {
      name: 'Barba y Bigote',
      description: 'Perfilado y arreglo de barba',
      duration: 20,
      price: 3000,
      category: 'HAIR'
    },
    {
      name: 'Coloración',
      description: 'Tintura completa o mechas',
      duration: 90,
      price: 12000,
      category: 'HAIR'
    },
    {
      name: 'Corte Infantil',
      description: 'Corte para niños hasta 12 años',
      duration: 20,
      price: 3500,
      category: 'HAIR'
    },
    {
      name: 'Peinado y Brushing',
      description: 'Brushing profesional para eventos',
      duration: 40,
      price: 6000,
      category: 'STYLING'
    }
  ];

  for (const service of services) {
    await prisma.service.create({ data: service });
    console.log(`✅ Creado: ${service.name}`);
  }

  console.log('🎉 Seed completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });