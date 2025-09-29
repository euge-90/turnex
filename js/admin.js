import { API_BASE } from './utils.js';

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

// Verificar permisos
if (!token || !['BUSINESS', 'ADMIN'].includes(user.role)) {
  Swal.fire('Acceso denegado', 'No tenés permisos para acceder al panel de administración', 'error')
    .then(() => window.location.href = '/');
}

// Mostrar info del usuario
document.getElementById('userInfo').textContent = `${user.name} (${user.role})`;

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.clear();
  window.location.href = '/';
});

// Fecha actual
const today = new Date().toISOString().split('T')[0];
document.getElementById('dateFilter').value = today;

// Cargar datos iniciales
loadDashboardStats();
loadTodayBookings();
loadServices();

// Event listeners
document.getElementById('dateFilter').addEventListener('change', (e) => {
  loadBookingsByDate(e.target.value);
});

document.getElementById('serviceForm').addEventListener('submit', handleServiceSubmit);
document.getElementById('configForm').addEventListener('submit', handleConfigSubmit);

// === FUNCIONES ===

async function loadDashboardStats() {
  try {
    const res = await fetch(`${API_BASE}/bookings?date=${today}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const bookings = data.bookings || [];

    // Stats
    document.getElementById('todayBookings').textContent = bookings.length;
    
    const completed = bookings.filter(b => b.status === 'COMPLETED').length;
    document.getElementById('completedToday').textContent = completed;

    // Próximo turno
    const now = new Date();
    const upcoming = bookings
      .filter(b => b.status === 'CONFIRMED')
      .find(b => {
        const bookingTime = new Date(`${b.date}T${b.time}`);
        return bookingTime > now;
      });
    
    if (upcoming) {
      document.getElementById('nextBooking').textContent = `${upcoming.time} - ${upcoming.name}`;
    } else {
      document.getElementById('nextBooking').textContent = 'Sin turnos';
    }

    // Ingresos del día
    const revenue = bookings
      .filter(b => b.status === 'COMPLETED')
      .reduce((sum, b) => sum + (b.service?.price || 0), 0);
    document.getElementById('revenueToday').textContent = `$${revenue.toLocaleString()}`;

  } catch (error) {
    console.error('Error cargando stats:', error);
  }
}

async function loadTodayBookings() {
  loadBookingsByDate(today);
}

async function loadBookingsByDate(date) {
  try {
    const res = await fetch(`${API_BASE}/bookings?date=${date}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    const bookings = data.bookings || [];

    const container = document.getElementById('bookingsList');
    
    if (bookings.length === 0) {
      container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">No hay turnos para este día</p></div>';
      return;
    }

    container.innerHTML = bookings.map(booking => `
      <div class="col-md-6 col-lg-4">
        <div class="card booking-card ${booking.status.toLowerCase()}">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="mb-0">${booking.time}</h5>
              <span class="badge bg-${getStatusColor(booking.status)}">${getStatusText(booking.status)}</span>
            </div>
            <h6 class="mb-1">${booking.name}</h6>
            <p class="mb-2 text-muted">${booking.service?.name || 'Sin servicio'}</p>
            <div class="d-flex gap-2">
              ${booking.status === 'CONFIRMED' ? `
                <button class="btn btn-sm btn-success" onclick="window.changeBookingStatus('${booking.id}', 'COMPLETED')">
                  Completar
                </button>
                <button class="btn btn-sm btn-warning" onclick="window.changeBookingStatus('${booking.id}', 'NO_SHOW')">
                  No vino
                </button>
              ` : ''}
              ${booking.status !== 'CANCELLED' ? `
                <button class="btn btn-sm btn-danger" onclick="window.cancelBooking('${booking.id}')">
                  Cancelar
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error cargando turnos:', error);
  }
}

async function loadServices() {
  try {
    const res = await fetch(`${API_BASE}/services`);
    const services = await res.json();

    const tbody = document.getElementById('servicesTableBody');
    
    if (services.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay servicios creados</td></tr>';
      return;
    }

    tbody.innerHTML = services.map(service => `
      <tr>
        <td>${service.name}</td>
        <td>${service.category || '-'}</td>
        <td>${service.duration} min</td>
        <td>$${service.price.toLocaleString()}</td>
        <td>
          <span class="badge bg-${service.active ? 'success' : 'secondary'}">
            ${service.active ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="window.editService('${service.id}')">Editar</button>
          <button class="btn btn-sm btn-${service.active ? 'warning' : 'success'}" 
                  onclick="window.toggleService('${service.id}', ${!service.active})">
            ${service.active ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error cargando servicios:', error);
  }
}

async function handleServiceSubmit(e) {
  e.preventDefault();
  
  const serviceId = document.getElementById('serviceId').value;
  const data = {
    name: document.getElementById('serviceName').value,
    category: document.getElementById('serviceCategory').value,
    duration: parseInt(document.getElementById('serviceDuration').value),
    price: parseFloat(document.getElementById('servicePrice').value),
    description: document.getElementById('serviceDescription').value
  };

  try {
    const url = serviceId ? `${API_BASE}/services/${serviceId}` : `${API_BASE}/services`;
    const method = serviceId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      Swal.fire('Éxito', 'Servicio guardado correctamente', 'success');
      bootstrap.Modal.getInstance(document.getElementById('serviceModal')).hide();
      document.getElementById('serviceForm').reset();
      loadServices();
    } else {
      const error = await res.json();
      Swal.fire('Error', error.error || 'No se pudo guardar el servicio', 'error');
    }
  } catch (error) {
    Swal.fire('Error', 'Error de conexión', 'error');
  }
}

async function handleConfigSubmit(e) {
  e.preventDefault();
  
  const workingDays = [];
  ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach(day => {
    if (document.getElementById(`day${day}`).checked) {
      workingDays.push(day);
    }
  });

  const data = {
    startTime: document.getElementById('startTime').value,
    endTime: document.getElementById('endTime').value,
    workingDays
  };

  try {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      Swal.fire('Éxito', 'Configuración guardada', 'success');
    } else {
      Swal.fire('Error', 'No se pudo guardar la configuración', 'error');
    }
  } catch (error) {
    Swal.fire('Error', 'Error de conexión', 'error');
  }
}

// Funciones globales
window.changeBookingStatus = async (id, status) => {
  try {
    const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (res.ok) {
      Swal.fire('Éxito', 'Estado actualizado', 'success');
      loadTodayBookings();
      loadDashboardStats();
    }
  } catch (error) {
    Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
  }
};

window.cancelBooking = async (id) => {
  const confirm = await Swal.fire({
    title: '¿Cancelar turno?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, cancelar',
    cancelButtonText: 'No'
  });

  if (confirm.isConfirmed) {
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        Swal.fire('Cancelado', 'Turno cancelado correctamente', 'success');
        loadTodayBookings();
        loadDashboardStats();
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo cancelar el turno', 'error');
    }
  }
};

window.editService = async (id) => {
  try {
    const res = await fetch(`${API_BASE}/services`);
    const services = await res.json();
    const service = services.find(s => s.id === id);

    if (service) {
      document.getElementById('serviceId').value = service.id;
      document.getElementById('serviceName').value = service.name;
      document.getElementById('serviceCategory').value = service.category || 'Corte';
      document.getElementById('serviceDuration').value = service.duration;
      document.getElementById('servicePrice').value = service.price;
      document.getElementById('serviceDescription').value = service.description || '';

      new bootstrap.Modal(document.getElementById('serviceModal')).show();
    }
  } catch (error) {
    Swal.fire('Error', 'No se pudo cargar el servicio', 'error');
  }
};

window.toggleService = async (id, active) => {
  try {
    const res = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ active })
    });

    if (res.ok) {
      Swal.fire('Éxito', active ? 'Servicio activado' : 'Servicio desactivado', 'success');
      loadServices();
    }
  } catch (error) {
    Swal.fire('Error', 'No se pudo cambiar el estado', 'error');
  }
};

function getStatusColor(status) {
  const colors = {
    'CONFIRMED': 'success',
    'COMPLETED': 'secondary',
    'CANCELLED': 'danger',
    'NO_SHOW': 'warning'
  };
  return colors[status] || 'secondary';
}

function getStatusText(status) {
  const texts = {
    'CONFIRMED': 'Confirmado',
    'COMPLETED': 'Completado',
    'CANCELLED': 'Cancelado',
    'NO_SHOW': 'No vino'
  };
  return texts[status] || status;
}