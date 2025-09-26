import { vi } from 'vitest'

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock window.location
try { delete window.location } catch(e) {}
window.location = { href: '', reload: vi.fn() }

// Mock fetch
global.fetch = vi.fn()

// Mock Swal
global.Swal = {
  fire: vi.fn().mockResolvedValue({ isConfirmed: false })
}
import { vi } from 'vitest'

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock fetch
global.fetch = vi.fn()
