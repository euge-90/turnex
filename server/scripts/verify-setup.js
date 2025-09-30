#!/usr/bin/env node
/**
 * Script de verificación post-rotación de credenciales
 * Ejecutar después de rotar credenciales para verificar configuración
 *
 * Uso: node scripts/verify-setup.js
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function success(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`);
}

function header(msg) {
  console.log(`\n${colors.blue}${'═'.repeat(70)}`);
  console.log(`${msg}`);
  console.log(`${'═'.repeat(70)}${colors.reset}\n`);
}

async function checkDatabaseConnection() {
  header('1. VERIFICANDO CONEXIÓN A BASE DE DATOS');

  try {
    await prisma.$connect();
    success('Conexión a base de datos exitosa');

    // Verificar que podemos hacer queries
    const result = await prisma.$queryRaw`SELECT NOW() as time`;
    info(`Hora del servidor DB: ${result[0].time}`);

    return true;
  } catch (err) {
    error(`Error de conexión: ${err.message}`);
    info('Verifica DATABASE_URL en server/.env');
    return false;
  }
}

async function checkTables() {
  header('2. VERIFICANDO TABLAS DE LA BASE DE DATOS');

  try {
    const tables = ['User', 'Service', 'Booking', 'Config'];

    for (const table of tables) {
      try {
        const count = await prisma[table.toLowerCase()].count();
        success(`Tabla ${table}: ${count} registros`);
      } catch (err) {
        error(`Tabla ${table}: No existe o error`);
        warning('Puede que necesites ejecutar: npx prisma migrate deploy');
        return false;
      }
    }

    return true;
  } catch (err) {
    error(`Error al verificar tablas: ${err.message}`);
    return false;
  }
}

function checkEnvVariables() {
  header('3. VERIFICANDO VARIABLES DE ENTORNO');

  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CORS_ALLOWED_ORIGINS'
  ];

  let allPresent = true;

  for (const envVar of required) {
    if (process.env[envVar]) {
      success(`${envVar}: Configurado`);

      // Validaciones específicas
      if (envVar === 'JWT_SECRET') {
        if (process.env[envVar] === 'change-me' || process.env[envVar] === 'your-secret-key') {
          error(`${envVar}: Usando valor por defecto no seguro`);
          warning('Genera uno nuevo con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
          allPresent = false;
        } else if (process.env[envVar].length < 32) {
          warning(`${envVar}: Parece muy corto (${process.env[envVar].length} chars). Recomendado: 64 chars`);
        } else {
          info(`  Longitud: ${process.env[envVar].length} caracteres`);
        }
      }

      if (envVar === 'DATABASE_URL') {
        const url = process.env[envVar];
        if (url.includes('npg_tePR1D0XzFuJ') || url.includes('ep-patient-voice-adbui67d')) {
          error('DATABASE_URL: Usando credenciales COMPROMETIDAS');
          error('DEBES rotarlas inmediatamente');
          allPresent = false;
        } else {
          success('DATABASE_URL: Credenciales rotadas correctamente');
        }
      }

      if (envVar === 'CORS_ALLOWED_ORIGINS') {
        const origins = process.env[envVar].split(',');
        info(`  Orígenes permitidos: ${origins.length}`);
        origins.forEach(o => info(`    - ${o.trim()}`));

        if (!origins.some(o => o.includes('euge-90.github.io'))) {
          warning('No incluye https://euge-90.github.io (GitHub Pages)');
        }
      }
    } else {
      error(`${envVar}: NO configurado`);
      allPresent = false;
    }
  }

  return allPresent;
}

async function checkGitStatus() {
  header('4. VERIFICANDO SEGURIDAD DE GIT');

  try {
    const { execSync } = await import('child_process');

    // Verificar que .env no está en Git
    try {
      const gitStatus = execSync('git status --short', { encoding: 'utf-8' });

      if (gitStatus.includes('.env') && !gitStatus.includes('.env.example')) {
        error('Archivo .env está en Git staging area');
        warning('Ejecuta: git reset HEAD server/.env');
        return false;
      } else {
        success('server/.env no está staged en Git');
      }
    } catch (err) {
      info('No se pudo verificar git status (puede que no sea un repo git)');
    }

    // Verificar que .env está ignorado
    try {
      const checkIgnore = execSync('git check-ignore server/.env', { encoding: 'utf-8' });
      if (checkIgnore.trim() === 'server/.env') {
        success('server/.env está en .gitignore');
      }
    } catch (err) {
      error('server/.env NO está ignorado en .gitignore');
      return false;
    }

    return true;
  } catch (err) {
    warning('No se pudo verificar git (¿git no instalado?)');
    return true; // No bloqueante
  }
}

async function runTests() {
  header('5. EJECUTANDO TESTS UNITARIOS');

  try {
    const { execSync } = await import('child_process');
    const output = execSync('npm test -- --run', {
      encoding: 'utf-8',
      cwd: join(__dirname, '../..'),
      stdio: 'pipe'
    });

    if (output.includes('passed')) {
      success('Tests unitarios: PASSING');
      const match = output.match(/(\d+) passed/);
      if (match) {
        info(`  ${match[1]} tests pasando`);
      }
      return true;
    } else {
      error('Tests unitarios: FAILING');
      return false;
    }
  } catch (err) {
    error('Error al ejecutar tests');
    info(err.message);
    return false;
  }
}

async function main() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════════════╗
║         VERIFICACIÓN DE CONFIGURACIÓN - TURNEX                    ║
║         Post-Rotación de Credenciales                             ║
╚═══════════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const checks = {
    env: checkEnvVariables(),
    db: false,
    tables: false,
    git: false,
    tests: false
  };

  checks.db = await checkDatabaseConnection();

  if (checks.db) {
    checks.tables = await checkTables();
  }

  checks.git = await checkGitStatus();

  // Tests solo si todo lo demás pasó
  if (checks.env && checks.db && checks.tables) {
    info('\nEjecutando tests... (puede tardar unos segundos)');
    checks.tests = await runTests();
  }

  // Resumen final
  header('RESUMEN DE VERIFICACIÓN');

  const results = [
    { name: 'Variables de entorno', status: checks.env },
    { name: 'Conexión a base de datos', status: checks.db },
    { name: 'Tablas de base de datos', status: checks.tables },
    { name: 'Seguridad de Git', status: checks.git },
    { name: 'Tests unitarios', status: checks.tests }
  ];

  results.forEach(({ name, status }) => {
    if (status) {
      success(name);
    } else {
      error(name);
    }
  });

  const allPassed = Object.values(checks).every(v => v === true);

  console.log();
  if (allPassed) {
    console.log(`${colors.green}${'═'.repeat(70)}`);
    console.log(`✅ ¡TODO VERIFICADO CORRECTAMENTE!`);
    console.log(`${'═'.repeat(70)}${colors.reset}\n`);
    info('Tu aplicación está lista para usar con las nuevas credenciales');
  } else {
    console.log(`${colors.red}${'═'.repeat(70)}`);
    console.log(`❌ ALGUNAS VERIFICACIONES FALLARON`);
    console.log(`${'═'.repeat(70)}${colors.reset}\n`);
    warning('Revisa los errores arriba y corrígelos antes de continuar');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  error(`Error fatal: ${err.message}`);
  process.exit(1);
});