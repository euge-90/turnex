import sessionManager from './session.js';
import { showSuccess, showError, showLoading, closeLoading } from './utils.js';

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

      // Manejar 401 (no autorizado)
      if (response.status === 401) {
        this._handleUnauthorized();
        throw new Error('Tu sesión expiró. Por favor, ingresá nuevamente.');
      }

      // Manejar 403 (prohibido)
      if (response.status === 403) {
        this._handleForbidden();
        throw new Error('No tenés permisos para realizar esta acción');
      }

      // Intentar parsear la respuesta
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Si la respuesta no es OK, lanzar error con el mensaje del servidor
      if (!response.ok) {
        const errorMessage = data.error || data.message || `Error ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
      
    } catch (error) {
      // Errores de red
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        const networkError = 'No se pudo conectar con el servidor. Verificá tu conexión.';
        console.error(`❌ Error de red en ${endpoint}:`, error);
        throw new Error(networkError);
      }
      
      // Re-lanzar el error con el mensaje apropiado
      console.error(`❌ Error en ${endpoint}:`, error.message);
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

  async patch(endpoint, body = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  // ==========================================
  // AUTH
  // ==========================================
  
  async signup(userData) {
    try {
      const data = await this.post('/auth/signup', userData);
      if (data.token && data.user) {
        sessionManager.login(data.user, data.token);
        // No mostrar mensaje aquí - lo maneja validation.js
      }
      return data;
    } catch (error) {
      console.warn('⚠️ API caída, usando auth local:', error.message);
      const mockUser = {
        id: crypto.randomUUID(),
        email: userData.email,
        name: userData.name || userData.email.split('@')[0],
        role: userData.role || 'CLIENT',
        businessName: userData.businessName || null,
        phone: userData.phone || null
      };
      const mockToken = 'local-' + crypto.randomUUID();
      const users = JSON.parse(localStorage.getItem('turnex-local-users') || '[]');
      users.push(mockUser);
      localStorage.setItem('turnex-local-users', JSON.stringify(users));
      sessionManager.login(mockUser, mockToken);
      // No mostrar mensaje - lo maneja validation.js
      return { user: mockUser, token: mockToken };
    }
  }

  async login(credentials) {
    try {
      const data = await this.post('/auth/login', credentials);
      if (data.token && data.user) {
        sessionManager.login(data.user, data.token);
        // No mostrar mensaje aquí - lo maneja validation.js
      }
      return data;
    } catch (error) {
      console.warn('⚠️ API caída, usando auth local:', error.message);
      const users = JSON.parse(localStorage.getItem('turnex-local-users') || '[]');
      let user = users.find(u => u.email === credentials.email);
      if (!user) {
        user = {
          id: crypto.randomUUID(),
          email: credentials.email,
          name: credentials.email.split('@')[0],
          role: 'CLIENT',
          businessName: null,
          phone: null
        };
        users.push(user);
        localStorage.setItem('turnex-local-users', JSON.stringify(users));
      }
      const mockToken = 'local-' + crypto.randomUUID();
      sessionManager.login(user, mockToken);
      // No mostrar mensaje - lo maneja validation.js
      return { user, token: mockToken };
    }
  }

  logout() {
    sessionManager.logout();
    showSuccess('Sesión cerrada correctamente');
  }

  // ==========================================
  // SERVICES
  // ==========================================
  
  async getServices(businessId = null) {
    try {
      const params = businessId ? { businessId } : {};
      return await this.get('/services', params);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      showError('No se pudieron cargar los servicios');
      throw error;
    }
  }

  async getService(id) {
    try {
      return await this.get(`/services/${id}`);
    } catch (error) {
      showError('No se pudo obtener el servicio');
      throw error;
    }
  }

  async createService(serviceData) {
    try {
      const result = await this.post('/services', serviceData);
      showSuccess(`Servicio "${serviceData.name}" creado`);
      return result;
    } catch (error) {
      showError(error.message || 'Error al crear el servicio');
      throw error;
    }
  }

  async updateService(id, serviceData) {
    try {
      const result = await this.put(`/services/${id}`, serviceData);
      showSuccess('Servicio actualizado correctamente');
      return result;
    } catch (error) {
      showError(error.message || 'Error al actualizar el servicio');
      throw error;
    }
  }

  async deleteService(id) {
    try {
      const result = await this.delete(`/services/${id}`);
      showSuccess('Servicio eliminado correctamente');
      return result;
    } catch (error) {
      showError(error.message || 'Error al eliminar el servicio');
      throw error;
    }
  }

  // ==========================================
  // BOOKINGS
  // ==========================================
  
  async getBookings() {
    try {
      return await this.get('/bookings');
    } catch (error) {
      console.warn('⚠️ API caída, usando localStorage');
      const user = sessionManager.getUser();
      const allBookings = JSON.parse(localStorage.getItem('app_bookings_v1') || '[]');
      return user ? allBookings.filter(b => b.email === user.email) : allBookings;
    }
  }

  async getBookingsByDay(date) {
    try {
      return await this.get('/bookings/day', { date });
    } catch (error) {
      console.error('Error al obtener turnos del día:', error);
      // No mostrar error aquí, es silencioso
      return [];
    }
  }

  async createBooking(bookingData) {
    try {
      const result = await this.post('/bookings', bookingData);
      return result;
    } catch (error) {
      console.warn('⚠️ API caída, usando localStorage');
      const user = sessionManager.getUser();
      const allBookings = JSON.parse(localStorage.getItem('app_bookings_v1') || '[]');
      const services = JSON.parse(localStorage.getItem('app_services_v1') || '[]');
      const service = services.find(s => s.id === bookingData.serviceId);
      const booking = {
        id: crypto.randomUUID(),
        email: user?.email || bookingData.email || 'guest@turnex.app',
        name: user?.name || bookingData.name || 'Usuario',
        serviceId: bookingData.serviceId,
        serviceName: bookingData.serviceName || service?.name || 'Servicio',
        duration: service?.duration || 30,
        date: bookingData.date,
        time: bookingData.time,
        createdAt: Date.now()
      };
      allBookings.push(booking);
      localStorage.setItem('app_bookings_v1', JSON.stringify(allBookings));
      return booking;
    }
  }

  async cancelBooking(id) {
    try {
      const result = await this.delete(`/bookings/${id}`);
      showSuccess('Turno cancelado correctamente');
      return result;
    } catch (error) {
      console.warn('⚠️ API caída, usando localStorage');
      const user = sessionManager.getUser();
      const allBookings = JSON.parse(localStorage.getItem('app_bookings_v1') || '[]');
      const idx = allBookings.findIndex(b => b.id === id && b.email === user?.email);
      if (idx === -1) throw new Error('Reserva no encontrada');
      allBookings.splice(idx, 1);
      localStorage.setItem('app_bookings_v1', JSON.stringify(allBookings));
      showSuccess('Turno cancelado (modo local)');
      return { success: true };
    }
  }

  async updateBooking(id, bookingData) {
    try {
      const result = await this.put(`/bookings/${id}`, bookingData);
      showSuccess('Turno actualizado correctamente');
      return result;
    } catch (error) {
      console.warn('⚠️ API caída, usando localStorage');
      const allBookings = JSON.parse(localStorage.getItem('app_bookings_v1') || '[]');
      const idx = allBookings.findIndex(b => b.id === id);
      if (idx === -1) throw new Error('Reserva no encontrada');
      allBookings[idx] = { ...allBookings[idx], ...bookingData };
      localStorage.setItem('app_bookings_v1', JSON.stringify(allBookings));
      showSuccess('Turno actualizado (modo local)');
      return allBookings[idx];
    }
  }

  async updateBookingStatus(id, status) {
    try {
      const result = await this.patch(`/bookings/${id}/status`, { status });
      showSuccess('Estado del turno actualizado');
      return result;
    } catch (error) {
      showError(error.message || 'Error al actualizar el estado');
      throw error;
    }
  }

  // ==========================================
  // CONFIG
  // ==========================================
  
  async getConfig() {
    try {
      return await this.get('/config');
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      // No mostrar error, usar valores por defecto
      return null;
    }
  }

  async updateConfig(configData) {
    try {
      const result = await this.put('/config', configData);
      // NO mostrar mensaje aquí, se maneja en cada funcionalidad específica
      return result;
    } catch (error) {
      showError(error.message || 'Error al actualizar la configuración');
      throw error;
    }
  }

  // ==========================================
  // ADMIN
  // ==========================================
  
  async getUsersCount() {
    try {
      return await this.get('/admin/users/count');
    } catch (error) {
      console.error('Error al obtener conteo de usuarios:', error);
      return { total: 0 };
    }
  }

  // ==========================================
  // HANDLERS PRIVADOS
  // ==========================================
  
  _handleUnauthorized() {
    console.warn('⚠️ Token inválido o expirado');
    sessionManager.logout();
    
    // Cerrar cualquier modal abierto
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
      const instance = bootstrap.Modal.getInstance(modal);
      if (instance) instance.hide();
    });
    
    // Disparar evento para que la UI reaccione
    window.dispatchEvent(new CustomEvent('auth:expired'));
  }

  _handleForbidden() {
    console.warn('⚠️ Acceso denegado');
    window.dispatchEvent(new CustomEvent('permission:denied'));
  }
}

const api = new APIClient();
export default api;