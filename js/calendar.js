import { startOfMonth, endOfMonth, addDays, isWorkingDay, isPast, fmtDateKey, qs, isDateBlocked } from './utils.js';

const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Show week starting Monday for better local convention
const dayNames = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

export class Calendar {
  constructor(gridEl, labelEl){
    this.gridEl = gridEl;
    this.labelEl = labelEl;
    this.current = new Date();
    this.selected = null;
  }

  mount(){ this.renderMonth(); }

  prev(){ this.current.setMonth(this.current.getMonth()-1); this.renderMonth(); }
  next(){ this.current.setMonth(this.current.getMonth()+1); this.renderMonth(); }

  setSelected(date){ this.selected = date; this.highlightSelected(); }

  onSelect(cb){ this.onSelectCb = cb; }

  renderMonth(){
    const start = startOfMonth(this.current);
    const end = endOfMonth(this.current);

    const firstGridDate = addDays(start, -((start.getDay()+6)%7)); // start on Monday grid
    const totalCells = 42; // 6 weeks grid

    this.gridEl.innerHTML = '';

    // Weekday headers
    dayNames.forEach((name, idx)=>{
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
}
