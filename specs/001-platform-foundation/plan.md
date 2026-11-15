# Implementation Plan: Platform Foundation (Phase 2)

**Branch**: `001-platform-plan` (this plan); story branches `001-sN-<name>` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-platform-foundation/spec.md`

## Summary

Phase 2 turns an empty repository into the foundation every later phase builds on. The result is:

- a pnpm and Turborepo monorepo with a NestJS modular-monolith API, a worker and a mock partner hub;
- six Next.js web apps and an Expo mobile app;
- PostgreSQL with schema-per-module tables, row-level security, append-only triggers and a hash-chained audit log;
- Keycloak for demo sign-in, with OTP for privileged roles;
- a reusable maker-checker capability with database-enforced "no self-approval";
- configuration with versions, approval and rollback;
- a seeded, deterministic scenario engine;
- correlation IDs flowing into Grafana LGTM;
- a fail-closed adapter registry plus three-layer egress denial;
- automated label, accessibility and visual checks against the approved Phase 2 designs.

Delivery follows spec clarification Q1: **one plan, nine story pull requests in order 1 → 9**. Each pull request leaves `main` green. Technical decisions are in [research.md](./research.md) (R-1 to R-21). Data in [data-model.md](./data-model.md). Interfaces in [contracts/](./contracts/). Validation in [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript (version per research R-1: 7.x if NestJS decorator metadata works, otherwise the newest 6.x, one version repository-wide). Node.js 22 LTS. SQL (PostgreSQL 16).

**Primary Dependencies** (majors as of 2026-11-15; exact versions pinned in the lockfile by the first task):
- **Workspace**: pnpm 11.0.9, Turborepo 2.
- **Backend**: NestJS 12, Drizzle ORM, `pg`, BullMQ 6 and Redis 7, `openid-client` 6 / JOSE for token validation, `nestjs-zod` with Zod 4, `@nestjs/throttler`, Pino 10, OpenTelemetry SDK, `pure-rand`.
- **Web**: Next.js 16 with React 19, Tailwind 4, Radix primitives, `next-intl` 4, `iron-session`.
- **Mobile**: Expo SDK 58 with Expo Router, i18next, `expo-auth-session`, `expo-secure-store`, `expo-local-authentication`.
- **Infrastructure**: Docker Compose, Keycloak (current major), `grafana/otel-lgtm`, Caddy gateway.
- **Tests**: Vitest 5, fast-check 4, Testcontainers 12, Playwright 1.65, `@axe-core/playwright`, Maestro, Spectral, orval.

**Storage**: PostgreSQL 16 with schemas `platform`, `iam`, `audit`, `config`, `demo`, `integration`; Redis for queues and rate limits. Versioned SQL migrations protected by checksums (R-3).

**Testing**: unit (Vitest, fast-check), integration (Testcontainers: Postgres, Redis, Keycloak), negative authorization matrix, end-to-end (Playwright web; Maestro on Android), accessibility (axe), visual (Phase 2 baselines), safety (startup guard, egress probes, repository scans), determinism (digest compare). See [contracts/ci-checks.md](./contracts/ci-checks.md).

**Target Platform**: local Docker Compose on Windows 11 (Docker Desktop with WSL2, verified 28.1) and Linux CI runners (GitHub Actions `ubuntu-latest`). Browsers: current Chromium in tests. Mobile: Android emulator API 34. iOS deferred (spec Q3).

**Project Type**: web service + multiple web frontends + mobile app (monorepo).

**Performance Goals**: none invented (NFR-010 is measured in Phase 12). Practical targets: `pnpm dev:all` healthy in under 10 minutes on a cold cache and 2 minutes warm on the workstation; the CI `ci` aggregate under 25 minutes on pull requests.

**Constraints**:
- DEMO only; no outbound network from running containers.
- No real data, URLs or credentials.
- Integer minor units for every configured money value.
- Logical CSS only; Arabic and English.
- WCAG 2.2 AA.
- Solo mode (self-attested evidence, re-reviewed later).
- Article XI: no dependency outside the plan's stack without an ADR.

**Scale/Scope**:
- 10 apps and about 10 packages.
- About 7 migrations and about 30 API routes.
- 15 roles and about 20 permissions.
- 6 web shells with 5–17 routes each; the mobile app with 5 tabs.
- 1 scenario (`baseline-v1`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | How the plan complies | Result |
|---|---|---|
| I. Simulation Boundary First | `APP_MODE` guard; adapter allowlist `mock:*` with fail-closed start; disabled live adapter classes; three-layer egress denial; CI probes; scans extended (R-9, ci-checks). Internal hostnames allowlisted in C-9 by name only | PASS |
| II. Ledger Is the Source of Truth | No ledger in Phase 2. The scenario engine seeds only through services and never writes ledger tables directly (FR-034) | PASS |
| III. Money Safety | Money configuration values are integer minor units; no money arithmetic in Phase 2 | PASS |
| IV. Idempotency and Explicit State | Idempotency middleware on every mutating route; explicit lifecycles for approvals, config versions, elevations and runs; outbox at least once with de-duplication | PASS |
| V. Security, Tenancy, SoD | Keycloak OIDC; OTP for privileged roles checked by realm and API; RLS with no bypass flag; read-only, audited elevation (Q4); separation of duties at grant time (service and trigger); no self-approval (service and trigger); least-privilege matrix that also generates the negative suite | PASS |
| VI. Auditability and Traceability | Hash-chained, append-only audit in the same transaction; anchors; verify and export; correlation IDs in logs, traces, metrics, audit and user errors | PASS |
| VII. Test-First for P0 | Each story's tests are written first (tasks): negative authorization, RLS, triggers, tamper detection, startup guard, egress, determinism | PASS |
| VIII. Honest Representation | `SimulationBanner` in the root layout of every app, impossible to remove; exports and notifications labelled; crawler, axe and Maestro checks | PASS |
| IX. Inclusive by Default | i18n catalogs from the approved copy deck; logical CSS lint; five state components; axe; visual match with the approved RTL designs | PASS |
| X. Reproducibility | One-command bootstrap and start; checksummed migrations and manifests; injected clock, ID and random sources; digest compare across machines | PASS |
| XI. Simplicity | A modular monolith; every dependency is in the plan's §C.2 stack or is a direct implementation detail of it (Caddy as gateway, `grafana/otel-lgtm` as the packaged Grafana stack, `iron-session`, `pure-rand`). See Complexity Tracking | PASS with justification |

**Post-design re-check**: all PASS. Design-time findings:
1. The plan's `cross_tenant` RLS flag was replaced by a read-only, single-tenant elevation (data model Δ; stricter than the plan).
2. Audit truncation is impossible by design, so a scenario reset starts a new audit epoch (data model).
3. C-9 needed the internal service names allowlisted (done, with reasons).

## Project Structure

### Documentation (this feature)

```text
specs/001-platform-foundation/
├── spec.md  plan.md  research.md  data-model.md  quickstart.md
├── contracts/  http-api.md  events-and-config.md  runtime-config.md  scenario-manifest.md  ui-shell.md  ci-checks.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source code (repository root)

