/**
 * SessionManager - Gestión de sesiones y roles
 */

const STORAGE_KEYS = {
  TOKEN: 'turnex_token',
  USER: 'turnex_user',
  EXPIRY: 'turnex_token_expiry'
};

// Matriz de permisos
const PERMISSIONS = {
  'create-service': ['BUSINESS', 'ADMIN'],
  'edit-service': ['BUSINESS', 'ADMIN'],
  'delete-service': ['BUSINESS', 'ADMIN'],
  'view-all-bookings': ['BUSINESS', 'ADMIN'],
  'manage-users': ['ADMIN'],
  'manage-config': ['BUSINESS', 'ADMIN'],
  'view-stats': ['BUSINESS', 'ADMIN'],
  'create-booking': ['CLIENT', 'BUSINESS', 'ADMIN'],
  'view-own-bookings': ['CLIENT', 'BUSINESS', 'ADMIN']
};

class SessionManager {
  constructor() {
    this.user = null;
    this.token = null;
    this.loadSession();
  }

  loadSession() {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const userJson = localStorage.getItem(STORAGE_KEYS.USER);
      const expiry = localStorage.getItem(STORAGE_KEYS.EXPIRY);

      if (token && userJson) {
        this.token = token;
        this.user = JSON.parse(userJson);

        // Verificar si el token expiró
        if (expiry && new Date(expiry) < new Date()) {
          console.warn('Token expirado, cerrando sesión');
          this.logout();
          return false;
        }

        this._dispatchEvent('session:loaded', { user: this.user });
        return true;
      }
    } catch (error) {
      console.error('Error al cargar sesión:', error);
      this.logout();
    }
    return false;
  }

  login(user, token) {
    try {
      this.user = user;
      this.token = token;

      // Calcular fecha de expiración (7 días)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);

      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.EXPIRY, expiry.toISOString());

      this._dispatchEvent('session:login', { user });
      
      // Redirigir según el rol
      this._redirectByRole();
      
      return true;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      return false;
    }
  }

  logout() {
    this.user = null;
    this.token = null;

    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.EXPIRY);

    this._dispatchEvent('session:logout');
    window.location.hash = '#login';
  }

  isAuthenticated() {
    return this.token !== null && this.user !== null;
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  hasRole(roles) {
    if (!this.user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(this.user.role);
  }

  canAccess(permission) {
    if (!this.user) return false;
    const allowedRoles = PERMISSIONS[permission] || [];
    return allowedRoles.includes(this.user.role);
  }

  isOwner(resourceUserId) {
    if (!this.user) return false;
    return this.user.id === resourceUserId || this.user.role === 'ADMIN';
  }

  _redirectByRole() {
    if (!this.user) return;

    const redirects = {
      'CLIENT': '#servicios',
      'BUSINESS': '#mis-servicios',
      'ADMIN': '#admin'
    };

    const hash = redirects[this.user.role] || '#';
    window.location.hash = hash;
  }

  _dispatchEvent(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

// Crear instancia global
const sessionManager = new SessionManager();

export default sessionManager;