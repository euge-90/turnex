#!/usr/bin/env bash
set -euo pipefail

# Usage: export DATABASE_URL="postgresql://user:pass@host:port/db" && ./mark-migrations-applied.sh
MIGRATIONS_DIR="$(dirname "$0")/../prisma/migrations"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: Please set DATABASE_URL environment variable before running this script."
  exit 1
fi

echo "Using DATABASE_URL (masked): ${DATABASE_URL:0:40}..."

for dir in "$MIGRATIONS_DIR"/*/ ; do
  [ -d "$dir" ] || continue
  folder=$(basename "$dir")
  echo "Marking migration as applied: $folder"
  npx prisma migrate resolve --schema=../prisma/schema.prisma --applied "$folder"
done

echo "Done. All migrations marked as applied."
