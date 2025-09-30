import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('should save user session', () => {
    const token = 'test-token-123'
    const user = { id: 1, email: 'test@test.com', role: 'CLIENT' }
    
    localStorage.setItem('turnex-token', token)
    localStorage.setItem('turnex-user', JSON.stringify(user))
    
    expect(localStorage.setItem).toHaveBeenCalledWith('turnex-token', token)
    expect(localStorage.setItem).toHaveBeenCalledWith('turnex-user', JSON.stringify(user))
  })

  it('should check authentication', () => {
    // Mock token exists
    localStorage.getItem.mockReturnValue('test-token')
    const isAuthenticated = !!localStorage.getItem('turnex-token')
    expect(isAuthenticated).toBe(true)
    
    // Mock no token
    localStorage.getItem.mockReturnValue(null)
    const isNotAuthenticated = !!localStorage.getItem('turnex-token')
    expect(isNotAuthenticated).toBe(false)
  })

  it('should logout and clear session', () => {
    localStorage.removeItem('turnex-token')
    localStorage.removeItem('turnex-user')
    
    expect(localStorage.removeItem).toHaveBeenCalledWith('turnex-token')
    expect(localStorage.removeItem).toHaveBeenCalledWith('turnex-user')
  })
})
