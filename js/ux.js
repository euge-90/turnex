// Navbar scrolled shadow toggle
(() => {
  const nav = document.querySelector('.navbar');
  if(!nav) return;
  const onScroll = () => nav.classList.toggle('navbar-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Intersection Observer to reveal elements
(() => {
  const els = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window) || !els.length){
    els.forEach(el => el.classList.add('show'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if(e.isIntersecting){
        e.target.classList.add('show');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });
  els.forEach(el => io.observe(el));
})();

// Hero search, category wiring, counts, geolocation and tracking
(() => {
  const q = document.getElementById('heroServiceQuery');
  const where = document.getElementById('heroLocation');
  const btn = document.getElementById('btnHeroSearch');
  const categorySelect = document.getElementById('svcCategory');

  // Map a free-text query to our internal category set
  function mapQueryToCategory(text){
    const t = (text||'').toLowerCase();
    if(/barba|barber/.test(t)) return 'barba';
    if(/balayage|mechas|color|ra[ií]z|tinte/.test(t)) return 'color';
    if(/tratamiento|botox|alisado|anti[- ]?frizz|hidrataci[óo]n|uñ[ae]s|manicu|pedicu/.test(t)) return 'tratamiento';
    if(/peinado|brushing|plancha|ondas/.test(t)) return 'peinado';
    if(/corte|caballero|dama|niñ/.test(t)) return 'corte';
    return '';
  }

  function performSearch(){
    const cat = mapQueryToCategory(q?.value || '');
    if(categorySelect){
      categorySelect.value = cat;
      categorySelect.dispatchEvent(new Event('change'));
    }
    const target = document.getElementById('servicios');
    if(target){
      target.scrollIntoView({ behavior:'smooth' });
      const container = target.querySelector('.container') || target;
      container.classList.remove('flash-highlight-bg');
      // reflow to restart animation
      void container.offsetWidth;
      container.classList.add('flash-highlight-bg');
      setTimeout(()=> container.classList.remove('flash-highlight-bg'), 1200);
    }
  }

  btn?.addEventListener('click', performSearch);
  q?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); performSearch(); } });

  // Category cards: interactions (click + 3D tilt/parallax)
  const catCards = Array.from(document.querySelectorAll('.cat-card[data-cat]'));
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Helper: set active visual state
  function setActiveCard(card){
    catCards.forEach(c=> c.classList.toggle('is-active', c===card));
  }

  catCards.forEach(a=>{
    // Click behavior (filter + scroll + highlight)
    a.addEventListener('click', (e)=>{
      const cat = a.getAttribute('data-cat') || '';
      const fallback = a.getAttribute('data-cat-fallback') || '';
      if(categorySelect){
        if(cat === 'all'){
          categorySelect.value = '';
          categorySelect.dispatchEvent(new Event('change'));
          // Clear active state when viewing all
          catCards.forEach(c=> c.classList.remove('is-active'));
        } else {
          const to = [...categorySelect.options].some(o=>o.value===cat) ? cat : fallback;
          if(to){
            categorySelect.value = to;
            categorySelect.dispatchEvent(new Event('change'));
            setActiveCard(a);
          }
        }
        const target = document.getElementById('servicios');
        if(target){
          target.scrollIntoView({ behavior:'smooth' });
          const container = target.querySelector('.container') || target;
          container.classList.remove('flash-highlight-bg');
          void container.offsetWidth;
          container.classList.add('flash-highlight-bg');
          setTimeout(()=> container.classList.remove('flash-highlight-bg'), 1200);
        }
      }
    });

    if(prefersReduced) return; // Respect reduced motion

    // 3D tilt + sheen + parallax background
    const bg = a.querySelector('.cat-bg');
    const maxTilt = 7; // deg
    const maxParallax = 8; // px

    function onMove(ev){
      const r = a.getBoundingClientRect();
      const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
      const y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
      const px = (x / r.width) * 2 - 1;  // -1 .. 1
      const py = (y / r.height) * 2 - 1; // -1 .. 1
      const rx = (-py * maxTilt).toFixed(2) + 'deg';
      const ry = (px * maxTilt).toFixed(2) + 'deg';
      a.style.setProperty('--rx', rx);
      a.style.setProperty('--ry', ry);
      a.style.setProperty('--mx', (x.toFixed(1)) + 'px');
      a.style.setProperty('--my', (y.toFixed(1)) + 'px');
      if(bg){
        const tx = (-px * maxParallax).toFixed(1) + 'px';
        const ty = (-py * maxParallax).toFixed(1) + 'px';
        bg.style.setProperty('--tx', tx);
        bg.style.setProperty('--ty', ty);
      }
    }
    function reset(){
      a.style.removeProperty('--rx');
      a.style.removeProperty('--ry');
      a.style.removeProperty('--mx');
      a.style.removeProperty('--my');
      if(bg){
        bg.style.removeProperty('--tx');
        bg.style.removeProperty('--ty');
      }
    }
    a.addEventListener('mousemove', onMove, { passive: true });
    a.addEventListener('mouseleave', reset);
    a.addEventListener('touchstart', onMove, { passive: true });
    a.addEventListener('touchmove', onMove, { passive: true });
    a.addEventListener('touchend', reset);
  });

  // Update category counts when services are synced or rendered
  function detectCategory(s){
    const name = (s.name||'').toLowerCase();
    const desc = (s.description||'').toLowerCase();
    const text = `${name} ${desc}`;
    if(/barba|perfilado/.test(text)) return 'barba';
    if(/balayage|mechas|color|ra[ií]z|tinte/.test(text)) return 'color';
    if(/tratamiento|botox|alisado|anti[- ]?frizz|hidrataci[óo]n/.test(text)) return 'tratamiento';
    if(/peinado|brushing|plancha|ondas/.test(text)) return 'peinado';
    if(/corte|caballero|dama|niñ/.test(text)) return 'corte';
    // Map uñas under tratamiento count
    if(/uñ[ae]s|manicu|pedicu/.test(text)) return 'tratamiento';
    return '';
  }
  // Animate numbers helper
  function tweenNumber(el, to, suffix){
    const text = el.textContent || '';
    const m = text.match(/\d+/);
    const from = m ? parseInt(m[0],10) : 0;
    const dur = 400; const start = performance.now();
    function step(t){
      const p = Math.min(1, (t - start) / dur);
      const val = Math.round(from + (to - from) * p);
      el.textContent = `${val}${suffix}`;
      if(p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updateCategoryCounts(){
    const all = (window.__services_cache||[]).map(s=> ({...s, __cat: detectCategory(s)}));
    const countBy = all.reduce((acc,s)=>{ acc[s.__cat] = (acc[s.__cat]||0)+1; return acc; }, {});
    const ids = [
      ['corte','catCount-corte'],
      ['color','catCount-color'],
      ['tratamiento','catCount-tratamiento'],
      ['barba','catCount-barba'],
      ['peinado','catCount-peinado'],
      // uñas uses tratamiento as fallback and its counter id is catCount-unas
    ];
    ids.forEach(([key,id])=>{
      const el = document.getElementById(id);
      if(el) tweenNumber(el, (countBy[key]||0), ' servicios');
    });
    const unas = document.getElementById('catCount-unas');
    if(unas) tweenNumber(unas, (countBy['tratamiento']||0), ' servicios');
  }
  window.addEventListener('turnex:services-synced', updateCategoryCounts);
  window.addEventListener('turnex:services-rendered', updateCategoryCounts);
  if(window.__services_cache) updateCategoryCounts();

  // Animate services list on render (staggered)
  const prefersReducedAnim = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animateServices(){
    if(prefersReducedAnim) return;
    const grid = document.getElementById('servicesList');
    if(!grid) return;
    const cards = grid.querySelectorAll('.service-card');
    let i = 0;
    cards.forEach(card => {
      const col = card.closest('[class^="col-"]') || card.parentElement;
      if(col){
        col.style.setProperty('--d', `${Math.min(600, i*40)}ms`);
        col.classList.remove('srv-anim'); // restart
        // force reflow
        void col.offsetWidth;
        col.classList.add('srv-anim');
        i++;
      }
    });
  }
  window.addEventListener('turnex:services-rendered', animateServices);

  // Geolocation prefill for location input (best effort)
  (function prefillLocation(){
    if(!where || !navigator.geolocation) return;
    try{
      navigator.geolocation.getCurrentPosition((pos)=>{
        const { latitude, longitude } = pos.coords || {};
        // simple city hint, keep it local to input; real reverse geocoding would call an API
        where.value = where.value || 'Cerca de mí';
        where.dataset.coords = `${latitude},${longitude}`;
      }, ()=>{/* ignore */}, { enableHighAccuracy:false, timeout:3000, maximumAge:60000 });
    }catch(_){/* ignore */}
  })();

  // App store buttons click tracking
  const appStore = document.getElementById('btnAppStore');
  const gplay = document.getElementById('btnGooglePlay');
  function track(name){
    const evt = { event:'download_click', source:name, ts: Date.now() };
    if(window.dataLayer && Array.isArray(window.dataLayer)) window.dataLayer.push(evt);
    else console.log('[track]', evt);
  }
  appStore?.addEventListener('click', ()=> track('app_store'));
  gplay?.addEventListener('click', ()=> track('google_play'));
})();

// Generate QR in the mock container if library is available
(() => {
  const box = document.querySelector('.app-download .qr-mock');
  if(!box) return;
  const url = box.getAttribute('data-qr') || location.href;
  if(typeof window.QRCode === 'function'){
    // Clear placeholder SVG (if any)
    box.innerHTML = '';
    const size = Math.min(box.clientWidth, box.clientHeight) - 16; // keep padding
    const qrEl = document.createElement('div');
    box.appendChild(qrEl);
    try{
      new window.QRCode(qrEl, {
        text: url,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
    }catch(_){ /* keep placeholder if fails */ }
  }
})();

// Categories scroll navigation (prev/next buttons)
(() => {
  const wrap = document.querySelector('.categories .cat-scroll');
  const row = document.querySelector('.categories .row.g-3');
  if(!wrap || !row) return;

  const prev = document.createElement('button');
  prev.className = 'cat-nav prev';
  prev.setAttribute('aria-label', 'Anterior');
  prev.innerHTML = '<i class="bi bi-chevron-left"></i>';
  const next = document.createElement('button');
  next.className = 'cat-nav next';
  next.setAttribute('aria-label', 'Siguiente');
  next.innerHTML = '<i class="bi bi-chevron-right"></i>';
  wrap.appendChild(prev); wrap.appendChild(next);

  function update(){
    const max = row.scrollWidth - row.clientWidth - 1;
    prev.classList.toggle('disabled', row.scrollLeft <= 0);
    next.classList.toggle('disabled', row.scrollLeft >= max);
    // Only show on overflow
    const overflow = row.scrollWidth > row.clientWidth + 10;
    prev.style.display = next.style.display = overflow ? 'grid' : 'none';
  }
  function scrollByDir(dir){
    const amount = Math.max(200, row.clientWidth * 0.8) * dir;
    row.scrollBy({ left: amount, behavior: 'smooth' });
  }
  prev.addEventListener('click', ()=> scrollByDir(-1));
  next.addEventListener('click', ()=> scrollByDir(1));
  row.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(row);
  update();
})();

// Lightweight toast utility (non-blocking notifications)
(() => {
  function ensureContainer(){
    let c = document.getElementById('txToastContainer');
    if(!c){
      c = document.createElement('div');
      c.id = 'txToastContainer';
      // A11y: announce updates politely
      c.setAttribute('role', 'region');
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-atomic', 'true');
      c.style.position = 'fixed';
      c.style.top = '12px';
      c.style.right = '12px';
      c.style.zIndex = '1080';
      c.style.display = 'flex';
      c.style.flexDirection = 'column';
      c.style.gap = '8px';
      document.body.appendChild(c);
    }
    return c;
  }
  function toast({ type='info', text='', timeout=2800 }={}){
    const c = ensureContainer();
    const el = document.createElement('div');
    el.className = `alert alert-${type} shadow-sm`; // uses Bootstrap alerts
    el.textContent = text || '';
    el.style.minWidth = '240px';
    el.style.maxWidth = '420px';
    el.style.margin = 0;
    el.style.opacity = '0';
    el.style.transform = 'translateY(-6px)';
    el.style.transition = 'opacity .2s ease, transform .2s ease';
    c.appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity = '1'; el.style.transform = 'none'; });
    const t = setTimeout(()=> close(), timeout);
    function close(){
      clearTimeout(t);
      el.style.opacity = '0'; el.style.transform = 'translateY(-6px)';
      setTimeout(()=> el.remove(), 200);
    }
    el.addEventListener('click', close);
    return { close };
  }
  window.txToast = toast;
})();
