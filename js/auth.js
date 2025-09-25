import { apiLogin, apiSignup, getSession as apiGetSession, clearSession as apiClearSession } from './api.js'

// Session helpers relying solely on API's localStorage management
export function getSession () { return apiGetSession() }
export function isLogged () { return !!getSession() }
export function isAdmin () { return getSession()?.role === 'admin' }

export async function signup (email, password, extras = {}, options = {}) {
  const { user, token } = await apiSignup({ email, password, ...(extras || {}), ...(options || {}) })
  return { email: user.email, role: user.role, token }
}

export async function login (email, password, options = {}) {
  const { user, token } = await apiLogin({ email, password, ...(options || {}) })
  return { email: user.email, role: user.role, token }
}

export function logout () { apiClearSession() }

// Small validation helpers used by the signup form
function fullNameOk (name) {
  if (!name) return false
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2 && parts.every(p => p.length >= 2)
}

const phoneRe = /^(?:\+?\d[\d\s().-]{6,}\d)$/
const passValid = (v) => v.length >= 8

;(function initAuthBootstrap () {
  const start = () => {
    const isLocalhost = /^(localhost|127\.0\.0\.1)/.test(location.hostname)
    const metaApi = document.querySelector('meta[name="api-base"]')
    let API_BASE = (window.API_BASE || (metaApi ? metaApi.content : '') || '').trim()
    if (!isLocalhost && /^http:\/\/localhost/.test(API_BASE)) API_BASE = 'https://turnex-api.onrender.com/api'

    const $authModal = document.getElementById('authModal')
    if (!$authModal) return

    let defaultMode = 'login'
    const modeButtons = $authModal.querySelectorAll('[data-auth-mode]')
    const loginForm = document.getElementById('loginForm')
    const signupForm = document.getElementById('signupForm')

    modeButtons.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.authMode)))
    function setMode (mode) {
      $authModal.querySelectorAll('.btn-switch').forEach(b => b.classList.toggle('active', b.dataset.authMode === mode))
      $authModal.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('d-none', f.dataset.mode !== mode))
      const label = $authModal.querySelector('#authModalLabel')
      if (label) label.textContent = mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'
      const firstInput = $authModal.querySelector(`form[data-mode="${mode}"] input.form-control`)
      firstInput?.focus()
    }

    // ✅ FIX: Botones de mostrar/ocultar contraseña
    $authModal.querySelectorAll('[data-toggle-password]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        const inputId = btn.getAttribute('data-toggle-password')
        const input = document.getElementById(inputId)
        
        if (!input) {
          console.warn('No se encontró el input con ID:', inputId)
          return
        }
        
        // Toggle del tipo de input
        const isPassword = input.type === 'password'
        input.type = isPassword ? 'text' : 'password'
        
        // Toggle del ícono
        const icon = btn.querySelector('i')
        if (icon) {
          if (isPassword) {
            // Mostrar contraseña: cambiar a ojo tachado
            icon.classList.remove('bi-eye')
            icon.classList.add('bi-eye-slash')
          } else {
            // Ocultar contraseña: cambiar a ojo normal
            icon.classList.remove('bi-eye-slash')
            icon.classList.add('bi-eye')
          }
        }
      })
    })

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    function findFeedback (input) {
      return input.parentElement.querySelector('.invalid-feedback') ||
        input.closest('.mb-1, .mb-2, .mb-3, .mb-4, .mb-5')?.querySelector('.invalid-feedback') ||
        input.closest('.form-group')?.querySelector('.invalid-feedback')
    }
    
    function markValid (input, valid, message) {
      input.classList.toggle('is-invalid', !valid)
      input.classList.toggle('is-valid', valid)
      const fb = findFeedback(input)
      if (fb && message) fb.textContent = message
      if (fb) fb.style.visibility = valid ? 'hidden' : 'visible'
    }

    // Función para mostrar/ocultar el cuadro de requisitos
    function showPasswordRequirements(input, show = true) {
      const helpId = input.id + '-help'
      let helpText = document.getElementById(helpId)
      
      if (show && !helpText) {
        helpText = document.createElement('div')
        helpText.id = helpId
        helpText.className = 'password-requirements mt-2 p-2 border rounded bg-light'
        helpText.innerHTML = `
          <small class="text-muted d-block mb-1">
            <strong>📋 Requisitos de la contraseña:</strong>
          </small>
          <small class="text-muted">
            ✓ Mínimo 8 caracteres
          </small>
        `
        const fb = findFeedback(input)
        if (fb && fb.parentElement === input.parentElement) {
          fb.insertAdjacentElement('afterend', helpText)
        } else {
          input.insertAdjacentElement('afterend', helpText)
        }
      }
      
      if (helpText) {
        helpText.style.display = show ? 'block' : 'none'
      }
    }

    function updatePasswordCounter(input, minLength = 8) {
      const currentLength = (input.value || '').length
      const fb = findFeedback(input)
      if (!fb) return
      
      if (currentLength === 0) {
        fb.textContent = `Mínimo ${minLength} caracteres.`
        fb.style.visibility = 'hidden'
      } else if (currentLength < minLength) {
        fb.textContent = `${currentLength}/${minLength} caracteres (faltan ${minLength - currentLength}).`
        fb.style.visibility = 'visible'
      } else {
        fb.textContent = '✓ Contraseña válida'
        fb.style.visibility = 'visible'
      }
    }

    // Login realtime
    loginForm?.addEventListener('input', e => {
      const t = e.target
      if (t.id === 'loginEmail') {
        markValid(t, emailRe.test(t.value), 'Ingresá un email válido.')
      }
      if (t.id === 'loginPassword') {
        const isValid = passValid(t.value)
        markValid(t, isValid, 'Mínimo 8 caracteres.')
        updatePasswordCounter(t, 8)
      }
    })

    // Mostrar requisitos al hacer focus en contraseña de login
    loginForm?.querySelector('#loginPassword')?.addEventListener('focus', function() {
      showPasswordRequirements(this, true)
    })
    
    loginForm?.querySelector('#loginPassword')?.addEventListener('blur', function() {
      showPasswordRequirements(this, false)
    })

    // Signup realtime
    signupForm?.addEventListener('input', e => {
      const t = e.target
      const pass1 = document.getElementById('signupPassword')
      const pass2 = document.getElementById('signupPassword2')
      
      if (t.id === 'signupName') {
        markValid(t, fullNameOk((t.value || '').trim()), 'Ingresá nombre y apellido.')
      }
      if (t.id === 'signupEmail') {
        markValid(t, emailRe.test(t.value), 'Ingresá un email válido.')
      }
      if (t.id === 'signupPhone') {
        markValid(t, phoneRe.test(t.value), 'Ingresá un teléfono válido (mín. 8 dígitos).')
      }
      if (t.id === 'signupPassword') {
        const isValid = passValid(t.value)
        markValid(t, isValid, 'Mínimo 8 caracteres.')
        updatePasswordCounter(t, 8)
        if (pass2?.value) {
          markValid(pass2, pass2.value === t.value, 'Las contraseñas no coinciden.')
        }
      }
      if (t.id === 'signupPassword2' && pass1) {
        markValid(t, t.value === pass1.value, 'Las contraseñas no coinciden.')
      }
    })

    // Mostrar requisitos al hacer focus en contraseña de signup
    signupForm?.querySelector('#signupPassword')?.addEventListener('focus', function() {
      showPasswordRequirements(this, true)
    })
    
    signupForm?.querySelector('#signupPassword')?.addEventListener('blur', function() {
      if (!this.value) {
        showPasswordRequirements(this, false)
      }
    })

    function setLoading (btn, loading, text) {
      const sp = btn?.querySelector('.spinner-border')
      if (sp) sp.classList.toggle('d-none', !loading)
      if (btn) btn.disabled = loading
      if (btn && text) btn.lastChild.nodeValue = ` ${text}`
    }

    // Submit LOGIN
    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = loginForm.loginEmail.value.trim()
      const password = loginForm.loginPassword.value
      const remember = !!document.getElementById('loginRemember')?.checked
      const inlineError = document.getElementById('loginInlineError')
      if (inlineError) { 
        inlineError.classList.add('d-none')
        inlineError.textContent = '' 
      }

      const vEmail = emailRe.test(email)
      const vPass = passValid(password)

      markValid(loginForm.loginEmail, vEmail, 'Ingresá un email válido.')
      markValid(loginForm.loginPassword, vPass, 'Mínimo 8 caracteres.')

      if (!(vEmail && vPass)) return

      const btn = document.getElementById('loginSubmitBtn')
      setLoading(btn, true, 'Ingresando...')
      try {
        const { user } = await apiLogin({ email, password, remember })
        window.dispatchEvent(new CustomEvent('turnex:auth-success', { detail: { mode: 'login', user } }))
        if (window.Swal) Swal.fire({ icon: 'success', title: '¡Bienvenido!', text: 'Ingreso exitoso', timer: 1400, showConfirmButton: false })
        if (window.txToast) window.txToast({ type: 'success', text: 'Sesión iniciada' })
        bootstrap.Modal.getOrCreateInstance($authModal).hide()
      } catch (err) {
        let text = err.message
        if (err.status === 401) text = 'Credenciales inválidas.'
        if (err.status === 429) text = 'Demasiados intentos.'
        if (!navigator.onLine) text = 'Sin conexión.'
        if (inlineError) { 
          inlineError.textContent = text
          inlineError.classList.remove('d-none') 
        } else if (window.Swal) {
          Swal.fire({ icon: 'error', title: 'No se pudo ingresar', text })
        }
      } finally { 
        setLoading(btn, false, 'Ingresar') 
      }
    })

    // Submit SIGNUP
    signupForm?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const name = signupForm.signupName.value.trim()
      const email = signupForm.signupEmail.value.trim()
      const phone = signupForm.signupPhone.value.trim()
      const password = signupForm.signupPassword.value
      const password2 = signupForm.signupPassword2.value

      const vName = fullNameOk(name)
      const vEmail = emailRe.test(email)
      const vPhone = phoneRe.test(phone)
      const vPass1 = passValid(password)
      const vPass2 = password2 === password

      markValid(signupForm.signupName, vName, 'Ingresá nombre y apellido.')
      markValid(signupForm.signupEmail, vEmail, 'Ingresá un email válido.')
      markValid(signupForm.signupPhone, vPhone, 'Ingresá un teléfono válido (mín. 8 dígitos).')
      markValid(signupForm.signupPassword, vPass1, 'Mínimo 8 caracteres.')
      markValid(signupForm.signupPassword2, vPass2, 'Las contraseñas no coinciden.')

      if (!(vName && vEmail && vPhone && vPass1 && vPass2)) return

      const btn = document.getElementById('signupSubmitBtn')
      setLoading(btn, true, 'Creando...')
      try {
        const { user } = await apiSignup({ name, email, phone, password })
        window.dispatchEvent(new CustomEvent('turnex:auth-success', { detail: { mode: 'signup', user } }))
        if (window.Swal) Swal.fire({ icon: 'success', title: 'Cuenta creada', text: 'Ya podés iniciar sesión', timer: 1600, showConfirmButton: false })
        if (window.txToast) window.txToast({ type: 'success', text: 'Cuenta creada' })
        bootstrap.Modal.getOrCreateInstance($authModal).hide()
        setMode('login')
      } catch (err) {
        let text = err.message
        if (err.status === 409) text = 'Ese email ya está registrado.'
        if (err.status === 400) text = 'Datos inválidos.'
        if (!navigator.onLine) text = 'Sin conexión.'
        const inline = document.getElementById('signupInlineError')
        if (inline) { 
          inline.textContent = text
          inline.classList.remove('d-none') 
        } else if (window.Swal) {
          Swal.fire({ icon: 'error', title: 'No se pudo crear la cuenta', text })
        }
      } finally { 
        setLoading(btn, false, 'Crear cuenta') 
      }
    })

    // Abrir modal con modo elegido desde cualquier botón/link
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-auth-open]')
      if (!trigger) return
      e.preventDefault()
      defaultMode = trigger.getAttribute('data-auth-open') || 'login'
      const modal = bootstrap.Modal.getOrCreateInstance($authModal)
      setMode(defaultMode)
      modal.show()
    })

    $authModal.addEventListener('show.bs.modal', () => setMode(defaultMode || 'login'))
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})()