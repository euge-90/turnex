import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

let prisma = null;
try { prisma = new PrismaClient(); } catch { prisma = null; }

const memory = {
  users: new Map(), // key: email, value: user object
  seq: 1,
};

function pickUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

export async function findByEmail(email) {
  if (prisma) {
    try {
      return await prisma.user.findUnique({ where: { email } });
    } catch { return null; }
  }
  return memory.users.get(email) || null;
}

export async function createUser({ name, email, phone, password, role = 'CLIENT', businessName, businessAddress, businessPhone }) {
  const exists = await findByEmail(email);
  if (exists) throw new Error('UserExists');
  const passwordHash = await bcrypt.hash(password, 10);
  if (prisma) {
    return prisma.user.create({
      data: { name, email, phone, role, passwordHash, businessName, businessAddress, businessPhone },
    });
  }
  const user = {
    id: memory.seq++,
    name,
    email,
    phone,
    role,
    passwordHash,
    businessName,
    businessAddress,
    businessPhone,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memory.users.set(email, user);
  return user;
}

export async function getUserCountsAndRecent({ recentLimit = 20 } = {}) {
  // counts per role
  const roles = ['CLIENT', 'BUSINESS', 'ADMIN'];
  const countsPromises = roles.map(async (r) => {
    const count = prisma ? await prisma.user.count({ where: { role: r } }) : 0;
    return { role: r, count };
  });
  const counts = await Promise.all(countsPromises);

  // recent users
  const recent = prisma ? await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: recentLimit,
    select: { id: true, email: true, role: true, createdAt: true, name: true },
  }) : [];

  return { counts, recent };
}

export async function verifyUser(email, password) {
  const user = await findByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

export { pickUser };