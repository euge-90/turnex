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
const roleSelect = document.getElementById('signupRole');
const businessContainer = document.getElementById('businessNameContainer');
const businessNameInput = document.getElementById('signupBusinessName');

if (roleSelect && businessContainer && businessNameInput) {
  roleSelect.addEventListener('change', (e) => {
    if (e.target.value === 'BUSINESS') {
      businessContainer.style.display = 'block';
      businessNameInput.setAttribute('required', 'required');
    } else {
      businessContainer.style.display = 'none';
      businessNameInput.removeAttribute('required');
      businessNameInput.value = '';
    }
  });
}

setupAPIBase();

// Exportar sessionManager para uso directo
export { sessionManager };

