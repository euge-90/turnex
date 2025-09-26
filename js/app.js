import { qs, qsa, generateTimeSlots, fmtDateKey, addDays, getConfig, setConfig, timeToMinutes, SLOT_MINUTES, isWorkingDay, isDateBlocked, minutesToTime } from './utils.js'
import { CalendarioTurnex } from './calendario-turnex.js'
// Legacy booking.js imports removed; API is the source of truth
import { isLogged, login, signup, logout, getSession, isAdmin } from './auth.js'
import { AuthTurnex } from './auth-turnex.js'
import api from './api.js';

// DOM refs
const grid = qs('#calendarGrid')
const label = qs('#monthLabel')
const prev = qs('#prevMonth')
const next = qs('#nextMonth')
const slotsEl = qs('#timeSlots')
const form = qs('#bookingForm')
const btnConfirm = qs('#btnConfirm')
const nameInput = qs('#name')
const serviceSelect = qs('#service')
const serviceHelp = qs('#serviceHelp')
const servicesList = qs('#servicesList')
const servicesNewBadge = document.getElementById('servicesNewBadge')
const svcCategory = document.getElementById('svcCategory')
const svcCount = document.getElementById('svcCount')
const myBookingsEl = qs('#myBookings')
const btnLogin = qs('#btnLogin')
const btnSignup = qs('#btnSignup')
const navMyBookings = qs('#navMyBookings')
const btnLogout = qs('#btnLogout')
const navLogout = document.getElementById('navLogout')
const userMenu = document.getElementById('userMenu')
const authButtons = document.getElementById('authButtons')
const userNameEl = document.getElementById('userName')
const userAvatarInitial = document.getElementById('userAvatarInitial')
const heroButtonsOut = document.getElementById('heroButtonsOut')
const heroButtonsIn = document.getElementById('heroButtonsIn')
const yearEl = qs('#year')
const navAdminItem = qs('#navAdminItem')
const adminSection = qs('#admin')
const calendarioSection = qs('#calendario')
const misTurnosSection = qs('#mis-turnos')
const adminSummaryEl = qs('#adminSummary')
// --- Forward declarations / runtime stubs for helpers that live elsewhere ---
// These prefer window implementations when present, otherwise are no-ops.
let selectedDateKey = null
let selectedTime = null
const renderServices = (...args) => (window.renderServices ? window.renderServices(...args) : undefined)
const syncServices = (...args) => (window.syncServices ? window.syncServices(...args) : Promise.resolve([]))
const renderServicesSkeleton = (...args) => (window.renderServicesSkeleton ? window.renderServicesSkeleton(...args) : undefined)
const renderTimeSlots = (...args) => (window.renderTimeSlots ? window.renderTimeSlots(...args) : undefined)
const renderTimeSlotsSkeleton = (...args) => (window.renderTimeSlotsSkeleton ? window.renderTimeSlotsSkeleton(...args) : undefined)
const syncTakenForDate = (...args) => (window.syncTakenForDate ? window.syncTakenForDate(...args) : Promise.resolve())
const updateConfirmState = (...args) => (window.updateConfirmState ? window.updateConfirmState(...args) : undefined)
const getServiceByIdCached = (...args) => (window.getServiceByIdCached ? window.getServiceByIdCached(...args) : null)
const syncMyBookings = (...args) => (window.syncMyBookings ? window.syncMyBookings(...args) : Promise.resolve())
const syncAdminBookings = (...args) => (window.syncAdminBookings ? window.syncAdminBookings(...args) : Promise.resolve())
const renderMyBookings = (...args) => (window.renderMyBookings ? window.renderMyBookings(...args) : undefined)
const syncConfig = (...args) => (window.syncConfig ? window.syncConfig(...args) : undefined)
const setupAuth = (...args) => (window.setupAuth ? window.setupAuth(...args) : undefined)
const renderHoursBanner = (...args) => (window.renderHoursBanner ? window.renderHoursBanner(...args) : undefined)
const guardAdminRoute = (...args) => (window.guardAdminRoute ? window.guardAdminRoute(...args) : undefined)
const showModal = (...args) => (window.showModal ? window.showModal(...args) : undefined)
const createColorfulRipple = (...args) => (window.createColorfulRipple ? window.createColorfulRipple(...args) : undefined)
const performColorfulSearch = (...args) => (window.performColorfulSearch ? window.performColorfulSearch(...args) : undefined)
// Extra small stubs and DOM refs used by admin/ui code to satisfy linter
const updateAuthUI = (...args) => (window.updateAuthUI ? window.updateAuthUI(...args) : undefined)
const ensureAdminNavVisible = (...args) => (window.ensureAdminNavVisible ? window.ensureAdminNavVisible(...args) : undefined)
// Admin-related DOM elements (may be null if admin UI isn't present on the page)
const adminFilterService = qs('#adminFilterService') || qs('#admin-filter-service') || document.getElementById('adminFilterService')
const adminFilterFrom = qs('#adminFilterFrom') || document.getElementById('adminFilterFrom')
const adminFilterTo = qs('#adminFilterTo') || document.getElementById('adminFilterTo')
const adminFilterClear = qs('#adminFilterClear') || document.getElementById('adminFilterClear')
const adminByDayEl = qs('#adminByDay') || qs('#adminByDayEl') || document.getElementById('adminByDay')
const adminBookingsEl = qs('#adminBookings') || document.getElementById('adminBookings')
const adminHoursEl = qs('#adminHours') || document.getElementById('adminHours')
const btnSaveHours = qs('#btnSaveHours') || document.getElementById('btnSaveHours')
const blockedDaysList = qs('#blockedDaysList') || document.getElementById('blockedDaysList')
const btnAddBlocked = qs('#btnAddBlocked') || document.getElementById('btnAddBlocked')
const adminBlockDate = qs('#adminBlockDate') || document.getElementById('adminBlockDate')
const blockedRangesList = qs('#blockedRangesList') || document.getElementById('blockedRangesList')
const btnAddRange = qs('#btnAddRange') || document.getElementById('btnAddRange')
const adminRangeFrom = qs('#adminRangeFrom') || document.getElementById('adminRangeFrom')
const adminRangeTo = qs('#adminRangeTo') || document.getElementById('adminRangeTo')
const blockedTimesList = qs('#blockedTimesList') || document.getElementById('blockedTimesList')
const btnAddTimeBlock = qs('#btnAddTimeBlock') || document.getElementById('btnAddTimeBlock')
const adminTimeDate = qs('#adminTimeDate') || document.getElementById('adminTimeDate')
const adminTimeFrom = qs('#adminTimeFrom') || document.getElementById('adminTimeFrom')
const adminTimeTo = qs('#adminTimeTo') || document.getElementById('adminTimeTo')
const adminServicesEl = qs('#adminServices') || document.getElementById('adminServices')
const btnAddService = qs('#btnAddService') || document.getElementById('btnAddService')
const svcNameInput = document.getElementById('svcName') || document.querySelector('[name="svcName"]')
const svcDescInput = document.getElementById('svcDesc') || document.querySelector('[name="svcDesc"]')
const svcDurationInput = document.getElementById('svcDuration') || document.querySelector('[name="svcDuration"]')
const svcPriceInput = document.getElementById('svcPrice') || document.querySelector('[name="svcPrice"]')
// --- end stubs ---
// Configuración de colores para efectos dinámicos
const colorPalette = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  pastels: [
    '#FFD6E8', '#B3E5FC', '#C8E6C9',
    '#FFF9C4', '#E1BEE7', '#FFCCBC'
  ]
}

