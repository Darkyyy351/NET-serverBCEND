# NET 0.1 CM5 Preflight

Run this checklist on the CM5 after cloning both repositories and before exposing NET outside the local network.

## 1. Host

```bash
uname -m
docker --version
docker compose version
docker info
df -h /
hostname -I
ss -ltn | grep -E ':(3000|8080)\\b' || true
sudo ufw status
```

Pass conditions:

- Architecture is `aarch64` or `arm64`.
- Docker and `docker compose` both respond without errors.
- `docker info` confirms that the Docker daemon is running.
- At least 2 GB of free disk space is available for the first build.
- The CM5 has a stable LAN IP or a DHCP reservation.
- Ports `3000` and `8080` are not already used by another service.

If UFW is active, allow both NET ports only from the trusted LAN subnet. Replace `LAN_CIDR` with a value such as `192.168.1.0/24`:

```bash
sudo ufw allow from LAN_CIDR to any port 3000 proto tcp
sudo ufw allow from LAN_CIDR to any port 8080 proto tcp
```

## 2. Configuration

Backend `~/NET-serverBCEND/.env`:

```env
API_TOKEN=replace-with-a-long-random-token
BACKEND_PORT=3000
CORS_ORIGIN=http://CM5_IP_ADDRESS:8080
NET_RUNTIME=docker
LOG_RETENTION_LIMIT=500
```

Frontend `~/NET-frontend/.env`:

```env
VITE_NET_API_URL=http://CM5_IP_ADDRESS:3000/api/v1
VITE_NET_API_TOKEN=replace-with-the-same-backend-token
FRONTEND_PORT=8080
```

Generate the shared token once, then place the same value in both files:

```bash
openssl rand -hex 32
chmod 600 ~/NET-serverBCEND/.env ~/NET-frontend/.env
```

Pass conditions:

- `API_TOKEN` is not the example value and is identical in both files.
- `CM5_IP_ADDRESS` is replaced with the real LAN IP in both files.
- Backend `CORS_ORIGIN` exactly matches the URL used to open the frontend.
- Neither `.env` file is tracked by Git: `git status --short` must not list it.
- Both `.env` files are readable only by their owner.

For NET 0.1, keep ports `3000` and `8080` reachable only from the trusted LAN. The frontend token is embedded in its static bundle and is not suitable for public internet exposure.

## 3. Build And Start

```bash
cd ~/NET-serverBCEND
mkdir -p data
docker compose config
docker compose up -d --build

cd ~/NET-frontend
docker compose config
docker compose up -d --build
```

Pass conditions:

- Both `docker compose config` commands complete without warnings about missing variables.
- `docker compose ps` reports `net-backend` and `net-frontend` as running.
- The backend becomes healthy after its startup period.

## 4. Runtime Verification

On the CM5:

```bash
curl --fail http://localhost:3000/api/v1/health
curl --fail http://localhost:8080/health
curl --fail -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/devices
```

From the development computer:

```text
http://CM5_IP_ADDRESS:8080
```

Pass conditions:

- Both health requests return HTTP 200.
- The authorized devices request returns `"success":true`.
- Dashboard Settings reports a successful API connection.
- Adding and removing one disposable test device produces entries in Logs.

## 5. Persistence And Restart

Create one disposable device, then run:

```bash
cd ~/NET-serverBCEND
docker compose restart
curl --fail -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/v1/devices
```

Pass condition: the disposable device is still present after restart. Remove it from the dashboard after this check.

## 6. Update Routine

Before every update:

```bash
cd ~/NET-serverBCEND
mkdir -p backups
tar -czf "backups/net-data-$(date +%Y%m%d-%H%M%S).tar.gz" data
git pull --ff-only
docker compose up -d --build

cd ~/NET-frontend
git pull --ff-only
docker compose up -d --build
```

Use `git pull --ff-only` on the CM5 so deployment stops instead of creating an accidental server-side merge. If an update fails, keep the data backup and inspect `docker compose logs --tail=100` before changing anything else.
