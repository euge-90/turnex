Local development helper

This file explains how to run a local Postgres database for development using the helper PowerShell scripts in `server/scripts/`.

Start a local Postgres (requires Docker Desktop):

  # from PowerShell (in the `server` folder)
  ./scripts/start-local-db.ps1

This will start a container named `turnex-postgres` and print the `DATABASE_URL` you can place into `server/.env`.

Example `server/.env` line:

  DATABASE_URL=postgresql://turnex:turnexpass@127.0.0.1:5432/turnex?schema=public

Stop the container:

  ./scripts/stop-local-db.ps1

Stop and remove the container:

  ./scripts/stop-local-db.ps1 -Remove

Notes:
- If Docker is not installed the scripts will print instructions to install Docker Desktop for Windows: https://www.docker.com/get-started
- These scripts are intended for local development only. Don't commit production credentials to the repo.