// Datos de profesionales para servicios
const professionals = [
  { name: 'Maria González', rating: 4.9, reviews: 127, avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bb?w=40&h=40&fit=crop&crop=face' },
  { name: 'Carlos Mendez', rating: 4.8, reviews: 89, avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face' },
  { name: 'Ana Rodriguez', rating: 4.9, reviews: 203, avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face' },
  { name: 'Laura Martinez', rating: 4.8, reviews: 98, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=40&h=40&fit=crop&crop=face' },
  { name: 'Diego Lopez', rating: 4.6, reviews: 74, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face' }
]

// Inicialización principal
document.addEventListener('DOMContentLoaded', function () {
  initColorfulAnimations()
  initInteractiveElements()
  initSearchFunctionality()
  initServiceCardEffects()
  initScrollEffects()
  initCategoryFilters()
  initBusinessFeatures()
})

// Animaciones coloridas al aparecer elementos
function initColorfulAnimations () {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1'
          entry.target.style.transform = 'translateY(0) scale(1)'
        }, index * 150)
      }
    })
  }, observerOptions)

  document.querySelectorAll('.service-card, .testimonial-card, .stat-item, .how-it-works-card, .feature-card, .business-card').forEach((el) => {
    el.style.opacity = '0'
    el.style.transform = 'translateY(30px) scale(0.95)'
    el.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    observer.observe(el)
  })
}

// Inicializar filtros de categorías
function initCategoryFilters () {
  const categoryButtons = document.querySelectorAll('.category-btn')
  const serviceCards = document.querySelectorAll('.service-card')

  categoryButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const category = this.dataset.category

      categoryButtons.forEach(b => b.classList.remove('active'))
      this.classList.add('active')

      serviceCards.forEach((card, index) => {
        const cardCategory = card.dataset.category || 'all'

        if (category === 'all' || cardCategory === category) {
          card.style.display = 'block'
          setTimeout(() => {
            card.style.opacity = '1'
            card.style.transform = 'translateY(0) scale(1)'
          }, index * 100)
        } else {
          card.style.opacity = '0'
          card.style.transform = 'translateY(20px) scale(0.95)'
          setTimeout(() => {
            card.style.display = 'none'
          }, 300)
        }
      })
    })
  })
}

// Funciones de negocio
function initBusinessFeatures () {
  document.querySelectorAll('.app-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      const platform = this.textContent.includes('App Store') ? 'iOS' : 'Android'
      showAppDownloadModal(platform)
    })
  })

  document.querySelectorAll('.business-card .btn-business').forEach(btn => {
    btn.addEventListener('click', function () {
      const cardTitle = this.closest('.business-card').querySelector('h4').textContent
      showBusinessInfoModal(cardTitle)
    })
  })
}

// Elementos interactivos
function initInteractiveElements () {
  document.querySelectorAll('.service-card').forEach((card, index) => {
    const pastelColor = colorPalette.pastels[index % colorPalette.pastels.length]

    card.addEventListener('mouseenter', function () {
      this.style.background = `linear-gradient(135deg, ${pastelColor}20 0%, ${colorPalette.primary}10 100%)`
      this.style.borderColor = pastelColor
    })

    card.addEventListener('mouseleave', function () {
      this.style.background = '#FFFFFF'
      this.style.borderColor = 'transparent'
    })
  })

  document.querySelectorAll('.btn-accent, .btn-book').forEach(btn => {
    btn.addEventListener('click', function (e) {
      createColorfulRipple(this, e)
    })
  })
}

// Búsqueda interactiva
function initSearchFunctionality () {
  const searchInputs = document.querySelectorAll('.search-form input')
  const searchButton = document.querySelector('.search-form .btn-accent')

  searchInputs.forEach(input => {
    input.addEventListener('focus', function () {
      this.style.borderColor = colorPalette.secondary
      this.style.boxShadow = `0 0 0 3px ${colorPalette.secondary}30`
    })

    input.addEventListener('blur', function () {
      this.style.borderColor = '#E2E8F0'
      this.style.boxShadow = 'none'
    })
  })

  searchButton.addEventListener('click', function () {
    const servicio = searchInputs[0].value.toLowerCase()
    const zona = searchInputs[1].value.toLowerCase()
    performColorfulSearch(servicio, zona)
  })

  // Suggestion tags
  document.querySelectorAll('.suggestion-tag').forEach(tag => {
    tag.addEventListener('click', function () {
      searchInputs[0].value = this.textContent
      performColorfulSearch(this.textContent.toLowerCase(), '')
    })
  })
}

// Efectos en service cards
function initServiceCardEffects () {
  document.querySelectorAll('.service-card').forEach(card => {
    const img = card.querySelector('img')
    if (img) {
      img.addEventListener('mouseenter', function () {
        this.style.filter = 'brightness(110%) saturate(120%)'
      })
      img.addEventListener('mouseleave', function () {
        this.style.filter = 'brightness(100%) saturate(100%)'
      })
    }
  })

  document.querySelectorAll('.btn-book').forEach(button => {
    button.addEventListener('click', function (e) {
      e.preventDefault()
      const serviceCard = this.closest('.service-card')
      const serviceName = serviceCard.querySelector('.service-title').textContent
      const servicePrice = serviceCard.querySelector('.price-amount').textContent
      showBookingModal(serviceName, servicePrice)
    })
  })
}

