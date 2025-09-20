# Turnex - Turnos (v1.0)

Aplicación web estática para reservar turnos de peluquería unisex (mujeres, hombres y niños). Mobile-first, accesible y rápida.

## Tecnologías
- HTML5 semántico + Bootstrap 5.3 (CDN)
- CSS con custom properties, Grid/Flexbox
- Google Fonts (Poppins, Inter)
- SweetAlert2 (CDN)
- JavaScript ES6 Modules (vanilla)
- Persistencia: PostgreSQL con Prisma ORM (Neon en producción). Nota: versiones iniciales usaron SQLite.

## Estructura
- `index.html`
- `css/styles.css`, `css/responsive.css`
- `js/app.js`, `js/calendar.js`, `js/auth.js`, `js/utils.js`
- `assets/images/logo.svg`

## Ejecutar localmente
Opción recomendada: extensión `Live Server` para el front y Node.js para la API (opcional).

Frontend (estático):
1. Instalar `Live Server` (Ritwick Dey) en VS Code.
2. Abrir `index.html` y elegir "Open with Live Server".

Quick Start (PowerShell):
```powershell
# 1) Frontend con Live Server
# En VS Code, click derecho sobre index.html → Open with Live Server

# 2) API local (opcional pero recomendado)
cd "server"
npm install
npm run dev
# API en: http://localhost:3000/api (health: http://localhost:3000/api/health)
```

Backend (API con SQLite por defecto):
1. Abrir una terminal y ubicarse en `server/`.
2. Instalar dependencias:
	```powershell
	cd "server"
	npm install
	```
3. Ejecutar la API:
	```powershell
	npm run dev
	```
4. Probar salud: abrir `http://localhost:3000/api/health` → `{ ok: true }`.

Nota: El frontend consume la API y los datos se persisten con Prisma. Por defecto, se usa un archivo SQLite (`dev.db`).

### SQLite (por defecto)
1. Variables en `server/.env` (ya configurado):
	```
	DATABASE_URL="file:./dev.db"
	```
2. Generar cliente e inicializar la base:
	```powershell
	cd "server"
	npx prisma generate
	npx prisma migrate dev --name init
	```
3. Correr la API:
	```powershell
	npm run dev
	```
4. (Opcional) Prisma Studio:
	```powershell
	npx prisma studio
	```

Atajos útiles:
```powershell
# Resetear la base (borra y reaplica migraciones)
npm run db:reset

# Abrir Prisma Studio
npm run studio
```

### PostgreSQL (opcional)
1. Instalar PostgreSQL localmente y crear una base:
	- DB: `turnex`
	- Usuario: `postgres` (o el que uses), contraseña acorde.
2. Editar `server/.env` y ajustar `DATABASE_URL`:
	```
	DATABASE_URL="postgresql://<usuario>:<password>@localhost:5432/turnex?schema=public"
	```
3. Generar cliente e inicializar la base de datos con Prisma:
	```powershell
	cd "server"
	npx prisma generate
	npx prisma migrate dev --name init
	```
4. Correr la API nuevamente:
	```powershell
	npm run dev
	```
5. (Opcional) Explorar datos con Prisma Studio:
	```powershell
	npx prisma studio
	```

## API (REST)

Base de la API en producción: `https://turnex-api.onrender.com/api`

Autenticación: JWT en el header `Authorization: Bearer <token>`.

Endpoints principales:
- `GET /api/health` — Health check
- `POST /api/auth/signup` — Crear cuenta (campos: `email`, `password`)
- `POST /api/auth/login` — Login (devuelve `token` y `user`)
- `GET /api/services` — Listar servicios
- `POST /api/services` — Crear servicio (admin)
- `PUT /api/services/:id` — Actualizar servicio (admin)
- `DELETE /api/services/:id` — Eliminar servicio (admin; sin turnos futuros)
- `GET /api/bookings` — Listar turnos (propios; admin ve todos)
- `GET /api/bookings/day?date=YYYY-MM-DD` — Turnos compactos del día (para disponibilidad)
- `POST /api/bookings` — Crear turno (auth)
- `DELETE /api/bookings/:id` — Cancelar turno (propietario o admin)
- `GET /api/config` — Obtener configuración (horarios, bloqueos)
- `PUT /api/config` — Actualizar configuración (admin)
- `GET /api/admin/users/count` — Total de usuarios (admin)

