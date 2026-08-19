# NET Backend

Stable core backend for NET 0.1.

## What This Core Provides

- Versioned API under `/api/v1`
- Health endpoint for Docker and uptime monitoring
- Shared bearer-token authentication
- Device CRUD
- ESP self-registration
- ESP heartbeat/status updates
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
PORT=3000
CORS_ORIGIN=http://localhost:5173
NET_RUNTIME=docker
LOG_RETENTION_LIMIT=500
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
