import sessionManager from './session.js';
import api from './api.js';
if (!sessionManager.isAuthenticated()) { window.location.href = 'index.html'; }
let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;
let selectedService = null;
let services = [];
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
async function loadServices() {
  try {
    services = await api.getServices();
    const select = document.getElementById('serviceSelect');
    const opts = services.map(s => '<option value="' + s.id + '">' + s.name + ' - $' + s.price + ' (' + s.duration + ' min)</option>').join('');
    select.innerHTML = '<option value="">Selecciona un servicio</option>' + opts;
  } catch (error) { console.error('Error:', error); }
}
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  document.getElementById('currentMonth').textContent = months[currentDate.getMonth()] + ' ' + currentDate.getFullYear();
  let html = DAYS.map(d => '<div class="day-header">' + d + '</div>').join('');
  const startDay = firstDay.getDay();
  for (let i = startDay - 1; i >= 0; i--) { html += '<div class="day-cell disabled"></div>'; }
  const today = new Date();
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const isPast = date < today.setHours(0, 0, 0, 0);
    const isSelected = selectedDate && selectedDate.toDateString() === date.toDateString();
    let cls = 'day-cell';
    if (isPast) cls += ' disabled';
    if (isSelected) cls += ' selected';
    html += '<div class="' + cls + '" data-date="' + date.toISOString() + '" onclick="window.selectDate(\'' + date.toISOString() + '\')">' + day + '</div>';
  }
  grid.innerHTML = html;
}
window.selectDate = function(dateStr) {
  selectedDate = new Date(dateStr);
  selectedTime = null;
  renderCalendar();
  if (selectedService) { loadTimeSlots(); }
};
async function loadTimeSlots() {
  if (!selectedDate) return;
  const section = document.getElementById('timeSlotsSection');
  const container = document.getElementById('timeSlots');
  section.style.display = 'block';
  container.innerHTML = '<p class="text-muted">Cargando...</p>';
  try {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const bookings = await api.getBookingsByDay(dateStr);
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      for (let min of [0, 30]) {
        const t = hour.toString().padStart(2,'0') + ':' + min.toString().padStart(2,'0');
        if (!bookings.some(b => b.time === t)) { slots.push(t); }
      }
    }
    if (slots.length === 0) { container.innerHTML = '<p class="text-muted">Sin horarios disponibles</p>'; return; }
    container.innerHTML = slots.map(t => '<div class="time-slot" onclick="window.selectTime(\'' + t + '\')">' + t + '</div>').join('');
  } catch (error) { container.innerHTML = '<p class="text-danger">Error</p>'; }
}
window.selectTime = function(time) {
  selectedTime = time;
  document.querySelectorAll('.time-slot').forEach(el => { el.classList.toggle('selected', el.textContent.trim() === time); });
  showConfirmation();
};
function showConfirmation() {
  if (!selectedService || !selectedDate || !selectedTime) return;
  const section = document.getElementById('confirmSection');
  const summary = document.getElementById('bookingSummary');
  const service = services.find(s => s.id === selectedService);
  const dateStr = selectedDate.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  summary.innerHTML = '<div class="alert alert-info"><h6>✂️ ' + service.name + '</h6><p><i class="bi bi-calendar"></i> ' + dateStr + '</p><p><i class="bi bi-clock"></i> ' + selectedTime + '</p><p>💰 $' + service.price + '</p></div>';
  section.style.display = 'block';
}
document.getElementById('confirmBooking').addEventListener('click', async () => {
  if (!selectedService || !selectedDate || !selectedTime) return;
  const btn = document.getElementById('confirmBooking');
  btn.disabled = true;
  try {
    const service = services.find(s => s.id === selectedService);
    const user = sessionManager.getUser();
    await api.createBooking({ serviceId: selectedService, serviceName: service.name, date: selectedDate.toISOString().split('T')[0], time: selectedTime, duration: service.duration, name: user.name, email: user.email });
    await Swal.fire({ icon: 'success', title: '¡Reserva confirmada!', text: 'Tu turno ha sido registrado' });
    window.location.href = 'dashboard.html';
  } catch (error) {
    Swal.fire('Error', error.message, 'error');
    btn.disabled = false;
  }
});
document.getElementById('serviceSelect').addEventListener('change', (e) => {
  selectedService = e.target.value;
  const service = services.find(s => s.id === selectedService);
  if (service) { document.getElementById('serviceInfo').textContent = service.description + ' - $' + service.price; }
  if (selectedDate) { loadTimeSlots(); }
});
document.getElementById('prevMonth').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
loadServices();
renderCalendar();
