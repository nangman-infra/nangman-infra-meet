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
pnpm start:dev
```
