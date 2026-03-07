# Backend

Nest.js based internal API for Nangman Infra Meet.

## Principles

- Internal-only service, proxied by the frontend
- `pnpm` package management
- Feature-first DDD module layout
- Global validation, response wrapping, rate limiting, logging, and exception handling

## Current Scope

- Health endpoints
- Backend foundation only
- Meeting-related modules are scaffolds until product requirements are fixed

## Run

```bash
corepack enable
pnpm install
pnpm start:dev
```
