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
    target?.scrollIntoView({ behavior:'smooth' });
  }

  btn?.addEventListener('click', performSearch);
  q?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); performSearch(); } });

  // Category cards click wiring
  document.querySelectorAll('.cat-card[data-cat]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const cat = a.getAttribute('data-cat') || '';
      // allow a fallback mapping (e.g., uñas -> tratamiento)
      const fallback = a.getAttribute('data-cat-fallback') || '';
      if(categorySelect){
        const to = [...categorySelect.options].some(o=>o.value===cat) ? cat : fallback;
        if(to){
          categorySelect.value = to;
          categorySelect.dispatchEvent(new Event('change'));
        }
      }
    });
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
      if(el) el.textContent = (countBy[key]||0) + ' servicios';
    });
    const unas = document.getElementById('catCount-unas');
    if(unas) unas.textContent = (countBy['tratamiento']||0) + ' servicios';
  }
  window.addEventListener('turnex:services-synced', updateCategoryCounts);
  window.addEventListener('turnex:services-rendered', updateCategoryCounts);
  if(window.__services_cache) updateCategoryCounts();

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
