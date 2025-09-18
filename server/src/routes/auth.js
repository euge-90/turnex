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
        await prisma.user.create({ data:{ email, passwordHash: await hashPassword('admin123'), role:'admin' } });
      }
    }catch{ /* noop */ }
  })();

  router.post('/signup', async (req, res)=>{
    const { email, password } = req.body||{};
    if(!email || !password) return res.status(400).json({error:'Missing fields'});
    try{
      const found = await prisma.user.findUnique({ where:{ email } });
      if(found) return res.status(409).json({error:'Email already registered'});
      const user = await prisma.user.create({ data:{ email, passwordHash: await hashPassword(password), role:'user' } });
      const token = signToken(user);
      res.json({ token, user: { id:user.id, email:user.email, role:user.role } });
    }catch(err){ res.status(500).json({ error:'Signup failed' }); }
  });

  router.post('/login', async (req, res)=>{
    const { email, password } = req.body||{};
    try{
      const user = await prisma.user.findUnique({ where:{ email } });
      if(!user) return res.status(401).json({error:'Invalid credentials'});
      const ok = await verifyPassword(password, user.passwordHash);
      if(!ok) return res.status(401).json({error:'Invalid credentials'});
      const token = signToken(user);
      res.json({ token, user: { id:user.id, email:user.email, role:user.role } });
    }catch(err){ res.status(500).json({ error:'Login failed' }); }
  });

  return router;
}
