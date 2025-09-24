import { qs, qsa, generateTimeSlots, fmtDateKey, addDays, getConfig, setConfig, timeToMinutes, SLOT_MINUTES, isWorkingDay, isDateBlocked, minutesToTime } from './utils.js';
import { CalendarioTurnex } from './calendario-turnex.js';
// Legacy booking.js imports removed; API is the source of truth
import { isLogged, login, signup, logout, getSession, isAdmin } from './auth.js';
import { AuthTurnex } from './auth-turnex.js';
import { apiListServices, apiCreateBooking, apiGetMyBookings, apiGetBookingsByDate, apiCancelBooking, apiGetConfig, apiPutConfig, apiCreateService, apiUpdateService, apiDeleteService, apiGetUsersCount } from './api.js';

// DOM refs
const grid = qs('#calendarGrid');
const label = qs('#monthLabel');
const prev = qs('#prevMonth');
const next = qs('#nextMonth');
const slotsEl = qs('#timeSlots');
const form = qs('#bookingForm');
const btnConfirm = qs('#btnConfirm');
const nameInput = qs('#name');
const serviceSelect = qs('#service');
const serviceHelp = qs('#serviceHelp');
const servicesList = qs('#servicesList');
const servicesNewBadge = document.getElementById('servicesNewBadge');
const svcCategory = document.getElementById('svcCategory');
const svcCount = document.getElementById('svcCount');
const myBookingsEl = qs('#myBookings');
const btnLogin = qs('#btnLogin');
const btnSignup = qs('#btnSignup');
const navMyBookings = qs('#navMyBookings');
const btnLogout = qs('#btnLogout');
const navLogout = document.getElementById('navLogout');
const userMenu = document.getElementById('userMenu');
const authButtons = document.getElementById('authButtons');
const userNameEl = document.getElementById('userName');
const userAvatarInitial = document.getElementById('userAvatarInitial');
const heroButtonsOut = document.getElementById('heroButtonsOut');
const heroButtonsIn = document.getElementById('heroButtonsIn');
const yearEl = qs('#year');
const navAdminItem = qs('#navAdminItem');
const adminSection = qs('#admin');
const calendarioSection = qs('#calendario');
const misTurnosSection = qs('#mis-turnos');
const adminSummaryEl = qs('#adminSummary');
const adminByDayEl = qs('#adminByDay');
const adminBookingsEl = qs('#adminBookings');
const adminHoursEl = qs('#adminHours');
const btnSaveHours = qs('#btnSaveHours');
const adminFilterService = qs('#adminFilterService');
const adminFilterFrom = qs('#adminFilterFrom');
const adminFilterTo = qs('#adminFilterTo');
const adminFilterClear = qs('#adminFilterClear');
const blockedDaysList = qs('#blockedDaysList');
const adminBlockDate = qs('#adminBlockDate');
const btnAddBlocked = qs('#btnAddBlocked');
const blockedRangesList = qs('#blockedRangesList');
const adminRangeFrom = qs('#adminRangeFrom');
const adminRangeTo = qs('#adminRangeTo');
const btnAddRange = qs('#btnAddRange');
const blockedTimesList = qs('#blockedTimesList');
const adminTimeDate = qs('#adminTimeDate');
const adminTimeFrom = qs('#adminTimeFrom');
const adminTimeTo = qs('#adminTimeTo');
const btnAddTimeBlock = qs('#btnAddTimeBlock');
const hoursBanner = qs('#hoursBanner');
// Admin services
const adminServicesEl = qs('#adminServices');
const btnAddService = qs('#btnAddService');
const svcNameInput = qs('#svcName');
const svcDescInput = qs('#svcDesc');
const svcDurationInput = qs('#svcDuration');
const svcPriceInput = qs('#svcPrice');
const mainEl = document.querySelector('main');
const servicesSignupCard = document.getElementById('servicesSignupCard');

// Delegated handler for actions inside servicesList (details, book)
if(servicesList){
  servicesList.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action], button[data-service-id], [data-service]');
    if(!btn) return;
    // 'details' button
    if(btn.matches('[data-action="details"]')){
      const card = btn.closest('.service-card');
      const svcId = card?.querySelector('[data-service-id]')?.getAttribute('data-service-id') || card?.querySelector('[data-service]')?.getAttribute('data-service');
      if(svcId){
        const svc = getServiceByIdCached(svcId);
        try{ Swal.fire({ title: svc?.name||'Servicio', html: `<p class="text-start">${svc?.description||'Sin descripción'}</p><p class="small text-muted">Duración: ${svc?.duration||'-'} min · Precio: $${svc?.price||'—'}</p>` }); }catch(_){ }
      }
      return;
    }
    // 'book' button (explicit)
    if(btn.matches('[data-action="book"]') || btn.matches('[data-service]') || btn.matches('[data-service-id]')){
      const svcId = btn.getAttribute('data-service') || btn.getAttribute('data-service-id') || (btn.closest('.service-card')?.querySelector('[data-service]')?.getAttribute('data-service'));
      if(svcId){
        // set select and navigate to calendario
        serviceSelect.value = svcId;
        serviceSelect.dispatchEvent(new Event('change'));
        // If user logged, go to calendario; otherwise open auth modal for booking
        if(isLogged()){
          location.hash = '#calendario';
          document.getElementById('calendario').scrollIntoView({ behavior:'smooth' });
        }else{
          // open auth modal in signup flow to encourage account creation
          const evt = new CustomEvent('turnex:open-auth', { detail: { mode: 'signup' } });
          window.dispatchEvent(evt);
        }
      }
    }
  });
  // Keyboard accessibility: Enter or Space on focused article triggers book action
  servicesList.addEventListener('keydown', (e)=>{
    const el = e.target.closest('.service-card');
    if(!el) return;
    if(e.key === 'Enter' || e.key === ' '){
      e.preventDefault();
      const svcId = el.getAttribute('data-service-id');
      if(svcId){
        serviceSelect.value = svcId;
        serviceSelect.dispatchEvent(new Event('change'));
        if(isLogged()){
          location.hash = '#calendario';
          document.getElementById('calendario').scrollIntoView({ behavior:'smooth' });
        }else{
          window.dispatchEvent(new CustomEvent('turnex:open-auth', { detail:{ mode:'signup' } }));
        }
      }
    }
  });
}

// Admin route guard (top-level)
function guardAdminRoute(){
  if(location.hash === '#admin' && !isAdmin()){
    location.hash = '#servicios';
    try{ Swal.fire('Acceso restringido','Sección solo para administradores','info'); }catch{}
  }
}

