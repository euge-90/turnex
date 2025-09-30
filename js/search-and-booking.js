// Small module that provides hero search, booking handling and bookings history UI helpers
// This module is intentionally defensive and does not assume other modules are present.

function esc (s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) }

export function debounce (fn, wait) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait) } }

export async function performHeroSearch (query) {
  const q = String(query || '').trim().toLowerCase()
  const cached = window.__services_cache && window.__services_cache.length ? window.__services_cache : (await window.syncServices()) || []
  if (!q) {
    window.renderServices(cached)
    const list = document.getElementById('servicesList')
    if (list) list.scrollIntoView({ behavior: 'smooth' })
    return
  }
  const filtered = cached.filter(s => {
    const name = String(s.name || '').toLowerCase()
    const desc = String(s.description || '').toLowerCase()
    const cat = String(s.category || '').toLowerCase()
    return name.includes(q) || desc.includes(q) || cat.includes(q)
  })
  window.renderServices(filtered)
  // add visual highlight to matched cards
  setTimeout(() => {
    const list = document.getElementById('servicesList')
    if (!list) return
    list.querySelectorAll('.service-card').forEach(card => {
      const title = (card.querySelector('.service-title') && card.querySelector('.service-title').textContent || '').toLowerCase()
      const desc = (card.querySelector('.service-description') && card.querySelector('.service-description').textContent || '').toLowerCase()
      if (title.includes(q) || desc.includes(q) || (card.dataset.category || '').toLowerCase().includes(q)) {
        card.classList.add('turnex-highlight')
        setTimeout(() => card.classList.remove('turnex-highlight'), 1500)
      }
    })
  }, 50)
  const list = document.getElementById('servicesList')
  if (list) list.scrollIntoView({ behavior: 'smooth' })
}

export function setupHeroBindings () {
  try {
    const heroInput = document.getElementById('heroServiceQuery')
    const heroBtn = document.getElementById('btnHeroSearch')
    if (heroInput) heroInput.addEventListener('input', debounce(function (e) { performHeroSearch(e.target.value) }, 300))
    if (heroBtn) heroBtn.addEventListener('click', function () { performHeroSearch((heroInput && heroInput.value) || '') })
  } catch (e) { console.error(e) }
}

// Bookings (local demo storage)
export function handleBooking (serviceOrBtn) {
  const cached = window.__services_cache || []
  let serviceId = null
  let serviceName = ''
  // if an element (button) was passed, derive info from DOM
  if (serviceOrBtn && typeof serviceOrBtn === 'object' && serviceOrBtn.tagName) {
    const btn = serviceOrBtn
    serviceId = btn.getAttribute && btn.getAttribute('data-service-id')
    const card = btn.closest && btn.closest('.service-card')
    if (card) {
      serviceId = serviceId || card.dataset.id || card.getAttribute('data-id')
      const titleEl = card.querySelector && card.querySelector('.service-title')
      serviceName = titleEl ? titleEl.textContent.trim() : ''
    }
  } else if (serviceOrBtn) {
    serviceId = String(serviceOrBtn)
  }

  const svc = cached.find(s => String(s.id) === String(serviceId)) || { id: serviceId || 'local_' + Date.now(), name: serviceName || '' }
  const booking = { id: 'b_' + Date.now(), serviceId: svc.id, serviceName: svc.name || '', createdAt: new Date().toISOString() }
  try {
    const arr = JSON.parse(localStorage.getItem('turnex:bookings') || '[]')
    arr.unshift(booking)
    localStorage.setItem('turnex:bookings', JSON.stringify(arr))
    try { window.dispatchEvent && window.dispatchEvent(new CustomEvent('turnex:bookings-updated', { detail: { booking, count: arr.length } })) } catch (e) { /* ignore */ }
  } catch (e) { console.error(e) }
  try { showBookingConfirmation(booking, svc) } catch (e) { console.error(e) }
  refreshBookingsWidget()
}