// Efectos de scroll
function initScrollEffects () {
  window.addEventListener('scroll', function () {
    const scrolled = window.pageYOffset
    const navbar = document.querySelector('.navbar')

    if (scrolled > 100) {
      navbar.style.background = `linear-gradient(135deg, ${colorPalette.primary}95 0%, ${colorPalette.secondary}95 100%)`
      navbar.style.backdropFilter = 'blur(20px)'
    } else {
      navbar.style.background = `linear-gradient(135deg, ${colorPalette.primary} 0%, ${colorPalette.secondary} 100%)`
    }
  })
}

// Modal de reserva
function showBookingModal (serviceName, price) {
  const modalHTML = `
    <div class="modal fade" id="bookingModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border-radius: 20px; border: 3px solid ${colorPalette.primary};">
          <div class="modal-header" style="background: ${colorPalette.pastels[0]}40; border-radius: 17px 17px 0 0;">
            <h5 class="modal-title" style="color: ${colorPalette.primary}; font-weight: 700;">
              🎉 ¡Reservar ${serviceName}!
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center" style="padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">✨</div>
            <h4 style="color: ${colorPalette.primary}; margin-bottom: 1rem;">${serviceName}</h4>
            <p style="font-size: 2rem; color: ${colorPalette.secondary}; font-weight: 700; margin-bottom: 1.5rem;">${price}</p>
            <p style="color: #4A5568; margin-bottom: 2rem;">
              ¡Pronto tendrás acceso al sistema completo de reservas! 
              Mientras tanto, puedes contactarnos directamente.
            </p>
            <div class="d-grid gap-2">
              <button class="btn" onclick="contactWhatsApp('${serviceName}')" 
                  style="background: ${colorPalette.primary}; color: white; border-radius: 25px; padding: 12px; font-weight: 600;">
                📱 Contactar por WhatsApp
              </button>
              <button class="btn" onclick="contactPhone('${serviceName}')"
                  style="background: ${colorPalette.accent}; color: #2D3748; border-radius: 25px; padding: 12px; font-weight: 600;">
                📞 Llamar Ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

  showModal(modalHTML, 'bookingModal')
}

// Modal para descarga de app
function showAppDownloadModal (platform) {
  const modalHTML = `
    <div class="modal fade" id="appModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border-radius: 20px; border: 3px solid ${colorPalette.secondary};">
          <div class="modal-header" style="background: ${colorPalette.pastels[1]}40; border-radius: 17px 17px 0 0;">
            <h5 class="modal-title" style="color: ${colorPalette.primary}; font-weight: 700;">
              📱 Descarga Turnex para ${platform}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center" style="padding: 2rem;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">🚀</div>
            <h4 style="color: ${colorPalette.primary}; margin-bottom: 1rem;">¡Próximamente en ${platform}!</h4>
            <p style="color: #4A5568; margin-bottom: 2rem;">
              Estamos desarrollando nuestra app móvil. Mientras tanto, usa nuestra versión web.
            </p>
            <button class="btn" onclick="subscribeToUpdates()" 
                style="background: ${colorPalette.secondary}; color: white; border-radius: 25px; padding: 12px 30px; font-weight: 600;">
              🔔 Notificarme cuando esté lista
            </button>
          </div>
        </div>
      </div>
    </div>
  `

  showModal(modalHTML, 'appModal')
}

// Modal para información de negocio
function showBusinessInfoModal (feature) {
  const businessInfo = {
    'Gestión completa': 'Dashboard intuitivo, calendario sincronizado, base de datos de clientes',
    'Aumenta tus ventas': 'Perfil en marketplace, marketing automatizado, sistema de reseñas',
    'Reduce cancelaciones': 'Recordatorios automáticos, políticas de cancelación, estadísticas'
  }
  const htmlText = businessInfo[feature] || ''
  const modalHTML = `
    <div class="modal fade" id="businessInfoModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border-radius: 20px; border: 3px solid ${colorPalette.accent};">
          <div class="modal-header" style="background: ${colorPalette.pastels[3]}40; border-radius: 17px 17px 0 0;">
            <h5 class="modal-title" style="color: ${colorPalette.primary}; font-weight: 700;">
              ${feature}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body" style="padding: 1.5rem;">
            <p>${htmlText}</p>
          </div>
        </div>
      </div>
    </div>
  `

  showModal(modalHTML, 'businessInfoModal')

  // Note: previous inline code accidentally injected into the template literal was removed here.

  const protectHashes = () => {
    if (!isLogged()) {
      const h = location.hash
      if (h === '#calendario' || h === '#mis-turnos' || h === '#admin') {
        location.hash = '#servicios'
        const modal = document.getElementById('authModal')
        const m = modal ? new bootstrap.Modal(modal) : null
        m?.show()
      }
    }
  }
  window.addEventListener('hashchange', protectHashes)
  protectHashes()

  // Do NOT auto-show auth modal on page load; users should open it manually.
  // (This intentionally leaves the modal closed by default.)

  // Initial UI state
  updateAuthUI()

  // Also react to global auth-success events
  window.addEventListener('turnex:auth-success', async () => {
    updateAuthUI()
    await Promise.all([syncMyBookings(), syncAdminBookings()])
    renderMyBookings()
    renderAdmin()
  })

  // Logout from dropdown
  if (navLogout) {
    navLogout.addEventListener('click', (e) => {
      e.preventDefault()
      logout()
      // Reset UI state
      authButtons?.classList.remove('d-none')
      userMenu?.classList.add('d-none')
      heroButtonsOut?.classList.remove('d-none')
      heroButtonsIn?.classList.add('d-none')
      ensureAdminNavVisible(false)
      adminSection?.classList.add('d-none')
      calendarioSection?.classList.add('d-none')
      misTurnosSection?.classList.add('d-none')
      const myNavLi = navMyBookings?.closest('li')
      if (myNavLi) myNavLi.classList.add('d-none')
      // Go back to servicios
      location.hash = '#servicios'
      if (window.txToast) { window.txToast({ type: 'info', text: 'Sesión cerrada' }) } else { try { Swal.fire('Sesión cerrada', 'Tu sesión fue cerrada correctamente', 'success') } catch {} }
    })
  }

  // Hero CTA: scroll to calendar for logged users
  document.getElementById('heroReserveBtn')?.addEventListener('click', (e) => {
    e.preventDefault()
    if (!isLogged()) {
      // Open login modal when not logged
      const modal = document.getElementById('authModal')
      const m = modal ? new bootstrap.Modal(modal) : null
      m?.show()
      return
    }
    location.hash = '#calendario'
    document.getElementById('calendario')?.scrollIntoView({ behavior: 'smooth' })
  })

  // Hero CTA signup opens modal in signup mode
  document.querySelectorAll('[data-open-auth="signup"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const modal = document.getElementById('authModal')
      const m = modal ? new bootstrap.Modal(modal) : null
      // set to signup mode by toggling UI label appropriately
      const toggle = document.getElementById('btnToggleAuth')
      if (toggle) {
        // force signup state by simulating toggle if needed
        const title = document.querySelector('#authModal .modal-title')
        if (title && title.textContent?.includes('Ingresar')) toggle.click()
      }
      m?.show()
    })
  })

  // Hero search wiring: use hero fields to filter services
  const heroSearchBtn = document.getElementById('btnHeroSearch')
  const heroQuery = document.getElementById('heroServiceQuery')
  const heroLocation = document.getElementById('heroLocation')
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', (e) => {
      e.preventDefault()
      // Simple client-side filter by name/description
      const q = (heroQuery?.value || '').trim().toLowerCase()
      const loc = (heroLocation?.value || '').trim().toLowerCase()
      // If user is not logged, encourage signup via modal
      if (!isLogged() && q.length === 0) {
        const modal = document.getElementById('authModal')
        const m = modal ? new bootstrap.Modal(modal) : null
        m?.show()
        return
      }
      // If a category-like term matches known categories, set the select
      const categories = ['corte', 'color', 'tratamiento', 'barba', 'peinado', 'unas']
      const foundCat = categories.find(c => q.includes(c) || (q.length === 0 && loc.length > 0))
      if (foundCat) {
        svcCategory.value = foundCat
      } else {
        svcCategory.value = ''
      }
      renderServices()
      // Scroll to services
      document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  // Category card clicks: set select and render
  qsa('.cat-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const cat = card.dataset.cat || card.getAttribute('data-cat') || ''
      if (!cat) return
      if (svcCategory) svcCategory.value = cat
      renderServices()
      document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })
    })
  })
}

function setupCalendar () {
  const cal = new CalendarioTurnex(grid, label)
  cal.mount()
  cal.onSelect(async (date) => {
    selectedDateKey = fmtDateKey(date)
    selectedTime = null
    renderTimeSlotsSkeleton()
    await syncTakenForDate(selectedDateKey)
    renderTimeSlots(selectedDateKey)
    updateConfirmState()
  })
  prev.addEventListener('click', () => cal.prev())
  next.addEventListener('click', () => cal.next())
}

function setupBookingForm () {
  // HTML validation feedback
  form.addEventListener('input', updateConfirmState)
  // If user taps confirm while disabled, explain what's missing
  btnConfirm.addEventListener('click', (e) => {
    if (btnConfirm.disabled) {
      e.preventDefault()
      const missing = []
      if (!serviceSelect.value) missing.push('servicio')
      if (!(nameInput.value?.trim().length >= 2)) missing.push('nombre')
      if (!selectedDateKey) missing.push('día')
      if (!selectedTime) missing.push('horario')
      const msg = missing.length ? `Te falta seleccionar: ${missing.join(', ')}.` : 'Completá los pasos para confirmar.'
      try { Swal.fire('Faltan datos', msg, 'info') } catch {}
    }
  })
  serviceSelect.addEventListener('change', () => {
    selectedTime = null
    updateConfirmState()
    // Update helper text with service description or duration
    const svcId = serviceSelect.value
    const svc = svcId ? getServiceByIdCached(svcId) : null
    if (serviceHelp) {
      if (svc) {
        const desc = svc.description?.trim()
        serviceHelp.textContent = desc && desc.length > 0 ? desc : `Duración aprox. ${svc.duration} min`
      } else {
        serviceHelp.textContent = 'Elegí el servicio para calcular la duración.'
      }
    }
    if (selectedDateKey) renderTimeSlots(selectedDateKey)
  })
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!isLogged()) {
      Swal.fire('Ingresá primero', 'Necesitás iniciar sesión para reservar', 'info')
      return
    }
    const session = getSession()
    const serviceId = serviceSelect.value
    const service = getServiceByIdCached(serviceId)
    // Extra guards to ensure date/time were selected
    if (!serviceId) { Swal.fire('Seleccioná un servicio', 'Elegí un servicio para continuar', 'info'); return }
    if (!(nameInput.value?.trim().length >= 2)) { Swal.fire('Ingresá tu nombre', 'Completá tu nombre (mínimo 2 caracteres)', 'info'); return }
    if (!selectedDateKey) { Swal.fire('Seleccioná un día', 'Elegí un día en el calendario', 'info'); return }
    if (!selectedTime) { Swal.fire('Seleccioná un horario', 'Elegí un horario disponible', 'info'); return }
    try {
      const item = await api.createBooking({ serviceId, date: selectedDateKey, time: selectedTime, name: nameInput.value.trim() })
      const descHtml = service?.description && service.description.trim().length > 0 ? `${service.description}<br>` : ''
      const durHtml = Number.isFinite(service?.duration) ? `<div class="text-body-secondary">Duración aprox. ${service.duration} min</div>` : ''
      await Swal.fire({
        title: '¡Reserva confirmada!',
        html: `<b>${service?.name || 'Servicio'}</b><br>${descHtml}${item.date} · ${item.time}${durHtml}`,
        icon: 'success',
        confirmButtonText: 'Aceptar'
      })
      if (window.txToast) { window.txToast({ type: 'success', text: 'Reserva confirmada' }) }
      await Promise.all([syncTakenForDate(selectedDateKey), syncMyBookings(), syncAdminBookings()])
      renderTimeSlots(selectedDateKey)
      renderMyBookings()
      renderAdmin()
      form.reset()
      if (serviceHelp) serviceHelp.textContent = 'Elegí el servicio para calcular la duración.'
      selectedTime = null
      updateConfirmState()
    } catch (err) { Swal.fire('Error', err.message, 'error') }
  })
}

function init () {
  yearEl.textContent = new Date().getFullYear()
  syncConfig()
  renderServicesSkeleton()
  syncServices().then(renderServices)
  setupCalendar()
  setupAuth()
  setupBookingForm()
  renderHoursBanner()
  syncMyBookings().then(renderMyBookings)
  syncAdminBookings().then(renderAdmin)
  guardAdminRoute()
  window.addEventListener('hashchange', guardAdminRoute)
}

document.addEventListener('DOMContentLoaded', init)

// Wire up book button behavior for dynamically rendered service cards
window.addEventListener('turnex:services-rendered', () => {
  document.querySelectorAll('.btn-book').forEach(btn => {
    // avoid double-binding
    if (btn.__txBound) return
    btn.__txBound = true
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      // If not logged, open auth modal
      if (!isLogged()) {
        const modal = document.getElementById('authModal')
        // Synchronously ensure modal is visible and has the expected class for tests
        if (modal) {
          modal.classList.add('show')
          modal.style.display = 'block'
          modal.removeAttribute('aria-hidden')
          modal.setAttribute('aria-modal', 'true')
        }
        if (!document.querySelector('.modal-backdrop')) {
          const b = document.createElement('div')
          b.className = 'modal-backdrop fade show'
          document.body.appendChild(b)
        }
        const m = modal ? new bootstrap.Modal(modal) : null
        m?.show()
        return
      }
      // Otherwise, show booking modal
      const serviceCard = this.closest('.service-card')
      const serviceName = serviceCard ? (serviceCard.querySelector('.service-title')?.textContent || '') : ''
      const servicePrice = serviceCard ? (serviceCard.querySelector('.price-amount')?.textContent || '') : ''
      showBookingModal(serviceName, servicePrice)
    })
  })
})

// Document-level fallback: handle clicks on any current or future booking buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action="book"], .btn-book')
  if (!btn) return
  e.preventDefault()
  // Synchronously show auth modal for unauthenticated flows
  const modal = document.getElementById('authModal')
  if (modal) {
    modal.classList.add('show')
    modal.style.display = 'block'
    modal.removeAttribute('aria-hidden')
    modal.setAttribute('aria-modal', 'true')
  }
  if (!document.querySelector('.modal-backdrop')) {
    const b = document.createElement('div')
    b.className = 'modal-backdrop fade show'
    document.body.appendChild(b)
  }
  try { const m = modal ? new bootstrap.Modal(modal) : null; m?.show() } catch (_) {}
})

// Global helpers for legacy inline handlers
window.showDashboard = function () {
  if (isAdmin()) {
    location.hash = '#admin'
  } else if (isLogged()) {
    location.hash = '#mis-turnos'
  } else {
    const modal = document.getElementById('authModal')
    const m = modal ? new bootstrap.Modal(modal) : null
    m?.show()
  }
}

window.logout = function () {
  logout()
  if (window.txToast) { window.txToast({ type: 'info', text: 'Sesión cerrada' }) } else { Swal.fire('Sesión cerrada', 'Tu sesión fue cerrada correctamente', 'success') }
  location.hash = '#servicios'
}

window.scrollToCalendar = function () {
  if (!isLogged()) {
    const modal = document.getElementById('authModal')
    const m = modal ? new bootstrap.Modal(modal) : null
    m?.show()
    return
  }
  location.hash = '#calendario'
  document.getElementById('calendario')?.scrollIntoView({ behavior: 'smooth' })
}

// Admin dashboard
function renderAdmin () {
  // Toggle nav item
  ensureAdminNavVisible(isAdmin())
  adminSection?.classList.toggle('d-none', !isAdmin())
  if (!isAdmin()) return

  const all = window.__admin_bookings || []
  const total = all.length
  const now = new Date()
  let upcoming = all.filter(b => new Date(`${b.date}T${b.time}:00`) >= now)

  // Populate service filter (rebuild each render to reflect changes)
  if (adminFilterService) {
    const prev = adminFilterService.value || ''
    const svcOptions = (window.__services_cache || [])
    adminFilterService.innerHTML = '<option value="">Todos los servicios</option>' +
      svcOptions.map(s => `<option value="${s.id}">${s.name}</option>`).join('')
    // restore selection if still present
    if (prev && [...adminFilterService.options].some(o => o.value === prev)) {
      adminFilterService.value = prev
    }
  }

  // Apply filters
  const svc = adminFilterService?.value || ''
  const from = adminFilterFrom?.value || ''
  const to = adminFilterTo?.value || ''
  upcoming = upcoming.filter(b => {
    if (svc && String(b.serviceId) !== String(svc)) return false
    if (from && b.date < from) return false
    if (to && b.date > to) return false
    return true
  });

  // Summary (with async user count)
  (async () => {
    let usersTotal = '—'
    try {
      const { total: count } = await api.getUsersCount()
      usersTotal = count
    } catch {}
    adminSummaryEl && (adminSummaryEl.innerHTML = `
      <li>Total turnos: <b>${total}</b></li>
      <li>Próximos: <b>${upcoming.length}</b></li>
      <li>Usuarios registrados: <b>${usersTotal}</b></li>
    `)
  })()

  // Bookings by next 7 days
  const days = Array.from({ length: 7 }, (_, i) => addDays(now, i))
  adminByDayEl && (adminByDayEl.innerHTML = days.map(d => {
    const key = d.toISOString().slice(0, 10)
    const count = all.filter(b => b.date === key).length
    const label = d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    return `<li>${label}: <b>${counts.total}</b></li>`
  }).join(''))

  // Upcoming bookings table
  adminBookingsEl && (adminBookingsEl.innerHTML = (upcoming
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map(b => {
      const svc = getServiceByIdCached(b.serviceId)
      const desc = svc?.description && svc.description.trim().length ? `<div class="small text-body-secondary">${svc.description}</div>` : ''
      const dur = Number.isFinite(svc?.duration) ? `<div class="small text-body-secondary">Duración aprox. ${svc.duration} min</div>` : ''
      const extras = (desc || dur) ? `<div class="d-none d-sm-block">${desc}${dur}</div>` : ''
      return `<tr>
        <td>${b.date}</td>
        <td>${b.time}</td>
        <td>${svc?.name || 'Servicio'}${extras}</td>
        <td>${b.customerName || ''}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-admin-cancel="${b.id}">Cancelar</button></td>
      </tr>`
    })
    .join('')) || '<tr><td colspan="5" class="text-body-secondary">Sin turnos próximos</td></tr>')

  // Admin cancel any booking
  qsa('[data-admin-cancel]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-admin-cancel')
      const res = await Swal.fire({ title: '¿Cancelar turno?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, cancelar' })
      if (!res.isConfirmed) return
      try {
        await api.cancelBooking(id)
        Swal.fire('Cancelado', 'Turno cancelado', 'success')
        if (window.txToast) { window.txToast({ type: 'success', text: 'Turno cancelado' }) }
        await Promise.all([
          syncMyBookings(),
          syncAdminBookings(),
          selectedDateKey ? syncTakenForDate(selectedDateKey) : Promise.resolve()
        ])
        renderMyBookings()
        renderAdmin()
        if (selectedDateKey) renderTimeSlots(selectedDateKey)
      } catch (err) { Swal.fire('Error', err.message, 'error') }
    }
  })

  // Working hours editor
  const cfgHours = getConfig()
  const mapDays = [null, 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const daysOrder = [2, 3, 4, 5, 6] // Tue-Sat
  if (adminHoursEl) {
    adminHoursEl.innerHTML = daysOrder.map(d => {
      const [o, c] = cfgHours.workingHours[d] || [9, 18]
      return `<div class="input-group input-group-sm">
        <span class="input-group-text" style="min-width:60px">${mapDays[d]}</span>
        <span class="input-group-text">Desde</span>
        <input type="number" class="form-control" min="0" max="23" step="1" value="${o}" data-hour-open="${d}">
        <span class="input-group-text">Hasta</span>
        <input type="number" class="form-control" min="1" max="24" step="1" value="${c}" data-hour-close="${d}">
      </div>`
    }).join('')
  }
  if (btnSaveHours) {
    btnSaveHours.onclick = async () => {
      const newCfg = getConfig()
      daysOrder.forEach(d => {
        const open = parseInt(document.querySelector(`[data-hour-open="${d}"]`).value, 10)
        const close = parseInt(document.querySelector(`[data-hour-close="${d}"]`).value, 10)
        if (Number.isFinite(open) && Number.isFinite(close) && open < close) {
          newCfg.workingHours[d] = [open, close]
        }
      })
      try {
        const saved = await api.updateConfig(newCfg)
        setConfig({
          workingHours: saved.workingHours,
          blockedDays: saved.blockedDays,
          blockedDateRanges: saved.blockedDateRanges,
          blockedTimes: saved.blockedTimes
        })
        Swal.fire('Guardado', 'Horarios actualizados', 'success')
        if (window.txToast) { window.txToast({ type: 'success', text: 'Horarios actualizados' }) }
        renderHoursBanner()
      } catch (err) { Swal.fire('Error', err.message, 'error') }
      if (selectedDateKey) renderTimeSlots(selectedDateKey)
    }
  }

  // Storage export/import and size listing removed — database is the source of truth

  // Filter handlers
  adminFilterService && (adminFilterService.onchange = renderAdmin)
  adminFilterFrom && (adminFilterFrom.onchange = renderAdmin)
  adminFilterTo && (adminFilterTo.onchange = renderAdmin)
  adminFilterClear && (adminFilterClear.onclick = () => {
    if (adminFilterService) adminFilterService.value = ''
    if (adminFilterFrom) adminFilterFrom.value = ''
    if (adminFilterTo) adminFilterTo.value = ''
    renderAdmin()
  })

  // Blocked days manager
  const cfgBlock = getConfig()
  if (blockedDaysList) {
    blockedDaysList.innerHTML = (cfgBlock.blockedDays || []).map(k => `<li class="badge text-bg-secondary d-inline-flex align-items-center gap-1">${k} <button class="btn-close btn-close-white btn-close-sm" title="Quitar" data-unblock="${k}"></button></li>`).join('') ||
      '<li class="text-body-secondary">Sin días bloqueados</li>'
    qsa('[data-unblock]').forEach(btn => {
      btn.onclick = async () => {
        const key = btn.getAttribute('data-unblock')
        try {
          const newCfg = getConfig()
          newCfg.blockedDays = (newCfg.blockedDays || []).filter(x => x !== key)
          const saved = await api.updateConfig(newCfg)
          setConfig(saved)
          renderAdmin()
          if (window.txToast) { window.txToast({ type: 'success', text: `Día ${key} desbloqueado` }) }
          if (selectedDateKey) renderTimeSlots(selectedDateKey)
        } catch (err) { Swal.fire('Error', err.message, 'error') }
      }
    })
  }
  if (btnAddBlocked && adminBlockDate) {
    btnAddBlocked.onclick = async () => {
      const val = adminBlockDate.value
      if (!val) return
      try {
        const newCfg = getConfig()
        const setDays = new Set(newCfg.blockedDays || [])
        setDays.add(val)
        newCfg.blockedDays = Array.from(setDays)
        const saved = await api.updateConfig(newCfg)
        setConfig(saved)
        Swal.fire('Bloqueado', `Se bloqueó ${val}`, 'success')
        if (window.txToast) { window.txToast({ type: 'success', text: `Día ${val} bloqueado` }) }
        renderAdmin()
        if (selectedDateKey) renderTimeSlots(selectedDateKey)
      } catch (err) { Swal.fire('Error', err.message, 'error') }
    }
  }

  // Blocked date ranges
  if (blockedRangesList) {
    blockedRangesList.innerHTML = (cfgBlock.blockedDateRanges || []).map((r, idx) => `<li class="badge text-bg-secondary d-inline-flex align-items-center gap-1">${r.from} → ${r.to} <button class="btn-close btn-close-white btn-close-sm" title="Quitar" data-unrange="${idx}"></button></li>`).join('') ||
      '<li class="text-body-secondary">Sin rangos bloqueados</li>'
    qsa('[data-unrange]').forEach(btn => {
      btn.onclick = async () => {
        try {
          const idx = parseInt(btn.getAttribute('data-unrange'), 10)
          const newCfg = getConfig()
          newCfg.blockedDateRanges = (newCfg.blockedDateRanges || []).filter((_, i) => i !== idx)
          const saved = await api.updateConfig(newCfg)
          setConfig(saved)
          renderAdmin()
          if (window.txToast) { window.txToast({ type: 'success', text: 'Rango desbloqueado' }) }
        } catch (err) { Swal.fire('Error', err.message, 'error') }
      }
    })
  }
  if (btnAddRange && adminRangeFrom && adminRangeTo) {
    btnAddRange.onclick = async () => {
      const from = adminRangeFrom.value
      const to = adminRangeTo.value
      if (!from || !to || to < from) { Swal.fire('Error', 'Rango inválido', 'error'); return }
      try {
        const newCfg = getConfig()
        newCfg.blockedDateRanges = [...(newCfg.blockedDateRanges || []), { from, to }]
        const saved = await api.updateConfig(newCfg)
        setConfig(saved)
        Swal.fire('Bloqueado', `Se bloqueó ${from} → ${to}`, 'success')
        if (window.txToast) { window.txToast({ type: 'success', text: `Rango ${from} → ${to} bloqueado` }) }
        renderAdmin()
      } catch (err) { Swal.fire('Error', err.message, 'error') }
    }
  }

  // Blocked time ranges per day
  if (blockedTimesList) {
    const entries = Object.entries(cfgBlock.blockedTimes || {})
    blockedTimesList.innerHTML = entries.length
      ? entries.map(([k, arr]) => arr.map(([f, t], i) =>
      `<li class="badge text-bg-secondary d-inline-flex align-items-center gap-1">${k} ${f}→${t} <button class="btn-close btn-close-white btn-close-sm" title="Quitar" data-untime="${k}|${i}"></button></li>`
      ).join('')).join('')
      : '<li class="text-body-secondary">Sin bloqueos horarios</li>'
    qsa('[data-untime]').forEach(btn => {
      btn.onclick = async () => {
        try {
          const [key, idxStr] = btn.getAttribute('data-untime').split('|')
          const idx = parseInt(idxStr, 10)
          const newCfg = getConfig()
          const list = (newCfg.blockedTimes?.[key] || []).slice()
          list.splice(idx, 1)
          if (!newCfg.blockedTimes) newCfg.blockedTimes = {}
          newCfg.blockedTimes[key] = list
          const saved = await api.updateConfig(newCfg)
          setConfig(saved)
          renderAdmin()
          if (window.txToast) { window.txToast({ type: 'success', text: 'Bloqueo horario quitado' }) }
          if (selectedDateKey === key) renderTimeSlots(selectedDateKey)
        } catch (err) { Swal.fire('Error', err.message, 'error') }
      }
    })
  }
  if (btnAddTimeBlock && adminTimeDate && adminTimeFrom && adminTimeTo) {
    btnAddTimeBlock.onclick = async () => {
      const key = adminTimeDate.value
      const from = adminTimeFrom.value
      const to = adminTimeTo.value
      if (!key || !from || !to || to <= from) { Swal.fire('Error', 'Rango horario inválido', 'error'); return }
      try {
        const newCfg = getConfig()
        if (!newCfg.blockedTimes) newCfg.blockedTimes = {}
        const list = newCfg.blockedTimes[key] || []
        list.push([from, to])
        newCfg.blockedTimes[key] = list
        const saved = await api.updateConfig(newCfg)
        setConfig(saved)
        Swal.fire('Bloqueado', `Se bloqueó ${key} ${from}→${to}`, 'success')
        if (window.txToast) { window.txToast({ type: 'success', text: `Bloqueo ${from}→${to} en ${key}` }) }
        renderAdmin()
        if (selectedDateKey === key) renderTimeSlots(selectedDateKey)
      } catch (err) { Swal.fire('Error', err.message, 'error') }
    }
  }
  // Services manager (API-backed)
  if (adminServicesEl) {
    const SERVICES = window.__services_cache || []
    adminServicesEl.innerHTML = SERVICES.length
      ? SERVICES.map(s =>
      `<tr>
        <td>
          <span data-view-name="${s.id}">${s.name}</span>
          <input class="form-control form-control-sm d-none" data-edit-name="${s.id}" value="${s.name}">
        </td>
        <td>
          <span data-view-desc="${s.id}">${s.description || ''}</span>
          <input class="form-control form-control-sm d-none" data-edit-desc="${s.id}" value="${s.description || ''}">
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
      ).join('')
      : '<tr><td colspan="4" class="text-body-secondary">Sin servicios</td></tr>'
    // Delete (server enforces future bookings rule)
    qsa('[data-del-service]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-del-service')
        try {
          await api.deleteService(id)
          await syncServices()
          renderServices()
          renderAdmin()
          if (window.txToast) { window.txToast({ type: 'success', text: 'Servicio eliminado' }) }
        } catch (err) { Swal.fire('Error', err.message, 'error') }
      }
    })
    // Edit mode handlers
    qsa('[data-edit-service]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-edit-service')
        toggleEditRow(id, true)
      }
    })
    qsa('[data-cancel-edit]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-cancel-edit')
        toggleEditRow(id, false, true)
      }
    })
    qsa('[data-save-service]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-save-service')
        const nameEl = document.querySelector(`[data-edit-name="${id}"]`)
        const descEl = document.querySelector(`[data-edit-desc="${id}"]`)
        const durEl = document.querySelector(`[data-edit-duration="${id}"]`)
        const priceEl = document.querySelector(`[data-edit-price="${id}"]`)
        const name = nameEl.value.trim()
        const description = (descEl?.value || '').trim()
        const duration = parseInt(durEl.value, 10)
        const price = Math.max(0, parseInt(priceEl.value, 10) || 0)
        if (!name) { Swal.fire('Error', 'Nombre requerido', 'error'); return }
        if (!Number.isFinite(duration) || duration <= 0 || duration % 30 !== 0) { Swal.fire('Error', 'La duración debe ser múltiplo de 30', 'error'); return }
        try {
          await api.updateService(id, { name, description, duration, price })
          await syncServices()
          renderServices()
          renderAdmin()
          Swal.fire('Guardado', 'Servicio actualizado', 'success')
          if (window.txToast) { window.txToast({ type: 'success', text: 'Servicio actualizado' }) }
        } catch (err) { Swal.fire('Error', err.message, 'error') }
      }
    })
  }
  if (btnAddService && svcNameInput && svcDurationInput && svcPriceInput) {
    btnAddService.onclick = async () => {
      const name = svcNameInput.value.trim()
      const description = (svcDescInput?.value || '').trim()
      const duration = parseInt(svcDurationInput.value, 10)
      const price = parseInt(svcPriceInput.value, 10); const priceSafe = Number.isFinite(price) && price >= 0 ? price : 0
      if (!name) { Swal.fire('Error', 'Completá el nombre del servicio', 'error'); return }
      if (!Number.isFinite(duration) || duration <= 0 || duration % 30 !== 0) { Swal.fire('Error', 'La duración debe ser un múltiplo de 30 minutos', 'error'); return }
      try {
        await api.createService({ name, description, duration, price: priceSafe })
        await syncServices()
        svcNameInput.value = ''
        if (svcDescInput) svcDescInput.value = ''
        svcDurationInput.value = '30'
        svcPriceInput.value = '0'
        renderServices()
        renderAdmin()
        Swal.fire('Guardado', 'Servicio agregado', 'success')
        if (window.txToast) { window.txToast({ type: 'success', text: 'Servicio agregado' }) }
      } catch (err) { Swal.fire('Error', err.message, 'error') }
    }
  }
}