// Ensure Admin nav item exists or is removed based on role
function ensureAdminNavVisible(show){
  const existing = document.getElementById('navAdminItem');
  if(show){
    if(!existing){
      const ul = document.querySelector('#nav .navbar-nav');
      if(!ul) return;
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.id = 'navAdminItem';
      const a = document.createElement('a');
      a.className = 'nav-link';
      a.href = '#admin';
      a.id = 'navAdmin';
      a.textContent = 'Admin';
      li.appendChild(a);
      const buttonsLi = ul.querySelector('li.nav-item.d-flex');
      if(buttonsLi) ul.insertBefore(li, buttonsLi); else ul.appendChild(li);
    }
  }else{
    if(existing) existing.remove();
  }
}

let selectedDateKey = null;
let selectedTime = null;

async function syncServices(){
  try{ window.__services_cache = await apiListServices(); }
  catch{ window.__services_cache = []; }
  // Notify listeners that services cache is ready
  try{ window.dispatchEvent(new CustomEvent('turnex:services-synced', { detail: { count: (window.__services_cache||[]).length } })); }catch(_){ }
}

async function syncMyBookings(){
  try{ window.__my_bookings = await apiGetMyBookings(); }
  catch{ window.__my_bookings = []; }
}

async function syncAdminBookings(){
  if(!isAdmin()){ window.__admin_bookings = []; return; }
  try{ window.__admin_bookings = await apiGetMyBookings(); }
  catch{ window.__admin_bookings = []; }
}

async function syncTakenForDate(dateKey){
  try{ const list = await apiGetBookingsByDate(dateKey); window.__taken_slots = window.__taken_slots||{}; window.__taken_slots[dateKey] = list.flatMap(b=>{ const segs = Math.ceil((b.duration||30)/SLOT_MINUTES); const start = timeToMinutes(b.time); return Array.from({length:segs},(_,i)=> minutesToTime(start + i*SLOT_MINUTES)); }); }
  catch{ /* noop */ }
}

async function syncConfig(){
  try{
    const cfg = await apiGetConfig();
    setConfig({
      workingHours: cfg.workingHours || {},
      blockedDays: cfg.blockedDays || [],
      blockedDateRanges: cfg.blockedDateRanges || [],
      blockedTimes: cfg.blockedTimes || {}
    });
  }catch{ /* keep local defaults */ }
}

function getServiceByIdCached(id){
  const arr = window.__services_cache || [];
  let svc = arr.find(s=> String(s.id)===String(id));
  return svc || null;
}

function detectCategory(s){
  const name = (s.name||'').toLowerCase();
  const desc = (s.description||'').toLowerCase();
  const text = `${name} ${desc}`;
  if(/barba|perfilado/.test(text)) return 'barba';
  if(/balayage|mechas|color|ra[ií]z|tinte/.test(text)) return 'color';
  if(/tratamiento|botox|alisado|anti[- ]?frizz|hidrataci[óo]n/.test(text)) return 'tratamiento';
  if(/peinado|brushing|plancha|ondas/.test(text)) return 'peinado';
  if(/corte|caballero|dama|niñ/.test(text)) return 'corte';
  return '';
}

function renderServices(){
  // Render services list from cache (called after sync); if cache empty but loading, a skeleton might be shown elsewhere
  // Fill service select (prefer API, fallback to local list)
  const ALL = (window.__services_cache || []).map(s=> ({...s, __cat: detectCategory(s)}));
  const filter = (svcCategory?.value||'').toLowerCase();
  const SERVICES = filter ? ALL.filter(s=> s.__cat===filter) : ALL;
  // Badge: show if we have many services
  if(servicesNewBadge){
    if(SERVICES.length > 8){
      servicesNewBadge.textContent = `+${Math.max(0, SERVICES.length-8)} servicios nuevos`;
      servicesNewBadge.classList.remove('d-none');
    }else{
      servicesNewBadge.classList.add('d-none');
    }
  }
  serviceSelect.innerHTML = `<option value="" disabled selected>Elegí un servicio</option>` +
    (ALL).map(s=>`<option value="${s.id}">${s.name} — $${s.price}</option>`).join('');

  // Cards
  const highlightCount = Math.min(4, Math.max(0, ALL.length - 8));
  const highlightIds = new Set(ALL.slice(-highlightCount).map(s=> String(s.id)));
  if(SERVICES.length === 0){
    servicesList.innerHTML = `<div class="col-12"><div class="card card-glass"><div class="card-body text-center text-body-secondary">No hay servicios para mostrar${filter? ' en esta categoría' : ''}. ${isAdmin()? 'Agregá servicios desde el panel Admin.' : ''}</div></div></div>`;
  }else{
    servicesList.innerHTML = SERVICES.map(s=>`
    <div class="col-12 col-sm-6 col-lg-3" role="listitem">
      <article class="card card-glass service-card h-100" data-service-id="${s.id}" aria-labelledby="svc-${s.id}-title" tabindex="0">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h3 id="svc-${s.id}-title" class="h6 m-0">${s.name} ${highlightIds.has(String(s.id)) ? '<span class="badge text-bg-warning ms-1">Nuevo</span>' : ''}</h3>
            <span class="badge service-badge">$${s.price}</span>
          </div>
          ${s.__cat ? `<div class="mb-1"><span class="badge rounded-pill text-bg-secondary text-capitalize">${s.__cat}</span></div>` : ''}
          ${s.description ? `<div class="d-none d-sm-block"><p class="small m-0 desc">${s.description}</p></div>` : ''}
          <p class="text-body-secondary small mt-2">Duración aprox. ${s.duration} min</p>
          <div class="mt-3 d-grid gap-2">
            <button class="btn btn-outline-secondary btn-sm" data-action="details" type="button" aria-label="Ver detalles de ${s.name}">Detalles</button>
            <button class="btn btn-warning btn-sm" data-action="book" data-service-id="${s.id}" type="button">Reservar</button>
          </div>
        </div>
      </article>
    </div>`).join('');
  }

  // Count label
  if(svcCount){
    const total = ALL.length;
    const shown = SERVICES.length;
    svcCount.textContent = filter ? `${shown} de ${total}` : `${total} servicios`;
  }

  // Select service from card
    // NOTE: we use event delegation instead of binding many listeners
    // A single delegated handler (registered once during init) handles clicks on buttons inside #servicesList
    // See top-level handler registration (below) which reacts to data-action/data-service-id

  // Notify that services list has been rendered
  try{ window.dispatchEvent(new CustomEvent('turnex:services-rendered', { detail: { total: (window.__services_cache||[]).length } })); }catch(_){ }
}

