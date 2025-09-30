import sessionManager from './session.js';
import api from './api.js';

// Proteger página
if (!sessionManager.isAuthenticated()) {
  window.location.href = 'index.html';
}

const user = sessionManager.getUser();
const API_URL = window.API_BASE || 'https://turnex-api.onrender.com/api';
const token = sessionManager.getToken();

let selectedDate = null;
let selectedTime = null;
let selectedService = null;

// Actualizar UI usuario
document.getElementById('userName').textContent = user.name || user.email;
document.getElementById('userRole').textContent = getRoleDisplayName(user.role);
document.getElementById('navUserInfo').textContent = user.name || user.email;

// Logout
document.getElementById('btnLogout').addEventListener('click', () => {
  sessionManager.logout();
  window.location.href = 'index.html';
});

// Navegación entre secciones
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const sectionName = link.dataset.section;
    showSection(sectionName);

    // Update active tab
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

window.showSection = function(sectionName) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`${sectionName}-section`).classList.add('active');

  // Cargar datos de la sección
  if (sectionName === 'home') loadHome();
  if (sectionName === 'calendar') loadCalendar();
  if (sectionName === 'reservations') loadReservations();
  if (sectionName === 'services') loadServices();
};

function getRoleDisplayName(role) {
  const roles = { CLIENT: 'Cliente', BUSINESS: 'Negocio', ADMIN: 'Administrador' };
  return roles[role] || role;
}

// SECCIÓN HOME
async function loadHome() {
  try {
    const bookings = await fetchBookings();
    const upcoming = bookings.filter(b => new Date(b.date) >= new Date()).slice(0, 3);

    const container = document.getElementById('upcomingBookings');
    if (upcoming.length === 0) {
      container.innerHTML = '<p class="text-muted">No tenés reservas próximas</p>';
    } else {
      container.innerHTML = upcoming.map(b => `
        <div class="booking-card">
          <h6>${b.serviceName || 'Servicio'}</h6>
          <p class="mb-0 small text-muted">
            <i class="bi bi-calendar"></i> ${formatDate(b.date)} ${b.time}
          </p>
        </div>
      `).join('');
    }
  } catch (error) {
    document.getElementById('upcomingBookings').innerHTML = '<p class="text-danger">Error al cargar reservas</p>';
  }
}

// SECCIÓN CALENDARIO
function loadCalendar() {
  renderCalendar();
  loadServicesForBooking();
}

function renderCalendar() {
  const calendar = document.getElementById('calendar');
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = '<div style="grid-column: span 7; text-align: center; font-weight: bold; margin-bottom: 16px;">';
  html += `${today.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</div>`;

  ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(day => {
    html += `<div style="font-weight: 600; text-align: center; padding: 8px;">${day}</div>`;
  });

  // Días vacíos antes del primer día
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day disabled"></div>';
  }

  // Días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isPast = date < new Date().setHours(0, 0, 0, 0);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    html += `<div class="calendar-day ${isPast ? 'disabled' : ''}"
                  onclick="${isPast ? '' : `selectDate('${dateStr}')`}">
              ${day}
            </div>`;
  }

  calendar.innerHTML = html;
}

window.selectDate = function(date) {
  selectedDate = date;
  document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
  event.target.classList.add('selected');

  loadTimeSlots(date);
};

async function loadTimeSlots(date) {
  document.getElementById('timeSlots').style.display = 'block';

  // Horarios de 9am a 6pm cada 30 min
  const slots = [];
  for (let hour = 9; hour < 18; hour++) {
    slots.push(`${String(hour).padStart(2, '0')}:00`);
    slots.push(`${String(hour).padStart(2, '0')}:30`);
  }

  try {
    const bookedSlots = await fetch(`${API_URL}/bookings/day?date=${date}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).catch(() => []);

    const bookedTimes = bookedSlots.map(b => b.time);

    document.getElementById('timeSlotsContainer').innerHTML = slots.map(time => {
      const isBooked = bookedTimes.includes(time);
      return `<div class="time-slot ${isBooked ? 'disabled' : ''}"
                   onclick="${isBooked ? '' : `selectTime('${time}')`}">
                ${time} ${isBooked ? '(Ocupado)' : ''}
              </div>`;
    }).join('');
  } catch (error) {
    document.getElementById('timeSlotsContainer').innerHTML = slots.map(time =>
      `<div class="time-slot" onclick="selectTime('${time}')">${time}</div>`
    ).join('');
  }
}

