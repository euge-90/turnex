// validation.js - Sistema de validación SIMPLIFICADO

const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Ingresá un email válido (ejemplo@mail.com)'
  },
  password: {
    minLength: 8,
    message: 'Mínimo 8 caracteres'
  },
  phone: {
    pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{4,}$/,
    minLength: 8,
    message: 'Ingresá un teléfono válido (mín. 8 dígitos)'
  },
  name: {
    minLength: 3,
    pattern: /^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/,
    message: 'Ingresá tu nombre completo (solo letras)'
  }
};

// Mostrar feedback
function showFieldFeedback(input, isValid, message = '') {
  let container = input.parentElement;
  if (container.classList.contains('password-wrap')) {
    container = container.parentElement;
  }
  
  let feedback = container.querySelector('.invalid-feedback');
  
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    container.appendChild(feedback);
  }
  
  input.classList.remove('is-valid', 'is-invalid');
  
  if (isValid === null) {
    feedback.style.display = 'none';
    return;
  }
  
  if (isValid) {
    input.classList.add('is-valid');
    feedback.style.display = 'none';
  } else {
    input.classList.add('is-invalid');
    feedback.textContent = message;
    feedback.style.display = 'block';
  }
}

// Validaciones
function validateEmail(email) {
  if (!email || email.trim() === '') return { valid: null, message: '' };
  const isValid = VALIDATION_RULES.email.pattern.test(email);
  return { valid: isValid, message: isValid ? '' : VALIDATION_RULES.email.message };
}

function validatePassword(password) {
  if (!password || password.trim() === '') return { valid: null, message: '' };
  const isValid = password.length >= VALIDATION_RULES.password.minLength;
  return { valid: isValid, message: isValid ? '' : VALIDATION_RULES.password.message };
}

function validatePhone(phone) {
  if (!phone || phone.trim() === '') return { valid: null, message: '' };
  const digitsOnly = phone.replace(/[\s\-()]/g, '');
  const isValid = digitsOnly.length >= VALIDATION_RULES.phone.minLength && VALIDATION_RULES.phone.pattern.test(phone);
  return { valid: isValid, message: isValid ? '' : VALIDATION_RULES.phone.message };
}

function validateName(name) {
  if (!name || name.trim() === '') return { valid: null, message: '' };
  const trimmedName = name.trim();
  if (trimmedName.length < VALIDATION_RULES.name.minLength) {
    return { valid: false, message: 'El nombre debe tener al menos 3 caracteres' };
  }
  if (!VALIDATION_RULES.name.pattern.test(trimmedName)) {
    return { valid: false, message: VALIDATION_RULES.name.message };
  }
  return { valid: true, message: '' };
}

function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword || confirmPassword.trim() === '') return { valid: null, message: '' };
  const isValid = password === confirmPassword;
  return { valid: isValid, message: isValid ? '' : 'Las contraseñas no coinciden' };
}

// Toggle password
function setupPasswordToggle(buttonSelector, inputId) {
  const buttons = document.querySelectorAll(buttonSelector);
  
  buttons.forEach(button => {
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const input = document.getElementById(inputId);
      const icon = this.querySelector('i');
      
      if (input && icon) {
        if (input.type === 'password') {
          input.type = 'text';
          icon.className = 'bi bi-eye-slash';
        } else {
          input.type = 'password';
          icon.className = 'bi bi-eye';
        }
      }
    });
  });
}

// Setup validación de campo
function setupFieldValidation(inputId, validationFn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  const newInput = input.cloneNode(true);
  input.parentNode.replaceChild(newInput, input);
  
  newInput.addEventListener('input', function() {
    const result = validationFn(this.value);
    showFieldFeedback(this, result.valid, result.message);
  });
  
  newInput.addEventListener('blur', function() {
    if (this.value.trim() !== '') {
      const result = validationFn(this.value);
      showFieldFeedback(this, result.valid, result.message);
    }
  });
}

// Init Login
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  
  setupFieldValidation('loginEmail', validateEmail);
  setupFieldValidation('loginPassword', validatePassword);
  setupPasswordToggle('[data-toggle-password="loginPassword"]', 'loginPassword');
  
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  newForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    const emailResult = validateEmail(emailInput.value);
    const passwordResult = validatePassword(passwordInput.value);
    
    showFieldFeedback(emailInput, emailResult.valid, emailResult.message);
    showFieldFeedback(passwordInput, passwordResult.valid, passwordResult.message);
    
    if (emailResult.valid && passwordResult.valid) {
      console.log('Login válido');
    }
  });
}

