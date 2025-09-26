import { describe, it, expect, vi } from 'vitest'
import ErrorHandler from '../js/errorHandler.js'

// Mock Swal
global.Swal = {
  fire: vi.fn().mockResolvedValue({ isConfirmed: false })
}

describe('ErrorHandler', () => {
  it('should handle network errors', () => {
    const error = new TypeError('Failed to fetch')
    ErrorHandler.handle(error, 'test')
    
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'error',
        title: 'Sin conexión'
      })
    )
  })

  it('should handle 401 auth errors', () => {
    const error = { status: 401 }
    ErrorHandler.handle(error, 'test')
    
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'warning',
        title: 'Sesión expirada'
      })
    )
  })

  it('should handle 404 not found errors', () => {
    const error = { status: 404 }
    ErrorHandler.handle(error, 'test')
    
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'info',
        title: 'No encontrado'
      })
    )
  })

  it('should handle validation errors', () => {
    const errors = {
      email: 'Email inválido',
      password: 'Contraseña muy corta'
    }
    
    ErrorHandler.showValidationError(errors)
    
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        icon: 'warning',
        title: 'Errores de validación'
      })
    )
  })
})
