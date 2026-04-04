# Backend

Nest.js based internal API for Nangman Infra Meet.

## Principles

- Internal-only service, proxied by the frontend
- `pnpm` package management
- Feature-first DDD module layout
- Global validation, response wrapping, rate limiting, logging, and exception handling

## Current Scope

- Health endpoints
- meeting creation, listing, start, update, and end flows
- host authorization and visibility checks for managed meetings
- attendance join/leave/detail flows and attendance summaries
- moderated access-request domain support

## Run

```bash
corepack enable
pnpm install
cp .env.example .env
# set Neon DATABASE_URL / DATABASE_URL_DIRECT in .env
pnpm db:migrate
pnpm start:dev
```

## Database

Meeting persistence uses Drizzle with Neon Postgres.

The backend now requires a real database connection unless
`ALLOW_IN_MEMORY_PERSISTENCE=true` is set explicitly for tests.

For local-only development without Neon, start the bundled Postgres service with:

```bash
docker compose --profile localdb up -d postgres
```

```bash
pnpm db:generate
pnpm db:migrate
```
