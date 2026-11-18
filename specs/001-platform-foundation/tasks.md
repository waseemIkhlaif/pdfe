---

description: "Task list for Phase 2 — Platform Foundation"
---

# Tasks: Platform Foundation (Phase 2)

**Input**: Design documents from `specs/001-platform-foundation/` ([plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md))

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (all present). The Phase 2 design package is approved (`docs/design/approvals.md`, 2026-11-15).

**Tests**: REQUIRED. Constitution Article VII (test-first for P0 controls) and every story's Independent Test call for them. Within each story, the test tasks come first and must fail before the implementation tasks start.

**Organization**: one phase per user story, in the delivery order fixed by spec clarification Q1 (1 → 9). Each story phase is one pull request, on branch `001-sN-<name>`. **Phases 1 and 2 ship inside PR 1, together with User Story 1.** The Polish phase ships with PR 9.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1 … US9)
- **(human)**: only the repository owner can do it: an outward-facing action, or a self-attestation that must be the owner's own. The agent prepares everything else and stops.

## Path conventions

Monorepo, following plan.md §Project Structure: `apps/<app>/`, `packages/<pkg>/`, `db/`, `infra/`, `scripts/`, `tests/e2e-web/` (Playwright workspace package), `docs/`. Every API test lives in `apps/api/test/`. Integration tests are named `*.int.spec.ts` and run with Testcontainers.

## Standing rules for every task

- Never edit a migration after it has been merged. Add a new numbered file instead (R-3).
- No `Date.now()`, `new Date()` without arguments, `Math.random()` or `crypto.randomUUID()` outside `packages/platform-core` (R-13).
- No URL host outside `scripts/safety/allowed-hosts.txt` in any tracked file (C-9). No real data, credentials or endpoints (Article I).
- UI strings only from `packages/i18n`. Logical CSS only.
- Every new route is added to the negative authorization matrix in the same task that adds it (SC-005).
- `bash scripts/governance/check-phase0.sh` and `bash scripts/design/check-design.sh` stay green on every pull request.

---

## Phase 1: Setup (Shared Infrastructure) — ships in PR 1

**Purpose**: the workspace, the toolchain and the custom lint rules.

- [X] T001 Check TypeScript 7 for NestJS: in a scratch directory, compile one NestJS controller that uses constructor injection, with `experimentalDecorators` and `emitDecoratorMetadata`, using TypeScript 7.x. If the emitted metadata is right, pin 7.x; otherwise pin the newest 6.x. Record the outcome and the reason under "Implementation notes (Phase 2)" in `docs/adr/ADR-002-typescript-monorepo.md`
- [X] T002 Create the root `package.json` with these fields:
  - `"private": true`, `"packageManager": "pnpm@11.0.9"`, `"engines": { "node": ">=22" }`;
  - every script listed in `specs/001-platform-foundation/contracts/runtime-config.md` §Root commands, plus `egress:probe` and `totp`.

  Also create `pnpm-workspace.yaml` (members `apps/*`, `packages/*`, `tests/*`, `scripts/design/render`; move the `allowBuilds` policy from `packages/design-tokens/pnpm-workspace.yaml` here) and `turbo.json` (pipelines `build`, `lint`, `typecheck`, `test:unit`, `test:int`, each with its outputs)
- [X] T003 Bring `packages/design-tokens` (`@pdfe/design-tokens`) and `scripts/design/render` (`@pdfe/design-render`) into the workspace:
  - delete their own `pnpm-lock.yaml` and `pnpm-workspace.yaml`;
  - run `pnpm install` at the root to produce the single `pnpm-lock.yaml`;
  - in `.github/workflows/governance.yml`, change the `design-check` job to one root `pnpm install --frozen-lockfile`, followed by `pnpm --filter @pdfe/design-tokens test|build|verify` and `pnpm --filter @pdfe/design-render verify`.

  Confirm that `bash scripts/design/check-design.sh` and `bash scripts/design/tests/run.sh` still pass
- [X] T004 [P] Create `packages/config` (`@pdfe/config`): `eslint.config.base.mjs` (typescript-eslint strict, import order), `tsconfig.base.json` (strict, `target` as chosen in T001, decorators enabled), `prettier.config.mjs`. Add the root `eslint.config.mjs`, `tsconfig.json` and `prettier.config.mjs` that re-export them, plus `.prettierignore` (lockfile, `dist/`, `.next/`, `docs/design/packages/**`)
- [X] T005 [P] Extend `.gitattributes` with `eol=lf` for `*.sh`, `*.sql`, `Dockerfile*`, `*.Dockerfile`, `.env.example`, `Caddyfile` and `db/seeds/scenarios/**/*.yaml`. Keep the existing `SHA256SUMS`, PDF and PNG rules unchanged
- [X] T006 [P] Extend `.gitignore` with `.turbo/`, `.next/`, `.expo/`, `apps/mobile/android/`, `apps/mobile/ios/`, `playwright-report/`, `test-results/` and `/egress-report.txt`. Create `.dockerignore` with `node_modules`, `.git`, `**/.next`, `**/dist`, `.env*` (but not `.env.example`), `coverage`, `docs/design/packages`
- [X] T007 [P] Create `.env.example` with placeholder values for every variable in `contracts/runtime-config.md` §Environment variables. Secrets are written as `<generated>`. Hosts are only Compose service names, `localhost` and `10.0.2.2`
- [X] T008 [P] Create `packages/test-kit` (`@pdfe/test-kit`) with `vitest.base.ts` (shared Vitest config, fast-check in reduced mode when `CI_REDUCED=1`) and `src/containers.ts`, which starts PostgreSQL 16 and Redis 7 through Testcontainers and returns connection URLs
- [X] T009 [P] Create `docs/security/dependency-exceptions.md` with an empty table (columns: package, advisory ID, severity, reason, dated expiry, attested by) and a short rule: an entry needs a dated expiry of 90 days at most
- [X] T010 [P] Write failing RuleTester tests in `packages/config/eslint/rules/__tests__/no-nondeterminism.test.ts`:
  - `Date.now()`, `new Date()` without arguments, `Math.random()` and `crypto.randomUUID()` are reported in any file outside `packages/platform-core/`;
  - `new Date(value)` is allowed;
  - files under `packages/platform-core/` are allowed
- [X] T011 [P] Write failing RuleTester tests in `packages/config/eslint/rules/__tests__/no-physical-css.test.ts`:
  - reported: Tailwind classes `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `rounded-l*`, `rounded-r*`, `border-l*`, `border-r*`, and style keys `marginLeft`, `marginRight`, `paddingLeft`, `paddingRight`, `left`, `right`;
  - allowed: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`
- [X] T012 [P] Write failing RuleTester tests in `packages/config/eslint/rules/__tests__/no-hardcoded-ui-string.test.ts`:
  - reported: a JSX text literal or string literal in `aria-label`, `title`, `placeholder` or `alt` in `apps/web-*/app/**`, `apps/mobile/app/**`, `packages/ui-web/src/**` or `packages/ui-native/src/**`;
  - allowed: `t('…')` calls, `data-testid`, and whitespace-only text
- [X] T013 Implement the three rules in `packages/config/eslint/rules/{no-nondeterminism,no-physical-css,no-hardcoded-ui-string}.js` and enable them in `packages/config/eslint.config.base.mjs` (depends on T010–T012). Make the tests in T010–T012 pass

---

## Phase 2: Foundational (Blocking Prerequisites) — ships in PR 1

**Purpose**: the deterministic core, the migration runner, the first migration, and the api, worker and mock-hub skeletons with a base Compose stack.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

### Tests first

- [X] T014 [P] Write `packages/platform-core/test/clock.test.ts`:
  - `SystemClock` returns the current time;
  - `ScenarioClock(base, stepMs)` starts at `base`, advances only on `advance()` or `tick()` by `stepMs`, and two instances with the same base give the same sequence
- [X] T015 [P] Write `packages/platform-core/test/ids.test.ts`:
  - every ID is a valid UUIDv7 (version and variant bits);
  - IDs from one generator increase monotonically;
  - with fast-check: the same seed and the same `ScenarioClock` give an identical ID sequence, and different seeds give different sequences
- [X] T016 [P] Write `packages/platform-core/test/random.test.ts`: the seeded `RandomService` (xoroshiro128+) gives the same sequence for the same seed and different sequences for different seeds; `int(min, max)` stays in range (fast-check)
- [X] T017 [P] Write `packages/platform-core/test/canonical-json.test.ts` with RFC 8785 vectors: key ordering by UTF-16 code units, number serialization, string escaping, nested arrays; `sha256Hex(canonicalJson(x))` is stable
- [X] T018 [P] Write `packages/platform-core/test/errors.test.ts`: `toEnvelope(err, correlationId)` gives `{ error: { code, message_key: "errors.<code_lower>", correlation_id } }`, plus `details` only for validation errors; unknown errors map to `INTERNAL` without leaking the message
- [X] T019 [P] Write `packages/platform-core/test/correlation.test.ts`:
  - accepted: values matching `^[A-Za-z0-9._-]{8,64}$`;
  - replaced by `COR-<uuidv7>`: values that are too short, too long or contain other characters;
  - `runWithContext` and `getContext` keep values across `await`
- [X] T020 [P] Write `packages/platform-core/test/migrate.int.test.ts` (Testcontainers Postgres):
  - applies files in name order and records `filename` and `sha256` in `platform.schema_migrations`;
  - a second run applies nothing;
  - a changed applied file makes the runner exit non-zero, naming the file;
  - a failing file rolls back only itself
- [X] T021 [P] Write `apps/api/test/health.e2e.spec.ts` (Nest testing module and supertest):
  - `GET /v1/health` returns 200 with `"mode":"DEMO"`;
  - every response has `X-PDFE-Mode: DEMO`;
  - a valid `X-Correlation-Id` is echoed and an invalid one is replaced;
  - an unknown route returns 404 in the error envelope;
  - `GET /v1/meta` returns the version
- [X] T022 [P] Write `apps/mock-hub/test/ping.spec.ts`: `GET /mock/{kind}/ping` returns 200 for each of bank, psp, chain, kyc, sanctions, fx, price and notification, and 404 for any other kind
- [X] T023 [P] Write `packages/domain-types/test/config-registry.test.ts`:
  - every default validates against its Zod schema;
  - the safety-locked set is exactly `app.mode`, `adapters.allowlist`, `egress.internal_hosts`;
  - every key ending in `_minor` is an integer schema with a minimum of 0;
  - the keys equal the table in `contracts/events-and-config.md`

