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

// Bookings (local demo storage) - UPDATED to open modal with date/time selection
export async function handleBooking (serviceOrBtn) {
  const cached = window.__services_cache || []
  let serviceId = null
  let serviceName = ''
  let serviceDuration = 30
  let servicePrice = 0

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

  const svc = cached.find(s => String(s.id) === String(serviceId))
  if (svc) {
    serviceName = svc.name
    serviceDuration = svc.duration || 30
    servicePrice = svc.price || 0
  }

  // Check if user is logged in
  let userEmail = ''
  let userName = ''
  try {
    const userJson = localStorage.getItem('turnex-user')
    if (userJson) {
      const user = JSON.parse(userJson)
      userEmail = user.email || ''
      userName = user.name || user.email || ''
    }
  } catch (e) { /* no session */ }

  if (!userEmail) {
    Swal.fire({
      icon: 'warning',
      title: 'Iniciá sesión',
      text: 'Necesitás estar logueado para reservar turnos',
      confirmButtonText: 'Entendido'
    })
    return
  }

  // Import booking functions
  const { createBooking, listTakenSlots } = await import('./booking.js')
  const { generateTimeSlots, isWorkingDay, isPast, fmtDateKey } = await import('./utils.js')

  // Generate min date (tomorrow)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = fmtDateKey(tomorrow)

  // Generate max date (60 days from now)
  const maxDateObj = new Date(today)
  maxDateObj.setDate(maxDateObj.getDate() + 60)
  const maxDate = fmtDateKey(maxDateObj)

  const { value: formValues } = await Swal.fire({
    title: 'Reservar Turno',
    html: `
      <div class="text-start">
        <div class="mb-3">
          <label class="form-label fw-bold">Servicio</label>
          <input class="form-control" value="${esc(serviceName)}" readonly>
          <small class="text-muted">Duración: ${serviceDuration} min | Precio: $${servicePrice}</small>
        </div>
        <div class="mb-3">
          <label class="form-label fw-bold">Fecha</label>
          <input id="booking-date" type="date" class="form-control" min="${minDate}" max="${maxDate}" required>
          <small class="text-muted">Martes a sábado únicamente</small>
        </div>
        <div class="mb-3">
          <label class="form-label fw-bold">Horario</label>
          <select id="booking-time" class="form-select" required>
            <option value="">Seleccioná primero una fecha</option>
          </select>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Reservar',
    cancelButtonText: 'Cancelar',
    didOpen: () => {
      const dateInput = document.getElementById('booking-date')
      const timeSelect = document.getElementById('booking-time')

      // Update available times when date changes
      dateInput.addEventListener('change', function() {
        const selectedDate = this.value
        if (!selectedDate) {
          timeSelect.innerHTML = '<option value="">Seleccioná una fecha</option>'
          return
        }

        const dateObj = new Date(selectedDate + 'T00:00:00')

        // Validate working day
        if (!isWorkingDay(dateObj)) {
          timeSelect.innerHTML = '<option value="">No trabajamos este día (solo Mar-Sáb)</option>'
          return
        }

        // Validate not past
        if (isPast(dateObj)) {
          timeSelect.innerHTML = '<option value="">No se puede reservar en fechas pasadas</option>'
          return
        }

        // Get available slots
        const allSlots = generateTimeSlots(dateObj)
        const takenSlots = listTakenSlots(selectedDate)

        const availableSlots = allSlots.filter(slot => !takenSlots.has(slot))

        if (availableSlots.length === 0) {
          timeSelect.innerHTML = '<option value="">No hay horarios disponibles</option>'
          return
        }

        timeSelect.innerHTML = '<option value="">Seleccioná un horario</option>' +
          availableSlots.map(slot => `<option value="${slot}">${slot}</option>`).join('')
      })
    },
    preConfirm: () => {
      const date = document.getElementById('booking-date').value
      const time = document.getElementById('booking-time').value

      if (!date || !time) {
        Swal.showValidationMessage('Completá todos los campos')
        return false
      }

      return { date, time }
    }
  })

  if (formValues) {
    try {
      const newBooking = createBooking({
        email: userEmail,
        name: userName,
        serviceId: serviceId,
        serviceName: serviceName,
        date: formValues.date,
        time: formValues.time
      })

      Swal.fire({
        icon: 'success',
        title: '¡Reserva confirmada!',
        html: `
          <div class="text-start">
            <p><strong>Servicio:</strong> ${esc(serviceName)}</p>
            <p><strong>Fecha:</strong> ${formValues.date}</p>
            <p><strong>Hora:</strong> ${formValues.time}</p>
            <p class="text-muted mt-2">Te esperamos!</p>
          </div>
        `,
        confirmButtonText: 'Entendido'
      })

      refreshBookingsWidget()
    } catch (error) {
      console.error('Error creando reserva:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo crear la reserva',
        confirmButtonText: 'Cerrar'
      })
    }
  }
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

// Función global para editar turno - UPDATED with availability validation
window.editBooking = async function(bookingId) {
  try {
    const allBookings = JSON.parse(localStorage.getItem('app_bookings_v1') || '[]')
    const booking = allBookings.find(b => b.id === bookingId)
    if (!booking) {
      Swal.fire('Error', 'Turno no encontrado', 'error')
      return
    }

    // Import functions for validation
    const { canFitExcluding, listTakenSlotsForDateExcluding } = await import('./booking.js')
    const { generateTimeSlots, isWorkingDay, isPast, fmtDateKey } = await import('./utils.js')

    // Generate min date (today)
    const today = new Date()
    const minDate = fmtDateKey(today)

    // Generate max date (60 days from now)
    const maxDateObj = new Date(today)
    maxDateObj.setDate(maxDateObj.getDate() + 60)
    const maxDate = fmtDateKey(maxDateObj)

    const { value: formValues } = await Swal.fire({
      title: 'Editar Turno',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label class="form-label fw-bold">Servicio</label>
            <input class="form-control" value="${esc(booking.serviceName)}" readonly>
            <small class="text-muted">Duración: ${booking.duration || 30} min</small>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">Fecha</label>
            <input id="edit-date" type="date" class="form-control" value="${booking.date}" min="${minDate}" max="${maxDate}" required>
            <small class="text-muted">Martes a sábado únicamente</small>
          </div>
          <div class="mb-3">
            <label class="form-label fw-bold">Horario</label>
            <select id="edit-time" class="form-select" required>
              <option value="">Seleccioná un horario</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const dateInput = document.getElementById('edit-date')
        const timeSelect = document.getElementById('edit-time')

        // Function to update available times
        function updateAvailableTimes() {
          const selectedDate = dateInput.value
          if (!selectedDate) {
            timeSelect.innerHTML = '<option value="">Seleccioná una fecha</option>'
            return
          }

          const dateObj = new Date(selectedDate + 'T00:00:00')

          // Validate working day
          if (!isWorkingDay(dateObj)) {
            timeSelect.innerHTML = '<option value="">No trabajamos este día (solo Mar-Sáb)</option>'
            return
          }

          // Validate not past (allow today)
          const todayKey = fmtDateKey(new Date())
          if (selectedDate < todayKey) {
            timeSelect.innerHTML = '<option value="">No se puede reservar en fechas pasadas</option>'
            return
          }

          // Get available slots (excluding current booking)
          const allSlots = generateTimeSlots(dateObj)
          const takenSlots = listTakenSlotsForDateExcluding(selectedDate, bookingId)

          const availableSlots = allSlots.filter(slot => !takenSlots.has(slot))

          if (availableSlots.length === 0) {
            timeSelect.innerHTML = '<option value="">No hay horarios disponibles</option>'
            return
          }

          // Build options, pre-select current time if available
          timeSelect.innerHTML = '<option value="">Seleccioná un horario</option>' +
            availableSlots.map(slot => {
              const selected = slot === booking.time ? 'selected' : ''
              return `<option value="${slot}" ${selected}>${slot}</option>`
            }).join('')
        }

        // Initial load
        updateAvailableTimes()

        // Update on date change
        dateInput.addEventListener('change', updateAvailableTimes)
      },
      preConfirm: () => {
        const date = document.getElementById('edit-date').value
        const time = document.getElementById('edit-time').value

        if (!date || !time) {
          Swal.showValidationMessage('Completá todos los campos')
          return false
        }

        // Validate availability with full duration check
        const duration = booking.duration || 30
        if (!canFitExcluding(date, time, duration, bookingId)) {
          Swal.showValidationMessage('El horario seleccionado no está disponible o no tiene suficiente duración')
          return false
        }

        return { date, time }
      }
    })

    if (formValues) {
      const idx = allBookings.findIndex(b => b.id === bookingId)
      if (idx !== -1) {
        allBookings[idx] = { ...allBookings[idx], ...formValues }
        localStorage.setItem('app_bookings_v1', JSON.stringify(allBookings))
        refreshBookingsWidget()
        Swal.fire({
          icon: 'success',
          title: '¡Actualizado!',
          text: 'Tu turno fue modificado correctamente',
          confirmButtonText: 'Entendido'
        })
      }
    }
  } catch (error) {
    console.error('Error editando turno:', error)
    Swal.fire('Error', error.message || 'No se pudo editar el turno', 'error')
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
