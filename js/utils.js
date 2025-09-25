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
