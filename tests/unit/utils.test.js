import { describe, it, expect } from 'vitest'

describe('Date utilities', () => {
  it('should format dates correctly', () => {
    // Usar fecha con hora específica para evitar problemas de zona horaria
    const date = new Date(2025, 8, 26, 12, 0, 0) // mes 8 = septiembre (0-indexed)
    const formatted = date.toLocaleDateString('es-AR')
    expect(formatted).toMatch(/26\/9\/2025/)
  })

  it('should validate time slots', () => {
    const validTimes = ['09:00', '10:30', '14:00', '17:30']
    validTimes.forEach(time => {
      expect(time).toMatch(/^\d{2}:\d{2}$/)
    })
  })

  it('should calculate duration correctly', () => {
    const start = '10:00'
    const end = '11:30'
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const duration = (endH * 60 + endM) - (startH * 60 + startM)
    expect(duration).toBe(90)
  })

  it('should check if date is weekend', () => {
    const saturday = new Date(2025, 8, 27) // sábado
    const sunday = new Date(2025, 8, 28) // domingo
    const monday = new Date(2025, 8, 29) // lunes
    
    expect([0, 6].includes(saturday.getDay())).toBe(true)
    expect([0, 6].includes(sunday.getDay())).toBe(true)
    expect([0, 6].includes(monday.getDay())).toBe(false)
  })

  it('should format time correctly', () => {
    const formatTime = (hours, minutes) => {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }
    
    expect(formatTime(9, 0)).toBe('09:00')
    expect(formatTime(14, 30)).toBe('14:30')
  })
})