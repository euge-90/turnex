import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    include: ['tests/**/*.test.js'],
    exclude: ['tests/e2e/**', 'tests/playwright/**', 'server/tests/**']
  }
})
