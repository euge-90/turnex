import { Router } from 'express';
import { authMiddleware } from '../lib/auth.js';

export default function servicesRoutes({ prisma }){
  const router = Router();

  router.get('/', async (_req,res)=>{
    const svcs = await prisma.service.findMany({ orderBy:{ name:'asc' } });
    res.json(svcs);
  });

  router.post('/', authMiddleware(true), async (req,res)=>{
    const { name, description='', duration, price=0 } = req.body||{};
    if(!name || !Number.isFinite(duration)) return res.status(400).json({error:'Missing fields'});
    const svc = await prisma.service.create({ data:{ name, description, duration: Number(duration), price: Number(price)||0 } });
    res.status(201).json(svc);
  });

  router.put('/:id', authMiddleware(true), async (req,res)=>{
    const id = String(req.params.id);
    const exists = await prisma.service.findUnique({ where:{ id } });
    if(!exists) return res.status(404).json({error:'Not found'});
    const { name, description, duration, price } = req.body||{};
    const svc = await prisma.service.update({ where:{ id }, data:{
      ...(name!==undefined?{name}:{}) ,
      ...(description!==undefined?{description}:{}) ,
      ...(duration!==undefined?{duration: Number(duration)}:{}),
      ...(price!==undefined?{price: Number(price)||0}:{}),
    }});
    res.json(svc);
  });

  router.delete('/:id', authMiddleware(true), async (req,res)=>{
    const id = String(req.params.id);
    try{
      // Guard: prevent deletion if future bookings exist
      const nowKey = new Date().toISOString().slice(0,10);
      const hasFuture = await prisma.booking.findFirst({ where:{ serviceId: id, date: { gte: nowKey } } });
      if(hasFuture) return res.status(400).json({ error:'Service has future bookings' });
      await prisma.service.delete({ where:{ id } });
      res.status(204).end();
    }catch(err){ res.status(500).json({ error:'Delete failed' }); }
  });

  return router;
}
