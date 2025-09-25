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