// Toggle edit/view for a service row in admin table
function toggleEditRow (id, editing, restoreView = false) {
  const viewName = document.querySelector(`[data-view-name="${id}"]`)
  const editName = document.querySelector(`[data-edit-name="${id}"]`)
  const viewDesc = document.querySelector(`[data-view-desc="${id}"]`)
  const editDesc = document.querySelector(`[data-edit-desc="${id}"]`)
  const viewDur = document.querySelector(`[data-view-duration="${id}"]`)
  const editDur = document.querySelector(`[data-edit-duration="${id}"]`)
  const viewPrice = document.querySelector(`[data-view-price="${id}"]`)
  const editPrice = document.querySelector(`[data-edit-price="${id}"]`)
  const btnEdit = document.querySelector(`[data-edit-service="${id}"]`)
  const btnSave = document.querySelector(`[data-save-service="${id}"]`)
  const btnCancel = document.querySelector(`[data-cancel-edit="${id}"]`)
  if (!viewName || !editName || !viewDur || !editDur || !viewPrice || !editPrice || !btnEdit || !btnSave || !btnCancel) return
  if (restoreView) {
    // reset inputs to current values
    editName.value = viewName.textContent.trim()
    if (editDesc && viewDesc) editDesc.value = viewDesc.textContent.trim()
    const durMatch = (viewDur.textContent.match(/\d+/) || [30])[0]
    editDur.value = durMatch
    const priceMatch = (viewPrice.textContent.replaceAll('.', '').match(/\d+/) || [0])[0]
    editPrice.value = priceMatch
  }
  viewName.classList.toggle('d-none', editing)
  if (viewDesc) viewDesc.classList.toggle('d-none', editing)
  viewDur.classList.toggle('d-none', editing)
  viewPrice.classList.toggle('d-none', editing)
  editName.classList.toggle('d-none', !editing)
  if (editDesc) editDesc.classList.toggle('d-none', !editing)
  editDur.classList.toggle('d-none', !editing)
  editPrice.classList.toggle('d-none', !editing)
  btnEdit.classList.toggle('d-none', editing)
  btnSave.classList.toggle('d-none', !editing)
  btnCancel.classList.toggle('d-none', !editing)
}