Ejemplos rápidos (curl):

Signup:
```bash
curl -X POST "https://turnex-api.onrender.com/api/auth/signup" \
	-H "Content-Type: application/json" \
	-d '{"email":"user@example.com","password":"secret123"}'
```

Login (guardar token en variable de entorno POSIX):
```bash
TOKEN=$(curl -s -X POST "https://turnex-api.onrender.com/api/auth/login" \
	-H "Content-Type: application/json" \
	-d '{"email":"user@example.com","password":"secret123"}' | jq -r .token)
```

Listar servicios:
```bash
curl "https://turnex-api.onrender.com/api/services"
```

Crear turno (requiere token):
```bash
curl -X POST "https://turnex-api.onrender.com/api/bookings" \
	-H "Authorization: Bearer $TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"serviceId":"<SERVICE_ID>","date":"2025-09-20","time":"10:00","name":"Juan"}'
```

Ver mis turnos:
```bash
curl -H "Authorization: Bearer $TOKEN" "https://turnex-api.onrender.com/api/bookings"
```

## Funcionalidades
- Calendario interactivo (Martes a Sábado, 09:00-18:00, intervalos 30m)
- Selección de día y hora con disponibilidad
- Registro/Login con JWT
- Reserva y cancelación de turnos
- Sección "Mis turnos"
- Diseño responsive y accesible (targets ≥44px)
 - Alcance: servicios simples para toda la familia (unisex y niños)

## Notas y supuestos
- Usuarios, servicios, reservas y configuración se guardan en la base (SQLite o PostgreSQL, según `DATABASE_URL`).
- Contraseñas con hash (`bcrypt`).
- Se pueden ajustar horarios/días en `js/utils.js`.

## Próximos pasos
- Mejoras UX y accesibilidad adicionales
- Validación de solapado por duración de servicio (ya implementada en la API)
- Bloqueo de fechas/horas configurables por día (ya soportado en la API)
- Mejoras de accesibilidad (teclado completo en calendario)
- Pruebas Lighthouse y tuning de performance
 - Migrar a base de datos con Prisma (SQLite/Postgres) y persistir datos

## Deploy a GitHub Pages (frontend)

Esta repo ya incluye un workflow de GitHub Actions que publica la RAÍZ del repositorio (`./`) a GitHub Pages en cada push a `main`.

Pasos:
1) En GitHub, ir a `Settings → Pages → Build and deployment → Source = GitHub Actions`.
2) Hacer un push a `main` o ejecutar manualmente el workflow "Deploy to GitHub Pages" (`Actions → Deploy to GitHub Pages → Run workflow`).
3) La URL resultante será `https://<usuario>.github.io/<repo>/`.

SPA listo para Pages:
- Se incluye `/.nojekyll` para evitar que GitHub procese archivos.
- Se incluye `/404.html` con redirección a `index.html` para rutas internas.

Backend (Render) y CORS:
- En `index.html` el meta `api-base` apunta a `http://localhost:3000/api` por defecto para desarrollo local, pero hay un script que AUTOMÁTICAMENTE cambia a producción (`https://turnex-api.onrender.com/api`) cuando el sitio corre online (no localhost). No necesitás tocar nada para el deploy.
- En Render, asegurate de permitir el origen de tu Pages: definir `CORS_ALLOWED_ORIGINS` con la URL de origen de GitHub Pages (sin path), por ejemplo:

```
https://<usuario>.github.io
```

Luego de actualizar env vars en Render, reiniciar el servicio para aplicar cambios.

Verificación rápida:
- Abrir `https://<usuario>.github.io/<repo>/` y probar:
  - "Crear cuenta" (POST `/api/auth/signup`)
  - "Ingresar" (POST `/api/auth/login`)
  - Listado de servicios (GET `/api/services`)

Si ves errores CORS en consola:
- Revisá `Settings → Environment` en Render: `CORS_ALLOWED_ORIGINS` debe incluir exactamente el origen de Pages (`https://<usuario>.github.io`).
- Confirmá que el meta `api-base` está en `http://localhost:3000/api` (dev) y que el script de auto-switching no fue removido para producción.
