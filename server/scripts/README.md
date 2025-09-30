Helper scripts

create-local-db.js
- Purpose: create a database 'turnex' and a user 'turnex' with password 'turnexpass' using an admin Postgres connection.
- Requirements: Node.js installed and the `pg` npm package.

How to run:

1. Install `pg` in the server folder (adds to devDependencies or dependencies):

   npm install pg

2. Run the script pointing to an admin DB URL (you must have a Postgres server running somewhere):

   node scripts/create-local-db.js --url "postgresql://postgres:postgrespassword@127.0.0.1:5432/postgres"

The script will attempt:
  CREATE DATABASE turnex;
  CREATE USER turnex WITH PASSWORD 'turnexpass';
  GRANT ALL PRIVILEGES ON DATABASE turnex TO turnex;

It prints the DATABASE_URL you should use in `server/.env` after completion.
