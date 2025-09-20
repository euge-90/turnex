# Turnex v2

Modern, mobile‑first SPA scaffold to connect with the existing Render API.

## Run locally
- Open `turnex-v2/index.html` with Live Server.
- Ensure the API allows your origin in CORS when testing from `http://127.0.0.1:5500` or similar.

## API base
- HTML sets `<meta name="api-base" content="https://turnex-api.onrender.com/api">`.
- For local API, change it to `http://localhost:3000/api`.

## Features included
- Bootstrap 5.3 via CDN.
- Services list rendered from `GET /services`.
- Health check `GET /health` on boot.
- Placeholder Calendar section (to be wired to availability endpoint).

## Deploy
- This folder includes its own `.github/workflows/deploy-pages.yml` to deploy via GitHub Pages if in a separate repo.
- In this monorepo, the root Pages workflow deploys the root site; v2 can be published by moving these files to a dedicated repo or adjusting the workflow to include this subfolder.

## CORS
Add your production origin (e.g., `https://<user>.github.io`) to the API CORS allowlist. In `server/src/index.js` this is controlled via env vars.
