# Guía de Seguridad - Turnex

## ⚠️ ACCIÓN URGENTE REQUERIDA

### Credenciales Comprometidas

Las credenciales de base de datos estuvieron expuestas en el repositorio Git. **Debes rotarlas inmediatamente.**

---

## 🔐 Pasos para Rotar Credenciales

### 1. Rotar Base de Datos (Neon PostgreSQL)

**Credenciales comprometidas:**
- `DATABASE_URL` en `server/.env` (estuvo en Git)
- Base: `neondb` en `ep-patient-voice-adbui67d-pooler.c-2.us-east-1.aws.neon.tech`

**Acciones requeridas:**

1. **Ir a Neon Dashboard:**
   - https://console.neon.tech/
   - Login con tu cuenta

2. **Opción A - Crear nueva base de datos (RECOMENDADO):**
   ```
   - Create new project o new database
   - Copiar nueva DATABASE_URL
   - Aplicar migraciones: npx prisma migrate deploy
   - Opcionalmente migrar datos si es necesario
   ```

3. **Opción B - Resetear credenciales del proyecto actual:**
   ```
   - Settings → Reset password
   - Regenerar connection string
   - Nota: esto romperá todas las conexiones activas
   ```

4. **Actualizar variables de entorno:**
   
   **En local (`server/.env`):**
   ```bash
   DATABASE_URL="postgresql://NEW_USER:NEW_PASSWORD@NEW_HOST/NEW_DB?sslmode=require"
   ```
   
   **En Render (producción):**
   ```
   - Dashboard → turnex-api service
   - Environment → Edit
   - Actualizar DATABASE_URL
   - Save Changes (reiniciará el servicio automáticamente)
   ```

---

### 2. Generar Nuevo JWT_SECRET

**JWT_SECRET actual comprometido:** `change-me`

**Generar nuevo secret seguro:**

```bash
# En terminal (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output ejemplo (NO USAR ESTE, generar el tuyo):
# 803d3a04757cd8d6c02c0de6129380f65e293f8c2c05235ecdc5327e44220e88
```

**Actualizar:**

1. **Local (`server/.env`):**
   ```bash
   JWT_SECRET="tu-secret-generado-de-64-caracteres-hexadecimales"
   ```

2. **Render (producción):**
   ```
   - Environment → Edit
   - JWT_SECRET: "tu-secret-generado"
   - Save Changes
   ```

**⚠️ IMPORTANTE:** Cambiar el JWT_SECRET invalidará todas las sesiones activas. Los usuarios deberán volver a iniciar sesión.

---

### 3. Actualizar CORS en Producción

**Actualizar en Render:**

```
Variable: CORS_ALLOWED_ORIGINS
Valor: https://euge-90.github.io,http://localhost:5500,http://127.0.0.1:5500
```

**Pasos:**
1. Render Dashboard → turnex-api
2. Environment → Add Environment Variable
3. Key: `CORS_ALLOWED_ORIGINS`
4. Value: (el valor de arriba)
5. Save Changes

---

## 🔒 Verificación de Seguridad

### Checklist Post-Rotación

- [ ] Nueva `DATABASE_URL` funcionando en local
- [ ] Nueva `DATABASE_URL` configurada en Render
- [ ] Nuevo `JWT_SECRET` en local y Render
- [ ] `CORS_ALLOWED_ORIGINS` configurado en Render
- [ ] API responde correctamente después de cambios
- [ ] Frontend puede conectarse a API
- [ ] Login/Signup funcionan correctamente
- [ ] `server/.env` NO está en Git (verificar con `git status`)

### Verificar que .env está protegido

```bash
# Desde la raíz del proyecto
git check-ignore server/.env
# Debe mostrar: server/.env

# Verificar que no está staged
git status
# NO debe aparecer server/.env en la lista
```

---

## 📋 Configuración Correcta de Variables de Entorno

### Local Development (`server/.env`)

```bash
# Base de datos (DESPUÉS de rotar)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# JWT Secret (DESPUÉS de generar nuevo)
JWT_SECRET="secret-de-64-caracteres-hexadecimales-generado-con-crypto"

# CORS
CORS_ALLOWED_ORIGINS="http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000"

# Server
PORT=3000
NODE_ENV=development
```

### Production (Render Environment Variables)

```
DATABASE_URL = postgresql://user:password@host:5432/database?sslmode=require
JWT_SECRET = secret-de-64-caracteres-hexadecimales-diferente-al-de-local
CORS_ALLOWED_ORIGINS = https://euge-90.github.io,http://localhost:5500
PORT = 3000
NODE_ENV = production
```

---

## 🚫 Qué NO Hacer

❌ **NUNCA commitear archivos .env:**
```bash
# MAL ❌
git add server/.env
git commit -m "update env"

# BIEN ✅
git add server/.env.example
git commit -m "update env example"
```

❌ **NUNCA incluir credenciales en código:**
```javascript
// MAL ❌
const DB_URL = "postgresql://user:pass@host/db"

// BIEN ✅
const DB_URL = process.env.DATABASE_URL
```

❌ **NUNCA compartir .env por Slack/Discord/Email:**
- Usar variables de entorno de plataforma (Render, Vercel, etc.)
- O servicios seguros como 1Password, LastPass

---

## 🔍 Verificar Secretos en Historial de Git

**Problema:** Las credenciales ya están en el historial de Git, incluso después de eliminar el archivo.

**Opciones:**

### Opción 1: Rotar credenciales (RECOMENDADO)
- Más simple y seguro
- Ya hiciste esto siguiendo esta guía ✅

### Opción 2: Limpiar historial de Git (AVANZADO)
```bash
# ⚠️ PELIGROSO: Reescribe historial, requiere coordinación con todo el equipo

# Usando git-filter-repo (recomendado)
pip install git-filter-repo
git filter-repo --path server/.env --invert-paths

# O usando BFG Repo Cleaner
java -jar bfg.jar --delete-files .env
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (requiere permisos y coordinación)
git push origin --force --all
```

**Nota:** Si el repositorio es público o tiene múltiples colaboradores, la Opción 1 (rotar) es la única viable.

---

## 📚 Recursos Adicionales

- [OWASP Cheat Sheet - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub - Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Neon Security Best Practices](https://neon.tech/docs/connect/connection-security)

---

## 📞 En Caso de Incidente de Seguridad

1. **Rotar TODAS las credenciales inmediatamente**
2. **Revisar logs de acceso a base de datos**
3. **Notificar a usuarios si hubo compromiso de datos**
4. **Documentar el incidente y las acciones tomadas**

---

**Última actualización:** $(date +%Y-%m-%d)
**Estado:** CREDENCIALES COMPROMETIDAS - ROTACIÓN REQUERIDA