### Implementation

- [X] T024 [P] Implement `packages/platform-core/src/clock.ts` (`ClockService` interface, `SystemClock`, `ScenarioClock`), the only file allowed to call `Date.now()`. Create `packages/platform-core/package.json` (`@pdfe/platform-core`) and `src/index.ts`
- [X] T025 [P] Implement `packages/platform-core/src/random.ts`: `RandomService` with `SeededRandom` (`pure-rand` xoroshiro128+) and `SystemRandom` (crypto)
- [X] T026 Implement `packages/platform-core/src/ids.ts`: `IdGenerator`, which builds a UUIDv7 from the `ClockService` time and `RandomService` bytes, monotonic within a millisecond (depends on T024, T025)
- [X] T027 [P] Implement `packages/platform-core/src/canonical-json.ts` (RFC 8785) and `packages/platform-core/src/hash.ts` (`sha256Hex`)
- [X] T028 [P] Implement `packages/platform-core/src/errors.ts` (`AppError`, `toEnvelope`) and `packages/domain-types/src/error-codes.ts`. The codes list holds every code named in `contracts/http-api.md`:
  - general: `FORBIDDEN`, `UNAUTHENTICATED`, `MFA_REQUIRED`, `NOT_FOUND`, `VALIDATION_FAILED`, `RATE_LIMITED`, `INTERNAL`;
  - idempotency: `IDEMPOTENCY_KEY_REQUIRED`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_PROGRESS`;
  - approvals and IAM: `SELF_APPROVAL`, `NOT_PENDING`, `EXPIRED`, `PAYLOAD_CHANGED`, `SOD_CONFLICT`, `ELEVATION_ACTIVE`, `ELEVATION_READ_ONLY`;
  - configuration: `CONFIG_INVALID`, `CONFIG_SAFETY_LOCKED`;
  - scenarios: `MANIFEST_CHECKSUM_MISMATCH`, `RUN_IN_PROGRESS`;
  - adapters: `LIVE_ADAPTER_DISABLED`.

  Create `packages/domain-types/package.json` (`@pdfe/domain-types`)
- [X] T029 [P] Implement `packages/platform-core/src/correlation.ts` (AsyncLocalStorage context `{ correlationId, tenantId?, actorId?, elevationId? }`, `acceptOrGenerate(header)`)
- [X] T030 [P] Implement `packages/platform-core/src/sim-label.ts`. It exports `SIM_LABEL_EN = "SIMULATION — NOT REAL MONEY"`, `SIM_LABEL_AR = "محاكاة — ليست أموالاً حقيقية"` and `SIM_LABEL = "<en> / <ar>"`, and is the single source of the label text for every later task
- [X] T031 Implement `packages/domain-types/src/config-registry.ts` with every key, Zod schema, default and `safetyLocked` flag from `contracts/events-and-config.md`, plus a `ConfigReader` interface and a `DefaultsConfigReader` (the database-backed reader comes in US7) (depends on T023)
- [X] T032 Implement the migration runner in `packages/platform-core/src/migrate/{runner.ts,cli.ts}`:
  - it reads `db/migrations/*.sql` in name order and applies each file in its own transaction;
  - it records SHA-256 hashes and refuses changed files;
  - it connects with `MIGRATOR_DATABASE_URL`;
  - it has a `--check` mode that only verifies.

  Make T020 pass (depends on T027)
- [X] T033 Create `infra/postgres/init/01-roles.sh`. On first start it creates the login roles `migrator_role` and `app_role` (NOBYPASSRLS), and the roles `readonly_role` and `demo_reset_role`, with passwords from the environment. Then it creates the database `pdfe`, owned by `migrator_role`
- [X] T034 Write `db/migrations/0001_platform.sql`:
  - `CREATE EXTENSION pgcrypto`;
  - schemas `platform`, `iam`, `audit`, `config`, `demo`, `integration`, with `USAGE` for `app_role` and `readonly_role`;
  - `platform.tenants`, `platform.legal_entities` and `platform.organizations`, following `data-model.md` (including `is_synthetic` CHECK, UNIQUE (`tenant_id`, `code`) and `version`);
  - grants for `app_role`
- [X] T035 Implement `packages/platform-core/src/db/{pool.ts,tx.ts}`. `withTx(ctx, fn, { readOnly? })` opens a transaction, runs `SET LOCAL app.tenant_id`, `app.correlation_id` and optionally `app.elevation_id`, and sets `READ ONLY` when asked. It exposes a Drizzle instance on the transaction
- [X] T036 Create the `apps/api` skeleton (`@pdfe/api`, NestJS, port 4000):
  - `src/main.ts`, `src/app.module.ts`;
  - `src/core/core.module.ts`, which provides the `ClockService`, `IdGenerator` and `RandomService` tokens;
  - `src/core/error.filter.ts`, which returns the envelope;
  - `src/core/mode-header.interceptor.ts` (`X-PDFE-Mode: DEMO`);
  - `src/core/correlation.middleware.ts`: accept or generate the ID, echo it, run the request in the correlation context;
  - `src/db/db.module.ts`, `src/db/schema/platform.ts` (Drizzle).

  Depends on T024–T035
- [X] T037 Implement `apps/api/src/health/health.controller.ts`:
  - `GET /v1/health` checks Postgres and Redis and reports `mode` and `adapters` (an empty list until US2);
  - `GET /v1/meta` reports the version from `package.json` and the build SHA from the env.

  Make T021 pass
- [X] T038 [P] Create the `apps/worker` skeleton (`@pdfe/worker`): `src/main.ts` (NestJS standalone application context), `src/worker.module.ts`, a BullMQ connection from `REDIS_URL`, and a heartbeat log every 60 s
- [X] T039 [P] Create the `apps/mock-hub` skeleton (`@pdfe/mock-hub`, port 4100): `src/main.ts` and `src/mocks/ping.controller.ts` for the 8 kinds. Make T022 pass
- [X] T040 Create `infra/docker/node-app.Dockerfile`, one multi-stage Dockerfile driven by `ARG APP`:
  - `pnpm fetch` and `pnpm deploy --filter @pdfe/$APP` in the build stage;
  - a non-root user and the Node 22 slim runtime;
  - a `HEALTHCHECK` per app.

  It is used by api, worker, mock-hub and the web apps
- [X] T041 Create `infra/docker-compose.yml` (base):
  - `postgres:16` with `infra/postgres/init` mounted and a healthcheck;
  - `redis:7`;
  - a one-shot `migrate` service running the runner;
  - `api`, `worker` and `mock-hub`, which depend on healthy `postgres` and `redis` and on a completed `migrate`.

  In this phase, ports 4000 (api) are published directly; US2 moves publishing to the gateway

**Checkpoint**: `pnpm test:unit` passes, and `docker compose -f infra/docker-compose.yml up --wait` gives a healthy api answering on `/v1/health`.

---

## Phase 3: User Story 1 - One-command start and blocking checks (Priority: P1) 🎯 MVP — PR 1

**Goal**: a fresh clone starts the whole stack with `pnpm bootstrap` and `pnpm dev:all`; every app shows the banner; `pnpm test` runs everything; broken or unsafe pull requests cannot merge.

**Independent Test**: follow `quickstart.md` §1, §2 and §10 on a clean clone.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T042 [P] [US1] Write `scripts/smoke.mjs`, the smoke test used by the fresh-clone job and `pnpm dev:all`:
  - for ports 3001–3006, `GET /ar/sign-in` returns 200 and the HTML contains both `SIM_LABEL_EN` and `SIM_LABEL_AR`;
  - `GET http://localhost:4000/v1/health` reports `mode: DEMO`;
  - the exit code is non-zero, with the failing URL named
- [X] T043 [P] [US1] Write `packages/ui-web/test/SimulationBanner.test.tsx` (Vitest and Testing Library): the minimal banner renders `role="status"`, `data-sim="1"` and the exact text from `@pdfe/platform-core` `sim-label`
- [X] T044 [P] [US1] Write `scripts/test/bootstrap.test.mjs` (`node:test`), with the checks injected:
  - `bootstrap` fails with a clear message when Node is below 22, pnpm is not 11.0.9, or Docker is missing;
  - it creates `.env` from `.env.example` with fresh random values for every `<generated>`;
  - it never overwrites an existing `.env`;
  - a second run changes nothing

### Implementation for User Story 1

- [X] T045 [US1] Create `packages/ui-web` (`@pdfe/ui-web`): `src/SimulationBanner.tsx` (the minimal banner: bilingual text from `sim-label`, no props, sticky at the top) and `src/index.ts`. Make T043 pass
- [X] T046 [US1] Create `apps/web-consumer` (Next.js 16 App Router, port 3001):
  - `next.config.ts` (`output: 'standalone'`);
  - `app/[locale]/layout.tsx`, which renders `<SimulationBanner/>` outside `{children}` and sets `<html lang dir>` for `ar` (default) and `en`;
  - placeholder `page.tsx` files for `app/[locale]/page.tsx` and `app/[locale]/sign-in/page.tsx`;
  - `middleware.ts`, which redirects `/` to `/ar`
- [X] T047 [P] [US1] Create `apps/web-merchant` (3002), `apps/web-business` (3003), `apps/web-console` (3004), `apps/web-investor` (3005) and `apps/web-devportal` (3006) from the T046 template, with the same files and their own package names and ports (depends on T046)
- [X] T048 [P] [US1] Create `packages/ui-native` (`@pdfe/ui-native`) with a minimal `src/SimulationBanner.tsx`. Create `apps/mobile` (Expo SDK 58, Expo Router):
  - `app.json`, with the DEMO profile in `extra`;
  - `app/_layout.tsx`, which renders the banner above the navigator;
  - placeholder screens `app/(tabs)/{index,pay,send,markets,profile}.tsx`
- [X] T049 [US1] Add the six web apps to `infra/docker-compose.yml`, built with `infra/docker/node-app.Dockerfile`, with healthchecks and ports 3001–3006 published directly (until US2)
- [X] T050 [US1] Implement `scripts/bootstrap.mjs`:
  - check the prerequisites;
  - `pnpm install --frozen-lockfile`;
  - generate `.env` only if it is missing;
  - `pnpm turbo build --filter=./packages/*`;
  - `docker compose -f infra/docker-compose.yml build`.

  Wire it to `pnpm bootstrap`. Make T044 pass
- [X] T051 [US1] Implement `scripts/dev-all.mjs`: `docker compose -f infra/docker-compose.yml up -d --build --wait`, then run `scripts/smoke.mjs`, then print the URL table. Wire `pnpm dev:all`, `pnpm down` (`compose down`) and `pnpm reset` (`compose down -v`). Implement `pnpm dev` in `scripts/dev.mjs`: infrastructure services in Compose, apps through `turbo dev`. Make T042 pass against the running stack
- [X] T052 [US1] Implement `scripts/test-all.mjs` for `pnpm test`: `turbo test:unit`, then `turbo test:int`, then `pnpm --filter @pdfe/e2e-web test` only if `scripts/smoke.mjs` passes. It reports which layers ran
- [X] T053 [US1] Implement `scripts/ci/check-dep-exceptions.mjs`, with a `node:test` file `scripts/ci/check-dep-exceptions.test.mjs`. It reads the `pnpm audit --json` and Trivy JSON outputs and fails on any high or critical finding that is not in `docs/security/dependency-exceptions.md` with an unexpired date
- [X] T054 [US1] Create `.github/workflows/ci.yml`:
  - triggers: `pull_request`, `push` to `main`, and nightly `schedule`;
  - pnpm pinned explicitly (`corepack prepare pnpm@11.0.9 --activate`) and Node 22;
  - jobs `static` (`pnpm lint`, `pnpm typecheck`, `pnpm format:check`), `unit`, `deps` (`pnpm audit --audit-level=high`, a Trivy filesystem scan for HIGH and CRITICAL, then T053), `build` (`turbo build`, `docker compose build`), `integration` (`turbo test:int`) and `fresh-clone`;
  - `fresh-clone`: checkout into an empty directory, `pnpm bootstrap`, `pnpm dev:all`, smoke test, upload logs. It is path-filtered to `package.json`, `pnpm-lock.yaml`, `infra/**` and `scripts/bootstrap*`, and always runs nightly;
  - a final `ci` job with `needs` on every job and `if: always()`, which fails if any needed job failed or was cancelled.

  Follow `contracts/ci-checks.md`
- [X] T055 [US1] Write `docs/runbooks/local-setup.md`:
  - prerequisites: Windows 11 with Docker Desktop and WSL2, and Linux;
  - bootstrap;
  - the two run modes (`dev:all` versus `dev`) and what each proves;
  - ports;
  - reset;
  - troubleshooting: CRLF, Docker memory, port conflicts.

  Link it from `README.md`
- [ ] T056 [US1] Run `quickstart.md` §1 and §2 on the workstation. Write `docs/evidence/phase-2/fresh-clone.md` with the commands, the timings, the CI `fresh-clone` run link (filled in after the first green run) and an empty "Self-attestation" line for the owner
- [ ] T057 [US1] (human) After the first green `ci` run on `main`, add the `ci` check to the ruleset `main-protection-solo`. Save the exported ruleset as `docs/evidence/phase-2/ruleset.json`, and sign the self-attestation line in `docs/evidence/phase-2/fresh-clone.md`
- [ ] T058 [US1] (human) Following `quickstart.md` §10, open six scratch pull requests: a style error, a type error, a failing unit test, a fake AWS key, a non-allowlisted URL, and a pinned vulnerable dependency. Record each PR number and the check that blocked it in `docs/evidence/phase-2/blocked-prs.md`, then close the PRs

**Checkpoint**: SC-001 and SC-002 are met. PR 1 merges, and `main` is green with `ci` required.

---

## Phase 4: User Story 2 - The system cannot reach anything real (Priority: P1) — PR 2

**Goal**: only mock adapters can be configured; non-DEMO, non-mock or unknown adapter configurations refuse to start; live adapters fail before any I/O; there is no outbound network at three layers; the scan lists are extended.

**Independent Test**: `quickstart.md` §3, plus the scan fixtures failing on the scratch samples.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [x] T059 [P] [US2] Write `apps/api/test/startup-guard.spec.ts`, which spawns the built api with `--once` and the fixtures `apps/api/test/fixtures/adapters.{http-real,mock-unknown,missing-kind,unknown-kind}.json`. Expected results:
  - `APP_MODE=LIVE`, `APP_MODE` unset and `APP_MODE=demo` (wrong case) each exit 1 with `LIVE mode is not supported` or `APP_MODE must be DEMO`;
  - each adapter fixture exits 1, and the message names the offending key, for example `bank: http:real`;
  - `infra/adapters.demo.json` starts normally
- [x] T060 [P] [US2] Write `packages/platform-core/test/egress-guard.test.ts`. After `installEgressGuard(['localhost','127.0.0.1','api'])`:
  - `fetch`, `http.get`, `https.get`, `net.connect` and `tls.connect` to `example.com` and `1.1.1.1` reject with `EgressBlockedError` before any DNS lookup (spy on `dns.lookup`);
  - a local test server on `127.0.0.1` stays reachable
- [x] T061 [P] [US2] Write `apps/api/test/live-adapters.spec.ts`: every method of every `Disabled*Adapter` throws `LiveAdapterDisabledError` (code `LIVE_ADAPTER_DISABLED`), and no socket is opened (spy on `net.Socket.prototype.connect`)
- [x] T062 [P] [US2] Write `apps/api/test/adapter-registry.spec.ts`: registering a kind twice is refused; resolving an unregistered kind or type throws; `list()` returns `kind → type`, and every type starts with `mock:`
- [x] T063 [P] [US2] Add scan fixtures in the D-11 style under `scripts/safety/tests/fixtures/`. A runner, `scripts/safety/tests/run.sh`, asserts that the forbidden-pattern scan fails or passes as expected:
  - expected to fail: `rpc-mainnet/` (an RPC hostname fragment from the extended list), `iban-real-looking/`, `national-id/` (9 digits next to `ID` and next to `هوية`), `private-key/`;
  - expected to pass: `iban-sim/` (a `SIM-`-prefixed fixture)
- [x] T064 [P] [US2] Write `apps/mobile/scripts/check-api-base.test.mjs`. In the DEMO profile, `EXPO_PUBLIC_API_BASE_URL` values `http://10.0.2.2:4000` and `http://localhost:4000` pass, and `http://example.com` fails

### Implementation for User Story 2

- [x] T065 [US2] Implement `packages/platform-core/src/egress-guard.ts`:
  - `installEgressGuard(hosts)` sets an undici global dispatcher that rejects non-internal origins;
  - it patches `http.globalAgent`, `https.globalAgent`, `net.connect`, `net.createConnection` and `tls.connect`;
  - `EgressBlockedError` is added to `errors.ts`.

  Call it as the first statement of `apps/api/src/main.ts`, `apps/worker/src/main.ts` and `apps/mock-hub/src/main.ts`, with `INTERNAL_HOSTS`. Make T060 pass
- [x] T066 [US2] Implement `packages/platform-core/src/startup-guard.ts`:
  - `assertDemoMode(env)`;
  - `assertSafetyEnv(env)`: `INTERNAL_HOSTS` and the adapter allowlist equal the registry defaults of the safety-locked keys;
  - on failure, print `system.start_refused: <reason>` to stderr and exit 1.

  Call it in the api, worker and mock-hub mains before Nest starts. Add the `--once` flag to the api (`start:once` script: start, check, exit 0)
- [x] T067 [US2] Add `packages/domain-types/src/adapters.ts`: the 8 kinds and their port interfaces (`BankPort`, `PspPort`, `ChainPort`, `KycPort`, `SanctionsPort`, `FxPort`, `PricePort`, `NotificationPort`), each with `ping()` in Phase 2. Implement `apps/api/src/integration/adapter-registry.ts` (`register`, `resolve`, `list`). Make T062 pass
- [x] T068 [P] [US2] Implement the mock adapters in `apps/api/src/integration/adapters/mock/{bank,psp,chain,kyc,sanctions,fx,price,notification}.mock.ts`. Each calls `http://mock-hub:4100/mock/<kind>/ping`
- [x] T069 [P] [US2] Implement the disabled live adapters in `apps/api/src/integration/adapters/live/disabled-{bank,psp,chain,kyc,sanctions,fx,price,notification}.adapter.ts`. Every method throws `LiveAdapterDisabledError`, and they are never registered in DEMO. Make T061 pass
- [x] T070 [US2] Implement `apps/api/src/integration/adapter-config.loader.ts`. It reads `ADAPTERS_CONFIG` and refuses an unknown kind, a missing kind, a type outside `mock:*` or a type with no implementation, naming the key. Create `infra/adapters.demo.json` as in `contracts/runtime-config.md`. `GET /v1/health` lists the adapter types. Make T059 pass
- [x] T071 [US2] Write `db/migrations/0002_integration.sql` with `integration.partner_adapters` (`adapter_type CHECK (adapter_type LIKE 'mock:%')`). At start, the registry upserts one row per configured kind
- [x] T072 [US2] Change `infra/docker-compose.yml` to two networks:
  - `app` (`internal: true`): every service except the gateway;
  - `edge`: the gateway.

  Add the `gateway` service (Caddy) with `infra/Caddyfile`, which proxies `localhost:3001–3006` to the web apps and `localhost:4000` to the api. Remove every directly published port. Postgres, Redis, worker and mock-hub are never published
- [x] T073 [US2] Implement `scripts/egress-probe.mjs` (`pnpm egress:probe`). With `docker compose exec`, it runs the three probes from `contracts/ci-checks.md` §Egress probes inside api, worker and mock-hub. It writes `egress-report.txt` and exits non-zero if any probe succeeds
- [x] T074 [US2] Implement `apps/mobile/scripts/check-api-base.mjs` and run it in the mobile `prebuild` and `test` scripts. Make T064 pass
- [x] T075 [US2] Extend `scripts/safety/forbidden-patterns.txt` with the patterns from `contracts/ci-checks.md` §Repository scans:
  - RPC host fragments;
  - real bank API host fragments;
  - an IBAN-like pattern;
  - a national-ID-like pattern next to `ID` or `هوية`.

  Add an exclusion for `SIM-`-prefixed fixture values. Run `scripts/safety/tests/run.sh` in the `governance-check` job of `.github/workflows/governance.yml`. Make T063 pass, and keep `check-phase0.sh` at 17/17
- [x] T076 [US2] Update `.github/workflows/ci.yml`:
  - add an `egress` job (path-filtered to `infra/**`, `apps/api/**`, `apps/worker/**`, `apps/mock-hub/**`, and nightly) that starts the stack, runs `pnpm egress:probe` and uploads `egress-report.txt`;
  - add a `startup-guard` step inside `integration`;
  - add both to the `needs` of `ci`
- [x] T077 [US2] Run `quickstart.md` §3 locally. Commit the probe output as `docs/evidence/phase-2/egress-report.txt` and the startup-guard output as `docs/evidence/phase-2/startup-guard.md`. Add a "Safety boundary" section to `docs/runbooks/local-setup.md` saying that `pnpm dev` has only the code-level guard

**Checkpoint**: SC-003 and SC-004 are met. US2 acceptance 5 (safety-locked settings cannot be edited through configuration) is completed in US7 (T152), because the configuration API does not exist yet. The environment-level lock (T066) is in place now.

---

## Phase 5: User Story 3 - Roles, second factor, tenant isolation, separation of duties and maker-checker (Priority: P1) — PR 3

**Goal**:
- Keycloak sign-in with the §J.3 roles and OTP for privileged roles;
- least-privilege permission guards;
- RLS on every tenant-owned table;
- read-only, audited elevation;
- separation-of-duties checks at grant time;
- a reusable maker-checker capability, with no self-approval enforced in the service and in the database;
- idempotency, outbox and rate limits as shared behaviour;
- audit through a minimal append-only writer, which US4 completes.

**Independent Test**: `quickstart.md` §4 steps 1–3 and §5 steps 2–3 at API level; `pnpm --filter @pdfe/api test:int` is green, including `authz.matrix.spec.ts`.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [x] T078 [P] [US3] Write `packages/domain-types/test/rbac.test.ts`:
  - every permission in `data-model.md` §RBAC exists and has its holders;
  - the privileged set is exactly the 9 console roles;
  - every SoD pair is stored in both orders;
  - `auditor` conflicts with every role holding a write permission;
  - no single role's permissions span the three triple-rule groups;
  - every `action_type` has an approve permission
- [x] T079 [P] [US3] Write `apps/api/test/rls.int.spec.ts`. For every table with `tenant_id`:
  - a transaction with `app.tenant_id = A` reads 0 rows of tenant B;
  - an insert with `tenant_id = B` fails the `WITH CHECK`;
  - a missing `app.tenant_id` reads 0 rows;
  - `app_role` has `rolbypassrls = false`
- [x] T080 [P] [US3] Write `apps/api/test/approvals.int.spec.ts`:
  - self-approval is refused by the service (409 `SELF_APPROVAL`), and a direct SQL insert into `iam.approval_decisions` with `decided_by = requested_by` is refused by the trigger;
  - a decider without the approve permission gets 403;
  - a changed payload gives 409 `PAYLOAD_CHANGED`, an expired request 409 `EXPIRED`, and a cancelled or decided one 409 `NOT_PENDING`;
  - two concurrent approvals give exactly one outcome;
  - with `required_approvals = 2`, a cancel after the first approval leaves the request cancelled;
  - if an approver loses the permission while a request is pending, their decision is refused;
  - every step records exactly one audit event
- [x] T081 [P] [US3] Write `apps/api/test/sod.int.spec.ts`:
  - granting a role that conflicts with a held role is refused by the service (409 `SOD_CONFLICT`, listing both roles) and by the `trg_user_roles_sod` trigger on a direct insert;
  - the triple rule is refused;
  - the refusal is audited (`iam.role.grant_refused_sod`)
- [x] T082 [P] [US3] Write `apps/api/test/mfa.int.spec.ts`, using Testcontainers Keycloak with the realm import:
  - a privileged user's token without `otp` in `amr` gets 401 `MFA_REQUIRED` on every protected route, and the denial is audited (`auth.signin_denied_mfa`);
  - with a TOTP from the fixed secret, access works;
  - a non-privileged user works without a second factor
- [x] T083 [P] [US3] Write `apps/api/test/elevation.int.spec.ts`:
  - starting needs `tenant.elevate` and a reason of at least 10 characters;
  - a second active elevation gives 409 `ELEVATION_ACTIVE`;
  - reads return the target tenant's rows;
  - any POST during an elevation is refused (409 `ELEVATION_READ_ONLY` from the guard), and a direct write inside the read-only transaction fails;
  - after the expiry passes mid-session, the next read returns 403 and no data;
  - ending works;
  - audit records `tenant.elevation_started`, one `tenant.elevated_read` per read, and `tenant.elevation_ended`
- [x] T084 [P] [US3] Write `apps/api/test/idempotency.int.spec.ts`:
  - a POST without `Idempotency-Key` gets 400 `IDEMPOTENCY_KEY_REQUIRED`;
  - the same key and body replay the original status and body;
  - the same key with a different body gets 422 `IDEMPOTENCY_KEY_REUSED`;
  - a concurrent duplicate gets 409 `IDEMPOTENCY_IN_PROGRESS`;
  - after the TTL, the key can be reused
- [x] T085 [P] [US3] Write `apps/api/test/outbox.int.spec.ts`:
  - an event is written in the same transaction as its cause, and a rollback leaves no event;
  - two concurrent relays publish each event once (`SKIP LOCKED`);
  - a consumer receiving the same event twice processes it once
- [x] T086 [P] [US3] Write `apps/api/test/rate-limit.int.spec.ts`: going over `api.rate_limit.per_user_per_minute` returns 429 `RATE_LIMITED` with `Retry-After`, the event is logged, and the per-IP limit applies to unauthenticated routes
- [x] T087 [P] [US3] Write `apps/api/test/audit-minimal.int.spec.ts`:
  - an approved role grant produces exactly one `iam.role.granted` event with actor, role, tenant, action, target, reason, time, correlation ID and approval reference;
  - a forced audit insert failure rolls the grant back;
  - `UPDATE` and `DELETE` on `audit.audit_events` as `app_role` fail
- [x] T088 [P] [US3] Write `packages/auth-web/test/session.test.ts`: the session cookie is `HttpOnly` and `SameSite=Lax` and encrypted; the access token never appears in any server-component prop or response body sent to the browser; sign-out clears the session
- [x] T089 [US3] Write `apps/api/test/authz.matrix.spec.ts`. It discovers every route through Nest `DiscoveryService` and every role from `rbac.ts`, and asserts the expected status for each route × role × {with second factor, without} × {own tenant, other tenant}. A route with no matrix entry fails the suite. It covers only the routes that exist; later stories extend it in the same task that adds a route

### Implementation for User Story 3

- [x] T090 [US3] Implement `packages/domain-types/src/rbac.ts`:
  - the 15 roles from spec Story 3, each with `privileged`;
  - the permissions from `data-model.md` §RBAC plus the §J.3 starter permissions, each with `high_risk`;
  - `rolePermissions`;
  - `sodConflicts` (symmetric);
  - `tripleRuleGroups`;
  - `approvePermissionFor` (`iam.role.grant` and `iam.role.revoke` → `iam.role.grant.approve`; `config.change` and `config.rollback` → `config.approve`).

  Make T078 pass
- [x] T091 [US3] Write `db/migrations/0003_iam.sql`:
  - `iam.users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `sod_conflicts`, `approval_requests`, `approval_decisions` and `tenant_elevations`, as in `data-model.md`, including the partial unique index for one active elevation per user;
  - trigger `trg_no_self_approval`;
  - trigger `trg_user_roles_sod`, covering the conflicts and the triple rule, with an error that names the roles;
  - SECURITY DEFINER function `iam.list_users_all()`, which returns non-PII directory columns and is executable only by `app_role`; the service calls it only for `platform_admin`
- [x] T092 [US3] Write `db/migrations/0004_idempotency_outbox.sql`: `integration.idempotency_keys` (with `response_status`), `integration.outbox` (partial index `WHERE published_at IS NULL`) and `integration.inbox` (`consumer`, `event_id`, PK on both, for consumer de-duplication)
- [x] T093 [US3] Write `db/migrations/0005_audit.sql`:
  - `audit.audit_events` as in `data-model.md`, including `elevation_id` and the indexes;
  - a BEFORE UPDATE OR DELETE trigger that raises `audit is append-only`;
  - grants: `app_role` INSERT and SELECT only, `readonly_role` SELECT
- [x] T094 [US3] Write `db/migrations/0006_rls_grants.sql`:
  - `ENABLE` and `FORCE ROW LEVEL SECURITY`, with the policy from `data-model.md` §RLS, on `platform.legal_entities`, `platform.organizations`, `iam.users`, `iam.approval_requests` and `integration.idempotency_keys`;
  - table grants for `app_role` and `readonly_role`;
  - `TRUNCATE` on the demo-resettable tables for `demo_reset_role`, and `GRANT demo_reset_role TO app_role`.

  Make T079 pass
- [x] T095 [US3] Implement `packages/platform-core/src/migrate/reference-data.ts`, run by the migration CLI after the migrations. Using the migrator connection, it idempotently upserts `iam.roles`, `iam.permissions`, `iam.role_permissions` and `iam.sod_conflicts` from `rbac.ts`
- [x] T096 [US3] Add Drizzle schemas `apps/api/src/db/schema/{iam,integration,audit}.ts`
- [x] T097 [US3] Create `infra/keycloak/realm-pdfe-demo.json` for realm `pdfe-demo`:
  - confidential BFF clients `web-consumer` … `web-devportal`, with `localhost:300N` redirect URIs;
  - a public PKCE client `mobile`, with redirect `pdfe://auth`;
  - a `pdfe-tests` client with direct grant, used only by tests and scripts;
  - a user-attribute mapper `tenant_id`;
  - a `privileged` group with a conditional OTP browser flow, and `amr` in the token;
  - demo users with the fixed subjects from `contracts/scenario-manifest.md` (one per role, plus `demo.admin.a` and `demo.admin.b`), synthetic passwords, and fixed synthetic TOTP secrets for privileged users
- [x] T098 [P] [US3] Write `infra/keycloak/README.md` with the synthetic demo credential table, clearly marked synthetic. Implement `scripts/totp.mjs` (`pnpm totp <username>`), which prints the current code from the fixed secret
- [x] T099 [US3] Add `keycloak` to `infra/docker-compose.yml`:
  - `start-dev --import-realm` with the realm and themes mounted;
  - on the `app` and `edge` networks;
  - healthcheck.

  Add `localhost:8080` to `infra/Caddyfile`
- [x] T100 [US3] Create `packages/test-kit/src/{keycloak.ts,tokens.ts,app.ts}`:
  - a Testcontainers Keycloak with the realm import;
  - `tokenFor(username, { otp })` through `pdfe-tests`;
  - `createTestApp()`, which boots the api against containers and runs migrations and reference data
- [x] T101 [US3] Implement `apps/api/src/identity/`:
  - `jwt.verifier.ts`: JOSE remote JWKS from `OIDC_ISSUER`; it accepts the internal and the public issuer;
  - `auth.guard.ts`: builds the request principal (user, tenant, roles, permissions, `mfa`);
  - `mfa.guard.ts`: a privileged role without `otp` gets 401 `MFA_REQUIRED`, audited;
  - `require-permission.decorator.ts` with its guard;
  - an `auth.signin` audit event the first time each session ID is seen.

  Make T082 pass
- [x] T102 [US3] Implement `GET /v1/me` in `apps/api/src/identity/me.controller.ts`, returning user, tenant, roles, permissions, `mfa` and the active elevation. Add its matrix entries
- [x] T103 [US3] Implement `apps/api/src/tenancy/tenant-context.interceptor.ts`. It opens each request transaction through `withTx`, with the tenant from the token, or with the elevation target, `READ ONLY` and `app.elevation_id` when an elevation is active and not expired. Add `assertSameTenant()` as the second, code-level check
- [x] T104 [US3] Implement `apps/api/src/tenancy/elevation.{service,controller}.ts`:
  - routes `POST /v1/elevations`, `GET /v1/elevations/current` and `POST /v1/elevations/{id}/end`;
  - the TTL comes from `ConfigReader` `security.elevation.ttl_minutes`;
  - `elevated-read.interceptor.ts` records one `tenant.elevated_read` per read;
  - a guard refuses mutating methods during an elevation.

  Add the matrix entries. Make T083 pass
- [x] T105 [US3] Implement `apps/api/src/audit/audit.writer.ts`, the minimal writer. `record(tx, event)` validates the required fields, takes `pg_advisory_xact_lock(hashtext('audit'))`, computes `prev_hash` and `hash` with `canonical-json` and `sha256Hex`, and inserts in the caller's transaction. US4 adds the shared chain module, verification, anchors and export. Make T087 pass
- [x] T106 [US3] Implement `apps/api/src/integration/idempotency.middleware.ts`, covering POST, PUT, PATCH and DELETE under `/v1`, with key validation, the request hash, replay, 422, 409 and TTL from `idempotency.ttl_hours`. Make T084 pass
- [x] T107 [US3] Implement the outbox:
  - `apps/api/src/integration/outbox.writer.ts`, which writes in the caller's transaction;
  - `apps/worker/src/outbox-relay/outbox-relay.job.ts`, which uses `FOR UPDATE SKIP LOCKED` to send to BullMQ queues by topic and sets `published_at` and `attempts`, with backoff and an alert log after 10 failures;
  - `packages/platform-core/src/queue/consumer.ts`, a base consumer that de-duplicates through `integration.inbox`.

  Make T085 pass
- [x] T108 [US3] Add rate limiting: `@nestjs/throttler` with Redis storage, per user and per IP, values from `api.rate_limit`, the 429 envelope with `Retry-After`, and a log line. Make T086 pass
- [x] T109 [US3] Implement `apps/api/src/approvals/`:
  - `approvals.service.ts`:
    - create: `payload_hash` from RFC 8785, expiry from `approvals.default_expiry_hours`, audit `approval.created`, outbox `approval.requested`;
    - decide: `SELECT … FOR UPDATE` and every refusal rule from `data-model.md` §Lifecycles, audit `approval.decided`, outbox `approval.approved` or `approval.rejected`;
    - cancel;
  - `approvals.controller.ts`, with the four routes from `contracts/http-api.md`;
  - `approval-handler.registry.ts`, where owning modules register a handler per `action_type`; each handler runs once per `approval_id` through the inbox.

  Add the matrix entries. Make T080 pass
- [x] T110 [P] [US3] Implement `apps/worker/src/approvals-expiry/expiry.job.ts` (marks expired requests, audit `approval.expired`, outbox `approval.expired`) and `apps/worker/src/elevation-expiry/expiry.job.ts` (sets `ended_at` and `end_reason = expired`, audit `tenant.elevation_ended`), both using the injected `ClockService`
- [x] T111 [US3] Implement `apps/api/src/identity/iam.{service,controller}.ts`:
  - `GET /v1/iam/users`: own tenant, or `iam.list_users_all()` for `platform_admin`;
  - `GET /v1/iam/roles`;
  - `POST /v1/iam/users/{id}/role-grants` and `role-revocations`: an SoD pre-check returns 409 `SOD_CONFLICT`, otherwise an approval request is created;
  - handlers for `iam.role.grant` and `iam.role.revoke` re-check SoD and apply the change, with the trigger as backstop, auditing `iam.role.granted`, `iam.role.revoked` or `iam.role.grant_refused_sod`.

  Add the matrix entries. Make T081 pass
- [x] T112 [US3] Implement a provisional development seed in `apps/api/src/demo/dev-seed.ts` (`pnpm --filter @pdfe/api seed:dev`, DEMO only). Through the services, it creates the three tenants, the demo organization, and one user per realm demo user with their role grants, using the `system:seed` path. US8 replaces it (T171)
- [x] T113 [US3] Implement `packages/auth-web` (`@pdfe/auth-web`):
  - route-handler factories for `/api/auth/sign-in`, `/api/auth/callback` and `/api/auth/sign-out` (`openid-client`, Authorization Code + PKCE);
  - an `iron-session` session;
  - `getSession()`;
  - `apiFetch()`, which runs server-side only and adds the bearer token, `X-Correlation-Id` and a generated `Idempotency-Key` on mutations.

  Wire it into `app/api/auth/*` and `app/[locale]/sign-in/page.tsx` of all six web apps (unthemed; US9 styles it). Make T088 pass
- [x] T114 [US3] Generate the OpenAPI document: `apps/api/scripts/openapi.ts` writes `packages/contracts/openapi.json` (`nestjs-zod`, OpenAPI 3.1). Add `packages/contracts/orval.config.ts`, which generates typed clients into `packages/contracts/src/clients/`, and `.spectral.yaml`. In `.github/workflows/ci.yml` `static`, add Spectral lint plus a drift check (regenerate and `git diff --exit-code`)
- [x] T115 [US3] Add Keycloak to the `integration` job in `.github/workflows/ci.yml`, through Testcontainers with the realm import from `infra/keycloak/realm-pdfe-demo.json`. Make T089 pass across every current route
- [x] T116 [US3] Record the design deltas found while implementing this story:
  - `contracts/http-api.md`: `IDEMPOTENCY_KEY_REQUIRED`, `ELEVATION_READ_ONLY`, and the platform-admin user directory;
  - `data-model.md`: `integration.inbox`, `iam.list_users_all()`

**Checkpoint**: SC-005, SC-006 and SC-007 are met.

---

## Phase 6: User Story 4 - Tamper-evident audit trail (Priority: P1) — PR 4

**Goal**: the full hash chain with anchors and epochs, verification naming the first broken event, search, and labelled export. This replaces the minimal writer.

**Independent Test**: `quickstart.md` §6; T117–T120 green.

### Tests for User Story 4 ⚠️ (write first, must fail)

- [x] T117 [P] [US4] Write `apps/api/test/audit.tamper.int.spec.ts` on a disposable database. Each change is made by a superuser connection after disabling the trigger, and the verify result is checked:
  - an altered field gives `{ result: broken, seq, reason: hash_mismatch }` at that `seq`;
  - a deleted event gives `seq_gap`;
  - two swapped events give `prev_link_mismatch`;
  - an altered anchor gives `anchor_mismatch`, reported separately;
  - an untouched store gives `ok`
- [x] T118 [P] [US4] Write `apps/api/test/audit.concurrency.int.spec.ts`: 50 concurrent privileged actions produce 50 events with consecutive `seq`, and verification gives `ok`
- [x] T119 [P] [US4] Write `apps/api/test/audit.search-export.int.spec.ts`:
  - filters for actor, action, tenant, `from`/`to` and `correlation_id` return exactly the matching events;
  - the cursor pagination limit is at most 100;
  - the CSV export's first line is `# ` + `SIM_LABEL`, and JSON has `meta.label`;
  - the export itself is audited (`audit.exported`), and so is verification (`audit.verified`);
  - users without `audit.read`, `audit.export` or `audit.verify` get 403
- [x] T120 [P] [US4] Write `apps/api/test/audit.coverage.int.spec.ts`. For every audit action in `contracts/events-and-config.md` §Audit actions that is implemented so far, it triggers the action once and asserts exactly one event with every required field. A table in the spec lists actions not yet implemented; later stories remove entries from it

### Implementation for User Story 4

- [x] T121 [US4] Write `db/migrations/0007_audit_anchors.sql`: `audit.anchors` (`id`, `up_to_seq`, `hash`, `kind` ∈ {periodic, epoch_start}, `epoch_label`, `created_at`), append-only like `audit_events`, with the same grants. Record the `kind` and `epoch_label` delta in `data-model.md`
- [x] T122 [US4] Implement `apps/api/src/audit/audit.chain.ts`: `serializeForHash(row)` (canonical JSON of the row without `seq` and `hash`) and `chainHash(prevHash, row)`, shared by the writer and the verifier. Refactor `audit.writer.ts` into the final `AuditService.record()` on top of it
- [x] T123 [US4] Implement `apps/api/src/audit/audit.verifier.ts`. It streams the events in `seq` order over a range, or from an epoch anchor, and checks the hash, the previous link, `seq` gaps and anchors, returning the first failure with its reason. Make T117 and T118 pass
- [x] T124 [US4] Implement `apps/worker/src/audit-anchor/anchor.job.ts`: an anchor every 100 events or every hour, whichever comes first, with the injected `ClockService`
- [x] T125 [US4] Implement `apps/api/src/audit/audit.controller.ts`: `GET /v1/audit/events`, `POST /v1/audit/verify` and `GET /v1/audit/export?format=csv|json` (streamed, labelled through `sim-label`, and audited). Add the matrix entries. Make T119 and T120 pass

**Checkpoint**: SC-008 is met.

---

## Phase 7: User Story 5 - Every screen and file says SIMULATION (Priority: P1) — PR 5

**Goal**: the final non-dismissible banner on web, mobile and the Keycloak pages; labelled exports, documents and notifications; route manifests; label checks that fail the build.

**Independent Test**: the `e2e-web` label spec and the `mobile` label flows are green in both languages; the negative fixture fails as expected.

### Tests for User Story 5 ⚠️ (write first, must fail)

- [x] T126 [P] [US5] Create the workspace package `tests/e2e-web` (`@pdfe/e2e-web`):
  - `playwright.config.ts`, with one project per app, `baseURL` on `localhost:300N`, and Chromium only;
  - `src/routes.ts`, which loads every app's `routes.manifest.ts`;
  - `src/sign-in.ts`, which signs in through the Keycloak UI with `pnpm totp` codes for privileged roles;
  - `src/banner-check.ts`, which asserts that `[data-sim="1"]` is visible with `role="status"`, that its text equals `SIM_LABEL_EN` (en) or `SIM_LABEL_AR` (ar), and that `document.elementFromPoint` at the banner's centre is inside the banner
- [x] T127 [P] [US5] Write `tests/e2e-web/specs/label.spec.ts`. For each route in each manifest, × {ar, en}, signed in as the route's role, it runs `banner-check`, and a failure names the app and route. It also signs in through Keycloak and checks the banner on the Keycloak login and OTP pages
- [x] T128 [P] [US5] Write `tests/e2e-web/specs/label-negative.spec.ts` with fixtures `tests/e2e-web/fixtures/{no-banner,covered-banner,altered-text}.html`. `banner-check` must fail on each one, which proves that removing or covering the label fails the build
- [x] T129 [P] [US5] Write `scripts/ci/check-route-manifests.test.mjs` (`node:test`, with a temporary app fixture): a `page.tsx` on disk with no manifest entry fails, and so does a manifest entry with no page
- [x] T130 [P] [US5] Write `packages/platform-core/test/sim-label-exports.test.ts`:
  - `csvWithLabel` puts `# SIM_LABEL` on line 1;
  - `jsonWithLabel` puts `meta.label`;
  - `pdfWithWatermark` produces a PDF whose extracted text contains both label strings on every page;
  - `notificationWithLabel` prefixes the subject and body
- [x] T131 [P] [US5] Write `packages/ui-web/test/SimulationBanner.final.test.tsx`:
  - a type test (`expect-type`) shows that the component accepts no props;
  - the banner sits above the Radix portal container in the DOM order and in its z-index token;
  - the `SimShell` root layout always renders it
- [x] T132 [P] [US5] Write the Maestro label flows `apps/mobile/maestro/label-{home,pay,send,markets,profile}-{ar,en}.yaml` (10 flows). Each opens the tab in the language and asserts that the exact banner text is visible

### Implementation for User Story 5

- [x] T133 [US5] Finalize `packages/ui-web/src/SimulationBanner.tsx`:
  - sticky, full-width, uses tokens, `role="status"`, `data-sim="1"`, no props;
  - add `packages/ui-web/src/SimShell.tsx`, the root layout wrapper with the banner outside the content and the portal container below it;
  - in `packages/config/eslint.config.base.mjs`, add `no-restricted-imports` so that page code under `apps/web-*/app/**` (except `app/[locale]/layout.tsx`) cannot import the bare layout primitives.

  Switch all six root layouts to `SimShell`. Make T131 pass
- [x] T134 [P] [US5] Finalize `packages/ui-native/src/SimulationBanner.tsx` and `apps/mobile/app/_layout.tsx` (above the navigator and every modal stack, with an accessibility label equal to the text)
- [x] T135 [US5] Add the export helpers to `packages/platform-core/src/sim-label.ts`: `csvWithLabel`, `jsonWithLabel`, `pdfWithWatermark` (using `pdf-lib`; note the dependency in the ADR-002 implementation notes) and `notificationWithLabel`. Use them in the audit export and in the log-only notification consumer of `approval.requested`. Make T130 pass
- [x] T136 [US5] Create the Keycloak theme `infra/keycloak/themes/pdfe/login/`: `theme.properties`, a `template.ftl` override that renders the bilingual banner above every login page, and `messages_{ar,en}.properties`. Set `loginTheme: pdfe` in the realm. Full token styling comes in US9
- [x] T137 [P] [US5] Create `src/routes.manifest.ts` in all six web apps, with the routes from `contracts/ui-shell.md` §Routes as they exist now. Each entry has `path`, `roles`, `states` and `baseline` where a Phase 2 screen ID exists
- [x] T138 [US5] Implement `scripts/ci/check-route-manifests.mjs`, which scans `apps/web-*/app/**/page.tsx` against each manifest, and add it to the `static` job in `.github/workflows/ci.yml`. Make T129 pass
- [x] T139 [US5] Add an `e2e-web` job to `.github/workflows/ci.yml`:
  - path-filtered to `apps/web-*/**`, `packages/ui-web/**`, `packages/i18n/**`, `infra/keycloak/**`, and nightly;
  - starts the stack, runs `seed:dev` (until T171), installs Playwright Chromium, and runs `label.spec.ts` and `label-negative.spec.ts`;
  - uploads the report;
  - is added to `ci` needs.

  Make T127 and T128 pass
- [x] T140 [US5] Add a `mobile` job to `.github/workflows/ci.yml`:
  - path-filtered to `apps/mobile/**`, `packages/ui-native/**`, `packages/i18n/**`, and nightly;
  - `expo prebuild --platform android`, then a Gradle debug APK;
  - `reactivecircus/android-emulator-runner` (API 34), install the APK, `maestro test apps/mobile/maestro/`;
  - is added to `ci` needs.

  Make T132 pass

**Checkpoint**: SC-011 is met for the routes that exist. US9 adds routes, and the manifest check forces them into the crawl.

---

## Phase 8: User Story 6 - Follow one action across every component (Priority: P2) — PR 6

**Goal**:
- correlation IDs flow through requests, jobs and adapter calls into logs, traces, metrics, audit and user errors;
- logs are redacted;
- the local Grafana dashboard finds everything by ID.

**Independent Test**: `quickstart.md` §9.

### Tests for User Story 6 ⚠️ (write first, must fail)

- [x] T141 [P] [US6] Write `packages/platform-core/test/logger-redaction.test.ts`:
  - `display_name`, `full_name`, `name`, `Authorization`, `cookie`, `password`, `secret`, `token`, `totp`, document-number-like values (9 or more digits) and IBAN-like values become `[REDACTED]`;
  - `correlation_id` and `trace_id` are present on every line
- [x] T142 [P] [US6] Write `apps/api/test/correlation.int.spec.ts`:
  - a header that is too long or has invalid characters is replaced, and the raw value never appears in the captured logs;
  - the ID reaches the BullMQ job data, the worker's logs, the `X-Correlation-Id` header of the mock adapter call, the mock-hub log, the audit event and the error envelope
- [x] T143 [P] [US6] Write `tests/e2e-web/specs/correlation.spec.ts`:
  - `/{locale}/error?simulate=500` in web-consumer shows a correlation ID with a copy button;
  - the Grafana API through `localhost:3000` (datasource proxy for Loki and Tempo, and the Postgres audit datasource) finds the log lines, the trace and the audit event for that ID

### Implementation for User Story 6

- [x] T144 [US6] Implement `packages/platform-core/src/telemetry.ts`, an OpenTelemetry NodeSDK (HTTP, pg, ioredis and undici instrumentations; OTLP to `OTEL_EXPORTER_OTLP_ENDPOINT`; `correlation_id` as a span attribute and metric exemplar). Start it before Nest in the api, worker and mock-hub mains
- [x] T145 [US6] Implement `packages/platform-core/src/logger.ts`: Pino with redact paths and a pattern redactor, and a mixin adding `correlation_id`, `trace_id` and `span_id`. Replace the Nest logger in all three services. Make T141 pass
- [x] T146 [US6] Complete propagation:
  - `packages/platform-core/src/queue/producer.ts`, which puts `correlation_id` into job data, and the consumer base, which restores the context;
  - mock adapters send `X-Correlation-Id`;
  - `apps/mock-hub/src/core/correlation.middleware.ts`.

  Make T142 pass
- [x] T147 [US6] Add `POST /v1/demo/simulate-error` (`me.read`, DEMO only). It records audit `demo.error_simulated`, then returns a 500 envelope. Add the matrix entry, and add the route and audit action to `contracts/http-api.md` and `contracts/events-and-config.md`
- [x] T148 [US6] Add `packages/ui-web/src/ErrorView.tsx` (the message from `message_key`, the correlation ID inside `<bdi>`, and `CopyButton`). Add the `/[locale]/error` route in all six web apps; in DEMO it calls the simulate endpoint when `simulate=500` is set. `apiFetch` forwards the `correlation_id` to the error page. Update the route manifests
- [x] T149 [US6] Add `lgtm` (`grafana/otel-lgtm`) to `infra/docker-compose.yml` on the `app` network, and Grafana `localhost:3000` to `infra/Caddyfile`. Add the provisioning files `infra/grafana/provisioning/{datasources,dashboards}/*.yaml` (Loki, Tempo, Prometheus, and Postgres as `readonly_role`) and the dashboard `infra/grafana/dashboards/correlation.json` (variable `correlation_id`; panels for logs, trace search, audit rows and job logs). Make T143 pass
- [x] T150 [US6] Write `docs/evidence/phase-2/correlation.md` with the `quickstart.md` §9 walkthrough: the ID, screenshots of the dashboard, and the redaction check

**Checkpoint**: SC-012 is met.

---

## Phase 9: User Story 7 - Safe, reversible configuration (Priority: P2) — PR 7

**Goal**: settings with versions, effective dates, approval, diff and rollback; safety-locked keys that cannot be edited; a database-backed `ConfigReader`.

**Independent Test**: `quickstart.md` §5 at API level; T151–T153 green.

### Tests for User Story 7 ⚠️ (write first, must fail)

- [x] T151 [P] [US7] Write `apps/api/test/config.int.spec.ts`:
  - a proposal leaves the active value unchanged;
  - self-approval is refused, and approval by admin B activates the value;
  - a future `effective_from` makes the version `scheduled`, and the worker activates it, with the previous one `superseded`;
  - with two pending proposals for the same key, approving one makes the other `stale`;
  - rollback creates a new version with `rollback_of_version`, through approval;
  - a rollback target that fails the current schema gets 422;
  - an out-of-range value gets 422 `CONFIG_INVALID` with `details`;
  - a write to `app.mode`, `adapters.allowlist` or `egress.internal_hosts` gets 409 `CONFIG_SAFETY_LOCKED` and audit `config.refused_locked`;
  - `diff` returns the JSON Patch;
  - every step is audited
- [x] T152 [P] [US7] Write `apps/api/test/config-safety-env.spec.ts`. The api exits 1 at start when `APP_MODE`, `INTERNAL_HOSTS` or the adapter allowlist differ from the safety-locked rows (US2 acceptance 5 and FR-010)
- [x] T153 [P] [US7] Write `packages/platform-core/test/json-patch.test.ts`: `diff(a, b)` gives an RFC 6902 patch that, applied to `a`, gives `b` (fast-check over JSON values)

### Implementation for User Story 7

- [x] T154 [US7] Write `db/migrations/0008_config.sql`:
  - `config.config_items`;
  - `config.config_versions`, with statuses draft, pending_approval, scheduled, active, superseded, rejected and stale; UNIQUE (`key`, `version`) and a partial unique index on `active`;
  - grants
- [x] T155 [US7] Extend `packages/platform-core/src/migrate/reference-data.ts`. It upserts `config.config_items` from `config-registry.ts` (JSON Schema exported from Zod), and for any key with no version it creates version 1 `active` with the default, attributed to `system:bootstrap`
- [x] T156 [P] [US7] Implement `packages/platform-core/src/json-patch.ts`. Make T153 pass
- [x] T157 [US7] Implement `apps/api/src/config/config.service.ts`:
  - `propose`: Zod validation, safety-lock refusal, an approval `config.change`, audit `config.proposed`;
  - `rollback`: re-validation against the current schema, an approval `config.rollback`;
  - approval handlers: activate now or schedule, supersede the previous version, mark other pending versions `stale`, audit `config.activated` or `config.rolled_back`, outbox `config.activated`;
  - `diff`.

  Add `DbConfigReader`, which replaces `DefaultsConfigReader`, with a cache invalidated on `config.activated`
- [x] T158 [US7] Implement `apps/api/src/config/config.controller.ts` with the five routes from `contracts/http-api.md` (safety-locked items marked `editable: false`). Add the matrix entries. Make T151 pass
- [x] T159 [US7] Implement `apps/worker/src/config-activation/activation.job.ts`. Every minute, using the injected `ClockService`, it activates due `scheduled` versions, supersedes the previous ones, and records audit and the outbox event
- [x] T160 [US7] Extend the startup guard (`packages/platform-core/src/startup-guard.ts`, used by the api) to compare the env values with the safety-locked rows once the database is reachable, and to record `system.start_refused` in audit when it refuses. Make T152 pass

**Checkpoint**: SC-009 is met, and so is US2 acceptance 5.

---

## Phase 10: User Story 8 - Deterministic reset and seed (Priority: P2) — PR 8

**Goal**: versioned, checksummed scenario manifests; reset and seed through the services with seeded clock, ID and random sources; a digest and report; mock-hub control; `baseline-v1`.

**Independent Test**: `quickstart.md` §7; the CI digest equals the committed digest.

### Tests for User Story 8 ⚠️ (write first, must fail)

- [x] T161 [P] [US8] Write `packages/domain-types/test/scenario.test.ts`: the schema accepts `db/seeds/scenarios/baseline/v1.yaml`, and rejects an unknown tenant reference, a user whose roles conflict (SoD), a duplicate subject and a non-integer money config value
- [x] T162 [P] [US8] Write `apps/api/test/determinism.int.spec.ts`. On fresh containers, `baseline v1` with seed 42 is run twice with a reset in between: the two digests are equal and equal `db/seeds/scenarios/baseline/v1.digest-seed42.txt`. Seed 43 gives a different digest
- [x] T163 [P] [US8] Write `apps/api/test/scenario.int.spec.ts`:
  - a changed manifest gets 409 `MANIFEST_CHECKSUM_MISMATCH`;
  - a concurrent run gets 409 `RUN_IN_PROGRESS`;
  - outside DEMO, the run is refused;
  - only `platform_admin` and `ops_analyst` may run (through the matrix);
  - a fault injected after the users are created leaves the tables in the reset state and the run `failed` with an error code;
  - the report lists the counts and IDs per table;
  - audit records `scenario.run_started` and `scenario.run_finished`, and the run starts an `epoch_start` anchor;
  - `audit/verify` from that anchor gives `ok`
- [x] T164 [P] [US8] Write `apps/api/test/determinism-bypass.int.spec.ts`. During a run, a tripwire around `Date.now`, `Math.random` and `crypto.randomUUID` (installed only inside the run's context) fails the run when any code path calls one of them directly
- [x] T165 [P] [US8] Write `apps/mock-hub/test/control.spec.ts`: `POST /mock/_control` sets `latency_ms`, `failure_rate` (seeded) and a `script[]` of outcomes per kind; ping follows the configured behaviour; the control endpoint is refused unless called with the internal scenario token

### Implementation for User Story 8

- [x] T166 [US8] Write `db/migrations/0009_demo.sql`: `demo.scenarios` and `demo.scenario_runs` as in `data-model.md`, and grants (not resettable)
- [x] T167 [P] [US8] Implement `packages/domain-types/src/scenario.ts` (the Zod manifest schema and the SoD check against `rbac.ts`). Make T161 pass
- [x] T168 [P] [US8] Write `db/seeds/scenarios/baseline/v1.yaml` following `contracts/scenario-manifest.md`:
  - 3 tenants and the demo organization;
  - one user per role, with subjects equal to the realm users, plus admins A and B;
  - the configuration defaults and the mock-hub settings.

  Add `db/seeds/scenarios/SHA256SUMS` with LF line endings
- [x] T169 [US8] Implement `apps/api/src/demo/scenario-registry.ts`. At start, it registers each manifest in `demo.scenarios` and checks it against `SHA256SUMS`
- [x] T170 [US8] Implement `apps/api/src/demo/scenario-runner.ts`, following the run algorithm in `contracts/scenario-manifest.md`:
  - the run context provides a `ScenarioClock`, a seeded `IdGenerator` and a `SeededRandom` through a context-scoped provider override, plus the tripwire from T164;
  - `TRUNCATE` in the listed order under `SET LOCAL ROLE demo_reset_role`;
  - the epoch anchor;
  - seeding through the tenancy, IAM and config services (direct path attributed to `system:scenario`);
  - mock-hub control;
  - `apps/api/src/demo/digest.ts`: canonical export without `seq`, `prev_hash` and `hash`; SHA-256;
  - the report;
  - outbox `scenario.run.finished`.

  Make T162–T164 pass
- [x] T171 [US8] Implement `apps/api/src/demo/scenario.controller.ts` with the three routes from `contracts/http-api.md` and their matrix entries. Implement `scripts/scenario.mjs` (`pnpm scenario <code> --seed <n> [--version <v>]`), which gets a token for `demo.admin.a` with TOTP, runs the scenario and prints the digest. Delete `apps/api/src/demo/dev-seed.ts` (T112); `scripts/dev-all.mjs` and the CI `e2e-web` job now run `pnpm scenario baseline --seed 42`
- [x] T172 [P] [US8] Implement `apps/mock-hub/src/control/control.controller.ts` and the behaviour middleware for each kind (latency, seeded failure, scripted outcomes). Make T165 pass
- [x] T173 [US8] On the workstation, produce `db/seeds/scenarios/baseline/v1.digest-seed42.txt` with `pnpm scenario baseline --version v1 --seed 42`. Make sure the CI `integration` job compares the digest (T162). Write `docs/evidence/phase-2/determinism.md` with both digests and the CI run link

**Checkpoint**: SC-010 is met.

---

## Phase 11: User Story 9 - Navigable shells built to the approved designs (Priority: P2) — PR 9

**Goal**: every app shell and the console admin screens follow the approved Phase 2 package, in Arabic and English, with all five states, passing axe and the visual comparison. Mobile shells pass Maestro on Android.

**Independent Test**: the `e2e-web` (label, accessibility, visual and shell specs) and `mobile` jobs are green; `quickstart.md` §4, §5 and §8 work through the UI.

### Tests for User Story 9 ⚠️ (write first, must fail)

- [x] T174 [P] [US9] Write `packages/i18n/test/generate.test.ts`:
  - only `approved` rows of `docs/design/copy-decks/phase-02.md` are emitted;
  - every key exists in both `ar` and `en`;
  - the ICU syntax parses;
  - a key used in the code but missing from the catalog fails the build
- [x] T175 [P] [US9] Write `tests/e2e-web/specs/a11y.spec.ts`: `@axe-core/playwright` on every manifest route × {ar, en} × each declared state; it fails on serious or critical issues
- [x] T176 [P] [US9] Write `tests/e2e-web/specs/visual.spec.ts`:
  - for every manifest entry with a `baseline` ID, screenshot it at the baseline sizes from `docs/design/packages/phase-02/manifest.md` and compare it with `docs/design/packages/phase-02/baseline/{ar,en}/**`, with `maxDiffPixelRatio: 0.01`;
  - allow differences listed in `docs/design/qa/phase-02-approved-diffs.md` (create it empty);
  - print the routes that have no baseline
- [x] T177 [P] [US9] Write `tests/e2e-web/specs/shell.spec.ts`:
  - navigation equals the permission-filtered config for each demo role (from `/v1/me`);
  - the tenant, role and DEMO badges are visible;
  - the language switch sets `<html lang dir>`, the layout mirrors, and amounts and IDs sit in `<bdi>` with Western digits;
  - every route renders `loading` (`aria-busy`), `denied` on 403 and `error` with a correlation ID, plus `empty` where declared;
  - the role picker works;
  - privileged roles see the OTP step
- [ ] T178 [P] [US9] Write the Maestro flows `apps/mobile/maestro/{rtl-layout,a11y-labels,language-restart,offline-banner,app-lock}.yaml`:
  - in Arabic, the leading element sits on the right;
  - every tab control has an accessibility label;
  - switching language shows the restart prompt;
  - with airplane mode, the offline banner shows;
  - the app lock is labelled simulated

### Implementation for User Story 9

- [x] T179 [US9] Implement `packages/i18n` (`@pdfe/i18n`):
  - `scripts/generate.mjs` turns the approved rows of `docs/design/copy-decks/phase-02.md` into `src/catalogs/{ar,en}.json` and typed keys in `src/keys.ts`;
  - `src/next.ts` (`next-intl` setup) and `src/native.ts` (i18next setup);
  - it runs in `pnpm bootstrap` and `turbo build`.

  Make T174 pass
- [x] T180 [US9] Build the `packages/ui-web` components from `docs/design/prototype/` and `docs/design/system/components.md`, styled with `@pdfe/design-tokens` CSS variables and Tailwind 4 logical utilities, with Radix for overlays:
  - layout: `AppShell`, `SideNav`, `TopBar`;
  - badges: `TenantBadge`, `RoleBadge`, `EnvBadge`;
  - status and states: `StatusChip`, `StateBox` (empty, loading, error, denied);
  - data: `MoneyText`, `Table`, form fields;
  - actions: `MakerCheckerPanel`, `LanguageSwitch`, `CopyButton`.

  Each component gets a test in `packages/ui-web/test/`
- [ ] T181 [P] [US9] Build the `packages/ui-native` components: `TabShell`, `StateBox`, `Badges`, `LanguageSwitch` (`I18nManager.forceRTL` plus a restart prompt), `OfflineBanner` and `AppLock` (`expo-local-authentication`, labelled simulated, never identity verification)
- [x] T182 [US9] Complete the Keycloak theme in `infra/keycloak/themes/pdfe/login/`: token CSS, the sign-in page following CON-002, the OTP page following CON-003, and `ar`/`en` messages generated from `packages/i18n`
- [x] T183 [US9] Add the demo role picker (CON-004): `packages/ui-web/src/auth/RolePicker.tsx` on each app's `/[locale]/sign-in`, which passes `login_hint` through `auth-web`. Add `/[locale]/settings/language` (CON-005) and `/[locale]/403` (CON-007) to all six apps
- [x] T184 [P] [US9] Build the web-consumer shell (CON-008): `src/nav.ts`, `/[locale]/page.tsx` with `StateBox` states, and the manifest updated with baseline IDs
- [x] T185 [P] [US9] Build the shells for web-merchant (MER-001), web-business (BIZ-001), web-investor (INV-001, read-only demo viewer) and web-devportal (DEV-001): the `src/nav.ts` and `/[locale]/page.tsx` files, and the manifests updated
- [x] T186 [US9] Build the web-console shell: role-routed navigation (OPS-001, CMP-001, FIN-001, ADM) in `apps/web-console/src/nav.ts`, filtered by `/v1/me`
- [x] T187 [US9] Build the console `/[locale]/admin/users` (ADM-001) and `/[locale]/admin/roles` (ADM-002). The role grant request form shows the SoD conflict message from 409 `SOD_CONFLICT`
- [x] T188 [US9] Build the console `/[locale]/admin/config` (ADM-003, ADM-007 feature flags) and `/[locale]/admin/config/[key]`: history (ADM-004), diff and request (ADM-005), and rollback (ADM-006). Safety-locked keys are read-only, with their reason
- [x] T189 [US9] Build the console `/[locale]/approvals` and `/[locale]/approvals/[id]` with `MakerCheckerPanel`. For the requester, Approve is disabled, with the copy-deck string for "You cannot approve your own request"
- [x] T190 [US9] Build the console `/[locale]/admin/scenarios` and `/[locale]/admin/scenarios/runs/[id]` (OPS-002): run with code, version and seed, then status, digest and report
- [x] T191 [US9] Build the console `/[locale]/audit` (CMP-011), `/[locale]/audit/verify` (CMP-012) and `/[locale]/audit/export` (CMP-013)
- [x] T192 [US9] Build the console `/[locale]/elevation`: choose a tenant, give a reason, see the countdown, end. While elevated, a persistent "read-only elevation" badge shows
- [x] T193 [US9] Build the console `/[locale]/admin/tenants` (ADM-008), a read-only list backed by a new `GET /v1/tenants` (`iam.read`, platform scope). Add the matrix entry, and update `contracts/http-api.md` and `contracts/ui-shell.md`
- [ ] T194 [US9] Build the mobile shell in `apps/mobile`:
  - tabs Home, Pay, Send, Markets and Profile with `TabShell` (CON-008), where each tab shows `StateBox`;
  - `sign-in` through `expo-auth-session` PKCE on client `mobile`, with tokens in `expo-secure-store` (CON-002, CON-003);
  - `app-lock` (CON-006);
  - `settings/language` with the restart prompt (CON-005);
  - `error` and `offline` (CON-007);
  - the splash notice (CON-001).

  All strings come from `@pdfe/i18n`. Make T178 pass
- [ ] T195 [US9] Update `.github/workflows/ci.yml`: `e2e-web` also runs `a11y.spec.ts`, `visual.spec.ts`, `shell.spec.ts` and `correlation.spec.ts`; `mobile` runs every Maestro flow. Make T175–T177 pass. Then run `quickstart.md` §4, §5 and §8 through the UI

**Checkpoint**: SC-013 is met, SC-011 holds on every route, and every story is usable end to end.

---

## Phase 12: Polish & Cross-Cutting Concerns — ships with PR 9

**Purpose**: governance outputs, evidence and the final validation.

- [ ] T196 Update ADR-001, 002, 009, 010, 011, 012, 013, 014 and 015 in `docs/adr/`:
  - add an "As built (Phase 2)" section that links to the code and tests;
  - set `Status: Accepted`;
  - add the line "Re-review pending: outside reviewer before Gate 1/B";
  - leave an empty dated self-attestation line for the owner.

  Confirm that each ADR's Verification tests pass, and that `check-phase0.sh` C-13 stays green (FR-047)
- [ ] T197 (human) Sign the dated self-attestation line in each of the nine ADRs, after reviewing the as-built section
- [ ] T198 [P] Create `docs/evidence/phase-2/README.md`, which indexes every evidence file against SC-001 to SC-013. Create `docs/evidence/phase-2/open-items.md`: iOS verification before Phase 5 (FR-046a), internal TLS and SOPS in Phase 12 (R-19), and the NFR-010 performance measurement in Phase 12
- [ ] T199 [P] Update `specs/README.md`: the status of each 001 story and its PR number
- [ ] T200 Security hardening pass:
  - security headers in `infra/Caddyfile` and in each app's `next.config.ts` (CSP without inline script except Next's nonce, `frame-ancestors 'none'`, `Referrer-Policy`);
  - confirm the cookie flags and that no token reaches the browser;
  - run the `/security-review` command on the branch, and fix what it finds
- [ ] T201 Run the whole `quickstart.md` (§1–§10) on a clean clone, and record the results in `docs/evidence/phase-2/README.md`
- [ ] T202 Run `bash scripts/governance/check-phase0.sh`, `bash scripts/design/check-design.sh` and `bash scripts/design/tests/run.sh`, and fix any failure before opening PR 9

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)** has no dependencies. T003 must finish before any other workspace install.
- **Foundational (Phase 2)** depends on Setup and blocks every story.
- **Stories run in the fixed order US1 → US2 → … → US9** (spec Q1), one pull request each. Each must leave `main` green.
- **Polish** depends on US9 and ships in PR 9.

### Story dependencies (why the order is fixed)

| Story | Needs | Provides to later stories |
|---|---|---|
| US1 | Phases 1–2 | Workspace, CI `ci` check, apps, Compose, minimal banner |
| US2 | US1 | Egress guard, gateway and internal network, adapter registry, startup guard |
| US3 | US2 (gateway, internal hosts) | Auth, RBAC, RLS, approvals, idempotency, outbox, minimal audit writer, `auth-web`, OpenAPI |
| US4 | US3 (audit writer, permissions) | Final audit service, verify, export |
| US5 | US1 apps, US3 sign-in, US4 export | Final banner, route manifests, label crawl, mobile CI |
| US6 | US3 to US5 | Telemetry, logger, `/error` route, Grafana |
| US7 | US3 approvals, US4 audit | Database config, safety-lock API (completes US2 acceptance 5) |
| US8 | US3, US4, US7 | `baseline-v1`, which replaces the dev seed in CI and `dev:all` |
| US9 | Every earlier story | Full shells, axe, visual, mobile flows |

### Within each story

- Tests first; they must fail.
- Then migrations, then schemas, then services, then controllers and matrix entries, then CI wiring, then evidence.
- A task that adds a route also adds its matrix entry.

## Parallel Examples

```text
# Phase 2, after T024–T025: write the remaining core tests together
T016 random.test.ts   T017 canonical-json.test.ts   T018 errors.test.ts   T019 correlation.test.ts

# US1: once T046 (template app) is done
T047 five other web apps   T048 ui-native + mobile skeleton

# US2 tests together
T059 startup-guard   T060 egress-guard   T061 live-adapters   T062 adapter-registry   T063 scan fixtures   T064 mobile api base

# US3 tests together (all separate files)
T078 rbac   T079 rls   T080 approvals   T081 sod   T082 mfa   T083 elevation   T084 idempotency   T085 outbox   T086 rate-limit   T087 audit-minimal   T088 auth-web session

# US4 tests together
T117 tamper   T118 concurrency   T119 search-export   T120 coverage

# US8: manifest and schema in parallel, then the runner
T167 scenario.ts   T168 v1.yaml + SHA256SUMS   T172 mock-hub control

# US9: after T180 and T181
T184 consumer shell   T185 merchant/business/investor/devportal shells
```

## Implementation Strategy

### MVP (PR 1)

1. Phase 1, Phase 2, US1.
2. **Stop and validate**: `quickstart.md` §1, §2 and §10, and the CI `fresh-clone` job green.
3. The owner adds `ci` to the ruleset (T057) and records the blocked pull requests (T058).

### Incremental delivery

- **Gate-critical controls (P1)**: PRs 2–5 deliver US2 to US5, the P0 controls (safety, identity, audit, labels) that Gate 1/B relies on. Stop after each one and run its Independent Test.
- **Operability and the full UI (P2)**: PRs 6–9 deliver US6 to US9.
- After PR 9: Polish, then the owner's ADR attestations (T197).

### Solo-mode notes

- Tasks marked (human) are the owner's: T057, T058 and T197. The agent prepares the evidence files and leaves the attestation lines empty.
- The product's maker-checker always needs two different synthetic users (demo admins A and B). Solo mode does not change that.

## Notes

- 202 tasks in total. [P] means different files and no unfinished dependency.
- Commit after each task or logical group. Open the story's pull request when its checkpoint passes.
- If a task finds that a contract or the data model must change, update the contract file in the same task and say so in the PR description.
