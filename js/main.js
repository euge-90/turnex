/**
 * main.js - Punto de entrada principal para Turnex
 * Inicializa la aplicación y conecta todos los módulos
 */

import api from './api.js';
import sessionManager from './session.js';
import { isLogged, login, signup, logout, hasRole } from './auth.js';
import { setupHeroBindings, setupBookingDelegation, setupBookingsButton, refreshBookingsWidget } from './search-and-booking.js';

// Exponer globalmente para acceso desde HTML
window.api = api;
window.sessionManager = sessionManager;
window.authHelpers = { isLogged, login, signup, logout, hasRole };

// Función para inicializar servicios
async function initServices() {
  try {
    // Cargar servicios desde localStorage (booking.js tiene DEFAULT_SERVICES)
    const services = JSON.parse(localStorage.getItem('app_services_v1') || 'null');

    if (!services) {
      // Seed inicial de servicios
      const defaultServices = [
        { id: 'corte-caballero', name: 'Corte caballero', description: 'Corte clásico o moderno para hombres.', duration: 30, price: 6000 },
        { id: 'corte-dama', name: 'Corte dama', description: 'Corte y estilizado para mujeres.', duration: 60, price: 9000 },
        { id: 'corte-ninos', name: 'Corte niños', description: 'Corte sencillo para niñas y niños.', duration: 30, price: 5000 },
        { id: 'peinado', name: 'Peinado / Brushing', description: 'Peinado rápido, incluye brushing.', duration: 30, price: 5000 },
        { id: 'color', name: 'Color', description: 'Aplicación de color/tono.', duration: 60, price: 12000 },
        { id: 'tratamiento', name: 'Tratamiento', description: 'Tratamiento capilar de hidratación.', duration: 60, price: 9000 }
      ];
      localStorage.setItem('app_services_v1', JSON.stringify(defaultServices));
    }

    window.__services_cache = JSON.parse(localStorage.getItem('app_services_v1') || '[]');
  } catch (error) {
    console.error('Error inicializando servicios:', error);
  }
}

// Función para renderizar servicios (necesaria para search-and-booking.js)
window.syncServices = async function() {
  await initServices();
  return window.__services_cache;
};

window.renderServices = function(services) {
  // Esta función ya existe en el HTML estático, no necesitamos reimplementarla
  console.log('Servicios actualizados:', services.length);
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Turnex inicializando...');

  // Inicializar servicios
  await initServices();

  // Setup de búsqueda y reservas
  setupHeroBindings();
  setupBookingDelegation();
  setupBookingsButton();

  // Actualizar UI según estado de sesión
  updateUIForSession();

  // Escuchar eventos de sesión
  window.addEventListener('session:login', updateUIForSession);
  window.addEventListener('session:logout', updateUIForSession);

  console.log('✅ Turnex inicializado correctamente');
});

// Actualizar UI según sesión
function updateUIForSession() {
  const user = sessionManager.getUser();
  const logged = sessionManager.isAuthenticated();

  // Elementos que requieren auth
  const requireAuthElements = document.querySelectorAll('[data-requires-auth]');
  requireAuthElements.forEach(el => {
    if (logged) {
      el.style.display = '';
      el.classList.remove('d-none');
    } else {
      el.style.display = 'none';
      el.classList.add('d-none');
    }
  });

  // Banner de bienvenida (solo si NO está logueado)
  const welcomeBanner = document.getElementById('welcomeBanner');
  if (welcomeBanner) {
    welcomeBanner.style.display = logged ? 'none' : 'block';
  }

  console.log(logged ? `👤 Usuario: ${user?.email}` : '🔓 Sin sesión');
}

// Exportar funciones para uso externo
export { initServices, updateUIForSession };