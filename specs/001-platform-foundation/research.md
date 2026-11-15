# Research: Platform Foundation (Phase 2)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-11-15

Each entry records a decision, why it was made and the alternatives considered. Entries are numbered R-1 onward. These IDs are separate from the plan's risk IDs (R-01…R-20). The starting point is the plan's stack (§C.2) and the proposed ADRs (ADR-001, 002, 009–015). Where current package majors (checked on npm 2026-11-15) are newer than the plan's table, the entry says so.

---

## R-1 Repository and workspace

- **Decision**: one pnpm workspace with Turborepo, exactly as in ADR-002 and plan Part D:
  - `apps/`: `api`, `worker`, `mock-hub`, `web-consumer`, `web-merchant`, `web-business`, `web-console`, `web-investor`, `web-devportal`, `mobile`.
  - `packages/`: `contracts`, `domain-types`, `design-tokens` (exists), `ui-web`, `ui-native`, `i18n`, `config`, `test-kit`, `platform-core` (Clock, IdGenerator, Random, correlation, canonical JSON, errors).
  - Phase 2 does not create `packages/money`, because there are no money features yet.
  
  The standalone `packages/design-tokens` and `scripts/design/render` join the workspace, and their own lockfiles are removed (token-pipeline contract, "Feature 001 integration"). One root `pnpm-lock.yaml`.
