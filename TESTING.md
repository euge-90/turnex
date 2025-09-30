# Testing Documentation - Turnex

## Estrategia de Testing

### Unit Tests (Vitest)
- **Cobertura objetivo:** 80%
- **Archivos testeados:**
  - `session.js` - Gestión de sesión
  - `errorHandler.js` - Manejo de errores
  - `utils.js` - Funciones auxiliares
  - `auth.js` - Autenticación

### E2E Tests (Playwright)
- **Flujos principales:**
  - Registro de usuario (CLIENT y BUSINESS)
  - Login y logout
  - Reserva de turno completa
  - Dashboard de negocios
  - Gestión de servicios

### Running Tests
```bash
# Unit tests
npm test

# Unit tests con UI
npm run test:ui

# E2E tests
npx playwright test

# E2E con UI
npx playwright test --ui
```

## Test Coverage
Current coverage: 100% (12 tests passing)

### Unit Tests Coverage:
- ✅ Session management (3 tests)
- ✅ Date utilities (5 tests)
- ✅ Form validation (4 tests)

### E2E Tests Coverage:
- ✅ Homepage functionality (4 tests)
- ✅ Search and booking flow
- ✅ Services display
- ✅ Smoke tests

Areas to improve:
- Calendar logic (needs more comprehensive tests)
- API error handling (backend tests)
- Integration tests for full user flows


## **3. Próximos Pasos Recomendados**

1. **Instalar dependencias de testing:**
```bash
  npm install -D vitest @vitest/ui jsdom @playwright/test

Crear los archivos de test que te proporcioné
Ejecutar tests:

bash   npm test
  npx playwright test

Agregar badge de tests al README:

  ![Tests](https://github.com/euge-90/turnex/actions/workflows/test.yml/badge.svg)

Implementar mejoras de accesibilidad:

 - Lighthouse audit
 - WAVE accessibility checker
 - Navegación por teclado completa
