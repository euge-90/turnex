// Utils: dates, dom, in-memory config
// Working days: Tue (2) to Sat (6) per requirements (Dom-Lun no permitidos)
export const DAYS_WORKING = [2, 3, 4, 5, 6]
// Default hours (fallback)
export const OPEN_HOUR = 9 // 09:00
export const CLOSE_HOUR = 18 // 18:00
// Per-day configurable hours [open, close)
export const WORKING_HOURS = {
  2: [9, 18], // Tue
  3: [9, 18], // Wed
  4: [9, 18], // Thu
  5: [9, 18], // Fri
  6: [9, 18] // Sat
}
export const SLOT_MINUTES = 30

export const fmtDateKey = (d) => d.toISOString().slice(0, 10)
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
export function timeToMinutes (t) {
  if (typeof t !== 'string') return 0
  const [h, m] = t.split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}
export function minutesToTime (mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Config (in-memory; authoritative source is the server API)
let __CONFIG = { workingHours: { ...WORKING_HOURS }, blockedDays: [], blockedDateRanges: [], blockedTimes: {} }
export function getConfig () {
  const cfg = __CONFIG || {}
  return {
    workingHours: { ...WORKING_HOURS, ...(cfg.workingHours || {}) },
    blockedDays: Array.isArray(cfg.blockedDays) ? cfg.blockedDays : [],
    blockedDateRanges: Array.isArray(cfg.blockedDateRanges) ? cfg.blockedDateRanges : [],
    blockedTimes: typeof cfg.blockedTimes === 'object' && cfg.blockedTimes ? cfg.blockedTimes : {}
  }
}
export function setConfig (cfg) {
  __CONFIG = {
    workingHours: { ...WORKING_HOURS, ...(cfg?.workingHours || {}) },
    blockedDays: Array.isArray(cfg?.blockedDays) ? cfg.blockedDays : [],
    blockedDateRanges: Array.isArray(cfg?.blockedDateRanges) ? cfg.blockedDateRanges : [],
    blockedTimes: typeof cfg?.blockedTimes === 'object' && cfg?.blockedTimes ? cfg.blockedTimes : {}
  }
}

export function isBlockedDay (date) {
  try {
    const key = fmtDateKey(date)
    const { blockedDays } = getConfig()
    return blockedDays.includes(key)
  } catch { return false }
}

export function isDateInBlockedRange (date) {
  try {
    const dKey = fmtDateKey(date)
    const { blockedDateRanges } = getConfig()
    return blockedDateRanges.some(r => r && r.from && r.to && dKey >= r.from && dKey <= r.to)
  } catch { return false }
}

export function isDateBlocked (date) {
  return isBlockedDay(date) || isDateInBlockedRange(date)
}

export function isTimeBlocked (date, time) {
  try {
    const key = fmtDateKey(date)
    const { blockedTimes } = getConfig()
    const ranges = blockedTimes?.[key] || []
    // time: 'HH:MM'
    return ranges.some(([from, to]) => from && to && time >= from && time < to)
  } catch { return false }
}

export function startOfMonth (date) { const d = new Date(date); d.setDate(1); d.setHours(0, 0, 0, 0); return d }
export function endOfMonth (date) { const d = new Date(date); d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d }
export function addDays (date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
export function isWorkingDay (date) { const dow = date.getDay(); return DAYS_WORKING.includes(dow) }
export function isPast (date) { const today = new Date(); today.setHours(0, 0, 0, 0); const cand = new Date(date); cand.setHours(0, 0, 0, 0); return cand < today }

export function generateTimeSlots (date) {
  // date: Date object to resolve per-day hours
  const dow = date instanceof Date ? date.getDay() : null
  const cfg = getConfig()
  const wh = cfg.workingHours || WORKING_HOURS
  const [open, close] = (dow && wh[dow]) ? wh[dow] : [OPEN_HOUR, CLOSE_HOUR]
  const slots = []
  for (let h = open; h < close; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const t = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      if (!isTimeBlocked(date, t)) slots.push(t)
    }
  }
  return slots
}

export function getWorkingHoursForDate (date) {
  const dow = date instanceof Date ? date.getDay() : null
  const cfg = getConfig()
  const wh = cfg.workingHours || WORKING_HOURS
  const [open, close] = (dow && wh[dow]) ? wh[dow] : [OPEN_HOUR, CLOSE_HOUR]
  return [open, close]
}

export function qs (sel) { return document.querySelector(sel) }
export function qsa (sel) { return Array.from(document.querySelectorAll(sel)) }

export function setAriaBusy (el, busy = true) { if (!el) return; el.setAttribute('aria-busy', String(busy)) }

// ========================================
// FEEDBACK VISUAL Y MANEJO DE ERRORES
// ========================================

/**
 * Muestra un mensaje con SweetAlert2
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title - Título del mensaje
 * @param {string} text - Texto del mensaje
 */
export function showMessage(type, title, text) {
  const icons = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
  }

  return Swal.fire({
    icon: icons[type] || 'info',
    title: title,
    text: text,
    confirmButtonText: 'Entendido',
    confirmButtonColor: '#6366f1',
    timer: type === 'success' ? 3000 : undefined,
    showConfirmButton: true
  })
}

