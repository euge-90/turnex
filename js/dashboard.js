import sessionManager from './session.js';
import api from './api.js';
import ErrorHandler from './errorHandler.js';

// Verificar autenticación
if (!sessionManager.isAuthenticated() || !sessionManager.hasRole('BUSINESS')) {
  window.location.href = 'index.html';
}

// Mostrar nombre del negocio
const user = sessionManager.getUser();
if (user && user.businessName) {
  const el = document.getElementById('businessName');
  if (el) el.textContent = user.businessName;
}

// Navegación entre secciones
document.querySelectorAll('[data-section]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const section = e.currentTarget.dataset.section;
    // Ocultar todas las secciones
    document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('d-none'));
    // Mostrar sección seleccionada
    const target = document.getElementById(section);
    if (target) target.classList.remove('d-none');
    // Actualizar nav activo
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    e.currentTarget.classList.add('active');
    // Cargar datos según la sección
    loadSectionData(section);
  });
});

// Cargar datos según sección
async function loadSectionData(section) {
  try {
    switch(section) {
      case 'overview':
        await loadOverview();
        break;
      case 'appointments':
        await loadAppointments();
        break;
      case 'services':
        await loadServices();
        break;
    }
  } catch (e) { ErrorHandler.handle(e, 'loadSectionData') }
}

// Cargar resumen
async function loadOverview() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await api.getBookings();
    const todayAppts = (appointments || []).filter(a => a.date === today);
    document.getElementById('todayAppointments').textContent = todayAppts.length;
    document.getElementById('confirmedAppointments').textContent = todayAppts.filter(a => a.status === 'confirmed').length;
    document.getElementById('pendingAppointments').textContent = todayAppts.filter(a => a.status === 'pending').length;

    const weekStart = getMonday(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekAppts = (appointments || []).filter(a => { const apptDate = new Date(a.date); return apptDate >= weekStart && apptDate <= weekEnd; });
    document.getElementById('weekAppointments').textContent = weekAppts.length;
    renderTodaySchedule(todayAppts);
  } catch (error) { ErrorHandler.handle(error, 'loadOverview') }
}

// Renderizar agenda del día
function renderTodaySchedule(appointments) {
  const container = document.getElementById('todaySchedule');
  if (!container) return;
  if (!appointments || appointments.length === 0) {
    container.innerHTML = '<p class="text-muted">No hay turnos para hoy</p>';
    return;
  }
  const sorted = appointments.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const html = `
    <table class="table table-hover">
      <thead>
        <tr>
          <th>Hora</th>
          <th>Cliente</th>
          <th>Servicio</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(appt => `
          <tr>
            <td><strong>${appt.time || ''}</strong></td>
            <td>${appt.name || appt.clientName || ''}</td>
            <td>${(appt.service && appt.service.name) || 'N/A'}</td>
            <td><span class="badge bg-${getStatusColor(appt.status)}">${getStatusText(appt.status)}</span></td>
            <td>
              <button class="btn btn-sm btn-success" onclick="confirmAppointment('${appt.id}')">
                <i class="bi bi-check-circle"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="cancelAppointment('${appt.id}')">
                <i class="bi bi-x-circle"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  container.innerHTML = html;
}

// Cargar todos los turnos
async function loadAppointments() {
  try {
    const appointments = await api.getBookings();
    const container = document.getElementById('appointmentsList');
    if (!container) return;
    if (!appointments || appointments.length === 0) { container.innerHTML = '<p class="text-muted">No hay turnos registrados</p>'; return }
    const grouped = groupByDate(appointments);
    const html = Object.keys(grouped).sort().reverse().map(date => `
      <div class="card mb-3">
        <div class="card-header">
          <h5>${formatDate(date)}</h5>
        </div>
        <div class="card-body">
          <table class="table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Servicio</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${grouped[date].sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(appt => `
                <tr>
                  <td>${appt.time}</td>
                  <td>${appt.name || appt.clientName}</td>
                  <td>${(appt.service && appt.service.name) || 'N/A'}</td>
                  <td><span class="badge bg-${getStatusColor(appt.status)}">${getStatusText(appt.status)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('');
    container.innerHTML = html;
  } catch (error) { ErrorHandler.handle(error, 'loadAppointments') }
}

// Cargar servicios
async function loadServices() {
  try {
    const services = await api.getServices();
    const container = document.getElementById('servicesList');
    if (!container) return;
    if (!services || services.length === 0) { container.innerHTML = '<p class="text-muted">No hay servicios registrados</p>'; return }
    const html = services.map(service => `
      <div class="col-md-4 mb-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">${service.name}</h5>
            <p class="card-text">${service.description || ''}</p>
            <p class="card-text">
              <strong>$${service.price}</strong> · ${service.duration} min
            </p>
            <button class="btn btn-sm btn-warning" onclick="editService('${service.id}')">
              <i class="bi bi-pencil"></i> Editar
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteService('${service.id}')">
              <i class="bi bi-trash"></i> Eliminar
            </button>
          </div>
        </div>
      </div>
    `).join('');
    container.innerHTML = html;
  } catch (error) { ErrorHandler.handle(error, 'loadServices') }
}

// Agregar servicio
window.addService = async function() {
  const name = document.getElementById('serviceName').value;
  const description = document.getElementById('serviceDescription').value;
  const price = document.getElementById('servicePrice').value;
  const duration = document.getElementById('serviceDuration').value;
  try {
    await api.createService({ name, description, price: parseFloat(price), duration: parseInt(duration) });
    bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
    showSuccess('Servicio agregado exitosamente');
    loadServices();
    document.getElementById('addServiceForm').reset();
  } catch (error) { ErrorHandler.handle(error, 'addService') }
}

// Confirmar turno
window.confirmAppointment = async function(id) {
  try {
    await api.updateBookingStatus(id, 'confirmed');
    showSuccess('Turno confirmado');
    loadOverview();
  } catch (error) { ErrorHandler.handle(error, 'confirmAppointment') }
}

// Cancelar turno
window.cancelAppointment = async function(id) {
  try {
    const result = await Swal.fire({ title: '¿Cancelar turno?', text: 'Esta acción no se puede deshacer', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, cancelar', cancelButtonText: 'No' });
    if (result.isConfirmed) {
      await api.deleteBooking(id);
      showSuccess('Turno cancelado');
      loadOverview();
    }
  } catch (error) { ErrorHandler.handle(error, 'cancelAppointment') }
}

// Logout
window.logout = function() { sessionManager.logout(); window.location.href = 'index.html'; }

// Utilidades
function getMonday(d) { d = new Date(d); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); return new Date(d.setDate(diff)); }
function groupByDate(appointments) { return (appointments || []).reduce((acc, appt) => { if (!acc[appt.date]) acc[appt.date] = []; acc[appt.date].push(appt); return acc; }, {}); }
function formatDate(dateStr) { const date = new Date(dateStr); return date.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
function getStatusColor(status) { const colors = { confirmed: 'success', pending: 'warning', cancelled: 'danger', completed: 'info' }; return colors[status] || 'secondary'; }
function getStatusText(status) { const texts = { confirmed: 'Confirmado', pending: 'Pendiente', cancelled: 'Cancelado', completed: 'Completado' }; return texts[status] || status; }
function showSuccess(message) { Swal.fire({ icon: 'success', title: message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 }); }
function showError(title, error) { Swal.fire({ icon: 'error', title: title, text: error && (error.message || error.toString()) || 'Ha ocurrido un error', toast: true, position: 'top-end', showConfirmButton: false, timer: 4000 }); }

// Cargar datos iniciales
loadOverview();
