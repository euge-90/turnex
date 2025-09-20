import { apiLogin, apiSignup, getSession as apiGetSession, clearSession as apiClearSession } from './api.js';

// Session helpers relying solely on API's localStorage management
export function getSession(){ return apiGetSession(); }
export function isLogged(){ return !!getSession(); }
export function isAdmin(){ return getSession()?.role === 'admin'; }

export async function signup(email, password, extras={}, options={}){
  const { user, token } = await apiSignup({ email, password, ...(extras||{}), ...(options||{}) });
  return { email: user.email, role: user.role, token };
}

export async function login(email, password, options={}){
  const { user, token } = await apiLogin({ email, password, ...(options||{}) });
  return { email: user.email, role: user.role, token };
}

export function logout(){ apiClearSession(); }

(function initAuthBootstrap() {
  const start = () => {
    const isLocalhost = /^(localhost|127\.0\.0\.1)/.test(location.hostname);
    const metaApi = document.querySelector('meta[name="api-base"]');
    let API_BASE = (window.API_BASE || (metaApi ? metaApi.content : '') || '').trim();
    if (!isLocalhost && /^http:\/\/localhost/.test(API_BASE)) API_BASE = 'https://turnex-api.onrender.com/api';

    const $authModal = document.getElementById('authModal');
    if (!$authModal) return;

    let defaultMode = 'login'; // NUEVO: modo por defecto al abrir
    const modeButtons = $authModal.querySelectorAll('[data-auth-mode]');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

    modeButtons.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.authMode)));
    function setMode(mode) {
      $authModal.querySelectorAll('.btn-switch').forEach(b => b.classList.toggle('active', b.dataset.authMode === mode));
      $authModal.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('d-none', f.dataset.mode !== mode));
      const label = $authModal.querySelector('#authModalLabel');
      if (label) label.textContent = mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión';
      // NUEVO: foco al primer input del modo activo
      const firstInput = $authModal.querySelector(`form[data-mode="${mode}"] input.form-control`);
      firstInput?.focus();
    }

    $authModal.querySelectorAll('[data-toggle-password]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-toggle-password');
        const input = document.getElementById(id);
        if (!input) return;
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) { icon.classList.toggle('bi-eye-slash', isPwd); icon.classList.toggle('bi-eye', !isPwd); }
      });
    });

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Login no requiere nombre ni teléfono; solo email y password
  const passStrong = (v) => v.length >= 9 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v);

    function findFeedback(input) {
      return input.parentElement.querySelector('.invalid-feedback')
        || input.closest('.mb-1, .mb-2, .mb-3, .mb-4, .mb-5')?.querySelector('.invalid-feedback')
        || input.closest('.form-group')?.querySelector('.invalid-feedback');
    }
    function markValid(input, valid, message) {
      input.classList.toggle('is-invalid', !valid);
      input.classList.toggle('is-valid', valid);
      const fb = findFeedback(input);
      if (fb && message) fb.textContent = message;
      if (fb) fb.style.visibility = valid ? 'hidden' : 'visible';
    }

    // Login realtime (solo email y password)
    loginForm?.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'loginEmail') markValid(t, emailRe.test(t.value), 'Ingresá un email válido.');
      if (t.id === 'loginPassword') markValid(t, (t.value || '').length >= 9, 'Mínimo 9 caracteres.');
    });

    // Signup realtime
    signupForm?.addEventListener('input', e => {
      const t = e.target;
      const pass1 = document.getElementById('signupPassword');
      const pass2 = document.getElementById('signupPassword2');
  if (t.id === 'signupName') markValid(t, fullNameOk((t.value || '').trim()), 'Ingresá nombre y apellido.');
      if (t.id === 'signupEmail') markValid(t, emailRe.test(t.value), 'Ingresá un email válido.');
      if (t.id === 'signupPhone') markValid(t, phoneRe.test(t.value), 'Ingresá un teléfono válido (mín. 8 dígitos).');
  if (t.id === 'signupPassword') { markValid(t, passStrong((t.value || '')), 'Debe tener 9+ caracteres, mayúscula, minúscula y número.'); if (pass2?.value) markValid(pass2, pass2.value === t.value, 'Las contraseñas no coinciden.'); }
      if (t.id === 'signupPassword2' && pass1) markValid(t, t.value === pass1.value, 'Las contraseñas no coinciden.');
    });

    function setLoading(btn, loading, text) {
      const sp = btn?.querySelector('.spinner-border'); if (sp) sp.classList.toggle('d-none', !loading);
      if (btn) btn.disabled = loading;
      if (btn && text) btn.lastChild.nodeValue = ` ${text}`;
    }
    async function postJSON(url, data) {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(data), credentials: 'include' });
      let payload = null; try { payload = await res.json(); } catch {}
      if (!res.ok) { const msg = payload?.message || payload?.error || res.statusText || 'Error al procesar la solicitud'; const err = new Error(msg); err.status = res.status; err.payload = payload; throw err; }
      return payload;
    }

  // Submit LOGIN (solo email y password)
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginForm.loginEmail.value.trim();
      const password = loginForm.loginPassword.value;

      const vEmail = emailRe.test(email);
    const vPass = password.length >= 9;

      markValid(loginForm.loginEmail, vEmail, 'Ingresá un email válido.');
    markValid(loginForm.loginPassword, vPass, 'Mínimo 9 caracteres.');

    if (!(vEmail && vPass)) return;

      const btn = document.getElementById('loginSubmitBtn');
      setLoading(btn, true, 'Ingresando...');
      try {
        const data = await postJSON(`${API_BASE}/auth/login`, { email, password });
        window.dispatchEvent(new CustomEvent('turnex:auth-success', { detail: { mode:'login', user: data.user } }));
        if (window.Swal) Swal.fire({ icon:'success', title:'¡Bienvenido!', text:'Ingreso exitoso', timer:1400, showConfirmButton:false });
        bootstrap.Modal.getOrCreateInstance($authModal).hide();
      } catch (err) {
        let text = err.message; if (err.status === 401) text = 'Credenciales inválidas.'; if (err.status === 429) text = 'Demasiados intentos.'; if (!navigator.onLine) text = 'Sin conexión.';
        if (window.Swal) Swal.fire({ icon:'error', title:'No se pudo ingresar', text });
      } finally { setLoading(btn, false, 'Ingresar'); }
    });

    // Submit SIGNUP (incluye teléfono)
    signupForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = signupForm.signupName.value.trim();
      const email = signupForm.signupEmail.value.trim();
      const phone = signupForm.signupPhone.value.trim();
      const password = signupForm.signupPassword.value;
      const password2 = signupForm.signupPassword2.value;

  const vName = fullNameOk(name);
      const vEmail = emailRe.test(email);
      const vPhone = phoneRe.test(phone);
  const vPass1 = passStrong(password);
      const vPass2 = password2 === password;

  markValid(signupForm.signupName, vName, 'Ingresá nombre y apellido.');
      markValid(signupForm.signupEmail, vEmail, 'Ingresá un email válido.');
      markValid(signupForm.signupPhone, vPhone, 'Ingresá un teléfono válido (mín. 8 dígitos).');
  markValid(signupForm.signupPassword, vPass1, 'Debe tener 9+ caracteres, mayúscula, minúscula y número.');
      markValid(signupForm.signupPassword2, vPass2, 'Las contraseñas no coinciden.');

      if (!(vName && vEmail && vPhone && vPass1 && vPass2)) return;

      const btn = document.getElementById('signupSubmitBtn');
      setLoading(btn, true, 'Creando...');
      try {
        const data = await postJSON(`${API_BASE}/auth/signup`, { name, email, phone, password });
        window.dispatchEvent(new CustomEvent('turnex:auth-success', { detail: { mode:'signup', user: data.user } }));
        if (window.Swal) Swal.fire({ icon:'success', title:'Cuenta creada', text:'Ya podés iniciar sesión', timer:1600, showConfirmButton:false });
        bootstrap.Modal.getOrCreateInstance($authModal).hide();
        setMode('login');
      } catch (err) {
        let text = err.message; if (err.status === 409) text = 'Ese email ya está registrado.'; if (err.status === 400) text = 'Datos inválidos.'; if (!navigator.onLine) text = 'Sin conexión.';
        if (window.Swal) Swal.fire({ icon:'error', title:'No se pudo crear la cuenta', text });
      } finally { setLoading(btn, false, 'Crear cuenta'); }
    });

    // NUEVO: abrir modal con modo elegido desde cualquier botón/link
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-auth-open]');
      if (!trigger) return;
      e.preventDefault();
      defaultMode = trigger.getAttribute('data-auth-open') || 'login'; // 'login' | 'signup'
      const modal = bootstrap.Modal.getOrCreateInstance($authModal);
      setMode(defaultMode);
      modal.show();
    });

    // Abrir modal usando el modo por defecto elegido (no forzar siempre login)
    $authModal.addEventListener('show.bs.modal', () => setMode(defaultMode || 'login'));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