// Init Signup
function initSignupForm() {
  const form = document.getElementById('signupForm');
  if (!form) return;
  
  setupFieldValidation('signupName', validateName);
  setupFieldValidation('signupEmail', validateEmail);
  setupFieldValidation('signupPhone', validatePhone);
  setupFieldValidation('signupPassword', validatePassword);
  
  const passwordInput = document.getElementById('signupPassword');
  const password2Input = document.getElementById('signupPassword2');
  
  if (password2Input) {
    const newPassword2 = password2Input.cloneNode(true);
    password2Input.parentNode.replaceChild(newPassword2, password2Input);
    
    newPassword2.addEventListener('input', function() {
      const pass1 = document.getElementById('signupPassword');
      const result = validatePasswordMatch(pass1.value, this.value);
      showFieldFeedback(this, result.valid, result.message);
    });
    
    newPassword2.addEventListener('blur', function() {
      if (this.value.trim() !== '') {
        const pass1 = document.getElementById('signupPassword');
        const result = validatePasswordMatch(pass1.value, this.value);
        showFieldFeedback(this, result.valid, result.message);
      }
    });
  }
  
  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      const pass2 = document.getElementById('signupPassword2');
      if (pass2 && pass2.value.trim() !== '') {
        const result = validatePasswordMatch(this.value, pass2.value);
        showFieldFeedback(pass2, result.valid, result.message);
      }
    });
  }
  
  setupPasswordToggle('[data-toggle-password="signupPassword"]', 'signupPassword');
  setupPasswordToggle('[data-toggle-password="signupPassword2"]', 'signupPassword2');
  
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);
  
  newForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const phoneInput = document.getElementById('signupPhone');
    const pass1 = document.getElementById('signupPassword');
    const pass2 = document.getElementById('signupPassword2');
    
    const nameResult = validateName(nameInput.value);
    const emailResult = validateEmail(emailInput.value);
    const phoneResult = validatePhone(phoneInput.value);
    const passwordResult = validatePassword(pass1.value);
    const password2Result = validatePasswordMatch(pass1.value, pass2.value);
    
    showFieldFeedback(nameInput, nameResult.valid, nameResult.message);
    showFieldFeedback(emailInput, emailResult.valid, emailResult.message);
    showFieldFeedback(phoneInput, phoneResult.valid, phoneResult.message);
    showFieldFeedback(pass1, passwordResult.valid, passwordResult.message);
    showFieldFeedback(pass2, password2Result.valid, password2Result.message);
    
    if (nameResult.valid && emailResult.valid && phoneResult.valid && 
        passwordResult.valid && password2Result.valid) {
      console.log('Signup válido');
    }
  });
}

// Clear validations
function clearValidations() {
  document.querySelectorAll('.form-control').forEach(input => {
    input.classList.remove('is-valid', 'is-invalid');
  });
  document.querySelectorAll('.invalid-feedback').forEach(fb => {
    fb.style.display = 'none';
  });
}

// Initialize
let initialized = false;

document.addEventListener('DOMContentLoaded', function() {
  if (!initialized) {
    initLoginForm();
    initSignupForm();
    initialized = true;
  }
  
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.addEventListener('shown.bs.modal', function() {
      setTimeout(() => {
        initLoginForm();
        initSignupForm();
      }, 100);
    });
    
    authModal.addEventListener('hidden.bs.modal', clearValidations);
  }
});
  phone: {
    pattern: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{4,}$/,
    minLength: 8,
    message: 'Ingresá un teléfono válido (mín. 8 dígitos)'
  },
  name: {
    minLength: 3,
    pattern: /^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/,
    message: 'Ingresá tu nombre completo (solo letras)'
  }
};

// Mostrar feedback de validación
function showFieldFeedback(input, isValid, message = '') {
  // Encontrar el contenedor padre
  let container = input.parentElement;
  if (container.classList.contains('password-wrap')) {
    container = container.parentElement;
  }
  
  // Buscar feedback existente
  let feedback = container.querySelector('.invalid-feedback');
  
  // Crear si no existe
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.className = 'invalid-feedback';
    container.appendChild(feedback);
  }
  
  // Limpiar clases
  input.classList.remove('is-valid', 'is-invalid');
  
  if (isValid === null) {
    feedback.style.display = 'none';
    return;
  }
  
  if (isValid) {
    input.classList.add('is-valid');
    feedback.style.display = 'none';
  } else {
    input.classList.add('is-invalid');
    feedback.textContent = message;
    feedback.style.display = 'block';
  }
}

// Validaciones
function validateEmail(email) {
  if (!email || email.trim() === '') return { valid: null, message: '' };
  const isValid = VALIDATION_RULES.email.pattern.test(email);
  return { valid: isValid, message: isValid ? '' : VALIDATION_RULES.email.message };
}

function validatePassword(password) {
  if (!password || password.trim() === '') return { valid: null, message: '' };
  const isValid = password.length >= VALIDATION_RULES.password.minLength;
  return { valid: isValid, message: isValid ? '' : VALIDATION_RULES.password.message };
}

function validatePhone(phone) {
  if (!phone || phone.trim() === '') return { valid: null, message: '' };
  const digitsOnly = phone.replace(/[\s\-()]/g, '');
  const isValid = digitsOnly.length >= VALIDATION_RULES.phone.minLength && VALIDATION_RULES.phone.pattern.test(phone);
  return { valid: isValid, message: isValid ? '' : VALIDATION_RULES.phone.message };
}

