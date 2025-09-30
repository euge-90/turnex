# GUÍA DE TESTING MANUAL - TURNEX

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### 1. AUTENTICACIÓN (Con fallback localStorage)
- ✅ Login/Signup funciona SIN backend
- ✅ Sesión persiste en localStorage
- ✅ Cualquier email/contraseña crea usuario automáticamente

### 2. CRUD COMPLETO DE TURNOS
- ✅ Crear turno → Botón "Reservar Turno" en cada servicio
- ✅ Ver turnos → Botón "Mis reservas" (abajo a la derecha)
- ✅ Editar turno → Ícono lápiz en cada turno
- ✅ Eliminar turno → Ícono basura en cada turno

### 3. PERSISTENCIA 100% FUNCIONAL
- ✅ Todo se guarda en localStorage (key: `app_bookings_v1`)
- ✅ Los datos NO se pierden al recargar la página
- ✅ Funciona sin conexión a internet

---

## 📋 PASOS PARA PROBAR

### A. Preparar el ambiente
1. Abrir `index.html` con Live Server o cualquier servidor HTTP
2. Abrir DevTools (F12) → Pestaña "Application" → LocalStorage

### B. Probar Autenticación
1. Click en "Crear cuenta"
2. Completar formulario:
   - Nombre: Juan Pérez
   - Email: juan@test.com
   - Teléfono: 1234567890
   - Tipo de cuenta: Cliente
   - Contraseña: test1234
3. Click "Crear cuenta"
4. ✅ Debería ver: "Cuenta creada (modo local)"

### C. Crear un Turno
1. Scroll hasta "Nuestros Servicios"
2. Click en "Reservar Turno" en cualquier servicio (ej: "Corte y Peinado")
3. Seleccionar fecha y hora
4. Click "Confirmar Reserva"
5. ✅ Debería ver: Confirmación de turno reservado

### D. Ver Turnos
1. Click en el botón flotante "Mis reservas" (abajo a la derecha)
2. ✅ Debería ver lista de turnos con:
   - Nombre del servicio
   - Fecha y hora
   - Duración
   - Botones Editar/Eliminar

### E. Editar un Turno
1. En el modal "Mis Turnos Reservados"
2. Click en ícono de lápiz (Editar)
3. Cambiar fecha u hora
4. Click "Guardar"
5. ✅ Debería ver: "¡Actualizado! Tu turno fue modificado correctamente"

### F. Eliminar un Turno
1. Click en ícono de basura (Eliminar)
2. Confirmar "Sí, cancelar"
3. ✅ Debería ver: "¡Cancelado! Tu turno fue eliminado"

### G. Verificar Persistencia
1. Recargar la página (F5)
2. Click en "Mis reservas"
3. ✅ Los turnos deberían seguir ahí

---

## 🔍 VALIDACIÓN TÉCNICA

### LocalStorage debe contener:
```javascript
// Verificar en DevTools Console:
localStorage.getItem('app_bookings_v1')  // Turnos
localStorage.getItem('turnex-user')      // Usuario actual
localStorage.getItem('turnex-token')     // Token de sesión
localStorage.getItem('turnex-local-users') // Lista de usuarios
```

### Estructura de un turno:
```json
{
  "id": "uuid-generado",
  "email": "juan@test.com",
  "name": "Juan Pérez",
  "serviceId": "corte-dama",
  "serviceName": "Corte y Peinado",
  "duration": 60,
  "date": "2025-10-15",
  "time": "14:00",
  "createdAt": 1727712345678
}
```

---

## ⚠️ TROUBLESHOOTING

### Si no funciona Login/Signup:
1. Revisar consola (F12) → Console
2. Buscar mensaje: "⚠️ API caída, usando auth local"
3. Verificar que localStorage no esté bloqueado

### Si no se ven los turnos:
1. Verificar en Console: `localStorage.getItem('app_bookings_v1')`
2. Si es null, crear un turno primero
3. Verificar que el email del usuario coincida con el email del turno

### Si los turnos desaparecen:
1. No usar modo incógnito (borra localStorage al cerrar)
2. No limpiar caché del navegador
3. Usar siempre el mismo email para login

---

## ✅ CRITERIOS DE ÉXITO

- [ ] Puedo crear una cuenta sin backend
- [ ] Puedo crear al menos 3 turnos diferentes
- [ ] Los turnos aparecen en "Mis reservas"
- [ ] Puedo editar la fecha/hora de un turno
- [ ] Puedo eliminar un turno
- [ ] Los turnos persisten después de recargar la página
- [ ] Todo funciona sin conexión a internet

---

**Fecha de creación**: 2025-09-30
**Versión**: 1.0.0 (Modo local sin backend)