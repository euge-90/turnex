import { isLogged, login, signup, logout } from './auth.js'

// AuthTurnex: Gestiona modal, validaciones, remember me, loading states y feedback
export class AuthTurnex {
  constructor ({
    modalSelector = '#authModal',
    formSelector = '#authForm',
    toggleBtn = '#btnToggleAuth',
    submitBtn = '#btnDoLogin',
    signupBtn = '#btnSignup',
    loginBtn = '#btnLogin',
    logoutBtn = '#btnLogout',
    onSuccess = () => {}
  } = {}) {
    this.modalEl = document.querySelector(modalSelector)
    this.formEl = document.querySelector(formSelector)
    this.btnToggle = document.querySelector(toggleBtn)
    this.btnSubmit = document.querySelector(submitBtn)
    this.btnSignup = document.querySelector(signupBtn)
    this.btnLogin = document.querySelector(loginBtn)
    this.btnLogout = document.querySelector(logoutBtn)
    this.onSuccess = onSuccess
    this.isSignup = false
    this.bootstrapModal = this.modalEl ? new bootstrap.Modal(this.modalEl) : null
    this.cacheFields()
    this.wireEvents()
    this.setSessionUI()
  }

  cacheFields () {
    // Core fields
    this.fEmail = document.getElementById('email')
    this.fPassword = document.getElementById('password')
    this.fPassword2 = document.getElementById('password2')
    // Extended fields
    this.fName = document.getElementById('fullName')
    this.fPhone = document.getElementById('phone')
    // Remember me
    this.fRemember = document.getElementById('rememberMe')
    // Modal title
    this.titleEl = this.modalEl?.querySelector('.modal-title')
    // Strength meter
    this.pwdBar = document.getElementById('pwdStrengthBar')
    this.pwdLabel = document.getElementById('pwdStrengthLabel')
  }

  wireEvents () {
    if (this.btnLogin) this.btnLogin.addEventListener('click', () => { this.isSignup = false; this.updateUI(); this.open() })
    if (this.btnSignup) this.btnSignup.addEventListener('click', () => { this.isSignup = true; this.updateUI(); this.open() })
    if (this.btnToggle) this.btnToggle.addEventListener('click', () => { this.isSignup = !this.isSignup; this.updateUI() })
    if (this.btnLogout) this.btnLogout.addEventListener('click', () => { logout(); this.setSessionUI(); this.onSuccess('logout') })

    if (this.formEl) {
      this.formEl.addEventListener('submit', (e) => { e.preventDefault(); this.handleSubmit() })
      this.formEl.addEventListener('input', () => { this.btnSubmit?.toggleAttribute('disabled', !this.formEl.checkValidity()) })
    }
    if (this.fPassword) {
      this.fPassword.addEventListener('input', () => this.updateStrength())
    }
    if (this.fPassword2) {
      this.fPassword2.addEventListener('input', () => this.validatePasswords())
    }
  }

  open () { this.bootstrapModal?.show() }
  close () { this.bootstrapModal?.hide() }

  setSessionUI () {
    const logged = isLogged()
    if (this.btnLogin) this.btnLogin.classList.toggle('d-none', logged)
    if (this.btnSignup) this.btnSignup.classList.toggle('d-none', logged)
    if (this.btnLogout) this.btnLogout.classList.toggle('d-none', !logged)
  }

  updateUI () {
    if (this.titleEl) this.titleEl.textContent = this.isSignup ? 'Crear cuenta' : 'Ingresar'
    if (this.btnToggle) this.btnToggle.textContent = this.isSignup ? 'Ya tengo cuenta' : 'Crear cuenta'
    if (this.btnSubmit) {
      const label = this.btnSubmit.querySelector('.btn-label')
      if (label) label.textContent = this.isSignup ? 'Crear cuenta' : 'Ingresar'
    }
    // Toggle extra fields
    const rows = this.modalEl?.querySelectorAll('[data-auth-extra]')
    rows?.forEach(r => r.classList.toggle('d-none', !this.isSignup))
    // Remember me visible on login
    const rememberRow = this.modalEl?.querySelector('[data-auth-remember]')
    if (rememberRow) rememberRow.classList.toggle('d-none', this.isSignup)
    // Required attributes depending on mode
    if (this.fName) this.fName.toggleAttribute('required', this.isSignup)
    if (this.fPassword2) this.fPassword2.toggleAttribute('required', this.isSignup)
    // Reset strength UI when toggling
    this.updateStrength()
    this.validatePasswords(true)
    // Re-evaluate form validity to enable/disable submit
    if (this.formEl && this.btnSubmit) {
      this.btnSubmit.toggleAttribute('disabled', !this.formEl.checkValidity())
    }
  }

