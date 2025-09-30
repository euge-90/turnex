import { Router } from 'express';
import { hashPassword, verifyPassword, signToken } from '../lib/auth.js';

export default function authRoutes({ prisma }){
  const router = Router();

  // Seed default admin if not exists
  (async ()=>{
    const email = 'admin@turnex.local';
    try{
      const exists = await prisma.user.findUnique({ where:{ email } });
      if(!exists){
        await prisma.user.create({ data:{ email, password: await hashPassword('admin123'), role:'ADMIN' } });
      }
    }catch{ /* noop */ }
  })();

  router.post('/signup', async (req, res)=>{
    const { email, password, name, phone, role, businessName, businessAddress, businessPhone } = req.body||{};
    if(!email || !password) return res.status(400).json({error:'Missing fields'});
    // normalize role
    const r = (role||'CLIENT').toString().toUpperCase();
    if(!['CLIENT','BUSINESS','ADMIN'].includes(r)) return res.status(400).json({ error:'Invalid role' });
    // business-specific validation
    if(r === 'BUSINESS' && (!businessName || !businessAddress)) return res.status(400).json({ error:'Missing business fields' });
    try{
      const found = await prisma.user.findUnique({ where:{ email } });
      if(found) return res.status(409).json({error:'Email already registered'});
      const data = {
        email,
        password: await hashPassword(password),
        role: r,
        name: name || undefined,
        phone: phone || undefined,
      };
      if(r === 'BUSINESS'){
        data.businessName = businessName;
        data.businessAddress = businessAddress;
        data.businessPhone = businessPhone || undefined;
      }
      const user = await prisma.user.create({ data });
      const token = signToken(user);
      res.json({ token, user: { id:user.id, email:user.email, role:user.role } });
    }catch(err){ console.error(err); res.status(500).json({ error:'Signup failed' }); }
  });

  router.post('/login', async (req, res)=>{
    const { email, password } = req.body||{};
    try{
      const user = await prisma.user.findUnique({ where:{ email } });
      if(!user) return res.status(401).json({error:'Invalid credentials'});
      const ok = await verifyPassword(password, user.password);
      if(!ok) return res.status(401).json({error:'Invalid credentials'});
      const token = signToken(user);
      res.json({ token, user: { id:user.id, email:user.email, role:user.role } });
    }catch(err){ console.error(err); res.status(500).json({ error:'Login failed' }); }
  });

  return router;
}
