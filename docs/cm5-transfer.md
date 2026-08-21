# NET CM5 Transfer Notes

This is the first stable transfer path for running NET on the CM5 with Docker.

## Assumptions

- CM5 runs Ubuntu Server with Docker and Docker Compose installed.
- Backend repo: `https://github.com/Darkyyy351/NET-serverBCEND.git`
- Frontend repo: `https://github.com/Darkyyy351/NET-frontend.git`
- Deployment repo: `https://github.com/Darkyyy351/NET-deploy.git`
- Backend listens on port `3000`.
- Frontend listens on port `8080`.

## Backend

```bash
cd ~
git clone https://github.com/Darkyyy351/NET-serverBCEND.git
cd NET-serverBCEND
cp .env.example .env
nano .env
```

Recommended `.env` for CM5:

```env
API_TOKEN=replace-with-long-random-token
BACKEND_PORT=3000
CORS_ORIGIN=http://CM5_IP_ADDRESS:8080
NET_RUNTIME=docker
LOG_RETENTION_LIMIT=500
```

Start backend:

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:3000/api/v1/health
```

## Frontend

```bash
cd ~
git clone https://github.com/Darkyyy351/NET-frontend.git
cd NET-frontend
cp .env.example .env
nano .env
```

Recommended `.env` for CM5:

```env
VITE_NET_API_URL=http://CM5_IP_ADDRESS:3000/api/v1
VITE_NET_API_TOKEN=replace-with-the-same-backend-token
FRONTEND_PORT=8080
```

Start frontend:

```bash
docker compose up -d --build
docker compose ps
```

Open dashboard:

```text
http://CM5_IP_ADDRESS:8080
```

## Updates

Use the dedicated deployment repository for routine updates:

```bash
cd ~/apps/NET-deploy
git pull --ff-only origin main
./update.sh
```

The updater validates both application repositories, backs up backend data, builds uniquely tagged images while the current containers remain online, waits for both Docker healthchecks and restores both previous images if either service fails. It does not edit `.env` files or manage Uptime Kuma.

The complete first-deploy checklist is in [`cm5-preflight.md`](cm5-preflight.md). The manual `git pull --ff-only` and `docker compose up -d --build` procedure remains a recovery fallback, not the normal update path.

## Notes

- Runtime data lives in `data/devices.json` and `data/logs.json`.
- Runtime data is intentionally ignored by Git.
- Do not commit `.env`.
- For local browser testing, keep `CORS_ORIGIN` exactly aligned with the frontend URL.