  setLoading (loading) {
    if (!this.btnSubmit) return
    this.btnSubmit.disabled = loading
    const spinner = this.btnSubmit.querySelector('.spinner-border')
    if (spinner) spinner.classList.toggle('d-none', !loading)
  }

  async handleSubmit () {
    if (!this.formEl?.checkValidity()) { this.formEl.reportValidity(); return }
    const email = (this.fEmail?.value || '').trim()
    const password = (this.fPassword?.value || '').trim()
    const password2 = (this.fPassword2?.value || '').trim()
    const name = (this.fName?.value || '').trim()
    const phone = (this.fPhone?.value || '').trim()
    const remember = !!(this.fRemember?.checked)

    try {
      this.setLoading(true)
      if (this.isSignup) {
        if (name.length < 2) { Swal.fire('Datos inválidos', 'Ingresá tu nombre (mínimo 2 caracteres)', 'info'); return }
        if (!this.validateEmail(email)) { Swal.fire('Datos inválidos', 'Ingresá un email válido', 'info'); return }
        if (password.length < 6) { Swal.fire('Datos inválidos', 'Contraseña mínima 6 caracteres', 'info'); return }
        if (password !== password2) { Swal.fire('Datos inválidos', 'Las contraseñas no coinciden', 'info'); return }
        await signup(email, password, { name, phone }, { remember })
        Swal.fire('¡Cuenta creada!', 'Ya podés reservar turnos', 'success')
      } else {
        await login(email, password, { remember })
        Swal.fire('¡Listo!', 'Sesión iniciada', 'success')
      }
      this.close()
      this.setSessionUI()
      this.onSuccess('login')
    } catch (err) {
      const msg = (err && err.message) ? err.message : 'Ocurrió un error'
      const pretty =
        /already/i.test(msg)
          ? 'El email ya está registrado'
          : /invalid/i.test(msg)
            ? 'Credenciales inválidas'
            : /(failed|network|fetch|cors|blocked)/i.test(msg)
              ? 'No se pudo conectar con el servidor. Verificá tu conexión o intentá más tarde.'
              : msg
      Swal.fire('Error', pretty, 'error')
    } finally { this.setLoading(false) }
  }

  validateEmail (email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }

  validatePasswords (reset = false) {
    if (!this.isSignup) {
      this.fPassword2?.setCustomValidity('')
      return
    }
    if (!this.fPassword2) return
    const p1 = this.fPassword?.value || ''
    const p2 = this.fPassword2.value || ''
    if (reset && !p2) { this.fPassword2.setCustomValidity(''); return }
    const match = p1 === p2 && p2.length >= 6
    this.fPassword2.setCustomValidity(match ? '' : 'Las contraseñas no coinciden')
  }

  updateStrength () {
    const containerExtras = this.modalEl?.querySelectorAll('[data-auth-extra]')
    const show = this.isSignup
    containerExtras?.forEach(r => r.classList.toggle('d-none', !show))
    if (!show) return // only display in signup mode
    const pwd = (this.fPassword?.value || '')
    const score = this.scorePassword(pwd)
    const pct = Math.min(100, Math.max(0, Math.round(score * 20)))
    if (this.pwdBar) {
      this.pwdBar.style.width = pct + '%'
      this.pwdBar.className = 'progress-bar ' + (pct < 40 ? 'bg-danger' : pct < 70 ? 'bg-warning' : 'bg-success')
    }
    if (this.pwdLabel) {
      this.pwdLabel.textContent = pct < 40 ? 'Débil' : pct < 70 ? 'Media' : 'Fuerte'
      this.pwdLabel.className = 'small ' + (pct < 40 ? 'text-danger' : pct < 70 ? 'text-warning' : 'text-success')
    }
  }

  scorePassword (p) {
    if (!p) return 0
    let s = 0
    if (p.length >= 6) s++
    if (p.length >= 10) s++
    if (/[A-Z]/.test(p)) s++
    if (/[a-z]/.test(p)) s++
    if (/\d/.test(p)) s++
    if (/[^A-Za-z0-9]/.test(p)) s++
    return Math.min(5, s)
  }
}
