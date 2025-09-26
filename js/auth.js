import api from './api.js';
import sessionManager from './session.js';

// Helpers de sesión
export function getSession() {
  return sessionManager.getUser();
}

export function isLogged() {
  return sessionManager.isAuthenticated();
}

export function isAdmin() {
  return sessionManager.hasRole('ADMIN');
}

export function hasRole(role) {
  return sessionManager.hasRole(role);
}

// Auth functions
export async function signup(email, password, extras = {}, options = {}) {
  const data = await api.signup({ email, password, ...extras, ...options });
  return data;
}

export async function login(email, password, options = {}) {
  const data = await api.login({ email, password, ...options });
  return data;
}

export function logout() {
  api.logout();
}

// Configurar API base según entorno
function setupAPIBase() {
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  const metaApi = document.querySelector('meta[name="api-base"]');
  let API_BASE = (window.API_BASE || (metaApi ? metaApi.content : '') || '').trim();
  
  if (!isLocalhost && /^http:\/\/localhost/.test(API_BASE)) {
    API_BASE = 'https://turnex-api.onrender.com/api';
  }
  
  window.API_BASE = API_BASE;
}

setupAPIBase();

// Exportar sessionManager para uso directo
export { sessionManager };