- **Versions**: Node 22 LTS in `engines` and in CI; the local Node 25 also works. pnpm 11.0.9, pinned in the root `packageManager` field and explicitly in CI (see the corepack lesson from PR #21). Turborepo 2.x. Exact versions of every other dependency are pinned in the lockfile by the first implementation task.
- **TypeScript**: npm `latest` is 7.x, the native compiler. NestJS needs `experimentalDecorators` and `emitDecoratorMetadata`. Task T001 confirms that TypeScript 7 supports both. If it does not, the workspace pins the newest 6.x line for every package, so there is one compiler for the whole repository, and records the reason in ADR-002.
- **Alternatives**: Nx, rejected because it is heavier and not chosen in ADR-002; npm or yarn workspaces, rejected because ADR-002 chose pnpm; separate repositories, rejected because they break shared contracts.

## R-2 Backend shape

- **Decision**: a NestJS modular monolith in `apps/api` (ADR-001). Phase 2 modules: `core` (clock, ids, random, correlation, errors), `identity`, `tenancy`, `approvals`, `audit`, `config`, `integration` (adapter registry, idempotency, outbox), `demo`, `health`.
  - `apps/worker`: a NestJS standalone application context. It runs the outbox relay, config activation at the effective date, audit anchoring and elevation expiry.
  - `apps/mock-hub`: a small NestJS app with mock bank, PSP, chain, KYC, sanctions, FX, price and notification endpoints, plus a `_control` endpoint for scenario-driven behaviour.
- **Versions**: npm `latest` for `@nestjs/core` is 12.x. Use the current major and pin it in the lockfile.
- **Alternatives**: Fastify or Express without a framework, rejected because the module boundaries and guards would have to be hand-made; microservices, rejected by ADR-001.

## R-3 Database, migrations and access

- **Decision**:
  - PostgreSQL 16 (plan §C.2), one database, one schema per module: `platform`, `iam`, `audit`, `config`, `demo`, `integration`. Extension `pgcrypto`.
  - Migrations are plain SQL files `db/migrations/NNNN_name.sql`, applied by a small in-repo runner (`packages/platform-core/migrate`). The runner records each file's SHA-256 in `platform.schema_migrations` and **refuses to run if an applied file has changed**, which enforces the rule "never edit after merge".
  - Queries use Drizzle ORM for typed access. Raw SQL is used for RLS settings, triggers and the audit chain.
- **Database roles**:
  - `migrator_role` (owns the schemas);
  - `app_role` (no BYPASSRLS; INSERT/SELECT only on `audit.*`);
  - `readonly_role`;
  - `demo_reset_role` (TRUNCATE on demo-resettable tables only, used only by the scenario engine).
- **Alternatives**: Drizzle-kit generated migrations, rejected because generated diffs are harder to review and to protect from edits; Prisma, rejected because it is less SQL-transparent and the plan chose Drizzle; dbmate, rejected because it adds a Go binary.

## R-4 Identity provider and sign-in

- **Decision**: Keycloak (current major, container) with one realm `pdfe-demo`, versioned as `infra/keycloak/realm-pdfe-demo.json` and imported at start (ADR-010).
  - **Demo users** are defined in the realm file, one or more per role, with **fixed subject IDs, usernames and passwords**. Privileged users get a **fixed synthetic TOTP secret**, so tests can produce codes. All of these are synthetic and documented.
  - The scenario engine creates the matching `iam.users` and role grants from the manifest, keyed by the fixed subjects. This makes users deterministic and satisfies FR-011, with no Keycloak admin calls during runs.
  - **Second factor**: the realm requires OTP for users in the `privileged` group. The API rejects privileged roles unless the token's `amr` contains `otp` (or `acr` meets the configured level). This gives defence in depth for FR-012.
  - **Tenant claim**: a Keycloak user attribute `tenant_id` is mapped into the token. The API takes the tenant only from the validated token, never from the request.
  - **Web**: Authorization Code + PKCE in a shared `packages/auth-web`, using `openid-client` and `iron-session`, in a backend-for-frontend pattern. Next.js route handlers perform the code exchange. Tokens stay server-side in an encrypted, http-only, SameSite=Lax cookie. The browser never holds the access token, and API calls go server-to-server.
  - **Mobile**: `expo-auth-session` with PKCE. Tokens are stored in `expo-secure-store`.
- **Alternatives**: Auth.js, rejected because its Keycloak plus server-side token handling gives less explicit control; a home-made identity service, rejected because ADR-010 chose Keycloak and MFA would have to be reimplemented; the implicit flow, which is insecure.

## R-5 Tenant isolation and elevation

- **Decision**: every tenant-owned table has `tenant_id` and an RLS policy (ADR-011). The API opens every request transaction with `SET LOCAL app.tenant_id = <token tenant>`. Guards also check the tenant in code, as a second layer.
- **Elevation** (spec clarification Q4, FR-013a):
  - Elevation is a row in `iam.tenant_elevations` with user, target tenant, reason, start, expiry (default 30 minutes, configurable through the `security.elevation.ttl_minutes` setting) and end.
  - While an active elevation exists, the API runs the request in a `READ ONLY` transaction with `app.tenant_id = <target tenant>` and `app.elevation_id` set.
  - Any write fails at the database level (the read-only transaction) and in the guard.
  - Every read under elevation records an audit event, `tenant.elevated_read`.
  - The worker ends expired elevations. The API also checks expiry on each request, so an expired elevation stops immediately.
- **Alternatives**: a `cross_tenant` flag that bypasses RLS, as sketched in the plan, rejected because it is too broad; Q4 limits elevation to one tenant and read-only. Separate database per tenant, rejected as too heavy for a demo.

## R-6 Permissions, separation of duties and maker-checker

- **Decision**: roles and permissions are seeded from a versioned file, `packages/domain-types/src/rbac.ts`. It holds the matrix from plan §J.3 extended with the Phase 2 permissions listed in [data-model.md](./data-model.md) §RBAC.
  - A `@RequirePermission()` guard checks every endpoint. The negative authorization suite is generated from the same matrix, so the tests cannot drift from the rules.
  - **Separation-of-duties conflicts** live in `iam.sod_conflicts`, seeded from the plan's conflict list, plus the triple rule: no user may hold permissions from all three groups `ledger.post|adjust`, `stb.issuance.approve` and `audit.admin`. This is checked at grant time in the service and by a database trigger on `iam.user_roles`.
  - **Approvals**: `iam.approval_requests` and `iam.approval_decisions`, as in the plan.
    - The content fingerprint is SHA-256 of RFC 8785 canonical JSON.
    - The rule "decided_by ≠ requested_by" is enforced in the service and by a BEFORE INSERT trigger.
    - Concurrent decisions are serialized with `SELECT … FOR UPDATE` on the request row, so only one outcome is possible.
    - Expiry, cancellation and payload-change checks run inside the same transaction.
    - On approval, the API writes an `approval.approved` outbox event. The owning module executes the action exactly once, keyed by the approval ID.
  - **Who approves Phase 2 actions**:
    - Role grants and configuration changes are approved by a **different platform administrator**. The scenario seeds two admins, A and B.
    - Config approve and role-grant approve are `platform_admin` permissions, still subject to approver ≠ requester.
    - This keeps the plan §J.3 rule that platform_admin holds no approver role in other domains.
- **Alternatives**: OPA/Cedar policy engines, rejected as a new dependency with no Phase 2 need; checks only in code, rejected because Article V needs the database backstop.

## R-7 Audit chain

- **Decision**: `audit.audit_events` as in the plan.
  - `AuditService.record()` runs inside the caller's transaction, so the action and its audit event commit together or not at all (FR-018).
  - The chain is computed under `pg_advisory_xact_lock(hashtext('audit'))`: `hash = sha256(prev_hash || canonical_json(event without hash))`. The genesis `prev_hash` is 64 zeros.
  - Append-only is enforced by a BEFORE UPDATE OR DELETE trigger, which raises an error, and by grants (`app_role`: INSERT and SELECT only).
  - The worker writes an anchor (`up_to_seq`, `hash`) every 100 events or every hour, whichever comes first.
  - Verification walks the chain in `seq` order and reports one of: `ok`, the first broken `seq` with its reason (`hash_mismatch`, `prev_link_mismatch`, `seq_gap`), or `anchor_mismatch`.
  - Export streams CSV or JSON. The first line of CSV, and the `meta` key of JSON, carry the simulation label.
- **Alternatives**: an external transparency log, rejected because it would need egress; Merkle trees, rejected as unnecessary at demo scale.

## R-8 Correlation and observability

- **Decision**:
  - **Correlation ID**: the `X-Correlation-Id` header is accepted only if it matches `^[A-Za-z0-9._-]{8,64}$`. Otherwise a new ID is created, in the form `COR-<UUIDv7>`. The ID is propagated through AsyncLocalStorage, and through BullMQ job data and adapter call headers.
  - **Telemetry**: the OpenTelemetry Node SDK provides traces and metrics; logs come from Pino with the trace and correlation IDs. All three are sent over OTLP to the single-container **Grafana LGTM** image (`grafana/otel-lgtm`: Grafana, Loki, Tempo, Prometheus) for local use.
  - **Dashboard**: a provisioned Grafana dashboard, "Find by correlation ID", queries Loki, Tempo and the audit table (Postgres data source, read-only role).
  - **Redaction**: Pino redaction paths plus a pattern redactor for names, document numbers and secrets (FR-028).
- **Alternatives**: separate Loki, Tempo and Prometheus containers, rejected as more moving parts for one person; Jaeger, rejected because it lacks logs and metrics in one place.

## R-9 Adapter registry and outbound network

- **Decision** (ADR-009):
  - `AdapterRegistry.register(kind, impl)`, with each adapter type declared in configuration (`adapters.<kind>.type`). The startup guard exits with code 1, naming the offender, when any of these holds:
    - `APP_MODE !== 'DEMO'`;
    - a type is not in the allowlist `mock:*`;
    - a type is unknown.
  - Live interfaces exist as typed classes (`DisabledLiveBankAdapter` and similar) that throw `LiveAdapterDisabledError` before doing any I/O.
  - **Outbound network, three layers**:
    1. In-process guard: an undici global dispatcher plus a patch of the `http`/`https` globalAgent that rejects any host not in `INTERNAL_HOSTS`.
    2. Docker Compose: the app network has `internal: true`, so containers have no route out.
    3. CI egress job: from inside the api, worker and mock-hub containers, attempt a TCP connect and an HTTPS fetch to a public host and assert that both fail.
  - **Repository scans**: the existing C-9, gitleaks and the D-11 pattern lists are extended with mainnet/testnet RPC host patterns, real-looking IBANs and national ID formats (plan §I.11).
- **Alternatives**: network policy only, rejected because host-mode development would be unguarded; code guard only, rejected because native modules could bypass it.

## R-10 How the stack runs (one command)

- **Decision**: two documented modes.
  - **`pnpm dev:all`**, the acceptance mode. Docker Compose (`infra/docker-compose.yml`) builds and runs everything except the mobile app: Postgres, Redis, Keycloak, LGTM, api, worker, mock-hub and the six web apps. App containers sit on the internal network, and a gateway container (Caddy) on a second, published network exposes the web apps and Keycloak on `localhost` ports. This is the mode for egress tests, the fresh-clone CI job and demos.
  - **`pnpm dev`**, the fast mode. Infrastructure runs in Compose, and the apps run on the host with Turborepo watch. Only the code-level egress guard applies here, which is documented.
  - **Mobile**: `pnpm --filter mobile start` (Expo) on the host, pointed at the gateway. In the DEMO profile, a build-time check rejects any API base URL that is not an internal or loopback address.
  - **`pnpm bootstrap`**: checks prerequisites (Node, pnpm, Docker), installs, generates the local `.env` from `.env.example` with random development secrets (git-ignored), builds the tokens and prepares images.
- **Windows**: Docker Desktop with WSL2 (verified on the workstation, Docker 28.1). `.gitattributes` forces LF for `*.sh`, `SHA256SUMS`, Dockerfiles and the env templates.
- **Alternatives**: everything on the host, rejected because egress could not be proven; Kubernetes locally, rejected as too heavy (D-08 default: local Docker).

## R-11 Idempotency, outbox and rate limits

- **Decision**:
  - **Idempotency**: Nest middleware requires an `Idempotency-Key` header on POST, PUT, PATCH and DELETE under `/v1` (except `/v1/auth/*`). It stores `(tenant_id, scope=route, key, request_hash)` in `integration.idempotency_keys`:
    - same key and same hash: replay the stored response;
    - same key, different hash: 422 `IDEMPOTENCY_KEY_REUSED`;
    - a request still in progress: 409 `IDEMPOTENCY_IN_PROGRESS`.
    
    Keys expire after 24 hours, configurable.
  - **Outbox**: rows are written in the same transaction as the change. The worker relays them with `FOR UPDATE SKIP LOCKED` to BullMQ queues and marks them published. Delivery is at least once, and consumers de-duplicate on the event ID.
  - **Rate limits**: `@nestjs/throttler` with Redis storage, per user and per IP. Baseline values live in the configuration setting `api.rate_limit` (placeholders, NFR-009).
- **Alternatives**: polling without SKIP LOCKED, rejected because of the risk of double relay; Kafka, rejected as excessive.

## R-12 Configuration

- **Decision**:
  - A typed registry, `packages/domain-types/src/config-registry.ts`, defines each setting: key, Zod schema, default and `safetyLocked` flag. Safety-locked keys (`app.mode`, `adapters.allowlist`, `egress.internal_hosts`) are rejected on every write path and are not listed as editable.
  - A proposal creates a `config_versions` row with status `draft → pending_approval` and an approval request.
  - On approval, the version becomes `active` at `effective_from`; immediately when that date is now or in the past. The worker activates future-dated versions and marks the previous active version `superseded`.
  - Rollback creates a new version that copies an older value, through the same approval.
  - When two proposals are pending for one key, approving one marks the others `stale`. The plan's status list gains the value `stale`.
  - The diff endpoint returns a JSON Patch between two versions.
- **Alternatives**: environment variables, rejected because they have no approval, history or rollback; a key-value store, rejected because it lacks history.

## R-13 Determinism and the scenario engine

- **Decision** (ADR-013):
  - `ClockService`, `IdGenerator` and `RandomService` are injected everywhere. **No direct use** of `Date.now()`, `new Date()` without an argument, `Math.random()` or `crypto.randomUUID()` in application code; an ESLint rule enforces this outside `platform-core`.
  - **During a run**:
    - the clock starts at the manifest's `clock.base` and advances only through explicit steps;
    - IDs are UUIDv7 built from that clock and a seeded PRNG (`pure-rand`, xoroshiro128+);
    - randomness comes from the same seed.
  - **Manifests** are YAML files `db/seeds/scenarios/<code>/<version>.yaml`. Their SHA-256 is recorded in `demo.scenarios`, and a mismatch refuses the run.
  - **A run**:
    1. truncates demo-resettable tables in dependency order, with `demo_reset_role`, in DEMO only;
    2. seeds through the module services: tenants, organizations, users, role grants, configuration versions;
    3. exports the created rows canonically (sorted by table, then primary key, RFC 8785 JSON);
    4. digests that export with SHA-256.
    
    Audit events from the run are part of the digest. Their timestamps come from the scenario clock, so they are deterministic.
  - A run that fails part-way rolls back to the reset state and is recorded as failed.
  - The first scenario is `baseline-v1`: 3 tenants (platform, consumer pool, demo merchant), one user per role, two platform admins, and the default configuration versions.
- **Alternatives**: SQL dumps as seeds, rejected because they bypass the services and are not reviewable; Faker without a seed, rejected because it is non-deterministic.

## R-14 Web apps and shared UI

- **Decision**:
  - Next.js (npm `latest` is 16.x, App Router) for six apps: consumer, merchant, business, console (ops, compliance, finance and admin, role-routed), investor and devportal.
  - `packages/ui-web` holds the React versions of the Phase 1 prototype components: `AppShell`, `SideNav`, `TopBar`, `SimulationBanner`, `StatusChip`, `StateBox` (empty/loading/error/denied), `MoneyText`, `MakerCheckerPanel`, `Table`, `Form` fields. They are styled with the token CSS (`packages/design-tokens`) and Tailwind 4 using logical properties only. Radix primitives provide accessible overlays.
  - `SimulationBanner` renders in each app's root layout, outside every page boundary. Pages cannot opt out: there is no prop to hide it, and a lint rule forbids importing the internal layout without it.
  - `packages/i18n` holds the ICU catalogs built from the approved Phase 2 copy deck. The `ar` and `en` JSON files are generated by a script from `docs/design/copy-decks/phase-02.md` rows with status `approved` (research R-8 of feature 000). `next-intl` sets `<html lang dir>`.
  - Each app exports a **route manifest** (`src/routes.manifest.ts`), which the label crawler and the accessibility scan consume (FR-024, SC-011).
- **Alternatives**: one Next app with route groups for all portals, rejected because plan Part D separates the apps and their permissions; a CSS-in-JS library, rejected because tokens and logical properties are simpler with CSS variables.

## R-15 Mobile app

- **Decision**:
  - Expo (npm `latest` is SDK 58) with Expo Router.
  - Five placeholder tabs (Home, Pay, Send, Markets, Profile) and `SimulationBanner` in the root layout.
  - i18next with the same catalogs. Switching to Arabic calls `I18nManager.forceRTL` and shows a restart prompt.
  - Tokens are kept in `expo-secure-store`. The app lock uses `expo-local-authentication` as a local unlock only; it is labelled "simulated" and is never identity verification.
  - **CI (spec Q3)**: a `mobile` job builds an Android debug APK and runs Maestro flows on an Android emulator (`reactivecircus/android-emulator-runner`). The flows check every tab in both languages for the banner text, the right-to-left layout and the accessibility labels. The job runs on pull requests that touch `apps/mobile`, `packages/ui-native` or `packages/i18n`, and nightly. iOS is deferred to before Phase 5.
- **Alternatives**: Detox, rejected because Maestro is in the plan and simpler; the Expo web build for tests, rejected because it is not the real platform.

## R-16 Automated label, accessibility and visual checks

- **Decision**:
  - **Web label check**: Playwright crawls each app's route manifest, for each language and for a signed-in role that can reach the route. It asserts that `[data-sim="1"]` is visible, that its text matches the approved bilingual string exactly, and that no element covers its box (`elementFromPoint` at the banner centre).
  - **Exports**: PDF text extraction plus a CSV first-line check. Notification templates have a unit test.
  - **Accessibility**: `@axe-core/playwright` on the same routes, failing on serious or critical issues.
  - **Visual**: Playwright screenshots of the Phase 2 shell routes are compared with `docs/design/packages/phase-02/baseline/**` at the baseline sizes (visual-comparison contract). The threshold is recorded in [contracts/ci-checks.md](./contracts/ci-checks.md).
- **Alternatives**: unit tests on components only, rejected because they would not prove that every route shows the label.

## R-17 Continuous integration

- **Decision**: a new workflow `.github/workflows/ci.yml` with one aggregate required check, `ci`. The existing required checks (`governance-check`, `secret-scan`, `design-check`) stay. The `ci` workflow runs these jobs:

  | Job | What it runs |
  |---|---|
  | `static` | ESLint (including the determinism and logical-CSS rules), Prettier, type checking |
  | `unit` | Vitest and fast-check |
  | `integration` | Testcontainers: Postgres, Redis, Keycloak. Covers migrations from zero, RLS, triggers, approvals, audit and the negative authorization suite |
  | `deps` | `pnpm audit --audit-level=high` and a Trivy filesystem scan |
  | `build` | Every app; Docker images |
  | `e2e-web` | Playwright label, accessibility and visual checks on the Compose stack |
  | `egress` | The Compose stack, with probes from inside the containers |
  | `fresh-clone` | Clean checkout, bootstrap, start, smoke test: FR-004, SC-001 |
  | `mobile` | Path-filtered on pull requests, and nightly |

  Unit, static, deps and build run on every pull request. The heavier jobs run when relevant paths change, and every job runs nightly on `main`. The ruleset adds `ci` to the required checks after the first green run (task in Story 1).
- **Alternatives**: one big job, rejected because it is slow and its failures are unclear; many separately required checks, rejected because the ruleset churns as jobs are added.

## R-18 API style and contracts

- **Decision**:
  - REST under `/v1`, described by OpenAPI 3.1, which is generated from Nest decorators plus Zod schemas through `nestjs-zod`, and published as `packages/contracts/openapi.json`.
  - Typed clients are generated with `orval` for the web apps and the mobile app.
  - Errors use one envelope: `{ "error": { "code", "message_key", "correlation_id" } }`.
  - Contract lint (Spectral) and an `openapi-diff` against `main` run in CI; a breaking change needs an ADR.
  - The full endpoint list is in [contracts/http-api.md](./contracts/http-api.md).
- **Alternatives**: GraphQL and tRPC, rejected because the plan chose OpenAPI and the developer portal publishes REST later.

## R-19 Secrets and transport security (NFR-004 baseline)

- **Decision**:
  - Secrets live only in the git-ignored `.env` generated by `pnpm bootstrap`, with random development values; CI uses ephemeral generated values.
  - `.env.example` holds placeholders only and is covered by gitleaks and C-9.
  - Postgres has `pgcrypto` available.
  - Traffic between containers stays on the internal Docker network without TLS in Phase 2. Internal TLS, SOPS-encrypted demo env files and the key rotation runbook arrive in Phase 12, where NFR-004 is fully evidenced. This deferral is recorded as a known gap.
- **Alternatives**: SOPS now, rejected because one person has no shared secrets to protect yet; internal TLS now, rejected because certificate tooling would slow the foundation for little demo value.

## R-20 Ports and hostnames (local)

- **Decision**: fixed ports, documented in [contracts/runtime-config.md](./contracts/runtime-config.md), so tests and the mobile app can rely on them. The gateway publishes the web apps on 3001–3006, the API on 4000, Keycloak on 8080 and Grafana on 3000. Internal hostnames are the Compose service names.

## R-21 Design gate and approved designs

- **Decision**: the shells are built from the approved Phase 2 package (`docs/design/packages/phase-02/`). The prototype in `docs/design/prototype/` is the reference, and the baselines are the visual-comparison oracle. Screens outside Phase 2 are not built. The `phase-02` approval row (2026-11-15) satisfies D-13 for this plan.
