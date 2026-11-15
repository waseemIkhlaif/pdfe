# Contract: Runtime configuration, commands and local topology (Phase 2)

## Root commands (`package.json`)

| Command | Does | Notes |
|---|---|---|
| `pnpm bootstrap` | Checks Node ≥ 22, pnpm 11.0.9 and Docker; installs; writes `.env` from `.env.example` with random development secrets (only if `.env` is missing); builds tokens, contracts and i18n catalogs; pulls and builds images | Idempotent |
| `pnpm dev:all` | `docker compose -f infra/docker-compose.yml up -d --build --wait`, then prints the URLs | Acceptance mode (research R-10) |
| `pnpm dev` | Infrastructure in Compose and apps on the host (Turborepo watch) | Code-level egress guard only |
| `pnpm down` / `pnpm reset` | Stop / stop and delete the volumes | |
| `pnpm test` | Every test: unit, then integration (Testcontainers), then e2e against the Compose stack when it is running | `pnpm test:unit`, `test:int` and `test:e2e` exist separately |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Static checks | |
| `pnpm scenario <code> --seed <n> [--version <v>]` | Runs a scenario through the API with the bootstrap admin token | Prints the digest |

## Environment variables (`.env.example` holds placeholders only)

| Variable | Example | Rule |
|---|---|---|
| `APP_MODE` | `DEMO` | Anything else stops the process (FR-006) |
| `DATABASE_URL` | `postgres://app_role:<generated>@postgres:5432/pdfe` | `app_role`: no BYPASSRLS |
| `MIGRATOR_DATABASE_URL` | `postgres://migrator_role:<generated>@postgres:5432/pdfe` | Used only by the migration runner |
| `REDIS_URL` | `redis://redis:6379` | |
| `OIDC_ISSUER` | `http://keycloak:8080/realms/pdfe-demo` | Internal host |
| `OIDC_PUBLIC_ISSUER` | `http://localhost:8080/realms/pdfe-demo` | Browser redirects |
| `SESSION_SECRET` | `<generated 32 bytes>` | Web BFF cookies |
| `INTERNAL_HOSTS` | `postgres,redis,keycloak,mock-hub,api,worker,lgtm,localhost,127.0.0.1` | Egress allowlist; must equal the safety-locked config |
| `ADAPTERS_CONFIG` | `infra/adapters.demo.json` | Each `kind → type`; every type must match `mock:*` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://lgtm:4318` | |
| `API_BASE_URL` | `http://api:4000` | Web apps (server-side) |
| `EXPO_PUBLIC_API_BASE_URL` | `http://10.0.2.2:4000` | Android emulator loopback. The DEMO build check rejects non-internal hosts |

## Adapter configuration (`infra/adapters.demo.json`)

```json
{ "bank": "mock:bank", "psp": "mock:psp", "chain": "mock:chain", "kyc": "mock:kyc",
  "sanctions": "mock:sanctions", "fx": "mock:fx", "price": "mock:price", "notification": "mock:notification" }
```

The startup guard refuses to start when it finds any of these, and names the key:
- an unknown kind;
- a missing kind;
- a type outside `mock:*`;
- a type with no registered implementation.

## Compose topology (`infra/docker-compose.yml`)

| Network | `internal` | Members |
|---|---|---|
| `app` | **true** (no route to the internet) | postgres, redis, keycloak, lgtm, api, worker, mock-hub, web-* |
| `edge` | false | gateway (Caddy) only, plus keycloak for browser redirects |

The gateway publishes these ports on localhost:

| Port | Service |
|---|---|
| 3000 | Grafana |
| 3001 | consumer |
| 3002 | merchant |
| 3003 | business |
| 3004 | console |
| 3005 | investor |
| 3006 | devportal |
| 4000 | API |
| 8080 | Keycloak |

Postgres, Redis, the worker and mock-hub are never published. Images are built with network access at build time only. Running containers have none.