function validateName(name) {
  if (!name || name.trim() === '') return { valid: null, message: '' };
  const trimmedName = name.trim();
  if (trimmedName.length < VALIDATION_RULES.name.minLength) {
    return { valid: false, message: 'El nombre debe tener al menos 3 caracteres' };
  }
  if (!VALIDATION_RULES.name.pattern.test(trimmedName)) {
    return { valid: false, message: VALIDATION_RULES.name.message };
  }
  return { valid: true, message: '' };
}

function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword || confirmPassword.trim() === '') return { valid: null, message: '' };
  const isValid = password === confirmPassword;
  return { valid: isValid, message: isValid ? '' : 'Las contraseñas no coinciden' };
}

// Toggle password visibility
function setupPasswordToggle(buttonSelector, inputId) {
  const button = document.querySelector(buttonSelector);
  const input = document.getElementById(inputId);
  
  if (button && input) {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const icon = this.querySelector('i');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'bi bi-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'bi bi-eye';
      }
    });
  }
}

// Setup field validation
function setupFieldValidation(inputId, validationFn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  input.addEventListener('input', function() {
    const result = validationFn(this.value);
    showFieldFeedback(this, result.valid, result.message);
  });
  
  input.addEventListener('blur', function() {
    if (this.value.trim() !== '') {
      const result = validationFn(this.value);
      showFieldFeedback(this, result.valid, result.message);
    }
  });
}

// Init Login Form
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  
  // Setup validations
  setupFieldValidation('loginEmail', validateEmail);
  setupFieldValidation('loginPassword', validatePassword);
  
  // Setup password toggle
  setupPasswordToggle('[data-toggle-password="loginPassword"]', 'loginPassword');
  
  // Submit
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    const emailResult = validateEmail(emailInput.value);
    const passwordResult = validatePassword(passwordInput.value);
    
    showFieldFeedback(emailInput, emailResult.valid, emailResult.message);
    showFieldFeedback(passwordInput, passwordResult.valid, passwordResult.message);
    
    if (emailResult.valid && passwordResult.valid) {
      console.log('Login válido');
      // Aquí iría tu lógica de login
    }
  });
}

// Init Signup Form
function initSignupForm() {
  const form = document.getElementById('signupForm');
  if (!form) return;
  
  const passwordInput = document.getElementById('signupPassword');
  const password2Input = document.getElementById('signupPassword2');
  
  // Setup validations
  setupFieldValidation('signupName', validateName);
  setupFieldValidation('signupEmail', validateEmail);
  setupFieldValidation('signupPhone', validatePhone);
  setupFieldValidation('signupPassword', validatePassword);
  
  // Password confirmation
  if (password2Input) {
    password2Input.addEventListener('input', function() {
      const result = validatePasswordMatch(passwordInput.value, this.value);
      showFieldFeedback(this, result.valid, result.message);
    });
    
    password2Input.addEventListener('blur', function() {
      if (this.value.trim() !== '') {
        const result = validatePasswordMatch(passwordInput.value, this.value);
        showFieldFeedback(this, result.valid, result.message);
      }
    });
  }
  
  // Re-validate confirmation when main password changes
  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      if (password2Input && password2Input.value.trim() !== '') {
        const result = validatePasswordMatch(this.value, password2Input.value);
        showFieldFeedback(password2Input, result.valid, result.message);
      }
    });
  }
  
  // Setup password toggles
  setupPasswordToggle('[data-toggle-password="signupPassword"]', 'signupPassword');
  setupPasswordToggle('[data-toggle-password="signupPassword2"]', 'signupPassword2');
  
  // Submit
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const phoneInput = document.getElementById('signupPhone');
    
    const nameResult = validateName(nameInput.value);
    const emailResult = validateEmail(emailInput.value);
    const phoneResult = validatePhone(phoneInput.value);
    const passwordResult = validatePassword(passwordInput.value);
    const password2Result = validatePasswordMatch(passwordInput.value, password2Input.value);
    
    showFieldFeedback(nameInput, nameResult.valid, nameResult.message);
    showFieldFeedback(emailInput, emailResult.valid, emailResult.message);
    showFieldFeedback(phoneInput, phoneResult.valid, phoneResult.message);
    showFieldFeedback(passwordInput, passwordResult.valid, passwordResult.message);
    showFieldFeedback(password2Input, password2Result.valid, password2Result.message);
    
    if (nameResult.valid && emailResult.valid && phoneResult.valid && 
        passwordResult.valid && password2Result.valid) {
      console.log('Signup válido');
      // Aquí iría tu lógica de registro
    }
  });
}

// Clear validations
function clearValidations() {
  document.querySelectorAll('.form-control').forEach(input => {
    input.classList.remove('is-valid', 'is-invalid');
  });
  document.querySelectorAll('.invalid-feedback').forEach(fb => {
    fb.style.display = 'none';
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  initLoginForm();
  initSignupForm();
  
  const authModal = document.getElementById('authModal');
  if (authModal) {
    authModal.addEventListener('shown.bs.modal', function() {
      initLoginForm();
      initSignupForm();
    });
    
    authModal.addEventListener('hidden.bs.modal', clearValidations);
  }
});