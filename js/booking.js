import { storage, generateTimeSlots, timeToMinutes, minutesToTime, getWorkingHoursForDate, SLOT_MINUTES } from './utils.js'

const KEY_BOOKINGS = 'app_bookings_v1'
const KEY_SERVICES = 'app_services_v1'

export function listBookings () { return storage.get(KEY_BOOKINGS, []) }
export function listBookingsByUser (email) { return listBookings().filter(b => b.email === email) }

export function listTakenSlots (dateKey) {
  const items = listBookings().filter(b => b.date === dateKey)
  const taken = new Set()
  items.forEach(b => {
    const duration = Number(b.duration) || getServiceById(b.serviceId)?.duration || 30
    const segments = Math.max(1, Math.ceil(duration / SLOT_MINUTES))
    let mins = timeToMinutes(b.time)
    for (let i = 0; i < segments; i++) {
      taken.add(minutesToTime(mins))
      mins += SLOT_MINUTES
    }
  })
  return taken
}

export function listTakenSlotsForDateExcluding (dateKey, excludeBookingId) {
  const items = listBookings().filter(b => b.date === dateKey && b.id !== excludeBookingId)
  const taken = new Set()
  items.forEach(b => {
    const duration = Number(b.duration) || getServiceById(b.serviceId)?.duration || 30
    const segments = Math.max(1, Math.ceil(duration / SLOT_MINUTES))
    let mins = timeToMinutes(b.time)
    for (let i = 0; i < segments; i++) {
      taken.add(minutesToTime(mins))
      mins += SLOT_MINUTES
    }
  })
  return taken
}

export function createBooking ({ email, name, serviceId, serviceName, date, time }) {
  const all = listBookings()
  const svc = getServiceById(serviceId)
  if (!svc) throw new Error('Servicio inválido')
  const duration = svc.duration
  // Validate availability for full duration
  if (!canFit(date, time, duration)) {
    throw new Error('El horario no tiene suficiente disponibilidad para la duración del servicio')
  }
  const id = crypto.randomUUID()
  const newItem = { id, email, name, serviceId, serviceName: serviceName || svc.name, duration, date, time, createdAt: Date.now() }
  all.push(newItem)
  storage.set(KEY_BOOKINGS, all)
  return newItem
}

export function cancelBooking (id, email) {
  const all = listBookings()
  const idx = all.findIndex(b => b.id === id && b.email === email)
  if (idx === -1) throw new Error('Reserva no encontrada')
  all.splice(idx, 1)
  storage.set(KEY_BOOKINGS, all)
}

export function updateBookingFields (id, patch) {
  const all = listBookings()
  const idx = all.findIndex(b => b.id === id)
  if (idx === -1) throw new Error('Reserva no encontrada')
  all[idx] = { ...all[idx], ...patch }
  storage.set(KEY_BOOKINGS, all)
  return all[idx]
}

// Services CRUD in localStorage
// Unisex + niños, duraciones en múltiplos de 30 minutos
const DEFAULT_SERVICES = [
  { id: 'corte-caballero', name: 'Corte caballero', description: 'Corte clásico o moderno para hombres.', duration: 30, price: 6000 },
  { id: 'corte-dama', name: 'Corte dama', description: 'Corte y estilizado para mujeres.', duration: 60, price: 9000 },
  { id: 'corte-ninos', name: 'Corte niños', description: 'Corte sencillo para niñas y niños.', duration: 30, price: 5000 },
  { id: 'peinado', name: 'Peinado / Brushing', description: 'Peinado rápido, incluye brushing.', duration: 30, price: 5000 },
  { id: 'color', name: 'Color', description: 'Aplicación de color/tono.', duration: 60, price: 12000 },
  { id: 'tratamiento', name: 'Tratamiento', description: 'Tratamiento capilar de hidratación.', duration: 60, price: 9000 }
]

function ensureServicesSeeded () {
  let svcs = storage.get(KEY_SERVICES, null)
  if (!Array.isArray(svcs)) {
    storage.set(KEY_SERVICES, DEFAULT_SERVICES)
    return DEFAULT_SERVICES
  }
  // One-time migration if old default set is still present (ids: cut, wash, treat, color) and no custom services
  const oldIds = ['cut', 'wash', 'treat', 'color']
  const ids = new Set(svcs.map(s => s.id))
  const hasAllOld = oldIds.every(id => ids.has(id))
  const hasCustom = svcs.some(s => !oldIds.includes(s.id))
  if (hasAllOld && !hasCustom) {
    storage.set(KEY_SERVICES, DEFAULT_SERVICES)
    return DEFAULT_SERVICES
  }
  // Non-destructive migration: fill missing description from defaults (match by id or normalized name)
  const byId = new Map(DEFAULT_SERVICES.map(s => [s.id, s]))
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const byName = new Map(DEFAULT_SERVICES.map(s => [norm(s.name), s]))
  let changed = false
  svcs = svcs.map(s => {
    if (!s.description || s.description.trim() === '') {
      const tpl = byId.get(s.id) || byName.get(norm(s.name || ''))
      if (tpl && tpl.description) {
        changed = true
        return { ...s, description: tpl.description }
      }
    }
    return s
  })
  if (changed) storage.set(KEY_SERVICES, svcs)
  return svcs
}

export function listServices () {
  return ensureServicesSeeded()
}
export function saveServices (services) { storage.set(KEY_SERVICES, services) }
export function getServiceById (id) { return listServices().find(s => s.id === id) }

// Duration fit check
export function canFit (dateKey, startTime, duration) {
  const date = new Date(`${dateKey}T00:00:00`)
  const [open, close] = getWorkingHoursForDate(date)
  const closeMins = close * 60
  const startMins = timeToMinutes(startTime)
  const endMins = startMins + duration
  if (endMins > closeMins) return false
  const slots = generateTimeSlots(date)
  const taken = listTakenSlots(dateKey)
  const segments = Math.max(1, Math.ceil(duration / SLOT_MINUTES))
  let cur = startMins
  for (let i = 0; i < segments; i++) {
    const t = minutesToTime(cur)
    if (!slots.includes(t)) return false
    if (taken.has(t)) return false
    cur += SLOT_MINUTES
  }
  return true
}

export function canFitExcluding (dateKey, startTime, duration, excludeBookingId) {
  const date = new Date(`${dateKey}T00:00:00`)
  const [open, close] = getWorkingHoursForDate(date)
  const closeMins = close * 60
  const startMins = timeToMinutes(startTime)
  const endMins = startMins + duration
  if (endMins > closeMins) return false
  const slots = generateTimeSlots(date)
  const taken = listTakenSlotsForDateExcluding(dateKey, excludeBookingId)
  const segments = Math.max(1, Math.ceil(duration / SLOT_MINUTES))
  let cur = startMins
  for (let i = 0; i < segments; i++) {
    const t = minutesToTime(cur)
    if (!slots.includes(t)) return false
    if (taken.has(t)) return false
    cur += SLOT_MINUTES
  }
  return true
}
