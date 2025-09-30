// Sync bottom nav active state with hash
(function () {
  const items = document.querySelectorAll('.bottom-nav .item')
  function reflect () {
    const h = (location.hash || '#servicios').replace('#', '')
    items.forEach(a => {
      const active = a.dataset.nav === h
      a.classList.toggle('active', active)
      a.setAttribute('aria-current', active ? 'page' : 'false')
    })
  }
  window.addEventListener('hashchange', reflect)
  reflect()
})();

// Theme toggle logic with persistence
(function () {
  const html = document.documentElement
  const btn = document.getElementById('btnThemeToggle')
  const setIcon = () => {
    const isDark = html.getAttribute('data-bs-theme') === 'dark'
    if (btn) {
      const ic = btn.querySelector('i')
      if (ic) {
        ic.classList.toggle('bi-moon-stars', !isDark)
        ic.classList.toggle('bi-sun', isDark)
      }
    }
  }
  function toggle () {
    const next = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark'
    html.setAttribute('data-bs-theme', next)
    try { localStorage.setItem('turnex-theme', next) } catch (_) { }
    setIcon()
  }
  if (btn) {
    btn.addEventListener('click', toggle)
    setIcon()
  }
})()

// Service worker registration (skip on localhost)
if ('serviceWorker' in navigator && !['localhost', '127.0.0.1'].includes(location.hostname)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

// Provide default syncServices and renderServices when not provided by other modules.
(function () {
  if (window.syncServices && window.renderServices) return
  const API_BASE = window.API_BASE || 'http://localhost:3000/api'

  window.syncServices = async function () {
    try {
      const res = await fetch(`${API_BASE}/services`)
      if (!res.ok) return []
      const data = await res.json()
      window.__services_cache = data || []
      window.dispatchEvent(new Event('turnex:services-synced'))
      return data || []
    } catch (e) {
      window.__services_cache = []
      window.dispatchEvent(new Event('turnex:services-synced'))
      return []
    }
  }

  function esc (s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) }

  window.renderServices = function (services) {
    const list = document.getElementById('servicesList')
    const arr = services || window.__services_cache || []
    if (!list) return
    if (!arr.length) {
      list.innerHTML = '<div class="col-12 text-body-secondary">Sin servicios</div>'
      window.dispatchEvent(new Event('turnex:services-rendered'))
      return
    }
    list.innerHTML = arr.map(s => `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="service-card" data-id="${esc(s.id)}" data-category="${esc(s.category)}">
          <div class="service-image">
            <img src="${esc(s.image || '')}" alt="${esc(s.name)}" />
            <div class="service-category">${esc(s.category || '')}</div>
          </div>
          <div class="service-content">
            <h3 class="service-title">${esc(s.name)}</h3>
            <p class="service-description">${esc(s.description || '')}</p>
            <div class="service-meta">
              <div class="service-duration">${s.duration ? '⏱️ ' + esc(s.duration) + ' min' : ''}</div>
              <div class="service-price"><div class="price-amount">${s.price ? '$' + esc(s.price) : ''}</div></div>
            </div>
            <button class="btn-book btn btn-primary" data-action="book" data-service-id="${esc(s.id)}">Reservar Turno</button>
          </div>
        </div>
      </div>
    `).join('')

    window.dispatchEvent(new Event('turnex:services-rendered'))
  }
  // Try to load the search-and-booking module (modern browsers). If not available, leave the fallback handlers in the file.
  try {
    import('./search-and-booking.js').then(mod => {
      // wire up hero bindings and booking delegation
      try { if (mod && mod.setupHeroBindings) mod.setupHeroBindings() } catch (_) {}
      try { if (mod && mod.setupBookingDelegation) mod.setupBookingDelegation() } catch (_) {}
      try { if (mod && mod.setupBookingsButton) mod.setupBookingsButton() } catch (_) {}
      try { if (mod && mod.refreshBookingsWidget) mod.refreshBookingsWidget() } catch (_) {}
      // expose helpers globally for tests/fallbacks
      window.turnexSearchBooking = mod.default || mod
    }).catch(() => {
      // module import failed — leave inline fallbacks as-is (no-op)
    })
  } catch (e) { /* ignore older browsers */ }
  // If the app already ran init and skipped sync, perform a sync+render now
  try { window.syncServices().then(() => { try { window.renderServices(window.__services_cache || []) } catch(_){} }) } catch (_) {}
})()
