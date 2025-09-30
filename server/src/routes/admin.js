import express from 'express';
import { requireRole } from '../lib/auth.js';

export default function adminRoutes({ prisma }){
  const router = express.Router();

  // Admin-only: returns counts per role and recent users
  router.get('/users', requireRole('ADMIN'), async (req, res) => {
    try {
      const roles = ['CLIENT','BUSINESS','ADMIN'];
      const counts = await Promise.all(roles.map(async (r)=> ({ role: r, count: await prisma.user.count({ where: { role: r } }) } )));
      const recent = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, email: true, role: true, createdAt: true, name: true } });
      res.json({ counts, recent });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
