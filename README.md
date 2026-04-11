# Nangman Infra Meet

This repository is organized as a two-service application with separate package
management and validation flows.

## Structure

- `frontend/`: the Element Call based web client and embedded package sources
- `backend/`: the internal Nest.js meeting-management API
- `infra/`: development certificates and infrastructure assets
- `docker-compose.yml`: root-level orchestration for the frontend and backend

## Current Product Scope

- meeting planning, scheduling, and host-managed lifecycle actions
- moderated meeting access and entry approval flows
- in-call attendance tracking and attendance summaries
- Element Call based calling, chat, and shared notes in the frontend

## Run

Frontend runtime config remains env-driven and the backend stays internal-only.

```bash
cp frontend/.env.deploy.example frontend/.env.deploy
cp backend/.env.example backend/.env
# set Neon DATABASE_URL / DATABASE_URL_DIRECT in backend/.env
cd backend
corepack enable
pnpm install
pnpm db:migrate
cd ..
docker compose up --build -d
```

Frontend local development uses Yarn 4.

```bash
cd frontend
corepack enable
corepack yarn install --immutable
corepack yarn dev
```

Backend local development uses `pnpm`.

```bash
cd backend
cp .env.example .env
# set Neon DATABASE_URL / DATABASE_URL_DIRECT in .env
corepack enable
pnpm install
pnpm db:migrate
pnpm audit
pnpm start:dev
```

Services:

- Frontend: `http://127.0.0.1:8082`
- Backend: internal-only, reached through the frontend proxy at `/api/v1`

Frontend-specific documentation now lives in [frontend/README.md](./frontend/README.md).

## Validate

```bash
cd frontend
corepack yarn lint
corepack yarn test --run
corepack yarn build:full:development

cd ../backend
pnpm lint:types
pnpm test --runInBand
pnpm build
```
