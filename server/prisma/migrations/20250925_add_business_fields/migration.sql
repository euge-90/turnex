-- Ensure enum type exists (create if not present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
    CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'BUSINESS', 'ADMIN');
  END IF;
END$$;

-- Add business columns if they're missing, but only if the "User" table exists.
DO $$
BEGIN
  -- to_regclass returns the relation if it exists; quoted identifiers are checked as-is.
  IF to_regclass('"User"') IS NOT NULL THEN
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessName" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessAddress" TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "businessPhone" TEXT;

    -- If role column is missing, add it as enum with default
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'role'
    ) THEN
      ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'CLIENT';
    END IF;
  END IF;
END$$;
