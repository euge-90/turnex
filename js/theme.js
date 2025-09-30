/**
 * ThemeManager - Gestión de modo oscuro/claro
 */

class ThemeManager {
  constructor() {
    this.STORAGE_KEY = 'turnex-theme';
    this.init();
  }

  init() {
    // Detectar preferencia del sistema
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Obtener tema guardado o usar preferencia del sistema
    const savedTheme = localStorage.getItem(this.STORAGE_KEY);
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

    this.setTheme(initialTheme, false); // false = no guardar en localStorage de nuevo

    // Escuchar cambios en preferencia del sistema
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(this.STORAGE_KEY)) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });

    this._attachToggleListeners();
  }

  setTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);

    if (save) {
      localStorage.setItem(this.STORAGE_KEY, theme);
    }

    this._updateToggleButtons(theme);
    this._dispatchEvent('theme:changed', { theme });
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  _attachToggleListeners() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this._attachToggles());
    } else {
      this._attachToggles();
    }
  }

  _attachToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });
  }

  _updateToggleButtons(theme) {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      const icon = theme === 'dark' ? '☀️' : '🌙';
      const text = theme === 'dark' ? 'Modo claro' : 'Modo oscuro';

      // Si el botón tiene solo icono
      if (btn.textContent.trim().match(/^[🌙☀️]$/)) {
        btn.textContent = icon;
      }
      // Si tiene texto
      else if (btn.querySelector('.theme-text')) {
        btn.querySelector('.theme-text').textContent = text;
        if (btn.querySelector('.theme-icon')) {
          btn.querySelector('.theme-icon').textContent = icon;
        }
      }
      // Actualizar title
      btn.setAttribute('title', text);
    });
  }

  _dispatchEvent(eventName, detail = {}) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

// Crear instancia global
const themeManager = new ThemeManager();

export default themeManager;