// Category filter change
svcCategory && (svcCategory.onchange = renderServices);

function renderServicesSkeleton(){
  if(!servicesList) return;
  servicesList.innerHTML = Array.from({length:8}).map(()=>`
    <div class="col-12 col-sm-6 col-lg-3">
      <div class="card card-glass service-card h-100">
        <div class="card-body">
          <div class="skeleton skeleton-text" style="width:60%"></div>
          <div class="skeleton skeleton-text" style="width:90%"></div>
          <div class="skeleton skeleton-text" style="width:40%"></div>
          <div class="skeleton skeleton-btn mt-2"></div>
        </div>
      </div>
    </div>`).join('');
}

function renderHoursBanner(){
  if(!hoursBanner) return;
  const cfg = getConfig();
  // working days are Tue-Sat (2..6)
  const daysLabel = 'Mar–Sáb';
  // Build min-max range based on configured working hours
  const hours = cfg.workingHours || {};
  const opens = [2,3,4,5,6].map(d=> hours[d]?.[0]).filter(Number.isFinite);
  const closes = [2,3,4,5,6].map(d=> hours[d]?.[1]).filter(Number.isFinite);
  const minOpen = opens.length? Math.min(...opens): 9;
  const maxClose = closes.length? Math.max(...closes): 18;
  const pad = (n)=> String(n).padStart(2,'0');
  hoursBanner.innerHTML = `<i class="bi bi-clock"></i><span>Horarios laborales: ${daysLabel} · ${pad(minOpen)}:00–${pad(maxClose)}:00</span>`;
}

function renderTimeSlots(dateKey){
  const taken = new Set(window.__taken_slots?.[dateKey] || []);
  const slots = generateTimeSlots(new Date(dateKey));
  const slotSet = new Set(slots);
  const svcId = serviceSelect.value;
  const svc = svcId ? getServiceByIdCached(svcId) : null;
  const duration = Number.isFinite(svc?.duration) ? svc.duration : 0;

  function canStartAt(t){
    if(!duration) return true; // if no service selected yet
    const start = timeToMinutes(t);
    const segments = Math.ceil(duration / SLOT_MINUTES);
    for(let i=0;i<segments;i++){
      const tt = minutesToTime(start + i*SLOT_MINUTES);
      if(!slotSet.has(tt)) return false; // outside working hours or blocked time
      if(taken.has(tt)) return false;    // already occupied by some booking
    }
    return true;
  }

  const buttons = slots.map(t=>{
    const disabled = taken.has(t) || !canStartAt(t);
    return { t, disabled };
  });
  const anyEnabled = buttons.some(b=> !b.disabled);
  if(buttons.length===0 || !anyEnabled){
    slotsEl.innerHTML = `<div class="text-body-secondary">No hay horarios disponibles para este día${svc? ' y servicio seleccionado' : ''}. Probá otro día o cambiá el servicio.</div>`;
  }else{
    slotsEl.innerHTML = buttons.map(({t,disabled})=>`<button type="button" class="slot ${disabled?'disabled':''}" data-time="${t}" aria-disabled="${disabled}">${t}</button>`).join('');
  }

  qsa('.slot').forEach(el=>{
    el.addEventListener('click',()=>{
      if(el.classList.contains('disabled')) return;
      qsa('.slot').forEach(s=>s.classList.remove('active'));
      el.classList.add('active');
      selectedTime = el.getAttribute('data-time');
      updateConfirmState();
    });
  });
}

function renderTimeSlotsSkeleton(){
  if(!slotsEl) return;
  slotsEl.innerHTML = Array.from({length:8}).map(()=>`<div class="skeleton skeleton-btn"></div>`).join('');
}

function updateConfirmState(){
  const hasAll = selectedDateKey && selectedTime && serviceSelect.value && nameInput.value?.trim().length>=2;
  btnConfirm.disabled = !hasAll;
}

function renderMyBookings(){
  const session = getSession();
  if(!session){ myBookingsEl.innerHTML = '<div class="text-body-secondary">Iniciá sesión para ver tus turnos.</div>'; return; }
  const items = window.__my_bookings || [];
  if(!items.length){ myBookingsEl.innerHTML = '<div class="text-body-secondary">Sin turnos por ahora.</div>'; return; }
  myBookingsEl.innerHTML = items.sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).map(b=>{
    const svc = getServiceByIdCached(b.serviceId);
    const desc = svc?.description && svc.description.trim().length? `<div class="small text-body-secondary">${svc.description}</div>` : '';
    const dur = Number.isFinite(svc?.duration) ? `<div class="small text-body-secondary">Duración aprox. ${svc.duration} min</div>` : '';
      const extras = (desc || dur) ? `<div class="d-none d-sm-block">${desc}${dur}</div>` : '';
      return `
    <div class="col-12 col-md-6">
      <div class="card booking-card">
        <div class="card-body d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">${svc?.name || 'Servicio'}</div>
                ${extras}
            <div class="small text-body-secondary">${b.date} · ${b.time}</div>
          </div>
          <button class="btn btn-sm btn-outline-danger" data-cancel="${b.id}">Cancelar</button>
        </div>
      </div>
    </div>`
  }).join('');

  qsa('[data-cancel]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.getAttribute('data-cancel');
      const res = await Swal.fire({
        title:'¿Cancelar turno?',
        text:'Esta acción no se puede deshacer',
        icon:'warning', showCancelButton:true, confirmButtonText:'Sí, cancelar', cancelButtonText:'No'
      });
      if(res.isConfirmed){
        try{
          await apiCancelBooking(id);
          Swal.fire('Cancelado','Tu turno fue cancelado','success');
          if(window.txToast){ window.txToast({ type:'success', text:'Turno cancelado' }); }
          await Promise.all([
            syncMyBookings(),
            syncAdminBookings(),
            selectedDateKey ? syncTakenForDate(selectedDateKey) : Promise.resolve()
          ]);
          renderMyBookings();
          if(selectedDateKey) renderTimeSlots(selectedDateKey);
          renderAdmin();
        }catch(err){ Swal.fire('Error', err.message, 'error'); }
      }
    });
  });
}

