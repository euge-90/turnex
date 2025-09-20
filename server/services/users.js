const bcrypt = require('bcrypt');

let prisma = null;
try { prisma = require('@prisma/client') ? new (require('@prisma/client').PrismaClient)() : null; } catch { prisma = null; }

const memory = {
  users: new Map(), // key: email, value: user object
  seq: 1,
};

function pickUser(u) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

async function findByEmail(email) {
  if (prisma) {
    try {
      return await prisma.user.findUnique({ where: { email } });
    } catch { return null; }
  }
  return memory.users.get(email) || null;
}

async function createUser({ name, email, phone, password, role = 'client' }) {
  const exists = await findByEmail(email);
  if (exists) throw new Error('UserExists');
  const passwordHash = await bcrypt.hash(password, 10);
  if (prisma) {
    return prisma.user.create({
      data: { name, email, phone, role, passwordHash },
    });
  }
  const user = {
    id: memory.seq++,
    name,
    email,
    phone,
    role,
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memory.users.set(email, user);
  return user;
}

async function verifyUser(email, password) {
  const user = await findByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}

module.exports = {
  findByEmail,
  createUser,
  verifyUser,
  pickUser,
};