#!/usr/bin/env node
/*
create-local-db.js
Simple Node script to create a database and user for local Postgres using the `pg` client.
Usage:
  node scripts/create-local-db.js --url <ADMIN_DATABASE_URL>

Example:
  # If you have a Postgres server running and accessible
  node scripts/create-local-db.js --url "postgresql://postgres:yourpassword@127.0.0.1:5432/postgres"

The script will create database 'turnex' and user 'turnex' with password 'turnexpass'.
It will exit with a clear message if `pg` is missing and show the exact SQL it would run.
*/

import { execSync } from 'child_process';
import process from 'process';

function help() {
  console.log('Usage: node scripts/create-local-db.js --url "postgresql://user:pass@host:port/db"');
}

const args = process.argv.slice(2);
let url;
let desiredDb = 'turnex';
let desiredUser = 'turnex';
let desiredPass = 'turnexpass';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url') url = args[i+1];
  if (args[i] === '--db') desiredDb = args[i+1];
  if (args[i] === '--user') desiredUser = args[i+1];
  if (args[i] === '--pass') desiredPass = args[i+1];
}
if (!url) {
  help();
  process.exit(1);
}

// Check for pg
try {
  execSync('node -e "require(\'pg\')"', { stdio: 'ignore' });
} catch (err) {
  console.error('\nThe `pg` package is not installed. Install it with: npm install pg\n');
  process.exit(1);
}

import pkg from 'pg';
const { Client } = pkg;

(async function(){
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log('Connected to the admin DB. Running setup statements...');
  const dbName = desiredDb;
  const user = desiredUser;
  const password = desiredPass;

  await client.query(`CREATE DATABASE ${dbName};`).catch(e=>console.log('CREATE DATABASE:', e.message));
  await client.query(`CREATE USER ${user} WITH PASSWORD '${password}';`).catch(e=>console.log('CREATE USER:', e.message));
  await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${user};`).catch(e=>console.log('GRANT:', e.message));

  // Ensure the database and public schema are owned by the desired user so migrations can run
  try {
    await client.query(`ALTER DATABASE ${dbName} OWNER TO ${user};`);
  } catch (e) {
    console.log('ALTER DATABASE OWNER:', e.message);
  }

  // Connect to the newly created database to change schema owner
  try {
    const clientDb = new Client({ connectionString: url.replace(/\/postgres$/, `/${dbName}`) });
    await clientDb.connect();
    try {
      await clientDb.query(`ALTER SCHEMA public OWNER TO ${user};`);
      await clientDb.query(`GRANT ALL ON SCHEMA public TO ${user};`);
    } catch (e) {
      console.log('ALTER SCHEMA / GRANT:', e.message);
    } finally {
      await clientDb.end();
    }
  } catch (e) {
    console.log('Could not connect to new DB to alter schema owner:', e.message);
  }

  console.log('\nDone. You can now set in server/.env:');
  console.log(`DATABASE_URL=postgresql://${user}:${password}@127.0.0.1:5432/${dbName}?schema=public`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
