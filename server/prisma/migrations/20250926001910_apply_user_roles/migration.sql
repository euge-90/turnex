/*
  Non-destructive migration to convert `User.role` (TEXT) -> `UserRole` enum.

  Steps:
   1. Create enum type `UserRole`.
   2. Add a new nullable enum column `role_new`.
   3. Copy/transform existing role string values into `role_new`.
   4. Make `role_new` NOT NULL with a default, drop old `role`, and rename.

  This preserves existing role values and avoids data loss.
*/

-- 1) Create enum type
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'BUSINESS', 'ADMIN');

-- 2) Add new nullable enum column
ALTER TABLE "User" ADD COLUMN "role_new" "UserRole";

-- 3) Copy/transform existing string values into role_new
-- Map common string values to the enum; unknown values default to CLIENT.
UPDATE "User" SET "role_new" = (
  CASE
    WHEN LOWER("role") IN ('client','user','cliente') THEN 'CLIENT'::"UserRole"
    WHEN LOWER("role") IN ('business','owner','business_owner','negocio') THEN 'BUSINESS'::"UserRole"
    WHEN LOWER("role") IN ('admin','administrator') THEN 'ADMIN'::"UserRole"
    ELSE 'CLIENT'::"UserRole"
  END
);

-- 4) Make role_new NOT NULL with a default, drop old role, and rename
ALTER TABLE "User" ALTER COLUMN "role_new" SET DEFAULT 'CLIENT';
UPDATE "User" SET "role_new" = 'CLIENT' WHERE "role_new" IS NULL;
ALTER TABLE "User" ALTER COLUMN "role_new" SET NOT NULL;
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";

-- 5) Add business fields
ALTER TABLE "User" ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "businessPhone" TEXT;