function showBookingConfirmation (booking, service) {
  try {
    const id = 'turnex-toast-' + Date.now()
    const wrapper = document.createElement('div')
    wrapper.className = 'toast-container position-fixed bottom-0 end-0 p-3'
    wrapper.style.zIndex = 1080
    wrapper.innerHTML = `
      <div id="${id}" class="toast align-items-center text-bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">Reserva realizada: ${esc(service && service.name ? service.name : booking.serviceName)}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
        </div>
      </div>
    `
    document.body.appendChild(wrapper)
    const toastEl = wrapper.querySelector('.toast')
    // ensure visible immediately in case bootstrap JS isn't available
    try { toastEl.style.display = 'block' } catch (_) {}
    const bsToast = window.bootstrap && typeof window.bootstrap.Toast === 'function' ? new window.bootstrap.Toast(toastEl, { delay: 3000 }) : null
    if (bsToast && bsToast.show) bsToast.show()
    setTimeout(() => { try { wrapper.remove() } catch (_) {} }, 3500)
  } catch (e) { console.error(e) }
}

export function refreshBookingsWidget () {
  try {
    const el = document.getElementById('turnexBookingsList')
    if (!el) return

    // Leer turnos desde la estructura real (app_bookings_v1)
    const allBookings = JSON.parse(localStorage.getItem('app_bookings_v1') || '[]')

    // Filtrar por usuario actual si está logueado
    let userBookings = allBookings
    try {
      const userJson = localStorage.getItem('turnex-user')
      if (userJson) {
        const user = JSON.parse(userJson)
        userBookings = allBookings.filter(b => b.email === user.email)
      }
    } catch (e) { /* usar todos los turnos si no hay sesión */ }

    if (!userBookings.length) {
      el.innerHTML = '<div class="text-body-secondary text-center py-3">No tenés turnos reservados</div>'
      return
    }

    // Renderizar lista completa con opciones de editar/eliminar
    el.innerHTML = userBookings.slice(0, 20).map(b => `
      <div class="card mb-2 booking-item-card" data-booking-id="${esc(b.id)}">
        <div class="card-body p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 class="mb-1 fw-semibold">${esc(b.serviceName)}</h6>
              <div class="small text-muted">
                <i class="bi bi-calendar3"></i> ${esc(b.date)} a las ${esc(b.time)}
              </div>
              <div class="small text-muted">
                <i class="bi bi-clock"></i> Duración: ${b.duration || 30} min
              </div>
            </div>
            <div class="btn-group-vertical btn-group-sm">
              <button class="btn btn-sm btn-outline-primary" onclick="editBooking('${esc(b.id)}')" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteBooking('${esc(b.id)}')" title="Eliminar">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `).join('')

    try {
      window.dispatchEvent && window.dispatchEvent(new CustomEvent('turnex:bookings-refreshed', { detail: { count: userBookings.length } }))
    } catch (e) { /* ignore */ }
  } catch (e) { console.error(e) }
}

export function setupBookingDelegation () {
  try {
    const list = document.getElementById('servicesList')
    if (!list || list.__turnex_book_delegated) return
    list.addEventListener('click', function (ev) {
      const btn = ev.target.closest && ev.target.closest('[data-action="book"]')
      if (!btn) return
      const serviceId = btn.getAttribute('data-service-id') || (btn.closest && btn.closest('.service-card') && btn.closest('.service-card').dataset.id)
      if (!serviceId) return
      try { handleBooking(String(serviceId)) } catch (e) { console.error(e) }
    })
    list.__turnex_book_delegated = true
  } catch (e) { console.error(e) }
}