window.selectTime = function(time) {
  selectedTime = time;
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
  event.target.classList.add('selected');

  document.getElementById('serviceSelection').style.display = 'block';
};

async function loadServicesForBooking() {
  try {
    const services = await api.getServices();
    const select = document.getElementById('serviceSelect');
    select.innerHTML = '<option value="">Seleccionar servicio...</option>' +
      services.map(s => `<option value="${s.id}">${s.name} - $${s.price || 0}</option>`).join('');
  } catch (error) {
    document.getElementById('serviceSelect').innerHTML = '<option>Error al cargar servicios</option>';
  }
}

window.confirmBooking = async function() {
  const serviceId = document.getElementById('serviceSelect').value;

  if (!selectedDate || !selectedTime || !serviceId) {
    Swal.fire('Error', 'Completá todos los campos', 'error');
    return;
  }

  try {
    await api.createBooking({
      serviceId,
      date: selectedDate,
      time: selectedTime,
      name: user.name || user.email
    });

    Swal.fire('¡Reserva confirmada!', `${selectedDate} a las ${selectedTime}`, 'success');
    showSection('reservations');
  } catch (error) {
    Swal.fire('Error', error.message || 'No se pudo crear la reserva', 'error');
  }
};

// SECCIÓN RESERVAS
async function loadReservations() {
  const container = document.getElementById('bookingsList');
  container.innerHTML = '<p class="text-muted">Cargando...</p>';

  try {
    const bookings = await fetchBookings();

    if (bookings.length === 0) {
      container.innerHTML = '<p class="text-muted">No tenés reservas</p>';
      return;
    }

    container.innerHTML = bookings.map(b => `
      <div class="booking-card">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5>${b.serviceName || 'Servicio'}</h5>
            <p class="mb-1">
              <i class="bi bi-calendar"></i> ${formatDate(b.date)}
              <i class="bi bi-clock ms-2"></i> ${b.time}
            </p>
            <p class="mb-0 small text-muted">
              <i class="bi bi-person"></i> ${b.name || user.name}
            </p>
          </div>
          <button class="btn btn-sm btn-outline-danger" onclick="cancelBooking('${b.id}')">
            Cancelar
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = '<p class="text-danger">Error al cargar reservas</p>';
  }
}

window.cancelBooking = async function(id) {
  const result = await Swal.fire({
    title: '¿Cancelar esta reserva?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No'
  });

  if (result.isConfirmed) {
    try {
      await api.cancelBooking(id);
      Swal.fire('Cancelada', 'Tu reserva fue cancelada', 'success');
      loadReservations();
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
    }
  }
};

// SECCIÓN SERVICIOS
async function loadServices() {
  const container = document.getElementById('servicesList');
  container.innerHTML = '<p class="text-muted">Cargando...</p>';

  try {
    const services = await api.getServices();

    if (services.length === 0) {
      container.innerHTML = '<p class="text-muted">No hay servicios disponibles</p>';
      return;
    }

    container.innerHTML = services.map(s => `
      <div class="booking-card">
        <h5>${s.name}</h5>
        <p class="mb-1">${s.description || 'Sin descripción'}</p>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <span class="badge bg-primary">${s.duration || 30} min</span>
          <strong>$${s.price || 0}</strong>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = '<p class="text-danger">Error al cargar servicios</p>';
  }
}

// Helper functions
async function fetchBookings() {
  try {
    return await api.getBookings();
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Inicializar
loadHome();
