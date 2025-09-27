CI / Production database secrets

This project uses PostgreSQL and Prisma for production/staging. Do NOT commit production or staging database credentials into the repository. Instead, store them as GitHub Actions secrets and reference them in workflows.

Recommended secrets
- DATABASE_URL — the Prisma connection string for the app in production (example: postgresql://user:pass@host:5432/dbname?sslmode=require&channel_binding=require)
- ADMIN_DB_URL — (optional) an admin connection string used by local helpers (only if needed by CI scripts). Prefer not to store admin credentials in CI; use a limited-permissions user when possible.

How to add a secret in GitHub
1. Go to your repository on GitHub and click Settings → Secrets and variables → Actions → New repository secret.
2. Add a secret named DATABASE_URL with the Neon connection string.
3. If you need ADMIN_DB_URL for database setup automation in CI, add it too. Again, prefer using a dedicated CI user / role.

CI workflow usage
- The repository contains a GitHub Actions workflow that runs tests and, if configured, runs Prisma migrations using `npx prisma migrate deploy`.
- The workflow reads `DATABASE_URL` from secrets. Ensure the secret is present before enabling any workflow step that applies migrations.

Local development notes
- For local development we recommend running a local Postgres and using a local `server/.env` (this repo's `server/.env` may be set to your local DB during development).
- The scripts in `server/scripts/` include helpers to create a local `turnex` database and user. They are intended for developer machines only.

Safety checklist before running migrations in CI
- Confirm the `DATABASE_URL` secret points to a non-production staging database unless you intentionally want to run migrations on production.
- Prefer `npx prisma migrate deploy` in CI to apply existing migrations non-interactively.
- Keep backups and review migrations in a PR before deploying.

If you need help adding the secret or updating the workflow to use a different secret name, tell me which secret name you prefer and I can update `.github/workflows/deploy-safety.yml` accordingly.