```text
package.json  pnpm-workspace.yaml  turbo.json  .env.example  .gitattributes (extended)
apps/
├── api/            src/{main.ts, app.module.ts, core/, identity/, tenancy/, approvals/, audit/, config/, integration/, demo/, health/}
│                   test/{authz.matrix.spec.ts, rls.int.spec.ts, audit.tamper.int.spec.ts, startup-guard.spec.ts, determinism.int.spec.ts, ...}
├── worker/         src/{outbox-relay, config-activation, audit-anchor, elevation-expiry}
├── mock-hub/       src/{mocks/<kind>, control}
├── web-consumer/  web-merchant/  web-business/  web-console/  web-investor/  web-devportal/
│                   app/[locale]/{sign-in, settings/language, 403, error, ...}  src/routes.manifest.ts
└── mobile/         app/(tabs)/{index,pay,send,markets,profile}.tsx  maestro/*.yaml
packages/
├── platform-core/  clock, ids, random, correlation, canonical-json, errors, egress-guard, migrate
├── domain-types/   rbac.ts, config-registry.ts, scenario.ts, error-codes.ts
├── contracts/      openapi.json (generated), clients (orval)
├── auth-web/       OIDC BFF helpers (openid-client + iron-session)
├── ui-web/  ui-native/  i18n/ (catalogs generated from the approved copy deck)  config/ (eslint, tsconfig, prettier)  test-kit/
├── design-tokens/  (exists; joins the workspace)
db/
├── migrations/     0001_platform.sql … 0007_roles_grants.sql
└── seeds/scenarios/baseline/v1.yaml  SHA256SUMS  v1.digest-seed42.txt
infra/
├── docker-compose.yml  adapters.demo.json  Caddyfile
├── keycloak/realm-pdfe-demo.json  themes/pdfe/  README.md (demo credentials, synthetic)
└── grafana/dashboards/correlation.json
scripts/  bootstrap.mjs  egress-probe.mjs  totp.mjs  (existing governance/, design/, safety/ unchanged except the extended lists)
docs/
├── runbooks/local-setup.md
├── evidence/phase-2/  (fresh-clone.md, blocked-prs.md, egress-report.txt, determinism.md)
└── adr/ ADR-001,002,009–015 → Accepted (FR-047)
.github/workflows/ci.yml   (new; governance.yml unchanged)
```

