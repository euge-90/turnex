import { describe, it, expect } from 'vitest'

describe('Form validation', () => {
  it('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    
    expect(emailRegex.test('test@example.com')).toBe(true)
    expect(emailRegex.test('invalid-email')).toBe(false)
    expect(emailRegex.test('test@')).toBe(false)
  })

  it('should validate phone numbers', () => {
    const phoneRegex = /^\d{10}$/
    
    expect(phoneRegex.test('1122334455')).toBe(true)
    expect(phoneRegex.test('112233')).toBe(false)
    expect(phoneRegex.test('abc1234567')).toBe(false)
  })

  it('should validate password strength', () => {
    const isValidPassword = (pwd) => pwd.length >= 8
    
    expect(isValidPassword('test1234')).toBe(true)
    expect(isValidPassword('short')).toBe(false)
  })

  it('should validate business name', () => {
    const isValidBusinessName = (name) => !!(name && name.trim().length >= 3)
    
    expect(isValidBusinessName('Peluquería Moderna')).toBe(true)
    expect(isValidBusinessName('AB')).toBe(false)
    expect(isValidBusinessName('')).toBe(false)
    expect(isValidBusinessName('   ')).toBe(false)
  })
})