function setupAuth(){
  const heroReserveCta = document.getElementById('heroReserveCta');
  // Helper to toggle UI by auth state
  const updateAuthUI = () => {
    const logged = isLogged();
    const session = getSession();
    // Navbar groups
    authButtons?.classList.toggle('d-none', logged);
    userMenu?.classList.toggle('d-none', !logged);
    if(userNameEl){ userNameEl.textContent = (session?.name && session.name.trim()) || (session?.email || 'Usuario'); }
    if(userAvatarInitial){
      const from = (session?.name && session.name.trim()) || (session?.email || 'U');
      const init = (from.trim()[0] || 'U').toUpperCase();
      userAvatarInitial.textContent = init;
    }
    // Legacy buttons
    btnLogout?.classList.toggle('d-none', !logged);
    btnLogin?.classList.toggle('d-none', logged);
    btnSignup?.classList.toggle('d-none', logged);
    // Hero states
    heroButtonsOut?.classList.toggle('d-none', logged);
    heroButtonsIn?.classList.toggle('d-none', !logged);
    if(servicesSignupCard) servicesSignupCard.classList.toggle('d-none', logged);
    // Sections and nav
    ensureAdminNavVisible(isAdmin());
    adminSection?.classList.toggle('d-none', !isAdmin());
    calendarioSection?.classList.toggle('d-none', !logged);
    misTurnosSection?.classList.toggle('d-none', !logged);
    const myNavLi = navMyBookings?.closest('li');
    if(myNavLi) myNavLi.classList.toggle('d-none', !logged);
  };
  const auth = new AuthTurnex({
    onSuccess: async (event)=>{
      // Refresh UI on login/logout
      updateAuthUI();

      await Promise.all([syncMyBookings(), syncAdminBookings()]);
      renderMyBookings();
      renderAdmin();

      if(event==='login'){
        if(isAdmin()){
          location.hash = '#admin';
        }else{
          location.hash = '#calendario';
          document.getElementById('calendario')?.scrollIntoView({ behavior:'smooth' });
        }
      }
    }
  });

  // Gate protected links when not logged
  document.querySelectorAll('#nav a.nav-link, .hero a.btn, a[href="#calendario"], a[href="#mis-turnos"], a[href="#admin"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      if(!isLogged()){
        const href = a.getAttribute('href')||'';
        if(href==='#servicios') return;
        e.preventDefault();
        // open modal login
        const modal = document.getElementById('authModal');
        const m = modal ? new bootstrap.Modal(modal) : null;
        m?.show();
      }
    });
  });

  const protectHashes = ()=>{
    if(!isLogged()){
      const h = location.hash;
      if(h==='#calendario' || h==='#mis-turnos' || h==='#admin'){
        location.hash = '#servicios';
        const modal = document.getElementById('authModal');
        const m = modal ? new bootstrap.Modal(modal) : null;
        m?.show();
      }
    }
  };
  window.addEventListener('hashchange', protectHashes);
  protectHashes();

  // Do NOT auto-show auth modal on page load; users should open it manually.
  // (This intentionally leaves the modal closed by default.)

  // Initial UI state
  updateAuthUI();

  // Also react to global auth-success events
  window.addEventListener('turnex:auth-success', async () => {
    updateAuthUI();
    await Promise.all([syncMyBookings(), syncAdminBookings()]);
    renderMyBookings();
    renderAdmin();
  });

  // Logout from dropdown
  if(navLogout){
    navLogout.addEventListener('click', (e)=>{
      e.preventDefault();
      logout();
      // Reset UI state
      authButtons?.classList.remove('d-none');
      userMenu?.classList.add('d-none');
      heroButtonsOut?.classList.remove('d-none');
      heroButtonsIn?.classList.add('d-none');
      ensureAdminNavVisible(false);
      adminSection?.classList.add('d-none');
      calendarioSection?.classList.add('d-none');
      misTurnosSection?.classList.add('d-none');
      const myNavLi = navMyBookings?.closest('li');
      if(myNavLi) myNavLi.classList.add('d-none');
      // Go back to servicios
      location.hash = '#servicios';
      if(window.txToast){ window.txToast({ type:'info', text:'Sesión cerrada' }); }
      else { try{ Swal.fire('Sesión cerrada','Tu sesión fue cerrada correctamente','success'); }catch{} }
    });
  }

  // Hero CTA: scroll to calendar for logged users
  document.getElementById('heroReserveBtn')?.addEventListener('click', (e)=>{
    e.preventDefault();
    if(!isLogged()){
      // Open login modal when not logged
      const modal = document.getElementById('authModal');
      const m = modal ? new bootstrap.Modal(modal) : null;
      m?.show();
      return;
    }
    location.hash = '#calendario';
    document.getElementById('calendario')?.scrollIntoView({ behavior:'smooth' });
  });

  // Hero CTA signup opens modal in signup mode
  document.querySelectorAll('[data-open-auth="signup"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      const modal = document.getElementById('authModal');
      const m = modal ? new bootstrap.Modal(modal) : null;
      // set to signup mode by toggling UI label appropriately
      const toggle = document.getElementById('btnToggleAuth');
      if(toggle){
        // force signup state by simulating toggle if needed
        const title = document.querySelector('#authModal .modal-title');
        if(title && title.textContent?.includes('Ingresar')) toggle.click();
      }
      m?.show();
    });
  });

  // Hero search wiring: use hero fields to filter services
  const heroSearchBtn = document.getElementById('btnHeroSearch');
  const heroQuery = document.getElementById('heroServiceQuery');
  const heroLocation = document.getElementById('heroLocation');
  if(heroSearchBtn){
    heroSearchBtn.addEventListener('click', (e)=>{
      e.preventDefault();
      // Simple client-side filter by name/description
      const q = (heroQuery?.value||'').trim().toLowerCase();
      const loc = (heroLocation?.value||'').trim().toLowerCase();
      // If user is not logged, encourage signup via modal
      if(!isLogged() && q.length===0){
        const modal = document.getElementById('authModal');
        const m = modal ? new bootstrap.Modal(modal) : null;
        m?.show();
        return;
      }
      // If a category-like term matches known categories, set the select
      const categories = ['corte','color','tratamiento','barba','peinado','unas'];
      const foundCat = categories.find(c=> q.includes(c) || (q.length===0 && loc.length>0));
      if(foundCat){
        svcCategory.value = foundCat;
      }else{
        svcCategory.value = '';
      }
      renderServices();
      // Scroll to services
      document.getElementById('servicios')?.scrollIntoView({ behavior:'smooth' });
    });
  }

  // Category card clicks: set select and render
  qsa('.cat-card').forEach(card=>{
    card.addEventListener('click', (e)=>{
      const cat = card.dataset.cat || card.getAttribute('data-cat') || '';
      if(!cat) return;
      if(svcCategory) svcCategory.value = cat;
      renderServices();
      document.getElementById('servicios')?.scrollIntoView({ behavior:'smooth' });
    });
  });
}

