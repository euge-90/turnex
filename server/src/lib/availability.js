export const SLOT_MINUTES = 30;

export function fmtDateKey(d){ return d.toISOString().slice(0,10); }
export function timeToMinutes(t){ const [h,m] = t.split(':').map(Number); return (h||0)*60 + (m||0); }
export function minutesToTime(n){ const h=Math.floor(n/60), m=n%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }

export function isDateInRange(key, from, to){ return key>=from && key<=to; }

export function getWorkingHoursForDate(cfg, date){
  const dow = date.getDay();
  const [open, close] = (cfg.workingHours && cfg.workingHours[dow]) ? cfg.workingHours[dow] : [9,18];
  return [open, close];
}

export function isTimeBlocked(cfg, date, time){
  const key = fmtDateKey(date);
  const ranges = (cfg.blockedTimes?.[key]) || [];
  return ranges.some(([f,t])=> time>=f && time<t);
}

export function isDateBlocked(cfg, date){
  const key = fmtDateKey(date);
  if((cfg.blockedDays||[]).includes(key)) return true;
  return (cfg.blockedDateRanges||[]).some(r=> isDateInRange(key, r.from, r.to));
}

export function generateTimeSlots(cfg, date){
  const [open, close] = getWorkingHoursForDate(cfg, date);
  const out = [];
  for(let h=open; h<close; h++){
    for(let m=0; m<60; m+=SLOT_MINUTES){
      const t = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      if(!isTimeBlocked(cfg, date, t)) out.push(t);
    }
  }
  return out;
}

export function canFit(cfg, bookingsOfDate, dateKey, startTime, duration){
  const date = new Date(`${dateKey}T00:00:00`);
  const [open, close] = getWorkingHoursForDate(cfg, date);
  const closeMins = close*60;
  const start = timeToMinutes(startTime);
  const end = start + duration;
  if(end > closeMins) return false;

  // Build taken set expanded by duration per booking
  const taken = new Set();
  for(const b of bookingsOfDate){
    let cur = timeToMinutes(b.time);
    const segs = Math.max(1, Math.ceil((b.duration||duration)/SLOT_MINUTES));
    for(let i=0;i<segs;i++){
      taken.add(minutesToTime(cur));
      cur += SLOT_MINUTES;
    }
  }
  const segs = Math.max(1, Math.ceil(duration/SLOT_MINUTES));
  let cur = start;
  for(let i=0;i<segs;i++){
    const t = minutesToTime(cur);
    if(taken.has(t)) return false;
    if(isTimeBlocked(cfg, date, t)) return false;
    cur += SLOT_MINUTES;
  }
  return true;
}
