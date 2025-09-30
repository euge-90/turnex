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
    { title: 'Buscar Servicios', desc: 'Explora y reserva servicios', icon: '🔍', color: '#667eea', link: 'index.html#servicios' },
    { title: 'Reservar Turno', desc: 'Agenda una nueva cita', icon: '📅', color: '#f093fb', link: 'calendar.html' },
    { title: 'Mis Reservas', desc: 'Ver y gestionar mis turnos', icon: '📋', color: '#4facfe', onClick: showBookings }
  ];
} else if (user.role === 'BUSINESS') {
  actions = [
    { title: 'Calendario', desc: 'Ver turnos programados', icon: '📅', color: '#f093fb', link: 'calendar.html' },
    { title: 'Reservas', desc: 'Gestionar todas las reservas', icon: '📋', color: '#4facfe', onClick: showAllBookings }
  ];
} else if (user.role === 'ADMIN') {
  actions = [
    { title: 'Todas las Reservas', desc: 'Ver todas las reservas', icon: '📋', color: '#f093fb', onClick: showAllBookings },
    { title: 'Estadísticas', desc: 'Reportes y analytics', icon: '📊', color: '#fa709a', onClick: loadStats }
  ];
}

actionsGrid.innerHTML = actions.map(a => 
  `<a href="${a.link || '#'}" class="action-card" data-action="${a.title}">
    <div class="action-icon" style="background: ${a.color}20; color: ${a.color};">${a.icon}</div>
    <h5 class="mb-2">${a.title}</h5>
    <p class="text-muted mb-0 small">${a.desc}</p>
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
async function showBookings() {
  const section = document.getElementById('recentBookingsSection');
  const list = document.getElementById('recentBookingsList');
  section.style.display = 'block';
  list.innerHTML = '<p class="text-muted">Cargando...</p>';
  try {
    const bookings = await api.getBookings();
    if (!bookings || bookings.length === 0) {
      list.innerHTML = '<p class="text-muted">No tienes reservas. <a href="calendar.html">¡Reserva ahora!</a></p>';
      return;
    }
    list.innerHTML = bookings.slice(0, 5).map(b => 
      `<div class="booking-item">
        <div class="d-flex justify-content-between">
          <div>
            <h6 class="mb-1">${b.serviceName || 'Servicio'}</h6>
            <p class="mb-0 small text-muted"><i class="bi bi-calendar"></i> ${b.date} a las ${b.time}</p>
          </div>
          <button class="btn btn-sm btn-outline-danger" onclick="cancelBooking('${b.id}')"><i class="bi bi-x-circle"></i></button>
        </div>
      </div>`
    ).join('');
  } catch (error) {
    list.innerHTML = '<p class="text-danger">Error al cargar</p>';
  }
}

async function showAllBookings() {
  const section = document.getElementById('recentBookingsSection');
  const list = document.getElementById('recentBookingsList');
  section.style.display = 'block';
  list.innerHTML = '<p class="text-muted">Cargando...</p>';
  try {
    const bookings = await api.getBookings();
    if (!bookings || bookings.length === 0) {
      list.innerHTML = '<p class="text-muted">No hay reservas.</p>';
      return;
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
