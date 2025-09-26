import { spawn } from 'child_process';
import http from 'http';

function waitFor(url, timeout = 10000){
  const start = Date.now();
  return new Promise((resolve, reject)=>{
    (function check(){
      http.get(url, res=>{
        res.resume(); resolve(true);
      }).on('error', ()=>{
        if(Date.now() - start > timeout) return reject(new Error('timeout'));
        setTimeout(check, 200);
      });
    })();
  });
}

async function run(){
  const server = spawn(process.execPath, ['src/index.js'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env } });
  server.stdout.on('data', d => process.stdout.write(d));
  server.stderr.on('data', d => process.stderr.write(d));

  try{
    await waitFor('http://127.0.0.1:3000/api/health', 15000);
  }catch(e){
    server.kill();
    console.error('Server did not start in time');
    process.exit(1);
  }

  // login as seeded admin
  const login = await new Promise((resolve, reject)=>{
    const req = http.request('http://127.0.0.1:3000/api/auth/login', { method:'POST', headers:{ 'Content-Type':'application/json' } }, res=>{
      let body=''; res.on('data',c=>body+=c); res.on('end', ()=> resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ email:'admin@turnex.local', password:'admin123' }));
    req.end();
  });
  if(login.status !== 200){ console.error('Login failed', login.status, login.body); server.kill(); process.exit(1); }
  const token = JSON.parse(login.body).token;

  // call admin endpoint
  const adminRes = await new Promise((resolve, reject)=>{
    const req = http.request('http://127.0.0.1:3000/api/admin/users', { method:'GET', headers:{ Authorization: `Bearer ${token}` } }, res=>{
      let body=''; res.on('data',c=>body+=c); res.on('end', ()=> resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });

  if(adminRes.status !== 200){ console.error('Admin endpoint failed', adminRes.status, adminRes.body); server.kill(); process.exit(1); }
  const payload = JSON.parse(adminRes.body);
  if(!Array.isArray(payload.counts) || !Array.isArray(payload.recent)){ console.error('Unexpected payload', payload); server.kill(); process.exit(1); }

  console.log('Admin endpoint OK — counts:', payload.counts.map(c=>`${c.role}:${c.count}`).join(','));
  server.kill();
  process.exit(0);
}

run().catch(err=>{ console.error(err); process.exit(1); });
