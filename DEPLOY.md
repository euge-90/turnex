# Deploy guide

This project has two parts:
- Frontend: static HTML/CSS/JS in the repo root
- Backend: Node.js + Express + Prisma under `server/`

You can deploy quickly with SQLite using Fly.io for the backend and Netlify for the frontend, or switch to PostgreSQL for scalability.

## Option A: Fly.io (backend with SQLite) + Netlify (frontend)

1) Backend config
- In production, set `DATABASE_URL=file:/data/dev.db` and a strong `JWT_SECRET`.
- Allow your frontend origin via CORS using `CORS_ALLOWED_ORIGINS` (comma-separated), e.g. `https://your-site.netlify.app,https://yourdomain.com`.

2) Fly.io deploy (from `server/`)
```sh
fly launch --no-deploy
fly volumes create data --size 1
# ensure mounts in fly.toml:
# [mounts]
#   source = "data"
#   destination = "/data"
fly secrets set JWT_SECRET="<strong-secret>"
fly secrets set DATABASE_URL="file:/data/dev.db"
# optionally restrict CORS
fly secrets set CORS_ALLOWED_ORIGINS="https://your-site.netlify.app,https://yourdomain.com"
fly deploy
```
- Health: `https://<app>.fly.dev/api/health`

3) Frontend on Netlify
- Add before scripts in `index.html` if needed:
```html
<meta name="api-base" content="https://<app>.fly.dev/api">
```
- Drag & drop the repo root or use CLI (`netlify deploy --prod --dir=.`)

## Option B: Managed Postgres (Render + Neon) — 100% Free

1) Create a Neon Postgres DB
- Get the connection string (often requires `?sslmode=require`).
- Example: `postgresql://user:pass@host/db?sslmode=require`.

2) Configure Prisma for Postgres
- In `server/prisma/schema.prisma`, set `provider = "postgresql"` (already done in this repo if you follow this option).
- Keep `Config` fields as `String` (works on Postgres too). You can migrate to `Json` later if desired.

3) Local migration (optional but recommended)
```sh
cd server
set DATABASE_URL=<your neon url>
npm run prisma:generate
npm run prisma:migrate
```

4) Deploy backend on Render (Free Web Service)
- Build command: `npm install`
- Start command: `npm run start:render` (applies migrations; falls back to `prisma db push` if none)
- Environment:
	- `DATABASE_URL` = Neon connection string
	- `JWT_SECRET` = strong secret
	- `PORT` = 3000 (Render sets `PORT`; Node will use it)
	- `CORS_ALLOWED_ORIGINS` = `https://<your-netlify>.netlify.app,https://yourdomain.com`

5) Frontend on Netlify
- In `index.html`, set:
```html
<meta name="api-base" content="https://<your-render-service>.onrender.com/api">
```
- Deploy the repo root.

Important: The `<meta name="api-base">` is how the frontend knows where the backend is. Replace it with your actual Render URL before deploying the frontend. Example: `<meta name="api-base" content="https://your-service.onrender.com/api">`.

## Environment variables
- `JWT_SECRET`: strong random secret for signing JWTs
- `DATABASE_URL`: SQLite file path or Postgres URI
- `PORT`: server port (defaults to 3000)
- `CORS_ALLOWED_ORIGINS`: comma-separated list of allowed origins for CORS

## Tips
- Keep one instance when using SQLite.
- Back up `/data/dev.db` regularly.
- Use Prisma Studio for data inspection: `npm run studio` in `server/`.
