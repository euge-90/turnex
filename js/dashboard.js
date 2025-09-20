(function () {
  const $admin = document.getElementById('adminDashboard');
  const $client = document.getElementById('clientDashboard');
  if (!$admin && !$client) return;

  const isLocalhost = /^(localhost|127\.0\.0\.1)/.test(location.hostname);
  const metaApi = document.querySelector('meta[name="api-base"]');
  let API_BASE = (window.API_BASE || (metaApi ? metaApi.content : '') || '').trim();
  if (!isLocalhost && /^http:\/\/localhost/.test(API_BASE)) {
    API_BASE = 'https://turnex-api.onrender.com/api';
  }

  // --- Mocks deterministas (cambian por día) ---
  const seed = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // yyyymmdd
  let s = Number(seed);
  function rnd(min, max) { // PRNG simple determinista
    s = (s * 1664525 + 1013904223) % 4294967296;
    const u = s / 4294967296;
    return Math.floor(min + u * (max - min + 1));
  }
  function mockStats() {
    return {
      appointmentsToday: rnd(6, 18),
      clients: rnd(120, 420),
      services: rnd(8, 16),
      revenueMonth: `$${(rnd(1200, 4200) * 1000).toLocaleString('es-AR')}`
    };
  }
  function mockNextAppointment() {
    const dayOffset = rnd(0, 3);
    const hour = [9, 10, 11, 12, 14, 15, 16, 17][rnd(0, 7)];
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, 0, 0, 0);
    const svcs = ['Corte clásico', 'Color raíz', 'Tratamiento keratina', 'Barba perfilada', 'Peinado evento'];
    const serviceName = svcs[rnd(0, svcs.length - 1)];
    return { serviceName, datetime: d.toISOString() };
  }
  // ---------------------------------------------

  function showRole(role, user) {
    if ($admin) $admin.classList.toggle('d-none', role !== 'admin');
    if ($client) $client.classList.toggle('d-none', role === 'admin');
    if (role === 'admin') {
      const g = document.getElementById('adminGreeting');
      if (g) g.textContent = `Hola ${user?.name || user?.email || ''}`;
      hydrateAdmin();
    } else {
      const g = document.getElementById('clientGreeting');
      if (g) g.textContent = `Hola ${user?.name || user?.email || ''}`;
      hydrateClient();
    }
  }

  async function hydrateAdmin() {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, { credentials:'include' });
      if (!res.ok) throw new Error('no-stats');
      const s = await res.json();
      setText('statAppointmentsToday', s.appointmentsToday ?? '—');
      setText('statClients', s.clients ?? '—');
      setText('statServices', s.services ?? '—');
      setText('statRevenue', s.revenueMonth ?? '—');
    } catch {
      // Fallback con mocks
      const m = mockStats();
      setText('statAppointmentsToday', m.appointmentsToday);
      setText('statClients', m.clients);
      setText('statServices', m.services);
      setText('statRevenue', m.revenueMonth);
    }
  }

  async function hydrateClient() {
    try {
      const res = await fetch(`${API_BASE}/me/bookings?limit=1&upcoming=true`, { credentials:'include' });
      if (!res.ok) throw new Error('no-bookings');
      const data = await res.json();
      const next = Array.isArray(data) ? data[0] : (data?.items?.[0] ?? null);
      renderNext(next);
    } catch {
      // Fallback con mock
      renderNext(mockNextAppointment());
    }
  }

  function renderNext(next) {
    const el = document.getElementById('nextAppointment');
    if (!el) return;
    if (next) {
      const dt = next.datetime || next.date || next.start || next.startsAt;
      const svc = next.service?.name || next.serviceName || 'Servicio';
      const when = dt ? new Date(dt).toLocaleString('es-AR', { dateStyle:'short', timeStyle:'short' }) : '(fecha a confirmar)';
      el.textContent = `${svc} — ${when}`;
    } else {
      el.textContent = 'Sin turnos próximos.';
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-qa]');
    if (!btn) return;
    const qa = btn.getAttribute('data-qa');
    if (qa === 'new-service') { location.hash = '#servicios'; window.dispatchEvent(new CustomEvent('turnex:new-service')); }
    if (qa === 'export-csv') { window.dispatchEvent(new CustomEvent('turnex:export-csv')); }
    if (qa === 'manage-services') location.hash = '#servicios';
    if (qa === 'book') location.hash = '#servicios';
    if (qa === 'my-appointments') location.hash = '#mis-turnos';
    if (qa === 'profile') location.hash = '#perfil';
  });

  window.addEventListener('turnex:auth-success', (e) => {
    const user = e.detail?.user || {};
    const role = user.role || (user.isAdmin ? 'admin' : 'client');
    showRole(role, user);
    const dash = document.getElementById('dashboard');
    if (dash) dash.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  // ...existing code...
})();