// Wire the floating bookings button to open the modal and refresh contents
export function setupBookingsButton() {
  try {
    const btn = document.getElementById('turnexBookingsBtn')
    if (!btn) return
    btn.addEventListener('click', function () {
      try {
        const modalEl = document.getElementById('turnexBookingsModal')
        refreshBookingsWidget()
        if (modalEl) {
          // set ARIA and attribute for tests
          try { modalEl.setAttribute('data-test-visible', '1'); modalEl.setAttribute('aria-hidden', 'false') } catch (_) {}
        }
        if (window.bootstrap && modalEl) {
          const bs = new window.bootstrap.Modal(modalEl)
          // remove attribute when hidden
          modalEl.addEventListener('hidden.bs.modal', function () { try { modalEl.removeAttribute('data-test-visible') } catch (_) {} }, { once: true })
          bs.show()
        } else if (modalEl) {
          // fallback for environments without Bootstrap JS: force visible and set aria/attr so tests can detect
          try { modalEl.classList.add('show'); modalEl.style.display = 'block'; modalEl.setAttribute('data-test-visible', '1'); modalEl.setAttribute('aria-hidden', 'false') } catch (_) {}
          // provide a small helper to hide later and restore aria
          modalEl.addEventListener('click', function hideOnClick(e) { try { if (e.target && e.target.matches && e.target.matches('[data-bs-dismiss]')) { modalEl.classList.remove('show'); modalEl.style.display = 'none'; modalEl.removeAttribute('data-test-visible'); modalEl.setAttribute('aria-hidden', 'true'); modalEl.removeEventListener('click', hideOnClick) } } catch(_){} })
        }
        try { window.dispatchEvent && window.dispatchEvent(new CustomEvent('turnex:bookings-modal-opened')) } catch (e) {}
      } catch (e) { console.error(e) }
    })
  } catch (e) { console.error(e) }
}

// Función global para editar turno
window.editBooking = async function(bookingId) {
  try {
    const allBookings = JSON.parse(localStorage.getItem('app_bookings_v1') || '[]')
    const booking = allBookings.find(b => b.id === bookingId)
    if (!booking) {
      alert('Turno no encontrado')
      return
    }

    const { value: formValues } = await Swal.fire({
      title: 'Editar Turno',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label class="form-label">Servicio</label>
            <input id="edit-service" class="form-control" value="${esc(booking.serviceName)}" readonly>
          </div>
          <div class="mb-3">
            <label class="form-label">Fecha</label>
            <input id="edit-date" type="date" class="form-control" value="${booking.date}">
          </div>
          <div class="mb-3">
            <label class="form-label">Hora</label>
            <input id="edit-time" type="time" class="form-control" value="${booking.time}">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        return {
          date: document.getElementById('edit-date').value,
          time: document.getElementById('edit-time').value
        }
      }
    })

    if (formValues) {
      const idx = allBookings.findIndex(b => b.id === bookingId)
      if (idx !== -1) {
        allBookings[idx] = { ...allBookings[idx], ...formValues }
        localStorage.setItem('app_bookings_v1', JSON.stringify(allBookings))
        refreshBookingsWidget()
        Swal.fire('¡Actualizado!', 'Tu turno fue modificado correctamente', 'success')
      }
    }
  } catch (error) {
    console.error('Error editando turno:', error)
    Swal.fire('Error', 'No se pudo editar el turno', 'error')
  }
}

// Función global para eliminar turno
window.deleteBooking = async function(bookingId) {
  try {
    const result = await Swal.fire({
      title: '¿Cancelar turno?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, mantener'
    })

    if (result.isConfirmed) {
      const allBookings = JSON.parse(localStorage.getItem('app_bookings_v1') || '[]')
      const filtered = allBookings.filter(b => b.id !== bookingId)
      localStorage.setItem('app_bookings_v1', JSON.stringify(filtered))
      refreshBookingsWidget()
      Swal.fire('¡Cancelado!', 'Tu turno fue eliminado', 'success')
    }
  } catch (error) {
    console.error('Error eliminando turno:', error)
    Swal.fire('Error', 'No se pudo cancelar el turno', 'error')
  }
}

export default {
  performHeroSearch,
  setupHeroBindings,
  handleBooking,
  setupBookingDelegation,
  refreshBookingsWidget,
}
