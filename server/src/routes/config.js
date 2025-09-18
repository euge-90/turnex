import { Router } from 'express';
import { authMiddleware } from '../lib/auth.js';

export default function configRoutes({ prisma }){
  const router = Router();

  async function getOrInit(){
    let cfg = await prisma.config.findUnique({ where:{ id:1 } });
    if(!cfg){
      cfg = await prisma.config.create({ data:{
        id: 1,
        workingHours: JSON.stringify({ 2:[9,18],3:[9,18],4:[9,18],5:[9,18],6:[9,18] }),
        blockedDays: JSON.stringify([]),
        blockedDateRanges: JSON.stringify([]),
        blockedTimes: JSON.stringify({})
      }});
    }
    // Parse string fields into JSON objects for the API response
    return {
      ...cfg,
      workingHours: safeParse(cfg.workingHours, {}),
      blockedDays: safeParse(cfg.blockedDays, []),
      blockedDateRanges: safeParse(cfg.blockedDateRanges, []),
      blockedTimes: safeParse(cfg.blockedTimes, {}),
    };
  }

  router.get('/', async (_req,res)=>{
    const cfg = await getOrInit();
    res.json(cfg);
  });

  router.put('/', authMiddleware(true), async (req,res)=>{
    const next = req.body||{};
    const cfg = await getOrInit();
    const updatedRaw = await prisma.config.update({ where:{ id: cfg.id }, data:{
      workingHours: JSON.stringify(next.workingHours ?? cfg.workingHours),
      blockedDays: JSON.stringify(next.blockedDays ?? cfg.blockedDays),
      blockedDateRanges: JSON.stringify(next.blockedDateRanges ?? cfg.blockedDateRanges),
      blockedTimes: JSON.stringify(next.blockedTimes ?? cfg.blockedTimes),
    }});
    const updated = {
      ...updatedRaw,
      workingHours: safeParse(updatedRaw.workingHours, {}),
      blockedDays: safeParse(updatedRaw.blockedDays, []),
      blockedDateRanges: safeParse(updatedRaw.blockedDateRanges, []),
      blockedTimes: safeParse(updatedRaw.blockedTimes, {}),
    };
    res.json(updated);
  });

  return router;
}

function safeParse(str, fallback){
  try{
    return typeof str === 'string' ? JSON.parse(str) : str;
  }catch{
    return fallback;
  }
}