/**
 * Muestra un mensaje de éxito (toast en esquina)
 * @param {string} message - Mensaje a mostrar
 */
export function showSuccess(message) {
  return Swal.fire({
    icon: 'success',
    title: '¡Listo!',
    text: message,
    timer: 2500,
    showConfirmButton: false,
    toast: true,
    position: 'top-end',
    background: '#10b981',
    color: '#fff'
  })
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error
 */
export function showError(message) {
  return Swal.fire({
    icon: 'error',
    title: 'Oops...',
    text: message || 'Ocurrió un error inesperado',
    confirmButtonText: 'Cerrar',
    confirmButtonColor: '#ef4444'
  })
}

/**
 * Pide confirmación antes de una acción
 * @param {string} title - Título de la confirmación
 * @param {string} text - Texto explicativo
 */
export function confirmAction(title, text) {
  return Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#6366f1',
    cancelButtonColor: '#6b7280',
    reverseButtons: true
  })
}

/**
 * Muestra un loading mientras se procesa algo
 * @param {string} message - Mensaje a mostrar
 */
export function showLoading(message = 'Procesando...') {
  return Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}

/**
 * Cierra el loading
 */
export function closeLoading() {
  Swal.close()
}

/**
 * Wrapper para fetch con manejo de errores
 * @param {string} url - URL a fetchear
 * @param {object} options - Opciones del fetch
 * @returns {Promise<any>} - Respuesta parseada o lanza error
 */
export async function fetchAPI(url, options = {}) {
  try {
    // Agregar token si existe
    const token = localStorage.getItem('token')
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    }

    // Agregar Content-Type por defecto si hay body
    if (options.body && !options.headers?.['Content-Type']) {
      options.headers = {
        ...options.headers,
        'Content-Type': 'application/json'
      }
    }

    const response = await fetch(url, options)
    
    // Si no es OK, intentar leer el mensaje de error del servidor
    if (!response.ok) {
      let errorMessage = 'Error en el servidor'
      
      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // Si no puede parsear JSON, usar mensaje genérico según status
        if (response.status === 401) {
          errorMessage = 'Sesión expirada. Por favor, ingresá nuevamente.'
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        } else if (response.status === 403) {
          errorMessage = 'No tenés permisos para realizar esta acción'
        } else if (response.status === 404) {
          errorMessage = 'Recurso no encontrado'
        } else if (response.status >= 500) {
          errorMessage = 'Error en el servidor. Intentá más tarde.'
        } else {
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    // Parsear respuesta
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }
    
    return await response.text()
    
  } catch (error) {
    // Manejo específico de errores de red
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      const errorMsg = 'No se pudo conectar con el servidor. Verificá tu conexión.'
      showError(errorMsg)
      throw new Error(errorMsg)
    }
    
    // Para otros errores, solo re-lanzar (ya tienen mensaje apropiado)
    throw error
  }
}
