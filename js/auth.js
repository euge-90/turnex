import { apiLogin, apiSignup, getSession as apiGetSession, clearSession as apiClearSession } from './api.js';

// Session helpers relying solely on API's localStorage management
export function getSession(){ return apiGetSession(); }
export function isLogged(){ return !!getSession(); }
export function isAdmin(){ return getSession()?.role === 'admin'; }

export async function signup(email, password){
  const { user, token } = await apiSignup(email, password);
  return { email: user.email, role: user.role, token };
}

export async function login(email, password){
  const { user, token } = await apiLogin(email, password);
  return { email: user.email, role: user.role, token };
}

export function logout(){ apiClearSession(); }
