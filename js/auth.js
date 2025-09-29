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
  // Redirect BUSINESS users to dashboard
  try {
    if (data && data.user && data.user.role === 'BUSINESS') {
      window.location.href = 'dashboard.html'
      return data
    }
  } catch (e) { /* ignore */ }
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

// Manejar cambio de rol en signup
// Toggle visibility of the business-name input in a DOM-ready, consistent way.
function updateBusinessFieldVisibility() {
  const roleSelectEl = document.getElementById('signupRole');
  const businessContainerEl = document.getElementById('businessNameContainer');
  const businessNameInputEl = document.getElementById('signupBusinessName');
  if (!roleSelectEl || !businessContainerEl || !businessNameInputEl) return;

  if (roleSelectEl.value === 'BUSINESS') {
    businessContainerEl.classList.remove('d-none');
    businessNameInputEl.required = true;
  } else {
    businessContainerEl.classList.add('d-none');
    businessNameInputEl.required = false;
    businessNameInputEl.value = '';
  }
}

// Run on DOM ready and attach change handler
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateBusinessFieldVisibility);
} else {
  updateBusinessFieldVisibility();
}

const _roleSelectWatcher = () => {
  const roleSelectEl = document.getElementById('signupRole');
  if (roleSelectEl) {
    roleSelectEl.addEventListener('change', updateBusinessFieldVisibility);
  }
};

_roleSelectWatcher();

setupAPIBase();

// Exportar sessionManager para uso directo
export { sessionManager };

