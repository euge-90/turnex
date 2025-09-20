/* Seed only if SEED=true */
if (process.env.SEED !== 'true') {
  console.log('Seed skipped (SEED!=true)');
  process.exit(0);
}

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const exists = await prisma.user.findUnique({ where: { email } });
  if (!exists) {
    const passwordHash = await bcrypt.hash('Admin12345', 10);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email,
        phone: '+5491100000000',
        role: 'admin',
        passwordHash,
      },
    });
    console.log('Seed: admin user created (admin@example.com / Admin12345)');
  } else {
    console.log('Seed: admin already exists');
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });