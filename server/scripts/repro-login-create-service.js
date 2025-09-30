/* Quick repro script: login then create a service using fetch (undici) with a 30s timeout.
 * Run from server/ with: node scripts/repro-login-create-service.js
 */
import fetch from 'node-fetch';
import AbortController from 'abort-controller';

const BASE = process.env.BASE || 'http://localhost:3000';
const LOGIN = '/api/auth/login';
const SERVICES = '/api/services';

async function run() {
  try {
    console.log('Base URL:', BASE);

    const loginRes = await fetch(BASE + LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'negocio@turnex.com', password: 'business123' })
    });

    const loginText = await loginRes.text();
    console.log('Login status:', loginRes.status);
    console.log('Login headers:', Object.fromEntries(loginRes.headers.entries()));
    console.log('Login body:', loginText);

    if (!loginRes.ok) {
      throw new Error('Login failed');
    }

    const loginJson = JSON.parse(loginText);
    const token = loginJson.token;
    if (!token) throw new Error('No token in login response');

    // Create service with 30s AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    console.log('Posting create-service...');
    const createRes = await fetch(BASE + SERVICES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ name: 'AutoService', price: 100 }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const createText = await createRes.text();
    console.log('Create status:', createRes.status);
    console.log('Create headers:', Object.fromEntries(createRes.headers.entries()));
    console.log('Create body:', createText);

  } catch (err) {
    console.error('Repro error:', err && err.stack ? err.stack : err);
  }
}

run();
