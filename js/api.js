const API_BASE = (window.API_BASE || 'http://localhost:3000/api');

function getToken(){ try{ return JSON.parse(localStorage.getItem('app_session_v1'))?.token || null; }catch{ return null } }
function setSession(data){ localStorage.setItem('app_session_v1', JSON.stringify(data)); }
function authHeaders(){ const t = getToken(); return t ? { Authorization: `Bearer ${t}` } : {}; }

async function http(path, opts={}){
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type':'application/json', ...(opts.headers||{}), ...authHeaders() }
  });
  if(!res.ok){ let err; try{ err = await res.json(); }catch{ err = { error: res.statusText } } throw new Error(err.error||'Request failed'); }
  const ct = res.headers.get('content-type')||''; if(ct.includes('application/json')) return res.json(); return res.text();
}

// Auth
export async function apiSignup(email, password){ const data = await http('/auth/signup', { method:'POST', body: JSON.stringify({ email, password }) }); setSession({ email: data.user.email, role: data.user.role, token: data.token }); return data; }
export async function apiLogin(email, password){ const data = await http('/auth/login', { method:'POST', body: JSON.stringify({ email, password }) }); setSession({ email: data.user.email, role: data.user.role, token: data.token }); return data; }

// Config
export async function apiGetConfig(){ return http('/config'); }
export async function apiPutConfig(next){ return http('/config', { method:'PUT', body: JSON.stringify(next) }); }

// Services
export async function apiListServices(){ return http('/services'); }
export async function apiCreateService({ name, description='', duration, price=0 }){ return http('/services', { method:'POST', body: JSON.stringify({ name, description, duration, price }) }); }
export async function apiUpdateService(id, { name, description, duration, price }){ return http(`/services/${encodeURIComponent(id)}`, { method:'PUT', body: JSON.stringify({ name, description, duration, price }) }); }
export async function apiDeleteService(id){ return http(`/services/${encodeURIComponent(id)}`, { method:'DELETE' }); }

// Bookings
export async function apiGetBookingsByDate(date){ return http(`/bookings/day?date=${encodeURIComponent(date)}`); }
export async function apiGetMyBookings(){ return http('/bookings'); }
export async function apiCreateBooking({ serviceId, date, time, name }){ return http('/bookings', { method:'POST', body: JSON.stringify({ serviceId, date, time, name }) }); }
export async function apiCancelBooking(id){ return http(`/bookings/${id}`, { method:'DELETE' }); }

export function getSession(){ try{ return JSON.parse(localStorage.getItem('app_session_v1')); }catch{ return null } }
export function clearSession(){ localStorage.removeItem('app_session_v1'); }

// Admin
export async function apiGetUsersCount(){ return http('/admin/users/count'); }
