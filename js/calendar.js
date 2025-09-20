import { startOfMonth, endOfMonth, addDays, isWorkingDay, isPast, fmtDateKey, qs, isDateBlocked, getWorkingHoursForDate, SLOT_MINUTES, minutesToTime, timeToMinutes } from './utils.js';
import { apiGetBookingsByDate } from './api.js';

const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Base day names Sunday-first; we can rotate to Monday-first if needed
const DAY_NAMES_SUN_FIRST = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export class Calendar {
  constructor(gridEl, labelEl, opts={}){
    this.gridEl = gridEl;
    this.labelEl = labelEl;
    this.current = new Date();
    this.selected = null;
    // options: { weekStart: 'monday' | 'sunday' }
    this.weekStart = (opts.weekStart === 'sunday') ? 'sunday' : 'monday';
    this._monthAvailability = new Map(); // key: yyyy-mm-dd -> { free:boolean, taken:Set<string> }
  }

  mount(){ this.renderMonth(); this.setupSwipe(); }
  
  // Enable mobile-friendly swipe gestures to change month
  setupSwipe(){
    if(!this.gridEl) return;
    let touchId = null;
    let startX = 0, startY = 0;
    let tracking = false;

    const getTouchById = (touchList, id)=>{
      for(let i=0;i<touchList.length;i++){ if(touchList[i].identifier===id) return touchList[i]; }
      return touchList[0] || null;
    };

    const onStart = (e)=>{
      const t = e.changedTouches && e.changedTouches[0];
      if(!t) return;
      touchId = t.identifier;
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
    };
    const onMove = (e)=>{
      if(!tracking) return;
      const t = getTouchById(e.changedTouches, touchId);
      if(!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      // If horizontal intent and significant, prevent vertical scroll jitter
      if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10){
        e.preventDefault();
      }
    };
    const onEnd = (e)=>{
      if(!tracking) return;
      const t = getTouchById(e.changedTouches, touchId);
      tracking = false;
      if(!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const threshold = 50; // px
      if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold){
        if(dx < 0) this.next(); else this.prev();
      }
    };

    this.gridEl.addEventListener('touchstart', onStart, { passive: true });
    this.gridEl.addEventListener('touchmove', onMove, { passive: false });
    this.gridEl.addEventListener('touchend', onEnd, { passive: true });
  }

  prev(){ this.current.setMonth(this.current.getMonth()-1); this.renderMonth(); }
  next(){ this.current.setMonth(this.current.getMonth()+1); this.renderMonth(); }

  setSelected(date){ this.selected = date; this.highlightSelected(); }

  onSelect(cb){ this.onSelectCb = cb; }

  async renderMonth(){
    const start = startOfMonth(this.current);
    const end = endOfMonth(this.current);

    // first day in grid aligned by weekStart
    const offset = this.weekStart === 'monday' ? ((start.getDay()+6)%7) : (start.getDay()%7);
    const firstGridDate = addDays(start, -offset);
    const totalCells = 42; // 6 weeks grid

  this.gridEl.innerHTML = '';

  // Prefetch availability for visible month (only working days)
  await this.prefetchMonthAvailability(start, end);

    // Weekday headers
    const dn = this.getDayNames();
    dn.forEach((name)=>{
      const h = document.createElement('div');
      h.className = 'text-center small text-body-secondary fw-medium';
      h.textContent = name;
      this.gridEl.appendChild(h);
    });

    for(let i=0;i<totalCells;i++){
      const date = addDays(firstGridDate, i);
  const inMonth = date.getMonth()===this.current.getMonth();
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'calendar-day';
      btn.setAttribute('role','gridcell');
      btn.setAttribute('aria-label', `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`);

      const disabled = !inMonth || !isWorkingDay(date) || isPast(date) || isDateBlocked(date);
      if(disabled) btn.setAttribute('aria-disabled','true');

      btn.textContent = String(date.getDate());

      // Availability dot
      const key = fmtDateKey(date);
      const status = this._monthAvailability.get(key);
      if(!disabled && status){
        const dot = document.createElement('span');
        dot.className = 'status-dot ' + (status.free ? 'ok' : 'full');
        dot.title = status.free ? 'Disponibilidad' : 'Completo';
        btn.appendChild(dot);
      }

      // Keyboard navigation
      btn.tabIndex = disabled ? -1 : 0;
      btn.addEventListener('keydown', (e)=>{
        if(disabled) return;
        const col = i % 7;
        const row = Math.floor(i / 7);
        let nextIndex = null;
        if(e.key==='ArrowRight') nextIndex = i+1;
        else if(e.key==='ArrowLeft') nextIndex = i-1;
        else if(e.key==='ArrowDown') nextIndex = i+7;
        else if(e.key==='ArrowUp') nextIndex = i-7;
        else if(e.key==='Enter' || e.key===' ') { e.preventDefault(); btn.click(); return; }
        if(nextIndex!=null){
          e.preventDefault();
          const nextBtn = this.gridEl.querySelectorAll('.calendar-day')[nextIndex];
          if(nextBtn && nextBtn.getAttribute('aria-disabled')!=='true') nextBtn.focus();
        }
      });

      btn.addEventListener('click', ()=>{
        if(disabled) return;
        this.selected = date;
        this.highlightSelected();
        this.onSelectCb?.(new Date(date));
      });

      this.gridEl.appendChild(btn);
    }

    this.labelEl.textContent = `${monthNames[this.current.getMonth()]} ${this.current.getFullYear()}`;
    this.highlightSelected();
  }

  highlightSelected(){
    const cells = this.gridEl.querySelectorAll('.calendar-day');
    cells.forEach((c)=> c.setAttribute('aria-selected','false'));
    if(!this.selected) return;
    // naive map: find button with same day number within month cells
    const day = this.selected.getDate();
    const month = this.current.getMonth();
    const year = this.current.getFullYear();
    cells.forEach((c)=>{
      const label = c.getAttribute('aria-label')||'';
      if(label.includes(`${day} ${monthNames[month]} ${year}`)){
        c.setAttribute('aria-selected','true');
      }
    });
  }

  getDayNames(){
    if(this.weekStart === 'sunday') return DAY_NAMES_SUN_FIRST;
    // rotate so Monday-first
    return DAY_NAMES_SUN_FIRST.slice(1).concat(DAY_NAMES_SUN_FIRST[0]);
  }

  async prefetchMonthAvailability(start, end){
    this._monthAvailability.clear();
    // Iterate visible days and compute availability using config + bookings
    const totalCells = 42; // includes previous/next month spillover
    const offset = this.weekStart === 'monday' ? ((start.getDay()+6)%7) : (start.getDay()%7);
    const firstGridDate = addDays(start, -offset);
    const tasks = [];
    for(let i=0;i<totalCells;i++){
      const d = addDays(firstGridDate, i);
      if(!isWorkingDay(d) || isPast(d) || isDateBlocked(d)) continue;
      const key = fmtDateKey(d);
      tasks.push(this.computeDayAvailability(key, d));
    }
    await Promise.allSettled(tasks);
  }

  async computeDayAvailability(dateKey, date){
    try{
      // Build all potential slots for the day
      const [open, close] = getWorkingHoursForDate(date);
      const allSlots = [];
      for(let h=open; h<close; h++){
        for(let m=0; m<60; m+=SLOT_MINUTES){
          allSlots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
        }
      }
      const takenList = await apiGetBookingsByDate(dateKey);
      // Expand taken segments by duration
      const taken = new Set();
      takenList.forEach(b=>{
        const segs = Math.ceil((b.duration||30)/SLOT_MINUTES);
        const startMin = timeToMinutes(b.time);
        for(let i=0;i<segs;i++){
          taken.add(minutesToTime(startMin + i*SLOT_MINUTES));
        }
      });
      // A day is considered free if at least one contiguous slot exists (we'll be more flexible: any free start slot)
      const free = allSlots.some(s=> !taken.has(s));
      this._monthAvailability.set(dateKey, { free, taken });
    }catch{
      // network or API error: mark as unknown (treated as free to not discourage booking)
      this._monthAvailability.set(dateKey, { free:true, taken:new Set() });
    }
  }
}