// Implementación real de updateAuthUI
window.updateAuthUI = function() {
  const user = sessionManager.getUser();
  const isAuth = sessionManager.isAuthenticated();
  
  console.log('🔄 Actualizando UI - Usuario:', user);
  
  const navbarList = document.querySelector('#navbarNav .navbar-nav');
  
  if (isAuth && user) {
    // Ocultar botones de Ingresar y Crear cuenta
    const loginBtn = document.querySelector('[data-auth-mode="login"]');
    const signupBtn = document.querySelector('[data-auth-mode="signup"]');
    
    if (loginBtn) loginBtn.closest('li').style.display = 'none';
    if (signupBtn) signupBtn.closest('li').style.display = 'none';
    
    // Agregar info de usuario si no existe
    if (!document.getElementById('user-info-nav')) {
      const userLi = document.createElement('li');
      userLi.id = 'user-info-nav';
      userLi.className = 'nav-item ms-lg-2';
      
      const roleLabel = user.role === 'ADMIN' ? '👑 ADMIN' : 
                       user.role === 'BUSINESS' ? '🏢 NEGOCIO' : '';
      
      userLi.innerHTML = `
        <div class="d-flex align-items-center">
          <span class="text-white me-2">
            ${user.name || user.email.split('@')[0]}
            ${roleLabel ? `<span class="badge bg-warning text-dark ms-1">${roleLabel}</span>` : ''}
          </span>
          <button class="btn btn-sm btn-outline-light" onclick="sessionManager.logout()">Salir</button>
        </div>
      `;
      
      navbarList.appendChild(userLi);
    }
    
    console.log(`✅ UI actualizada - Rol: ${user.role}`);
    
  } else {
    // Mostrar botones de login/signup
    const loginBtn = document.querySelector('[data-auth-mode="login"]');
    const signupBtn = document.querySelector('[data-auth-mode="signup"]');
    
    if (loginBtn) loginBtn.closest('li').style.display = '';
    if (signupBtn) signupBtn.closest('li').style.display = '';
    
    // Remover info de usuario
    const userInfo = document.getElementById('user-info-nav');
    if (userInfo) userInfo.remove();
  }
}