**Structure decision**: the layout follows plan Part D, with these additions:
- `packages/platform-core`, for determinism and safety code shared by api, worker and scripts;
- `packages/auth-web`, the shared BFF;
- `scripts/design/render` and `packages/design-tokens` join the workspace (R-1).

## Delivery sequence (one pull request per story, spec Q1)

| PR | Story (plan feature) | Includes | Exit evidence |
|---|---|---|---|
| 1 | US1 Foundation (001) | Workspace, configs, `platform-core` (clock, ids, random, correlation skeleton, errors), api/worker/mock-hub skeletons with `/v1/health`, migration runner plus `0001_platform`, empty web and mobile apps showing a **minimal banner**, Compose stack, bootstrap, `ci.yml` (static, unit, deps, build, fresh-clone), `docs/runbooks/local-setup.md` | fresh-clone job green; ruleset adds `ci`; blocked-PR evidence |
| 2 | US2 Safety boundary (006) | Adapter registry and guard, disabled live adapters, egress guard, internal network, egress and startup-guard jobs, extended scan lists | egress-report; startup-guard tests |
| 3 | US3 Identity (004) | Keycloak realm, `iam` migrations, RBAC seed, guards, OTP enforcement, RLS, elevation, approvals (service and triggers), negative suite; **audit calls through a minimal append-only writer** | authz suite and RLS tests green |
| 4 | US4 Audit (005) | Full hash chain, anchors, verify, search and export, tamper test; replaces the minimal writer | tamper test green |
| 5 | US5 Labels (003) | Final `SimulationBanner` in `ui-web`/`ui-native`, export and notification labels, Playwright crawler, route manifests | label crawl green on every route × 2 languages |
| 6 | US6 Correlation (002) | OpenTelemetry, Pino and redaction, LGTM, Grafana dashboard, error envelope everywhere | correlation walkthrough recorded |
| 7 | US7 Configuration (007) | Registry, versions, approval integration, activation worker, diff, rollback, safety locks | config tests green |
| 8 | US8 Scenarios (008) | Manifest schema, `baseline-v1`, reset and seed, digest, report, mock-hub control | digests equal locally and in CI |
| 9 | US9 Shells (009) | Full shells to the Phase 2 designs: sign-in and role picker, OTP step, navigation, badges, language switch, state components, console admin screens; i18n from the approved copy deck; axe and visual checks; mobile Maestro on Android | e2e-web and mobile green; ADRs accepted (FR-047) |

Rule for cross-story dependencies: an earlier pull request adds the smallest working piece, for example the minimal banner in PR 1 and the minimal audit writer in PR 3, and the owning story completes it (spec, Delivery assumption).

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| Keycloak as a separate container | ADR-010; real OIDC and OTP for privileged roles; realm as code | A home-made identity service would reimplement MFA and token security |
| Two run modes (`dev:all` containerized, `dev` host) | Egress can only be proven with container networking; fast iteration needs host mode | Containers only make development slow; host only cannot prove egress (FR-008) |
| Grafana LGTM single container | One image instead of four for logs, traces, metrics and dashboards (R-8) | Separate Loki, Tempo and Prometheus containers mean more moving parts for one person |
| Caddy gateway | App containers stay on an `internal: true` network while users still reach them on localhost | Publishing app ports directly would require the app network to be non-internal |
| Android CI emulator job | Spec Q3: automated mobile checks in CI | Manual mobile checks give no evidence |
| A new aggregate required check `ci` | Keeps the ruleset stable while jobs evolve | Requiring every job individually means ruleset churn on each new job |
