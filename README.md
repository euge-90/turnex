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
