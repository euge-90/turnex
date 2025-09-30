import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const services = await prisma.service.findMany();
  console.log(`\n📊 Total de servicios: ${services.length}\n`);
  services.forEach(s => {
    console.log(`✅ ${s.name} - ${s.duration}min - $${s.price} - ${s.category}`);
  });
}

main()
  .finally(() => prisma.$disconnect());