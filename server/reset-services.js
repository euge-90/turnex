import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Borrando servicios viejos...');
  await prisma.service.deleteMany();

  console.log('🌱 Creando servicios nuevos...');

  const services = [
    {
      name: 'Corte y Peinado',
      description: 'Corte personalizado y peinado profesional con productos de calidad premium',
      duration: 60,
      price: 4500,
      category: 'women'
    },
    {
      name: 'Corte + Barba',
      description: 'Corte moderno y arreglo de barba con técnicas profesionales y acabado perfecto',
      duration: 45,
      price: 3800,
      category: 'men'
    },
    {
      name: 'Color + Tratamiento',
      description: 'Coloración completa con tratamiento nutritivo para un cabello saludable y brillante',
      duration: 120,
      price: 8200,
      category: 'women'
    },
    {
      name: 'Corte para Niños',
      description: 'Cortes especializados para niños en ambiente cómodo y divertido',
      duration: 30,
      price: 2500,
      category: 'kids'
    },
    {
      name: 'Peinado para Eventos',
      description: 'Peinados elegantes para bodas, fiestas y ocasiones especiales',
      duration: 75,
      price: 5800,
      category: 'events'
    },
    {
      name: 'Tratamientos Capilares',
      description: 'Tratamientos reconstructivos y nutritivos para todo tipo de cabello',
      duration: 50,
      price: 4200,
      category: 'women'
    }
  ];

  for (const service of services) {
    await prisma.service.create({ data: service });
    console.log(`✅ Creado: ${service.name}`);
  }

  console.log('\n🎉 ¡Servicios actualizados correctamente!\n');
}

main()
  .finally(() => prisma.$disconnect());