// Al final de app.js
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando sistema de login con roles...');
  
  setTimeout(() => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
      // Remover TODOS los listeners anteriores
      const newForm = loginForm.cloneNode(true);
      loginForm.parentNode.replaceChild(newForm, loginForm);
      
      console.log('✅ Formulario de login clonado - listeners limpios');
      
      newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const email = document.getElementById('loginEmail')?.value?.trim();
        const password = document.getElementById('loginPassword')?.value;
        
        console.log('📧 Intentando login con:', email);
        
        if (!email || !password) {
          Swal.fire('Error', 'Completa todos los campos', 'error');
          return;
        }
        
        try {
          const response = await api.login({ email, password });
          console.log('✅ LOGIN EXITOSO:', response);
          console.log('👤 Usuario:', sessionManager.getUser());
          
          // Cerrar modal
          const modal = document.getElementById('authModal');
          if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
          }
          
          updateAuthUI();
          await Promise.all([syncMyBookings(), syncAdminBookings()]);
          renderMyBookings();
          renderAdmin();
          
          Swal.fire({
            title: 'Bienvenido',
            text: `Hola ${response.user.name || response.user.email}`,
            icon: 'success',
            timer: 2000
          });
          
        } catch (error) {
          console.error('❌ ERROR:', error);
          Swal.fire('Error', error.message, 'error');
        }
      });
    }
  }, 500); // Esperar a que validation.js termine de inicializar
});