function setupCalendar(){
  const cal = new CalendarioTurnex(grid, label);
  cal.mount();
  cal.onSelect(async (date)=>{
    selectedDateKey = fmtDateKey(date);
    selectedTime = null;
    renderTimeSlotsSkeleton();
    await syncTakenForDate(selectedDateKey);
    renderTimeSlots(selectedDateKey);
    updateConfirmState();
  });
  prev.addEventListener('click', ()=> cal.prev());
  next.addEventListener('click', ()=> cal.next());
}

function setupBookingForm(){
  // HTML validation feedback
  form.addEventListener('input', updateConfirmState);
  // If user taps confirm while disabled, explain what's missing
  btnConfirm.addEventListener('click', (e)=>{
    if(btnConfirm.disabled){
      e.preventDefault();
      const missing = [];
      if(!serviceSelect.value) missing.push('servicio');
      if(!(nameInput.value?.trim().length>=2)) missing.push('nombre');
      if(!selectedDateKey) missing.push('día');
      if(!selectedTime) missing.push('horario');
      const msg = missing.length ? `Te falta seleccionar: ${missing.join(', ')}.` : 'Completá los pasos para confirmar.';
      try{ Swal.fire('Faltan datos', msg, 'info'); }catch{}
    }
  });
  serviceSelect.addEventListener('change', ()=>{
    selectedTime = null;
    updateConfirmState();
    // Update helper text with service description or duration
    const svcId = serviceSelect.value;
    const svc = svcId ? getServiceByIdCached(svcId) : null;
    if(serviceHelp){
      if(svc){
        const desc = svc.description?.trim();
        serviceHelp.textContent = desc && desc.length>0 ? desc : `Duración aprox. ${svc.duration} min`;
      }else{
        serviceHelp.textContent = 'Elegí el servicio para calcular la duración.';
      }
    }
    if(selectedDateKey) renderTimeSlots(selectedDateKey);
  });
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    if(!isLogged()){
      Swal.fire('Ingresá primero','Necesitás iniciar sesión para reservar','info');
      return;
    }
    const session = getSession();
    const serviceId = serviceSelect.value;
    const service = getServiceByIdCached(serviceId);
    // Extra guards to ensure date/time were selected
    if(!serviceId){ Swal.fire('Seleccioná un servicio','Elegí un servicio para continuar','info'); return; }
    if(!(nameInput.value?.trim().length>=2)){ Swal.fire('Ingresá tu nombre','Completá tu nombre (mínimo 2 caracteres)','info'); return; }
    if(!selectedDateKey){ Swal.fire('Seleccioná un día','Elegí un día en el calendario','info'); return; }
    if(!selectedTime){ Swal.fire('Seleccioná un horario','Elegí un horario disponible','info'); return; }
    try{
      const item = await apiCreateBooking({ serviceId, date: selectedDateKey, time: selectedTime, name: nameInput.value.trim() });
      const descHtml = service?.description && service.description.trim().length>0 ? `${service.description}<br>` : '';
      const durHtml = Number.isFinite(service?.duration) ? `<div class="text-body-secondary">Duración aprox. ${service.duration} min</div>` : '';
      await Swal.fire({
        title:'¡Reserva confirmada!',
        html:`<b>${service?.name || 'Servicio'}</b><br>${descHtml}${item.date} · ${item.time}${durHtml}`,
        icon:'success', confirmButtonText:'Aceptar'
      });
      if(window.txToast){ window.txToast({ type:'success', text:'Reserva confirmada' }); }
  await Promise.all([syncTakenForDate(selectedDateKey), syncMyBookings(), syncAdminBookings()]);
      renderTimeSlots(selectedDateKey);
      renderMyBookings();
      renderAdmin();
      form.reset();
      if(serviceHelp) serviceHelp.textContent = 'Elegí el servicio para calcular la duración.';
      selectedTime = null;
      updateConfirmState();
    }catch(err){ Swal.fire('Error', err.message, 'error'); }
  });
}

function init(){
  yearEl.textContent = new Date().getFullYear();
  syncConfig();
  renderServicesSkeleton();
  syncServices().then(renderServices);
  setupCalendar();
  setupAuth();
  setupBookingForm();
  renderHoursBanner();
  syncMyBookings().then(renderMyBookings);
  syncAdminBookings().then(renderAdmin);
  guardAdminRoute();
  window.addEventListener('hashchange', guardAdminRoute);
}

document.addEventListener('DOMContentLoaded', init);

// Global helpers for legacy inline handlers
window.showDashboard = function(){
  if(isAdmin()){
    location.hash = '#admin';
  } else if(isLogged()){
    location.hash = '#mis-turnos';
  } else {
    const modal = document.getElementById('authModal');
    const m = modal ? new bootstrap.Modal(modal) : null;
    m?.show();
  }
};

window.logout = function(){
  logout();
  if(window.txToast){ window.txToast({ type:'info', text:'Sesión cerrada' }); }
  else { Swal.fire('Sesión cerrada','Tu sesión fue cerrada correctamente','success'); }
  location.hash = '#servicios';
};

window.scrollToCalendar = function(){
  if(!isLogged()){
    const modal = document.getElementById('authModal');
    const m = modal ? new bootstrap.Modal(modal) : null;
    m?.show();
    return;
  }
  location.hash = '#calendario';
  document.getElementById('calendario')?.scrollIntoView({ behavior:'smooth' });
};

