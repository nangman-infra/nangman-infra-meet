# Nangman Infra Meet

This repository is organized as a simple two-service layout.

## Structure

- `frontend/`: the existing Element Call based web client
- `backend/`: the internal Nest.js meeting-management API
- `infra/`: development certificates and infrastructure assets
- `docker-compose.yml`: root-level orchestration for the frontend and backend

## Run

Frontend runtime config remains env-driven and the backend stays internal-only.

```bash
cp frontend/.env.deploy.example frontend/.env.deploy
docker compose up --build -d
```

Backend local development uses `pnpm`.

```bash
cd backend
cp .env.example .env
corepack enable
pnpm install
pnpm audit
pnpm start:dev
```

Services:

- Frontend: `http://127.0.0.1:8082`
- Backend: internal-only, reached through the frontend proxy at `/api/v1`

Frontend-specific documentation now lives in [frontend/README.md](./frontend/README.md).
