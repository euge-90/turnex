-- Add required columns to existing User table with safe defaults for existing rows
-- Postgres dialect
ALTER TABLE "User"
  ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Usuario',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Note: Prisma's @updatedAt will keep this column in sync on updates.