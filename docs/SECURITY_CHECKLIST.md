# 🔐 Checklist de Seguridad - Turnex

**Tiempo estimado:** 15-20 minutos
**Fecha límite recomendada:** Inmediata (hoy)

---

## Paso 1: Preparación (5 min)

### 1.1 Abrir todas las consolas necesarias

- [ ] Terminal local (PowerShell/Bash)
- [ ] [Neon Console](https://console.neon.tech/) (abrir en navegador)
- [ ] [Render Dashboard](https://dashboard.render.com/) (abrir en navegador)
- [ ] Editor de texto con `server/.env` local

---

## Paso 2: Rotar Base de Datos (5-7 min)

### 2.1 En Neon Console

**Opción A - Crear nueva base de datos (RECOMENDADO):**

- [ ] Click en "Create Project" o "New Database"
- [ ] Nombre: `turnex-production` (o el que prefieras)
- [ ] Región: US East (Ohio) - `us-east-2` (o la más cercana)
- [ ] Click "Create"
- [ ] **Copiar** el `Connection String` que aparece (empezará con `postgresql://`)

**Opción B - Resetear password en proyecto actual:**

- [ ] Ir a Settings del proyecto actual
- [ ] Click "Reset password"
- [ ] **Copiar** el nuevo connection string

### 2.2 Guardar nueva DATABASE_URL

```
Ejemplo formato:
postgresql://user:password@ep-xxxxx.region.aws.neon.tech/dbname?sslmode=require
```

**Temporal - Pegar aquí (ELIMINAR después):**
```
DATABASE_URL="___TU_NUEVA_URL_AQUI___"
```

---

## Paso 3: Generar JWT_SECRET (2 min)

### 3.1 En terminal local

- [ ] Ejecutar comando:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

- [ ] **Copiar** el output (64 caracteres hexadecimales)

**Temporal - Pegar aquí (ELIMINAR después):**
```
JWT_SECRET="___TU_SECRET_AQUI___"
```

---

## Paso 4: Actualizar Local (3 min)

### 4.1 Editar `server/.env`

- [ ] Abrir archivo: `server/.env`
- [ ] Reemplazar `DATABASE_URL` con la nueva (del Paso 2.2)
- [ ] Reemplazar `JWT_SECRET` con el nuevo (del Paso 3.1)
- [ ] Agregar CORS si no existe:
  ```
  CORS_ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500,https://euge-90.github.io
  ```
- [ ] **Guardar archivo**

### 4.2 Aplicar migraciones (si creaste nueva DB)

```bash
cd server
npx prisma generate
npx prisma migrate deploy
```

- [ ] Comando ejecutado sin errores

### 4.3 Probar servidor local

```bash
npm run dev
```

- [ ] Servidor inicia correctamente
- [ ] Abrir: http://localhost:3000/api/health
- [ ] Respuesta: `{"ok":true,"timestamp":"..."}`

**Si hay error:** Verificar que `DATABASE_URL` esté correcta en `server/.env`

---

## Paso 5: Actualizar Render (5 min)

### 5.1 Ir a Render Dashboard

- [ ] Abrir: https://dashboard.render.com/
- [ ] Click en tu servicio (ej: `turnex-api`)
- [ ] Click en pestaña "Environment"

### 5.2 Actualizar variables

- [ ] Click "Add Environment Variable" o editar existente
- [ ] Actualizar `DATABASE_URL`:
  - Key: `DATABASE_URL`
  - Value: (pegar la nueva del Paso 2.2)
  
- [ ] Actualizar `JWT_SECRET`:
  - Key: `JWT_SECRET`
  - Value: (pegar el nuevo del Paso 3.1)
  
- [ ] Agregar/Actualizar `CORS_ALLOWED_ORIGINS`:
  - Key: `CORS_ALLOWED_ORIGINS`
  - Value: `https://euge-90.github.io,http://localhost:5500`

- [ ] Click "Save Changes"

### 5.3 Esperar deploy

- [ ] Esperar que el servicio se reinicie (1-2 min)
- [ ] Status cambia a "Live" (verde)

### 5.4 Verificar API en producción

- [ ] Abrir: https://turnex-api.onrender.com/api/health
- [ ] Respuesta: `{"ok":true,"timestamp":"..."}`

**Si hay error 500:** Revisar logs en Render → Logs tab

---

## Paso 6: Probar Frontend (2 min)

### 6.1 Probar signup/login

- [ ] Abrir: https://euge-90.github.io/turnex/
- [ ] Click "Crear cuenta"
- [ ] Registrar usuario de prueba
- [ ] ✅ Cuenta creada exitosamente

**Si hay error CORS:**
- Verificar `CORS_ALLOWED_ORIGINS` en Render incluye `https://euge-90.github.io`
- Reiniciar servicio en Render

---

## Paso 7: Limpieza (1 min)

### 7.1 Eliminar datos temporales

- [ ] **ELIMINAR** este checklist después de completarlo (contiene credenciales temporales)
- [ ] O borrar las secciones "Temporal - Pegar aquí"

### 7.2 Verificar Git

```bash
# Verificar que .env NO está en Git
git status

# NO debe aparecer server/.env
```

- [ ] `server/.env` NO aparece en git status

---

## ✅ Verificación Final

### Checklist de Seguridad Post-Rotación

- [ ] Nueva `DATABASE_URL` funcionando en local
- [ ] Nueva `DATABASE_URL` configurada en Render
- [ ] Nuevo `JWT_SECRET` en local (64 caracteres hex)
- [ ] Nuevo `JWT_SECRET` en Render
- [ ] `CORS_ALLOWED_ORIGINS` configurado en Render
- [ ] API health check responde en local: http://localhost:3000/api/health
- [ ] API health check responde en producción: https://turnex-api.onrender.com/api/health
- [ ] Frontend puede conectarse a API (signup/login funcionan)
- [ ] `server/.env` NO está en Git
- [ ] Este checklist eliminado o limpiado

---

## 🆘 Troubleshooting

### Error: "Connection refused" en local

**Solución:**
- Verificar que PostgreSQL está corriendo (si usas local)
- O verificar que `DATABASE_URL` de Neon esté correcta
- Intentar: `npx prisma studio` para probar conexión

### Error: "CORS policy" en frontend

**Solución:**
1. Render → Environment → Verificar `CORS_ALLOWED_ORIGINS`
2. Debe incluir: `https://euge-90.github.io`
3. Save Changes y reiniciar servicio

### Error: "Invalid JWT" después de cambiar secret

**Esto es NORMAL:** El nuevo JWT_SECRET invalida todos los tokens anteriores.

**Solución:**
- Los usuarios deben hacer logout/login nuevamente
- O simplemente limpiar localStorage:
  ```javascript
  localStorage.clear()
  location.reload()
  ```

---

## 📞 Contacto

Si encuentras problemas, revisa:
- [docs/SECURITY.md](./SECURITY.md) - Guía completa
- Logs de Render en Dashboard → Logs
- Logs locales en terminal

---

**¡Felicitaciones!** Has completado la rotación de credenciales. Tu aplicación ahora es más segura. 🎉

---

**Fecha de rotación:** ___________
**Completado por:** ___________
