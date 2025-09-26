// Sistema centralizado de manejo de errores

import sessionManager from './session.js'

export class ErrorHandler {
  static handle(error, context = '') {
    console.error(`[Error en ${context}]:`, error);
    try {
      if (!error) return this.showGenericError('Error desconocido')
      if (error.name === 'TypeError' && String(error.message).toLowerCase().includes('fetch')) {
        return this.showNetworkError()
      }
      if (error.status === 401) return this.showAuthError()
      if (error.status === 403) return this.showPermissionError()
      if (error.status === 404) return this.showNotFoundError()
      if (error.status >= 500) return this.showServerError()
      return this.showGenericError(error.message || String(error))
    } catch (e) {
      console.error('ErrorHandler failed', e)
      try { this.showGenericError('Ha ocurrido un error') } catch(_){}
    }
  }

  static showNetworkError() {
    return Swal.fire({ icon: 'error', title: 'Sin conexión', text: 'No se pudo conectar con el servidor. Verifica tu conexión a internet.', confirmButtonText: 'Reintentar', showCancelButton: true, cancelButtonText: 'Cancelar' }).then((result) => { if (result.isConfirmed) window.location.reload() })
  }

  static showAuthError() {
    // In test environments (jsdom) navigation is not implemented; only attempt logout
    return Swal.fire({ icon: 'warning', title: 'Sesión expirada', text: 'Tu sesión ha caducado. Por favor, inicia sesión nuevamente.', confirmButtonText: 'Iniciar sesión' }).then(() => {
      try { sessionManager.logout() } catch(_){}
      try { if (typeof window !== 'undefined' && window.location) window.location.href = 'index.html' } catch(_){}
    })
  }

  static showPermissionError() {
    return Swal.fire({ icon: 'error', title: 'Acceso denegado', text: 'No tienes permisos para realizar esta acción.' })
  }

  static showNotFoundError() {
    return Swal.fire({ icon: 'info', title: 'No encontrado', text: 'El recurso solicitado no existe.' })
  }

  static showServerError() {
    return Swal.fire({ icon: 'error', title: 'Error del servidor', text: 'Hubo un problema en el servidor. Intenta nuevamente más tarde.' })
  }

  static showGenericError(message) {
    return Swal.fire({ icon: 'error', title: 'Error', text: message || 'Ha ocurrido un error inesperado.' })
  }

  static showValidationError(errors) {
    const errorList = Object.entries(errors).map(([field, msg]) => `<li><strong>${field}:</strong> ${msg}</li>`).join('')
    return Swal.fire({ icon: 'warning', title: 'Errores de validación', html: `<ul class="text-start">${errorList}</ul>` })
  }
}

export default ErrorHandler;