// Admin dashboard
function renderAdmin(){
  // Toggle nav item
  ensureAdminNavVisible(isAdmin());
  adminSection?.classList.toggle('d-none', !isAdmin());
  if(!isAdmin()) return;

  const all = window.__admin_bookings || [];
  const total = all.length;
  const now = new Date();
  let upcoming = all.filter(b=> new Date(`${b.date}T${b.time}:00`) >= now);

  // Populate service filter (rebuild each render to reflect changes)
  if(adminFilterService){
  const prev = adminFilterService.value || '';
  const svcOptions = (window.__services_cache || []);
    adminFilterService.innerHTML = `<option value="">Todos los servicios</option>` +
      svcOptions.map(s=> `<option value="${s.id}">${s.name}</option>`).join('');
    // restore selection if still present
    if(prev && [...adminFilterService.options].some(o=>o.value===prev)){
      adminFilterService.value = prev;
    }
  }

  // Apply filters
  const svc = adminFilterService?.value || '';
  const from = adminFilterFrom?.value || '';
  const to = adminFilterTo?.value || '';
  upcoming = upcoming.filter(b=>{
    if(svc && String(b.serviceId)!==String(svc)) return false;
    if(from && b.date < from) return false;
    if(to && b.date > to) return false;
    return true;
  });

  // Summary (with async user count)
  (async ()=>{
    let usersTotal = '—';
    try{
      const { total:count } = await apiGetUsersCount();
      usersTotal = count;
    }catch{}
    adminSummaryEl && (adminSummaryEl.innerHTML = `
      <li>Total turnos: <b>${total}</b></li>
      <li>Próximos: <b>${upcoming.length}</b></li>
      <li>Usuarios registrados: <b>${usersTotal}</b></li>
    `);
  })();

  // Bookings by next 7 days
  const days = Array.from({length:7}, (_,i)=> addDays(now,i));
  adminByDayEl && (adminByDayEl.innerHTML = days.map(d=>{
    const key = d.toISOString().slice(0,10);
    const count = all.filter(b=>b.date===key).length;
    const label = d.toLocaleDateString('es-AR', { weekday:'short', day:'2-digit', month:'2-digit' });
    return `<li>${label}: <b>${count}</b></li>`;
  }).join(''));

  // Upcoming bookings table
  adminBookingsEl && (adminBookingsEl.innerHTML = (upcoming
    .sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time))
    .map(b=> {
      const svc = getServiceByIdCached(b.serviceId);
      const desc = svc?.description && svc.description.trim().length? `<div class=\"small text-body-secondary\">${svc.description}</div>` : '';
      const dur = Number.isFinite(svc?.duration) ? `<div class=\"small text-body-secondary\">Duración aprox. ${svc.duration} min</div>` : '';
      const extras = (desc || dur) ? `<div class=\"d-none d-sm-block\">${desc}${dur}</div>` : '';
      return `<tr>
        <td>${b.date}</td>
        <td>${b.time}</td>
        <td>${svc?.name || 'Servicio'}${extras}</td>
        <td>${b.customerName || ''}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-admin-cancel="${b.id}">Cancelar</button></td>
      </tr>`;
    })
    .join('')) || '<tr><td colspan="5" class="text-body-secondary">Sin turnos próximos</td></tr>');

  // Admin cancel any booking
  qsa('[data-admin-cancel]').forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.getAttribute('data-admin-cancel');
      const res = await Swal.fire({ title:'¿Cancelar turno?', icon:'warning', showCancelButton:true, confirmButtonText:'Sí, cancelar' });
      if(!res.isConfirmed) return;
      try{
        await apiCancelBooking(id);
        Swal.fire('Cancelado','Turno cancelado','success');
        if(window.txToast){ window.txToast({ type:'success', text:'Turno cancelado' }); }
        await Promise.all([
          syncMyBookings(),
          syncAdminBookings(),
          selectedDateKey ? syncTakenForDate(selectedDateKey) : Promise.resolve()
        ]);
        renderMyBookings();
        renderAdmin();
        if(selectedDateKey) renderTimeSlots(selectedDateKey);
      }catch(err){ Swal.fire('Error', err.message, 'error'); }
    };
  });

  // Working hours editor
  const cfgHours = getConfig();
  const mapDays = [null,'Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  const daysOrder = [2,3,4,5,6]; // Tue-Sat
  if(adminHoursEl){
    adminHoursEl.innerHTML = daysOrder.map(d=>{
      const [o,c] = cfgHours.workingHours[d] || [9,18];
      return `<div class="input-group input-group-sm">
        <span class="input-group-text" style="min-width:60px">${mapDays[d]}</span>
        <span class="input-group-text">Desde</span>
        <input type="number" class="form-control" min="0" max="23" step="1" value="${o}" data-hour-open="${d}">
        <span class="input-group-text">Hasta</span>
        <input type="number" class="form-control" min="1" max="24" step="1" value="${c}" data-hour-close="${d}">
      </div>`;
    }).join('');
  }
  if(btnSaveHours){
    btnSaveHours.onclick = async ()=>{
      const newCfg = getConfig();
      daysOrder.forEach(d=>{
        const open = parseInt(document.querySelector(`[data-hour-open="${d}"]`).value,10);
        const close = parseInt(document.querySelector(`[data-hour-close="${d}"]`).value,10);
        if(Number.isFinite(open) && Number.isFinite(close) && open < close){
          newCfg.workingHours[d] = [open, close];
        }
      });
      try{
        const saved = await apiPutConfig(newCfg);
        setConfig({
          workingHours: saved.workingHours,
          blockedDays: saved.blockedDays,
          blockedDateRanges: saved.blockedDateRanges,
          blockedTimes: saved.blockedTimes
        });
  Swal.fire('Guardado','Horarios actualizados','success');
  if(window.txToast){ window.txToast({ type:'success', text:'Horarios actualizados' }); }
        renderHoursBanner();
      }catch(err){ Swal.fire('Error', err.message, 'error'); }
      if(selectedDateKey) renderTimeSlots(selectedDateKey);
    };
  }

  // Storage export/import and size listing removed — database is the source of truth

  // Filter handlers
  adminFilterService && (adminFilterService.onchange = renderAdmin);
  adminFilterFrom && (adminFilterFrom.onchange = renderAdmin);
  adminFilterTo && (adminFilterTo.onchange = renderAdmin);
  adminFilterClear && (adminFilterClear.onclick = ()=>{
    if(adminFilterService) adminFilterService.value = '';
    if(adminFilterFrom) adminFilterFrom.value = '';
    if(adminFilterTo) adminFilterTo.value = '';
    renderAdmin();
  });

  // Blocked days manager
  const cfgBlock = getConfig();
  if(blockedDaysList){
    blockedDaysList.innerHTML = (cfgBlock.blockedDays||[]).map(k=>`<li class="badge text-bg-secondary d-inline-flex align-items-center gap-1">${k} <button class="btn-close btn-close-white btn-close-sm" title="Quitar" data-unblock="${k}"></button></li>`).join('')
      || '<li class="text-body-secondary">Sin días bloqueados</li>';
    qsa('[data-unblock]').forEach(btn=>{
      btn.onclick = async ()=>{
        const key = btn.getAttribute('data-unblock');
        try{
          const newCfg = getConfig();
          newCfg.blockedDays = (newCfg.blockedDays||[]).filter(x=>x!==key);
          const saved = await apiPutConfig(newCfg);
          setConfig(saved);
          renderAdmin();
          if(window.txToast){ window.txToast({ type:'success', text:`Día ${key} desbloqueado` }); }
          if(selectedDateKey) renderTimeSlots(selectedDateKey);
        }catch(err){ Swal.fire('Error', err.message, 'error'); }
      };
    });
  }
  if(btnAddBlocked && adminBlockDate){
    btnAddBlocked.onclick = async ()=>{
      const val = adminBlockDate.value;
      if(!val) return;
      try{
        const newCfg = getConfig();
        const setDays = new Set(newCfg.blockedDays||[]);
        setDays.add(val);
        newCfg.blockedDays = Array.from(setDays);
        const saved = await apiPutConfig(newCfg);
  setConfig(saved);
  Swal.fire('Bloqueado', `Se bloqueó ${val}`, 'success');
  if(window.txToast){ window.txToast({ type:'success', text:`Día ${val} bloqueado` }); }
        renderAdmin();
        if(selectedDateKey) renderTimeSlots(selectedDateKey);
      }catch(err){ Swal.fire('Error', err.message, 'error'); }
    };
  }

  // Blocked date ranges
  if(blockedRangesList){
    blockedRangesList.innerHTML = (cfgBlock.blockedDateRanges||[]).map((r,idx)=>`<li class="badge text-bg-secondary d-inline-flex align-items-center gap-1">${r.from} → ${r.to} <button class="btn-close btn-close-white btn-close-sm" title="Quitar" data-unrange="${idx}"></button></li>`).join('')
      || '<li class="text-body-secondary">Sin rangos bloqueados</li>';
    qsa('[data-unrange]').forEach(btn=>{
      btn.onclick = async ()=>{
        try{
          const idx = parseInt(btn.getAttribute('data-unrange'),10);
          const newCfg = getConfig();
          newCfg.blockedDateRanges = (newCfg.blockedDateRanges||[]).filter((_,i)=>i!==idx);
          const saved = await apiPutConfig(newCfg);
          setConfig(saved);
          renderAdmin();
          if(window.txToast){ window.txToast({ type:'success', text:'Rango desbloqueado' }); }
        }catch(err){ Swal.fire('Error', err.message, 'error'); }
      };
    });
  }
  if(btnAddRange && adminRangeFrom && adminRangeTo){
    btnAddRange.onclick = async ()=>{
      const from = adminRangeFrom.value;
      const to = adminRangeTo.value;
      if(!from || !to || to < from){ Swal.fire('Error','Rango inválido','error'); return; }
      try{
        const newCfg = getConfig();
        newCfg.blockedDateRanges = [...(newCfg.blockedDateRanges||[]), { from, to }];
  const saved = await apiPutConfig(newCfg);
  setConfig(saved);
  Swal.fire('Bloqueado', `Se bloqueó ${from} → ${to}`, 'success');
  if(window.txToast){ window.txToast({ type:'success', text:`Rango ${from} → ${to} bloqueado` }); }
        renderAdmin();
      }catch(err){ Swal.fire('Error', err.message, 'error'); }
    };
  }

  // Blocked time ranges per day
  if(blockedTimesList){
    const entries = Object.entries(cfgBlock.blockedTimes||{});
    blockedTimesList.innerHTML = entries.length ? entries.map(([k,arr])=> arr.map(([f,t],i)=>
      `<li class="badge text-bg-secondary d-inline-flex align-items-center gap-1">${k} ${f}→${t} <button class="btn-close btn-close-white btn-close-sm" title="Quitar" data-untime="${k}|${i}"></button></li>`
    ).join('')).join('') : '<li class="text-body-secondary">Sin bloqueos horarios</li>';
    qsa('[data-untime]').forEach(btn=>{
      btn.onclick = async ()=>{
        try{
          const [key, idxStr] = btn.getAttribute('data-untime').split('|');
          const idx = parseInt(idxStr,10);
          const newCfg = getConfig();
          const list = (newCfg.blockedTimes?.[key]||[]).slice();
          list.splice(idx,1);
          if(!newCfg.blockedTimes) newCfg.blockedTimes = {};
          newCfg.blockedTimes[key] = list;
          const saved = await apiPutConfig(newCfg);
          setConfig(saved);
          renderAdmin();
          if(window.txToast){ window.txToast({ type:'success', text:'Bloqueo horario quitado' }); }
          if(selectedDateKey===key) renderTimeSlots(selectedDateKey);
        }catch(err){ Swal.fire('Error', err.message, 'error'); }
      };
    });
  }
  if(btnAddTimeBlock && adminTimeDate && adminTimeFrom && adminTimeTo){
    btnAddTimeBlock.onclick = async ()=>{
      const key = adminTimeDate.value;
      const from = adminTimeFrom.value;
      const to = adminTimeTo.value;
      if(!key || !from || !to || to <= from){ Swal.fire('Error','Rango horario inválido','error'); return; }
      try{
        const newCfg = getConfig();
        if(!newCfg.blockedTimes) newCfg.blockedTimes = {};
        const list = newCfg.blockedTimes[key] || [];
        list.push([from,to]);
        newCfg.blockedTimes[key] = list;
  const saved = await apiPutConfig(newCfg);
  setConfig(saved);
  Swal.fire('Bloqueado', `Se bloqueó ${key} ${from}→${to}`,'success');
  if(window.txToast){ window.txToast({ type:'success', text:`Bloqueo ${from}→${to} en ${key}` }); }
        renderAdmin();
        if(selectedDateKey===key) renderTimeSlots(selectedDateKey);
      }catch(err){ Swal.fire('Error', err.message, 'error'); }
    };
  }
  // Services manager (API-backed)
  if(adminServicesEl){
    const SERVICES = window.__services_cache || [];
    adminServicesEl.innerHTML = SERVICES.length ? SERVICES.map(s=>
      `<tr>
        <td>
          <span data-view-name="${s.id}">${s.name}</span>
          <input class="form-control form-control-sm d-none" data-edit-name="${s.id}" value="${s.name}">
        </td>
        <td>
          <span data-view-desc="${s.id}">${s.description||''}</span>
          <input class="form-control form-control-sm d-none" data-edit-desc="${s.id}" value="${s.description||''}">
        </td>
        <td>
          <span data-view-duration="${s.id}">${s.duration} min</span>
          <input type="number" min="30" step="30" class="form-control form-control-sm d-none" data-edit-duration="${s.id}" value="${s.duration}">
        </td>
        <td>
          <span data-view-price="${s.id}">$${s.price}</span>
          <input type="number" min="0" step="100" class="form-control form-control-sm d-none" data-edit-price="${s.id}" value="${s.price}">
        </td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" data-edit-service="${s.id}">Editar</button>
            <button class="btn btn-success d-none" data-save-service="${s.id}">Guardar</button>
            <button class="btn btn-outline-secondary d-none" data-cancel-edit="${s.id}">Cancelar</button>
            <button class="btn btn-outline-danger" data-del-service="${s.id}">Eliminar</button>
          </div>
        </td>
      </tr>`
    ).join('') : '<tr><td colspan="4" class="text-body-secondary">Sin servicios</td></tr>';
    // Delete (server enforces future bookings rule)
    qsa('[data-del-service]').forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute('data-del-service');
        try{
          await apiDeleteService(id);
          await syncServices();
          renderServices();
          renderAdmin();
          if(window.txToast){ window.txToast({ type:'success', text:'Servicio eliminado' }); }
        }catch(err){ Swal.fire('Error', err.message, 'error'); }
      };
    });
    // Edit mode handlers
    qsa('[data-edit-service]').forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.getAttribute('data-edit-service');
        toggleEditRow(id, true);
      };
    });
    qsa('[data-cancel-edit]').forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.getAttribute('data-cancel-edit');
        toggleEditRow(id, false, true);
      };
    });
    qsa('[data-save-service]').forEach(btn=>{
      btn.onclick = async ()=>{
        const id = btn.getAttribute('data-save-service');
        const nameEl = document.querySelector(`[data-edit-name="${id}"]`);
        const descEl = document.querySelector(`[data-edit-desc="${id}"]`);
        const durEl = document.querySelector(`[data-edit-duration="${id}"]`);
        const priceEl = document.querySelector(`[data-edit-price="${id}"]`);
        const name = nameEl.value.trim();
        const description = (descEl?.value||'').trim();
        const duration = parseInt(durEl.value,10);
        const price = Math.max(0, parseInt(priceEl.value,10)||0);
        if(!name){ Swal.fire('Error','Nombre requerido','error'); return; }
        if(!Number.isFinite(duration) || duration<=0 || duration%30!==0){ Swal.fire('Error','La duración debe ser múltiplo de 30','error'); return; }
        try{
          await apiUpdateService(id, { name, description, duration, price });
          await syncServices();
          renderServices();
          renderAdmin();
          Swal.fire('Guardado','Servicio actualizado','success');
          if(window.txToast){ window.txToast({ type:'success', text:'Servicio actualizado' }); }
        }catch(err){ Swal.fire('Error', err.message, 'error'); }
      };
    });
  }
  if(btnAddService && svcNameInput && svcDurationInput && svcPriceInput){
    btnAddService.onclick = async ()=>{
      const name = svcNameInput.value.trim();
      const description = (svcDescInput?.value||'').trim();
      const duration = parseInt(svcDurationInput.value,10);
      const price = parseInt(svcPriceInput.value,10); const priceSafe = Number.isFinite(price) && price>=0 ? price : 0;
      if(!name){ Swal.fire('Error','Completá el nombre del servicio','error'); return; }
      if(!Number.isFinite(duration) || duration<=0 || duration%30!==0){ Swal.fire('Error','La duración debe ser un múltiplo de 30 minutos','error'); return; }
      try{
        await apiCreateService({ name, description, duration, price: priceSafe });
        await syncServices();
        svcNameInput.value='';
        if(svcDescInput) svcDescInput.value='';
        svcDurationInput.value='30';
        svcPriceInput.value='0';
        renderServices();
        renderAdmin();
        Swal.fire('Guardado','Servicio agregado','success');
        if(window.txToast){ window.txToast({ type:'success', text:'Servicio agregado' }); }
      }catch(err){ Swal.fire('Error', err.message, 'error'); }
    };
  }
}

