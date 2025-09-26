import { describe, it, expect, beforeEach, vi } from 'vitest'
import sessionManager from '../js/session.js'

describe('SessionManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should save and retrieve user session', () => {
    const token = 'test-token-123'
    const user = { id: 1, email: 'test@test.com', role: 'CLIENT' }
    
    sessionManager.saveSession(token, user)
    
    expect(localStorage.setItem).toHaveBeenCalledWith('turnex-token', token)
    expect(localStorage.setItem).toHaveBeenCalledWith('turnex-user', JSON.stringify(user))
  })

  it('should check if user is authenticated', () => {
    localStorage.getItem.mockReturnValue('test-token')
    expect(sessionManager.isAuthenticated()).toBe(true)
    
    localStorage.getItem.mockReturnValue(null)
    expect(sessionManager.isAuthenticated()).toBe(false)
  })

  it('should check user role correctly', () => {
    const user = { role: 'BUSINESS' }
    localStorage.getItem.mockReturnValue(JSON.stringify(user))
    
    expect(sessionManager.hasRole('BUSINESS')).toBe(true)
    expect(sessionManager.hasRole('CLIENT')).toBe(false)
  })

  it('should clear session on logout', () => {
    sessionManager.logout()
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('turnex-token')
    expect(localStorage.removeItem).toHaveBeenCalledWith('turnex-user')
  })
})
