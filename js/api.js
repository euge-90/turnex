import sessionManager from './session.js';

class APIClient {
  constructor() {
    this.baseURL = window.API_BASE || 'http://localhost:3000/api';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = sessionManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        this._handleUnauthorized();
        throw new Error('No autorizado');
      }

      if (response.status === 403) {
        this._handleForbidden();
        throw new Error('Acceso denegado');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async put(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // AUTH
  async signup(userData) {
    const data = await this.post('/auth/signup', userData);
    if (data.token && data.user) {
      sessionManager.login(data.user, data.token);
    }
    return data;
  }

  async login(credentials) {
    const data = await this.post('/auth/login', credentials);
    if (data.token && data.user) {
      sessionManager.login(data.user, data.token);
    }
    return data;
  }

  logout() {
    sessionManager.logout();
  }

  // SERVICES
  async getServices(businessId = null) {
    const params = businessId ? { businessId } : {};
    return this.get('/services', params);
  }

  async getService(id) {
    return this.get(`/services/${id}`);
  }

  async createService(serviceData) {
    return this.post('/services', serviceData);
  }

  async updateService(id, serviceData) {
    return this.put(`/services/${id}`, serviceData);
  }

  async deleteService(id) {
    return this.delete(`/services/${id}`);
  }

  // BOOKINGS
  async getBookings() {
    return this.get('/bookings');
  }

  async getBookingsByDay(date) {
    return this.get('/bookings/day', { date });
  }

  async createBooking(bookingData) {
    const res = await this.post('/bookings', bookingData);
    try { showSuccessToast && showSuccessToast('✅ Turno reservado exitosamente') } catch (e) {}
    return res;
  }

  async cancelBooking(id) {
    return this.delete(`/bookings/${id}`);
  }

  // CONFIG
  async getConfig() {
    return this.get('/config');
  }

  async updateConfig(configData) {
    return this.put('/config', configData);
  }

  // ADMIN
  async getUsersCount() {
    return this.get('/admin/users/count');
  }

  _handleUnauthorized() {
    console.warn('Token inválido o expirado');
    sessionManager.logout();
  }

  _handleForbidden() {
    console.warn('Acceso denegado');
    if (window.showNotification) {
      window.showNotification('No tienes permisos para realizar esta acción', 'error');
    }
    window.dispatchEvent(new CustomEvent('permission:denied'));
  }
}

const api = new APIClient();
export default api;

// Small visual helper used by UI flows
function showSuccessToast(message) {
  try {
    if (window.Swal) {
      window.Swal.fire({ icon: 'success', title: message, toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true })
      return
    }
    const ev = new CustomEvent('turnex:notification', { detail: { type: 'success', message } })
    window.dispatchEvent(ev)
  } catch (e) { console.error(e) }
}