# NET Backend

## Device admission and active verification

New self-registrations require a stable ID and persist as `pending`. Existing records without an admission field remain approved. `GET /api/v1/devices/requests` lists pending requests; `POST /api/v1/devices/:id/admission` accepts `{ "decision": "approved" }` or `rejected`. Repeated registration cannot change that decision. Pending/rejected devices cannot heartbeat, read, queue, claim or acknowledge commands. Manually created devices remain approved.

This release still uses a shared bearer: admission is an operator workflow, not isolation from a malicious holder of that credential. Per-device credentials and separate administrator authorization are required before treating this as a security boundary. A rejected ID stays rejected; changing IDs is not a trusted hardware identity.

`POST /api/v1/devices/:id/verify` starts a six-second `probe` for capable firmware. Read `/api/v1/devices/:id/verify/:commandId` for `checking`, `confirmed` or `no-response`. No response does not override heartbeat-based presence. Old firmware returns `unsupported`. Expired probes are never executed or accepted as confirmation. Deploy backend, frontend, then firmware `0.2.0-irl.4`; until flashed, existing nodes retain normal operation but cannot actively verify.

Stable core backend for NET 0.1.

## What This Core Provides

- Versioned API under `/api/v1`
- Health endpoint for Docker and uptime monitoring
- Shared bearer-token authentication
- Device CRUD
- ESP self-registration
- ESP heartbeat updates with automatic offline detection
- Command queue for ESP polling
- System status endpoint for dashboard service-health cards
- Persistent event logs for dashboard audit/monitoring views
- JSON persistence in `data/devices.json`
- Docker Compose deployment baseline for the CM5 node

## API

All `/api/v1/devices` routes require:

```http
Authorization: Bearer <API_TOKEN>
```

Routes:

- `GET /api/v1/health`
- `GET /api/v1/devices`
- `POST /api/v1/devices`
- `POST /api/v1/devices/register`
- `POST /api/v1/devices/:id/heartbeat`
- `DELETE /api/v1/devices/:id`
- `GET /api/v1/devices/:id/commands`
- `POST /api/v1/devices/:id/commands`
- `GET /api/v1/devices/:id/commands/next`
- `POST /api/v1/devices/:id/commands/:commandId/ack`
- `GET /api/v1/system/status`
- `GET /api/v1/logs`

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Run smoke tests:

```bash
npm test
```

## Docker Deployment

Create `.env` on the server:

```bash
API_TOKEN=use-a-long-random-token
BACKEND_PORT=3000
CORS_ORIGIN=http://localhost:5173
NET_RUNTIME=docker
LOG_RETENTION_LIMIT=500
DEVICE_OFFLINE_AFTER_SECONDS=35
```

Start the service:

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f app
curl http://localhost:3000/api/v1/health
```

Before the first CM5 deployment, follow [`docs/cm5-preflight.md`](docs/cm5-preflight.md). Routine CM5 updates are orchestrated by the separate [`NET-deploy`](https://github.com/Darkyyy351/NET-deploy) repository.
