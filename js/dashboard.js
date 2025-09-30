import sessionManager from './session.js';
import api from './api.js';

// Proteger página
if (!sessionManager.isAuthenticated()) {
  window.location.href = 'index.html';
}

const user = sessionManager.getUser();

// Actualizar UI
document.getElementById('userName').textContent = user.name || user.email;
document.getElementById('userRole').textContent = sessionManager.getRoleDisplayName();
document.getElementById('userEmail').textContent = user.email;
document.getElementById('navUserInfo').textContent = user.name || user.email;
document.getElementById('userAvatar').textContent = (user.name || user.email).charAt(0).toUpperCase();

// Logout
document.getElementById('btnLogout').addEventListener('click', () => {
  sessionManager.logout();
  window.location.href = 'index.html';
});

// Renderizar acciones por rol
const actionsGrid = document.getElementById('actionsGrid');
let actions = [];

if (user.role === 'CLIENT') {
  actions = [
    { title: 'Buscar Servicios', desc: 'Explora servicios disponibles', icon: '🔍', color: '#667eea', link: 'index.html#servicios' },
    { title: 'Reservar Turno', desc: 'Agenda una nueva cita', icon: '📅', color: '#f093fb', link: 'calendar.html' },
    { title: 'Mis Reservas', desc: 'Ver y gestionar mis turnos', icon: '📋', color: '#4facfe', link: 'mis-reservas.html' },
    { title: 'Mi Perfil', desc: 'Configuración de cuenta', icon: '👤', color: '#fa709a', onClick: showProfile }
  ];
} else if (user.role === 'BUSINESS') {
  actions = [
    { title: 'Calendario', desc: 'Ver turnos programados', icon: '📅', color: '#f093fb', link: 'calendar.html' },
    { title: 'Reservas', desc: 'Gestionar todas las reservas', icon: '📋', color: '#4facfe', link: 'mis-reservas.html' },
    { title: 'Mi Perfil', desc: 'Configuración del negocio', icon: '👤', color: '#fa709a', onClick: showProfile }
  ];
} else if (user.role === 'ADMIN') {
  actions = [
    { title: 'Todas las Reservas', desc: 'Ver todas las reservas', icon: '📋', color: '#f093fb', link: 'mis-reservas.html' },
    { title: 'Estadísticas', desc: 'Reportes y analytics', icon: '📊', color: '#fa709a', onClick: loadStats },
    { title: 'Configuración', desc: 'Ajustes del sistema', icon: '⚙️', color: '#4facfe', onClick: showProfile }
  ];
}

actionsGrid.innerHTML = actions.map(a =>
  `<a href="${a.link || '#'}" class="action-card" data-action="${a.title}">
    <div class="action-icon" style="background: ${a.color}20; color: ${a.color};">${a.icon}</div>
    <h5 class="mb-2 action-title">${a.title}</h5>
    <p class="mb-0 action-desc">${a.desc}</p>
  </a>`
).join('');

// Agregar listeners
actions.forEach(action => {
  if (action.onClick) {
    const card = actionsGrid.querySelector(`[data-action="${action.title}"]`);
    if (card) card.addEventListener('click', (e) => { e.preventDefault(); action.onClick(); });
  }
});

// Funciones
function showProfile() {
  Swal.fire({
    title: 'Mi Perfil',
    html: `
      <div class="text-start">
        <p><strong>Nombre:</strong> ${user.name || user.email}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Rol:</strong> ${sessionManager.getRoleDisplayName()}</p>
        ${user.businessName ? `<p><strong>Negocio:</strong> ${user.businessName}</p>` : ''}
      </div>
    `,
    icon: 'info',
    confirmButtonText: 'Cerrar',
    confirmButtonColor: '#FF6B6B'
  });
}

async function showBookings() {
  window.location.href = 'mis-reservas.html';
}

async function showAllBookings() {
  window.location.href = 'mis-reservas.html';
}
    list.innerHTML = bookings.map(b => 
      `<div class="booking-item">
        <h6>${b.serviceName || 'Servicio'}</h6>
        <p class="small text-muted"><i class="bi bi-calendar"></i> ${b.date} ${b.time} | <i class="bi bi-person"></i> ${b.name || b.email}</p>
      </div>`
    ).join('');
  } catch (error) {
    list.innerHTML = '<p class="text-danger">Error</p>';
  }
}

async function loadStats() {
  document.getElementById('statsSection').style.display = 'flex';
  try {
    const bookings = await api.getBookings();
    const services = await api.getServices();
    document.getElementById('statBookings').textContent = bookings.length || 0;
    document.getElementById('statServices').textContent = services.length || 0;
    document.getElementById('statUsers').textContent = '0';
  } catch (error) {
    console.error('Error:', error);
  }
}

window.cancelBooking = async function(id) {
  const confirm = await Swal.fire({ title: '¿Cancelar?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí' });
  if (confirm.isConfirmed) {
    try {
      await api.cancelBooking(id);
      Swal.fire('¡Cancelada!', '', 'success');
      showBookings();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }
};

if (user.role === 'CLIENT') showBookings();