// Toggle edit/view for a service row in admin table
function toggleEditRow(id, editing, restoreView=false){
  const viewName = document.querySelector(`[data-view-name="${id}"]`);
  const editName = document.querySelector(`[data-edit-name="${id}"]`);
  const viewDesc = document.querySelector(`[data-view-desc="${id}"]`);
  const editDesc = document.querySelector(`[data-edit-desc="${id}"]`);
  const viewDur = document.querySelector(`[data-view-duration="${id}"]`);
  const editDur = document.querySelector(`[data-edit-duration="${id}"]`);
  const viewPrice = document.querySelector(`[data-view-price="${id}"]`);
  const editPrice = document.querySelector(`[data-edit-price="${id}"]`);
  const btnEdit = document.querySelector(`[data-edit-service="${id}"]`);
  const btnSave = document.querySelector(`[data-save-service="${id}"]`);
  const btnCancel = document.querySelector(`[data-cancel-edit="${id}"]`);
  if(!viewName||!editName||!viewDur||!editDur||!viewPrice||!editPrice||!btnEdit||!btnSave||!btnCancel) return;
  if(restoreView){
    // reset inputs to current values
    editName.value = viewName.textContent.trim();
    if(editDesc && viewDesc) editDesc.value = viewDesc.textContent.trim();
    const durMatch = (viewDur.textContent.match(/\d+/)||[30])[0];
    editDur.value = durMatch;
    const priceMatch = (viewPrice.textContent.replaceAll('.', '').match(/\d+/)||[0])[0];
    editPrice.value = priceMatch;
  }
  viewName.classList.toggle('d-none', editing);
  if(viewDesc) viewDesc.classList.toggle('d-none', editing);
  viewDur.classList.toggle('d-none', editing);
  viewPrice.classList.toggle('d-none', editing);
  editName.classList.toggle('d-none', !editing);
  if(editDesc) editDesc.classList.toggle('d-none', !editing);
  editDur.classList.toggle('d-none', !editing);
  editPrice.classList.toggle('d-none', !editing);
  btnEdit.classList.toggle('d-none', editing);
  btnSave.classList.toggle('d-none', !editing);
  btnCancel.classList.toggle('d-none', !editing);
}
