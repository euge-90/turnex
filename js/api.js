const API_BASE = (window.API_BASE || 'http://localhost:3000/api')
const STORAGE_KEY = 'app_session_v1'

function readSession () {
  try { const s = sessionStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return null
}
function getToken () { try { return readSession()?.token || null } catch { return null } }
function setSession (data, opts = {}) {
  const remember = opts.remember !== false // default true
  const json = JSON.stringify(data)
  try {
    if (remember) { localStorage.setItem(STORAGE_KEY, json); sessionStorage.removeItem(STORAGE_KEY) } else { sessionStorage.setItem(STORAGE_KEY, json); localStorage.removeItem(STORAGE_KEY) }
  } catch {}
}
function authHeaders () { const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {} }

async function http (path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}), ...authHeaders() }
  })
  if (!res.ok) {
    let payload
    try { payload = await res.json() } catch { payload = { error: res.statusText } }
    const e = new Error(payload.error || payload.message || 'Request failed')
    e.status = res.status
    e.payload = payload
    throw e
  }
  const ct = res.headers.get('content-type') || ''; if (ct.includes('application/json')) return res.json(); return res.text()
}

// Auth
// extras (e.g., name, phone) are currently client-side only; backend accepts email/password
export async function apiSignup ({ email, password, name, phone, remember = true, role, businessName, businessAddress, businessPhone } = {}) {
  const payload = { name, email, phone, password }
  if (role) payload.role = role
  if (businessName) payload.businessName = businessName
  if (businessAddress) payload.businessAddress = businessAddress
  if (businessPhone) payload.businessPhone = businessPhone
  const data = await http('/auth/signup', { method: 'POST', body: JSON.stringify(payload) })
  setSession({ email: data.user.email, role: data.user.role, token: data.token, name: data.user.name || name || '', phone: data.user.phone || phone || '' }, { remember })
  return data
}
export async function apiLogin ({ email, password, remember = true }) {
  const data = await http('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  setSession({ email: data.user.email, role: data.user.role, token: data.token }, { remember })
  return data
}

// Config
export async function apiGetConfig () { return http('/config') }
export async function apiPutConfig (next) { return http('/config', { method: 'PUT', body: JSON.stringify(next) }) }

// Services
export async function apiListServices () { return http('/services') }
export async function apiCreateService ({ name, description = '', duration, price = 0 }) { return http('/services', { method: 'POST', body: JSON.stringify({ name, description, duration, price }) }) }
export async function apiUpdateService (id, { name, description, duration, price }) { return http(`/services/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ name, description, duration, price }) }) }
export async function apiDeleteService (id) { return http(`/services/${encodeURIComponent(id)}`, { method: 'DELETE' }) }

// Bookings
export async function apiGetBookingsByDate (date) { return http(`/bookings/day?date=${encodeURIComponent(date)}`) }
export async function apiGetMyBookings () { return http('/bookings') }
export async function apiCreateBooking ({ serviceId, date, time, name }) { return http('/bookings', { method: 'POST', body: JSON.stringify({ serviceId, date, time, name }) }) }
export async function apiCancelBooking (id) { return http(`/bookings/${id}`, { method: 'DELETE' }) }

export function getSession () { return readSession() }
export function clearSession () { try { localStorage.removeItem(STORAGE_KEY) } catch {} try { sessionStorage.removeItem(STORAGE_KEY) } catch {} }

// Admin
export async function apiGetUsersCount () { return http('/admin/users/count') }
