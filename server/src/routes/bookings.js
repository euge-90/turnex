import { Router } from 'express';
import { authMiddleware } from '../lib/auth.js';
import { canFit } from '../lib/availability.js';

export default function bookingsRoutes({ prisma }){
  const router = Router();

  async function getConfig(){
    const cfg = await prisma.config.findUnique({ where:{ id:1 } });
    return cfg || { workingHours:{2:[9,18],3:[9,18],4:[9,18],5:[9,18],6:[9,18]}, blockedDays:[], blockedDateRanges:[], blockedTimes:{} };
  }

  router.get('/', authMiddleware(false), async (req,res)=>{
    const { date, from, to, serviceId, status } = req.query;
    const where = {
      ...(date ? { date: String(date) } : {}),
      ...(from || to ? { date: { ...(from?{ gte:String(from) }:{}), ...(to?{ lte:String(to) }: {}) } } : {}),
      ...(serviceId ? { serviceId: String(serviceId) } : {}),
      ...(status ? { status: String(status) } : {}),
    };
    let list = await prisma.booking.findMany({
      where,
      orderBy:[{ date:'asc' },{ time:'asc' }],
      include:{ service: { select:{ id:true, name:true, duration:true, price:true } } }
    });
    if(req.user?.role !== 'admin') list = list.filter(b=> b.userId === req.user?.sub);
    res.json(list);
  });

  // Aggregate by date for availability (no user filtering, limited fields)
  router.get('/day', authMiddleware(false), async (req,res)=>{
    const { date } = req.query;
    if(!date) return res.status(400).json({ error:'Missing date' });
    const list = await prisma.booking.findMany({ where:{ date }, select:{ time:true, duration:true, serviceId:true } });
    res.json(list);
  });

  router.post('/', authMiddleware(false), async (req,res)=>{
    const { serviceId, date, time, name } = req.body||{};
    if(!serviceId || !date || !time) return res.status(400).json({error:'Missing fields'});
    // Look up service and duration
    const svc = await prisma.service.findUnique({ where:{ id: String(serviceId) } });
    if(!svc) return res.status(400).json({error:'Invalid service'});
    const duration = svc.duration || 30;
    // Fetch same-day bookings
    const sameDay = await prisma.booking.findMany({ where:{ date }, orderBy:{ time:'asc' } });
    const cfg = await getConfig();
    if(!canFit(cfg, sameDay, date, time, duration)) return res.status(409).json({ error:'Time not available' });
    const booking = await prisma.booking.create({ data:{
      userId: req.user.sub,
      serviceId: String(serviceId),
      date, time, duration,
      customerName: name || null,
      status: 'pending',
    }});
    res.status(201).json(booking);
  });

  router.delete('/:id', authMiddleware(false), async (req,res)=>{
    const id = String(req.params.id);
    const b = await prisma.booking.findUnique({ where:{ id } });
    if(!b) return res.status(404).json({error:'Not found'});
    if(b.userId !== req.user?.sub && req.user?.role !== 'admin') return res.status(403).json({error:'Forbidden'});
    await prisma.booking.delete({ where:{ id } });
    res.status(204).end();
  });

  // Update booking status (admin only)
  router.put('/:id', authMiddleware(true), async (req,res)=>{
    const id = String(req.params.id);
    if(req.user?.role !== 'admin') return res.status(403).json({ error:'Forbidden' });
    const { status } = req.body || {};
    const allowed = new Set(['pending','confirmed','in_progress','completed','cancelled','no_show']);
    if(!status || !allowed.has(String(status))) return res.status(400).json({ error:'Invalid status' });
    const exists = await prisma.booking.findUnique({ where:{ id } });
    if(!exists) return res.status(404).json({ error:'Not found' });
    const updated = await prisma.booking.update({ where:{ id }, data:{ status: String(status) } });
    res.json(updated);
  });

  return router;
}
