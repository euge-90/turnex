import sessionManager from './session.js';
import api from './api.js';

// Proteger página
if (!sessionManager.isAuthenticated()) {
  window.location.href = 'index.html';
}

const user = sessionManager.getUser();

// Logout
document.getElementById('btnLogout').addEventListener('click', () => {
  sessionManager.logout();
  window.location.href = 'index.html';
});

// Cargar reservas
async function loadReservations() {
  const loadingState = document.getElementById('loadingState');
  const reservationsList = document.getElementById('reservationsList');
  const emptyState = document.getElementById('emptyState');

  try {
    const bookings = await api.getBookings();

    loadingState.style.display = 'none';

    if (!bookings || bookings.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    // Ordenar por fecha (más recientes primero)
    bookings.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateB - dateA;
    });

    reservationsList.style.display = 'block';
    reservationsList.innerHTML = bookings.map(booking => createReservationCard(booking)).join('');

    // Agregar event listeners
    bookings.forEach(booking => {
      const modifyBtn = document.getElementById(`modify-${booking.id}`);
      const cancelBtn = document.getElementById(`cancel-${booking.id}`);

      if (modifyBtn) {
        modifyBtn.addEventListener('click', () => modifyReservation(booking));
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => cancelReservation(booking));
      }
    });

  } catch (error) {
    console.error('Error al cargar reservas:', error);
    loadingState.style.display = 'none';
    reservationsList.style.display = 'block';
    reservationsList.innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="bi bi-exclamation-triangle"></i> Error al cargar las reservas. Por favor, intenta nuevamente.
      </div>
    `;
  }
}

function createReservationCard(booking) {
  const status = booking.status || 'confirmed';
  const statusClass = `status-${status}`;
  const statusText = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada'
  }[status] || 'Confirmada';

  const bookingDate = new Date(booking.date + ' ' + booking.time);
  const now = new Date();
  const isPast = bookingDate < now;
  const canModify = !isPast && status !== 'cancelled';

  // Verificar si puede cancelar (24hs antes)
  const hoursUntil = (bookingDate - now) / (1000 * 60 * 60);
  const canCancel = hoursUntil >= 24 && status !== 'cancelled';

  return `
    <div class="reservation-card">
      <div class="reservation-header">
        <div>
          <div class="reservation-title">${booking.serviceName || 'Servicio'}</div>
          <div class="reservation-date">
            <i class="bi bi-calendar3"></i>
            <span>${formatDate(booking.date)}</span>
            <i class="bi bi-clock"></i>
            <span>${booking.time}</span>
          </div>
          ${booking.duration ? `<div class="reservation-date mt-1">
            <i class="bi bi-hourglass-split"></i>
            <span>${booking.duration} minutos</span>
          </div>` : ''}
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>

      ${(canModify || canCancel) ? `
        <div class="reservation-actions">
          ${canModify ? `<button class="btn-action btn-modify" id="modify-${booking.id}">
            <i class="bi bi-pencil"></i> Modificar
          </button>` : ''}
          ${canCancel ? `<button class="btn-action btn-cancel" id="cancel-${booking.id}">
            <i class="bi bi-x-circle"></i> Cancelar
          </button>` : ''}
        </div>
      ` : ''}

      ${isPast ? '<small class="text-muted"><i class="bi bi-check-circle"></i> Turno pasado</small>' : ''}
      ${status === 'cancelled' ? '<small class="text-danger"><i class="bi bi-x-circle"></i> Turno cancelado</small>' : ''}
      ${!canCancel && !isPast && status !== 'cancelled' ? '<small class="text-warning"><i class="bi bi-exclamation-triangle"></i> No se puede cancelar (menos de 24hs)</small>' : ''}
    </div>
  `;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('es-AR', options);
}

async function modifyReservation(booking) {
  Swal.fire({
    title: 'Modificar Reserva',
    html: `
      <div class="text-start">
        <p class="mb-3">Servicio: <strong>${booking.serviceName}</strong></p>
        <div class="mb-3">
          <label class="form-label">Nueva Fecha:</label>
          <input type="date" id="newDate" class="form-control" value="${booking.date}" min="${new Date().toISOString().split('T')[0]}">
        </div>
        <div class="mb-3">
          <label class="form-label">Nueva Hora:</label>
          <input type="time" id="newTime" class="form-control" value="${booking.time}">
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Guardar Cambios',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#FF6B6B',
    preConfirm: () => {
      const newDate = document.getElementById('newDate').value;
      const newTime = document.getElementById('newTime').value;

      if (!newDate || !newTime) {
        Swal.showValidationMessage('Debes seleccionar fecha y hora');
        return false;
      }

      return { date: newDate, time: newTime };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await api.updateBooking(booking.id, {
          date: result.value.date,
          time: result.value.time
        });

        Swal.fire({
          icon: 'success',
          title: '¡Reserva Modificada!',
          text: 'Tu turno ha sido actualizado correctamente',
          confirmButtonColor: '#FF6B6B'
        });

        loadReservations();
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'No se pudo modificar la reserva',
          confirmButtonColor: '#C62828'
        });
      }
    }
  });
}

async function cancelReservation(booking) {
  const result = await Swal.fire({
    title: '¿Cancelar Reserva?',
    html: `
      <p>Estás a punto de cancelar tu turno de:</p>
      <div class="alert alert-warning mt-3">
        <strong>${booking.serviceName}</strong><br>
        ${formatDate(booking.date)} - ${booking.time}
      </div>
      <p class="text-muted small">Esta acción no se puede deshacer</p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, Cancelar',
    cancelButtonText: 'No',
    confirmButtonColor: '#C62828',
    cancelButtonColor: '#6c757d'
  });

  if (result.isConfirmed) {
    try {
      await api.cancelBooking(booking.id);

      Swal.fire({
        icon: 'success',
        title: 'Reserva Cancelada',
        text: 'Tu turno ha sido cancelado correctamente',
        confirmButtonColor: '#FF6B6B'
      });

      loadReservations();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo cancelar la reserva',
        confirmButtonColor: '#C62828'
      });
    }
  }
}

// Inicializar
loadReservations();
