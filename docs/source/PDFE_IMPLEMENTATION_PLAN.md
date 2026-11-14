# PDFE — Comprehensive Implementation Plan (Spec Kit Edition)
**Product:** Palestinian Digital Financial Ecosystem (PDFE) — Integrated Simulation Platform
**Plan version:** 1.0 | **Date:** 2026-11-14 | **Based on:** Master PRD v0.2, Project Management Plan v0.2
**Audience:** The implementer (assumed zero prior experience), product owner, engineering lead, reviewers
**Delivery tool:** GitHub Spec Kit (`specify` CLI + `/speckit.*` slash commands) with an AI coding agent (Claude Code recommended)

> **SIMULATION ONLY.** Everything in this plan builds a *demonstration system that uses synthetic data*. Nothing here authorizes, enables or implies a live financial service. Every phase has a "no live egress" acceptance criterion. If you are ever unsure whether something could reach a real bank, chain, payment provider or identity service, **stop and ask the security lead.**

---

## Table of Contents
- [Part A — How to Use This Plan](#part-a--how-to-use-this-plan)
- [Part B — Architect's Review of the PRD and PM Plan](#part-b--architects-review-of-the-prd-and-pm-plan)
- [Part C — Target Architecture and Technology Decisions](#part-c--target-architecture-and-technology-decisions)
- [Part D — Repository Layout and Conventions](#part-d--repository-layout-and-conventions)
- [Part E — Spec Kit Setup, Workflow and Constitution](#part-e--spec-kit-setup-workflow-and-constitution)
- [Part F — Requirements Traceability Matrix](#part-f--requirements-traceability-matrix)
- [Part G — Phase Overview and Gate Mapping](#part-g--phase-overview-and-gate-mapping)
- [Part H — Phases 0–12 in Detail](#part-h--phases-012-in-detail)
- [Part I — Cross-Cutting Standards](#part-i--cross-cutting-standards)
- [Part J — Appendices (checklists, glossary, troubleshooting)](#part-j--appendices)

---

# Part A — How to Use This Plan

## A.1 If you have never built software like this before
You don't need to know everything up front. This plan is written so you can follow it **one phase at a time, one Spec Kit feature at a time**. Each feature follows the same loop:

```
1. /speckit.specify   → write WHAT and WHY (no tech)        → spec.md
2. /speckit.clarify   → AI asks questions, you answer       → spec.md updated
3. /speckit.checklist → generate a quality checklist        → checklists/*.md
4. /speckit.plan      → write HOW (tech, data, APIs)        → plan.md, data-model.md, contracts/
5. /speckit.tasks     → break plan into ordered tasks       → tasks.md
6. /speckit.analyze   → cross-check spec/plan/tasks         → consistency report
7. /speckit.implement → AI writes code task by task         → code + tests
8. Human review       → run tests, demo, reviewer sign-off  → PR merged
```

**Rules for beginners:**
1. **Never skip `/speckit.clarify` and `/speckit.analyze`** for P0 (critical) features. They catch the mistakes that are expensive later.
2. **Copy the prompt text in this plan exactly** into the slash command, then add anything specific you learned.
3. **Don't merge code you haven't run.** Run `pnpm test`, `pnpm e2e`, and open the app yourself.
4. **One feature = one Git branch = one pull request.** Spec Kit creates the branch for you (`001-...`, `002-...`).
5. **When a test fails, don't delete the test.** Fix the code or ask a reviewer.
6. **Passing AI code generation is not "done".** See the Definition of Done (Part I.2).

## A.2 Reading the phase sections
Every phase in Part H uses the same template:

| Section | What it tells you |
|---|---|
| Objective | Why the phase exists |
| PRD coverage | Exact PRD/NFR IDs delivered |
| Dependencies / Entry criteria | What must be finished first |
| Spec Kit features | The `/speckit.specify` prompts to run, in order |
| UI/UX design | Screens, states and design tasks for this phase |
| Database | Tables, constraints, migrations |
| Backend | Modules, services, APIs, events, rules |
| Frontend (web) | Pages, components, state |
| Mobile app | Screens and native concerns |
| Testing | Unit, property, integration, E2E, security |
| Deliverables | Concrete artifacts produced |
| Acceptance criteria | Pass/fail checks — **all must pass** to exit |
| Gate | Which PM gate (0–5) / PRD gate (A–F) this satisfies |

## A.3 Who signs off
Based on the RACI in the PM plan: **Product owner** accepts features; **Finance/ledger specialist** signs off ledger correctness; **Security lead** signs off the demo safety boundary and security; **Legal/compliance** approves any wording that describes regulated activity; **QA lead** verifies independently. In a small team one person can hold several roles, **but the person who wrote a change can never be its only approver** (maker-checker).

---

# Part B — Architect's Review of the PRD and PM Plan

## B.1 Overall assessment
Both documents are strong on **safety boundaries, ledger invariants, governance and traceability**. They deliberately avoid invented figures, which is correct. The main gaps are in **implementation specificity**: no technology stack, no mobile scope, no design process, no concrete data schemas, inconsistent gate numbering, and some P0 requirements that are under-specified for a beginner to build safely. This plan closes those gaps.

## B.2 Findings and resolutions

| # | Finding | Severity | Resolution in this plan |
|---|---|---|---|
| R-01 | **Mobile app not specified.** PRD lists a "Consumer app" but doesn't say web vs mobile. | High | Added a React Native (Expo) mobile app for consumers and a "merchant lite" mode (Phase 2 onwards). Web remains for portals/consoles. |
| R-02 | **UI/UX process missing.** Design lead in RACI, but no research → design system → handoff process. | High | Phase 1 is a dedicated UX track from discovery to design system; each later phase has its own design work. |
| R-03 | **Two gate schemes** (PM Gates 0–5, PRD Gates A–F) not mapped. | Medium | Unified mapping in Part G.2. |
| R-04 | **No technology stack** or ADRs. | High | Part C proposes one stack with ADR-001…ADR-015, all to be ratified at Gate 1/B. |
| R-05 | **Amount representation unspecified** (float risk). | Critical | Integer minor units only (`NUMERIC(38,0)`), per-asset scale table, no floating point anywhere in money paths. |
| R-06 | **Ledger concurrency strategy unspecified** (FR-LED-005, NFR-002). | Critical | Row-level locking on balance rows in a fixed lock order + optimistic version + SERIALIZABLE for reserve operations; property and race tests. |
| R-07 | **Immutability enforcement** only stated as a rule. | High | DB-level triggers block UPDATE/DELETE on posted journals; app role has no UPDATE/DELETE grant; hash-chained audit. |
| R-08 | **FX bridging** (Rule 2) has no accounting model. | High | FX position/bridge accounts per currency pair, each currency leg balanced separately; spread/fee to revenue accounts (Phase 7). |
| R-09 | **Fee allocation "placeholder"** in J2 is ambiguous. | Medium | Configurable fee schedule (versioned, maker-checker), default 0; posts to a fee revenue account. |
| R-10 | **Scenario determinism** (FR-DEMO-001) conflicts with real clocks, UUIDs and random. | High | Injected `Clock`, `IdGenerator` and `Random` with seed in DEMO; UUIDv7 derived from seed in scenario runs. |
| R-11 | **"Fail closed if adapter type unknown"** has no mechanism. | High | Adapter registry with an allowlist of `mock:*` types; boot fails if any other type is configured in DEMO; network egress deny at container + CI scan. |
| R-12 | **MFA for privileged roles** (NFR-003) but no identity provider chosen. | Medium | Keycloak (self-hosted) with TOTP for privileged roles; demo users seeded. |
| R-13 | **Arabic RTL** across web + mobile + PDFs not detailed. | Medium | Logical CSS properties, `dir` handling, bidi-safe number formatting, Arabic-capable PDF fonts, pseudo-localization testing. |
| R-14 | **Statements** (FR-ACC-002) need watermark + reconcile to ledger. | Medium | Server-generated PDFs with SIMULATION watermark and a checksum footer tied to a ledger snapshot. |
| R-15 | **Separation of duties** needs concrete role matrix. | High | Role/permission matrix in Phase 2 with SoD conflict rules enforced in code and tested. |
| R-16 | **Performance and RPO/RTO** are TBD (D-09). | Low (correctly deferred) | Phase 12 measures baselines; no invented SLOs. |
| R-17 | **Decision register** items block design (D-03, D-07, D-11). | Medium | Each phase lists which decisions it needs; defaults are placeholders, clearly labeled, configurable. |
| R-18 | **AI-generated code risk** (risk register). | High | Constitution forbids bypassing tests/controls; branch protection; CODEOWNERS for ledger, auth and adapters; `/speckit.analyze` required. |
| R-19 | **Investor dashboard** risks presenting modeled impact as real. | Medium | Every metric carries definition, denominator, timestamp and "SIMULATED" badge (enforced by a shared component). |
| R-20 | **INC (inclusion)** domain has a single P1 requirement. | Low | Phase 11 delivers referral + consent + analytics only; no lending logic. |

## B.3 Assumptions this plan makes (to confirm at Gate 0/A)
1. Small team (1–6 people) using an AI coding agent with Spec Kit.
2. A single deployable **modular monolith** backend is acceptable for the demo (simpler for beginners; module boundaries allow later splitting).
3. Cloud provider undecided (D-08). Local Docker Compose is the primary dev and demo environment; a single cloud VM/Kubernetes target is added in Phase 12.
4. Currencies in demo: ILS, USD, JOD, EUR (synthetic rates); assets: PSH (placeholder), BTC, ETH (paper).
5. No real personal data ever enters any environment (synthetic generator only).

---

# Part C — Target Architecture and Technology Decisions

## C.1 Architecture style
**Modular monolith + event outbox**, with strict module boundaries, one PostgreSQL database (schema per module), Redis for queues/cache, and all external systems behind **mock adapters**.

```
┌─────────────────────────────── Clients ───────────────────────────────┐
│ Mobile app (Expo RN)  │ Web: Consumer │ Merchant │ Business │ Ops │    │
│ consumer + merchant   │ Compliance │ Finance │ Investor │ Dev sandbox │ │
└──────────────┬──────────────────────────────┬──────────────────────────┘
               │ HTTPS (JSON, OpenAPI v1)      │
        ┌──────▼──────────────────────────────▼──────┐
        │ API Gateway layer (in-app): auth, tenancy, │
        │ rate limit, idempotency, correlation IDs   │
        ├────────────────────────────────────────────┤
        │ Modules (NestJS):                          │
        │ identity · tenancy · rbac · audit · config │
        │ ledger · txn-orchestrator · accounts       │
        │ wallet · payments · remittance · business  │
        │ stable-asset · exchange · compliance · ops │
        │ reconciliation · reporting · inclusion     │
        │ integration(adapters) · webhooks · demo    │
        ├──────────────┬───────────────┬─────────────┤
        │ Outbox relay │ Job workers   │ Scheduler   │
        └──────┬───────┴──────┬────────┴─────┬───────┘
     ┌─────────▼───┐   ┌──────▼─────┐   ┌────▼────────────────┐
     │ PostgreSQL  │   │ Redis      │   │ Mock Adapter Hub    │
     │ (schemas)   │   │ (BullMQ)   │   │ bank/PSP/chain/KYC/ │
     └─────────────┘   └────────────┘   │ FX/price/sanctions  │
                                        └─────────────────────┘
   Egress: DENY ALL except internal services (enforced at network + code + CI)
```

## C.2 Technology stack (one focused recommendation)

| Layer | Choice | Why (for a beginner) |
|---|---|---|
| Language | **TypeScript** everywhere | One language for backend, web, mobile; strong types catch money/state bugs |
| Monorepo | **pnpm workspaces + Turborepo** | Shared types/contracts between apps |
| Backend | **NestJS 10+** (Node 20/22 LTS) | Clear module structure, DI, guards, great docs |
| ORM / SQL | **Drizzle ORM** + raw SQL for ledger | Type-safe, SQL-transparent; ledger needs exact SQL control |
| Database | **PostgreSQL 16** | ACID, SERIALIZABLE, triggers, row locks, JSONB |
| Queue/cache | **Redis 7 + BullMQ** | Retries, delays, timeouts for orchestration |
| Auth | **Keycloak** (OIDC) | Self-hosted, MFA/TOTP, roles, no external service |
| Web apps | **Next.js 14+ (App Router) + React** | One framework for all portals |
| UI kit | **Tailwind CSS + Radix UI primitives + shadcn/ui pattern** | Accessible primitives, logical properties for RTL |
| i18n | **next-intl** (web), **i18next** (mobile) | ICU messages, Arabic plurals, RTL |
| Mobile | **React Native via Expo (SDK latest), Expo Router** | One codebase iOS/Android, OTA dev builds |
| Mobile state | **TanStack Query + Zustand** | Server state vs UI state separation |
| Forms/validation | **React Hook Form + Zod** (shared schemas) | Same validation client and server |
| API contracts | **OpenAPI 3.1** generated from NestJS + **orval** client codegen | Contract-first, typed clients |
| Design | **Figma** + **Tokens Studio** → **Style Dictionary** | Design tokens flow into code for web and mobile |
| PDFs | **Playwright HTML→PDF** with Noto Naskh Arabic / Noto Sans | Correct Arabic shaping and watermarks |
| Testing | **Vitest** (unit), **fast-check** (property), **Testcontainers** (integration), **Playwright** (web E2E), **Maestro** (mobile E2E), **Pact**/schema tests (contracts), **k6** (load), **axe-core** (a11y) | Covers every evidence type the PRD demands |
| Security tooling | **gitleaks**, **Semgrep**, **Trivy**, **OWASP ZAP** baseline, **npm audit** | Secrets/URL scanning, SAST, image scan, DAST |
| Observability | **OpenTelemetry** → **Grafana stack** (Tempo, Loki, Prometheus) | Correlation IDs end to end (FR-TXN-002, NFR-005) |
| Secrets | **Docker secrets / SOPS** locally; cloud secrets manager later | NFR-004 |
| CI/CD | **GitHub Actions** | Native with Spec Kit, branch protection |
| Containers | **Docker Compose** (dev/demo), Kubernetes manifests optional in Phase 12 | Simple first |

## C.3 Architecture Decision Records to create (Phase 0/3, ratify at Gate 1/B)

| ADR | Decision |
|---|---|
| ADR-001 | Modular monolith with schema-per-module PostgreSQL |
| ADR-002 | TypeScript monorepo (pnpm + Turborepo) |
| ADR-003 | Money as integer minor units, `NUMERIC(38,0)`; per-asset scale; banker's rounding prohibited unless documented; rounding residue to explicit account |
| ADR-004 | Double-entry ledger design: accounts, journals, lines, holds, balance projections; immutability via DB triggers and grants |
| ADR-005 | Concurrency: ordered row locks (`SELECT … FOR UPDATE` by account id ascending), optimistic `version`, SERIALIZABLE for issuance/reserve; retry on serialization failure with idempotency |
| ADR-006 | Idempotency: `(tenant_id, scope, idempotency_key)` unique with request hash and stored response |
| ADR-007 | Transaction orchestration: explicit typed state machines persisted with `transaction_state_events`; transitions validated by a transition table |
| ADR-008 | Transactional outbox for events and webhooks; at-least-once delivery with consumer de-duplication |
| ADR-009 | Adapter registry with DEMO allowlist (`mock:*`), fail-closed startup guard, network egress deny |
| ADR-010 | Identity: Keycloak OIDC, MFA for privileged roles, tenant claim in token |
| ADR-011 | Tenant isolation: `tenant_id` on every row + PostgreSQL Row-Level Security + app-level guards |
| ADR-012 | Audit: append-only, hash-chained `audit_events` with periodic anchor snapshots |
| ADR-013 | Determinism: injected Clock/IdGenerator/Random; seeded scenario runner |
| ADR-014 | Design tokens single source (Figma → Style Dictionary → web CSS vars + RN theme) |
| ADR-015 | Mobile: Expo React Native, secure storage, simulated biometric lock, no real push provider in DEMO (local notifications/mock) |

## C.4 Money and number rules (memorize these)
1. **Never use JavaScript `number` or `float` for money.** Use `bigint` in TypeScript and `NUMERIC(38,0)` in SQL.
2. Store amount + asset code. Scale lives in `assets` table: ILS=2, USD=2, JOD=3, EUR=2, PSH=2, BTC=8, ETH=18.
3. Display formatting happens only at the edge (UI) with the `formatMoney(amountMinor, asset, locale)` helper.
4. FX: rate stored as rational `rate_numerator / rate_denominator` (bigints); rounding mode documented per quote (default: round half toward the customer's benefit is NOT assumed; use ROUND_DOWN for the amount received and post residue to `FX_ROUNDING` account).

---

# Part D — Repository Layout and Conventions

```
pdfe/
├── .specify/                     # Spec Kit (created by `specify init`)
│   ├── memory/constitution.md    # Project constitution (Part E.4)
│   ├── scripts/                  # Spec Kit helper scripts
│   └── templates/                # spec/plan/tasks templates
├── .claude/commands/             # /speckit.* commands for Claude Code
├── specs/                        # One folder per feature (001-..., 002-...)
│   └── 001-platform-foundation/
│       ├── spec.md  plan.md  research.md  data-model.md
│       ├── contracts/  quickstart.md  tasks.md  checklists/
├── apps/
│   ├── api/                      # NestJS backend (modular monolith)
│   ├── worker/                   # BullMQ workers, outbox relay, scheduler
│   ├── mock-hub/                 # Mock adapters: bank, PSP, chain, KYC, FX, price, sanctions
│   ├── web-consumer/             # Next.js consumer web
│   ├── web-merchant/             # Merchant portal
│   ├── web-business/             # Business portal
│   ├── web-console/              # Ops + Compliance + Finance consoles (role-routed)
│   ├── web-investor/             # Investor/regulator demo dashboard (read-only)
│   ├── web-devportal/            # Developer sandbox docs + webhook explorer
│   └── mobile/                   # Expo React Native app (consumer + merchant lite)
├── packages/
│   ├── contracts/                # OpenAPI spec, generated clients, Zod schemas, event schemas
│   ├── money/                    # bigint money, FX math, formatting
│   ├── domain-types/             # shared enums/state machines
│   ├── design-tokens/            # Style Dictionary source + outputs (css, ts)
│   ├── ui-web/                   # Shared React web components (SimulationBanner, MoneyText…)
│   ├── ui-native/                # Shared RN components
│   ├── i18n/                     # ar/en message catalogs
│   ├── config/                   # eslint, tsconfig, prettier
│   └── test-kit/                 # fixtures, factories, scenario manifests, fast-check arbitraries
├── db/
│   ├── migrations/               # Versioned SQL migrations (never edit after merge)
│   └── seeds/scenarios/          # Versioned deterministic fixture manifests
├── infra/
│   ├── docker-compose.yml  docker-compose.demo.yml
│   ├── keycloak/  grafana/  network/ (egress policies)
├── docs/
│   ├── adr/  design/  runbooks/  evidence/  decisions/  risk/
└── .github/
    ├── workflows/  CODEOWNERS  pull_request_template.md
```

**Conventions**
- Branch: Spec Kit naming `NNN-short-name`. Commit messages: Conventional Commits (`feat(ledger): …`).
- Every PR description must include: PRD IDs, spec link, tests added, evidence link, "no live adapter exposure" checkbox.
- CODEOWNERS: `apps/api/src/modules/ledger/**`, `db/migrations/**` → finance + engineering lead; `**/adapters/**`, `infra/network/**` → security lead.

---

# Part E — Spec Kit Setup, Workflow and Constitution

## E.1 Install prerequisites (one-time, step by step)
1. Install **Git** (`git --version` should print a version).
2. Install **Node.js 22 LTS** (use `nvm`: `nvm install 22 && nvm use 22`).
3. Install **pnpm**: `corepack enable && corepack prepare pnpm@latest --activate`.
4. Install **Docker Desktop** (or Docker Engine + Compose). Test: `docker run hello-world`.
5. Install **Python 3.11+** and **uv**: `curl -LsSf https://astral.sh/uv/install.sh | sh`.
6. Install the **Spec Kit CLI**:
   ```bash
   uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
   specify check        # verifies tools are found
   ```
7. Install your AI agent (e.g., **Claude Code**) and sign in.
8. Install **Expo tooling** for mobile: `pnpm dlx expo --version`; install **Expo Go** on a test phone, or Android Studio / Xcode simulators.
9. Install **Figma** (design) and VS Code with extensions: ESLint, Prettier, Tailwind CSS IntelliSense, PostgreSQL.

## E.2 Initialize the project
```bash
mkdir pdfe && cd pdfe
git init
specify init . --ai claude          # creates .specify/ and agent commands
git add . && git commit -m "chore: initialize spec kit"
```
Then put the two source documents into `docs/source/` (`01_MASTER_PRD.md`, `03_PROJECT_MANAGEMENT_PLAN.md`) so the agent can read them during every command.

## E.3 The Spec Kit command loop (what each command does and how you use it)

| Command | You provide | It produces | Beginner tip |
|---|---|---|---|
| `/speckit.constitution` | Principles (Part E.4) | `.specify/memory/constitution.md` | Run once in Phase 0; amend only via ADR |
| `/speckit.specify <prompt>` | WHAT/WHY in business language | New branch + `specs/NNN-x/spec.md` | Don't mention frameworks here |
| `/speckit.clarify` | Answers to its questions | Clarifications section in spec | Answer with PRD IDs and rules |
| `/speckit.checklist <focus>` | Focus area (e.g., "ledger correctness, security, RTL") | `checklists/<focus>.md` | Use for P0 features |
| `/speckit.plan <prompt>` | Tech stack + constraints | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` | Paste the phase's Database + Backend + Frontend + Mobile sections |
| `/speckit.tasks` | — | `tasks.md` (ordered, `[P]` = parallel) | Check tests come **before** implementation |
| `/speckit.analyze` | — | Consistency/coverage report | Fix all CRITICAL/HIGH findings before implementing |
| `/speckit.implement` | — | Code per tasks | Run in small batches; review after each user story |

**Standard plan prompt prefix (paste at the start of every `/speckit.plan`):**
```
Use the stack and conventions in docs/adr and the constitution. TypeScript monorepo (pnpm+Turborepo).
Backend NestJS module under apps/api/src/modules/<module>. PostgreSQL 16 with SQL migrations in db/migrations,
schema per module, tenant_id + RLS on every tenant-owned table. Money as bigint minor units (NUMERIC(38,0)).
All external calls via the adapter registry; DEMO allows only mock:* adapters. Web: Next.js App Router in
apps/<app>, components from packages/ui-web, tokens from packages/design-tokens, next-intl ar/en with RTL.
Mobile: Expo React Native in apps/mobile using packages/ui-native and i18next. Contracts: OpenAPI 3.1 in
packages/contracts; generate clients with orval. Tests: Vitest, fast-check, Testcontainers, Playwright,
Maestro, axe-core. Every screen shows the SimulationBanner. Include data-model.md with full DDL, and
contracts/ with OpenAPI paths and event schemas.
```

## E.4 Constitution (run in Phase 0 with `/speckit.constitution`)
Paste the following as the prompt:

```
Create the PDFE constitution with these non-negotiable articles:

I. Simulation Boundary First. DEMO mode is the only supported mode. No code path may reach real banks,
   payment rails, blockchains (mainnet or public testnet), custody, identity verification, sanctions
   providers or market data. External dependencies are mock adapters only; unknown adapter types fail
   closed at startup. Outbound network is denied by default. Real URLs, credentials, private keys, RPC
   endpoints and real personal data are forbidden in the repository and are blocked by CI.

II. Ledger Is the Source of Truth. All value lives in an immutable, balanced double-entry ledger per
   currency and legal entity. Posted entries are never updated or deleted; corrections are compensating
   entries. No value is created except by documented synthetic funding or authorized simulated issuance.
   Balances are never inferred from frontend state.

III. Money Safety. Money is integer minor units (bigint / NUMERIC(38,0)). Floating point is forbidden in
   money paths. Rounding is explicit and residues post to named accounts.

IV. Idempotency and Explicit State. Every mutating command takes an idempotency key. Transactions follow
   typed state machines; illegal transitions are rejected; retries never double-post.

V. Security, Tenancy and Separation of Duties. Least privilege RBAC, tenant isolation (RLS + guards), MFA
   for privileged roles, maker-checker for high-risk actions; no one approves their own request; no single
   role can alter journals, approve issuance and erase audit.

VI. Auditability and Traceability. Every privileged or financial action records actor, reason, timestamp,
   correlation ID and approval. Audit is append-only and tamper-evident. Every feature maps
   PRD ID → spec → ADR → tasks → tests → demo evidence.

VII. Test-First for P0. P0 work requires positive and negative acceptance tests; financial stories require
   property-based tests and an accounting mapping reviewed before implementation. Tests are never deleted
   or weakened to make a build pass.

VIII. Honest Representation. Every screen, export, statement and dashboard is labeled
   "SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية". PSH is a placeholder for a proposed
   instrument, never presented as approved, issued or redeemable. Figures are illustrative and configurable.
   Modeled impact is never presented as observed impact.

IX. Inclusive by Default. Arabic (RTL) and English (LTR) are first-class; WCAG 2.2 AA is the target;
   every view has empty, loading, error and permission-denied states.

X. Reproducibility. Deterministic seeds, injected clock/ID/random, versioned fixtures and migrations;
   a fresh environment can be built, seeded and reset with one command.

XI. Simplicity. Modular monolith; no new service, dependency or pattern without an ADR.

Governance: amendments require an ADR approved by the engineering lead and security lead; the
constitution overrides any spec or plan; /speckit.analyze must report no constitution violations
before /speckit.implement.
```

## E.5 Global `/speckit.checklist` focuses to reuse
- `ledger-correctness` — balanced journals, immutability, idempotency, concurrency, reversal.
- `demo-safety` — no live egress, mock-only adapters, labels, no secrets.
- `security-authz` — RBAC, tenancy, SoD, MFA, negative tests.
- `ux-quality` — states, RTL, accessibility, copy clarity, simulation labels.
- `mobile-quality` — offline, secure storage, deep links, RTL, small screens.

---

# Part F — Requirements Traceability Matrix

Every PRD requirement mapped to the phase and Spec Kit feature that delivers it. QA uses this as the master checklist at Gate D/E.

## F.1 Functional requirements

| PRD ID | Pri | Phase | Spec Kit feature | Key evidence |
|---|---|---|---|---|
| FR-LED-001 | P0 | 3 | 010-ledger-core | Property test: Σdebits=Σcredits per currency per journal; mutation blocked by trigger |
| FR-LED-002 | P0 | 3 | 011-balances-holds | Hold/pending/posted state tests reconcile |
| FR-LED-003 | P0 | 3 | 012-idempotency | Duplicate request → one posting, same response |
| FR-LED-004 | P0 | 3 | 010-ledger-core | Reversal journal linked; both auditable |
| FR-LED-005 | P0 | 3 | 011-balances-holds | 100-way concurrent spend test rejects overspend |
| FR-TXN-001 | P0 | 3 | 013-txn-orchestrator | State transition table tests, replay |
| FR-TXN-002 | P0 | 3 | 013-txn-orchestrator | Trace view linking txn, journal, adapter event, audit |
| FR-ACC-001 | P0 | 3 | 014-accounts-provisioning | Seeded accounts + permissions |
| FR-ACC-002 | P0 | 5 | 022-statements | Watermarked PDF reconciles to ledger |
| FR-SEC-001 | P0 | 2 | 004-identity-rbac-tenancy | Negative authz test suite |
| FR-AUD-001 | P0 | 2 | 005-audit-log | Hash chain verify + tamper detection + export |
| FR-WAL-001 | P0 | 5 | 020-wallet-p2p | Both sides + ledger reconcile |
| FR-WAL-002 | P0 | 5 | 021-mock-bank-funding | No live rail reachable |
| FR-PAY-001 | P0 | 6 | 030-payment-intents-qr | Expired/duplicate intents rejected |
| FR-PAY-002 | P0 | 6 | 031-refunds-settlement | Original/refund/payout linkage |
| FR-BIZ-001 | P1 | 8 | 050-invoicing | Open/paid/overdue accurate |
| FR-BIZ-002 | P1 | 8 | 051-business-approvals | Dual control tested |
| FR-REM-001 | P0 | 7 | 040-remittance-flow | Corridor E2E journey |
| FR-REM-002 | P0 | 7 | 041-fx-quotes | Quote transparency + expiry tests |
| FR-STB-001 | P0 | 9 | 060-psh-issuance | Supply & coverage reconcile |
| FR-STB-002 | P0 | 9 | 061-psh-redemption | Burn/redemption reconcile |
| FR-STB-003 | P0 | 9 | 062-reserve-dashboard | Derived from source journals |
| FR-EXC-001 | P0 | 10 | 070-paper-matching | Matching + balances verified |
| FR-EXC-002 | P0 | 10 | 071-mock-crypto-deposits | No real chain tx ever |
| FR-EXC-003 | P1 | 10 | 072-market-surveillance | Synthetic cases generated |
| FR-INC-001 | P1 | 11 | 083-inclusion-referrals | Consent + no internal lending |
| FR-INT-001 | P0 | 8 | 052-public-api-webhooks | Contract tests + delivery log |
| FR-INT-002 | P0 | 2 | 006-adapter-registry-egress | Startup guard fails closed |
| FR-CMP-001 | P0 | 4 | 015-kyc-kyb | Review/approve/reject flow |
| FR-CMP-002 | P0 | 4 | 016-screening | Explainable alert + disposition |
| FR-CMP-003 | P0 | 4 | 017-monitoring-rules | Threshold triggers case |
| FR-CMP-004 | P0 | 4 | 018-case-management | Maker-checker dispositions |
| FR-OPS-001 | P0 | 11 | 080-reconciliation | Exceptions surfaced/resolved |
| FR-OPS-002 | P0 | 11 | 081-ops-queues | Reprocess never double-posts |
| FR-ADM-001 | P0 | 2 | 007-config-management | Versioned, approved, reversible |
| FR-DEMO-001 | P0 | 2 (+12) | 008-scenario-engine | Same seed → identical results |
| FR-DEMO-002 | P0 | 2 (+all) | 003-simulation-labels | UI/export label checks |
| FR-DEMO-003 | P0 | 2 | 006-adapter-registry-egress | CI checks + egress tests |

## F.2 Nonfunctional requirements

| NFR | Phase(s) | Evidence |
|---|---|---|
| NFR-001 No live integrations | 2, 12 | Egress tests, CI scan, config review |
| NFR-002 Correctness under concurrency | 3, every financial phase | fast-check + k6 race tests |
| NFR-003 Auth, MFA, least privilege | 2 | Auth test suite, MFA enforced for privileged roles |
| NFR-004 Encryption/secrets/rotation | 2, 12 | TLS internal, pgcrypto/disk encryption, SOPS, rotation runbook |
| NFR-005 Traceability | 2, 3 | OTel trace from UI click → journal |
| NFR-006 Arabic/English, WCAG 2.2 AA | 1, every UI phase, 12 | axe reports, manual screen-reader test, RTL visual tests |
| NFR-007 Reproducible deploy/seed/reset | 2, 12 | Fresh environment smoke test |
| NFR-008 Backups/restoration | 12 | Restore drill with measured RPO/RTO |
| NFR-009 Versioned APIs, rate limiting | 2, 8 | Contract + abuse tests |
| NFR-010 Performance baselines | 12 | k6 baseline report (no invented SLOs) |
| NFR-011 Tenant isolation, field minimization | 2, 12 | Isolation tests + pen test |
| NFR-012 Reconciliation visibility | 11 | Daily simulated close evidence |

## F.3 Journeys

| Journey | Phase delivered | Integrated in |
|---|---|---|
| J1 Consumer wallet transfer | 5 | 12 |
| J2 Merchant payment & refund | 6 | 12 |
| J3 Cross-border freelancer receipt | 7 | 12 |
| J4 Stable-value issuance/redemption | 9 | 12 |
| J5 Paper trading | 10 | 12 |
| J6 Compliance incident | 4 (engine), 11 (full) | 12 |
| J7 Business invoicing & supplier payment | 8 | 12 |

## F.4 Interfaces (PRD §10)

| Interface | Web | Mobile | Phase(s) |
|---|---|---|---|
| Consumer app | web-consumer | ✅ primary | 5, 7, 9, 10 |
| Merchant portal | web-merchant | ✅ merchant-lite mode | 6, 8 |
| Business portal | web-business | — | 8 |
| Operations console | web-console/ops | — | 11 |
| Compliance console | web-console/compliance | — | 4, 11 |
| Finance/treasury console | web-console/finance | — | 3, 9, 11 |
| Investor demo dashboard | web-investor | — (responsive web) | 11, 12 |
| Developer sandbox | web-devportal | — | 8 |

---

# Part G — Phase Overview and Gate Mapping

## G.1 Phase map (incremental delivery)

| Phase | Name | PM Milestone | Primary journeys | Depends on |
|---|---|---|---|---|
| 0 | Setup, governance & control baseline | M0 | — | — |
| 1 | UX/UI design: discovery → design system (continuous track) | M0→M7 | all (design) | 0 |
| 2 | Platform foundation (identity, tenancy, RBAC, audit, safety boundary, scenarios, app shells) | M1 | — | 0, 1 (shell designs) |
| 3 | Financial core (ledger, holds, idempotency, orchestration, accounts) | M2 | — | 2 |
| 4 | Compliance & risk core (KYC/KYB, screening, rules, cases) | M2/M6 | J6 engine | 3 |
| 5 | Consumer wallet + mobile app v1 | M3 | J1 | 3, 4 |
| 6 | Merchant payments, refunds, settlement + merchant-lite mobile | M3 | J2 | 5 |
| 7 | Cross-border remittance + mock FX | M4 | J3 | 5 |
| 8 | Business tools, public API, webhooks, developer sandbox | M4 | J7 | 6 |
| 9 | Stable-value instrument simulation (PSH) | M5 | J4 | 3, 4 |
| 10 | Paper exchange | M5 | J5 | 3, 4 |
| 11 | Operations, finance & compliance consoles, reconciliation, inclusion, analytics | M6 | J6 full | 5–10 |
| 12 | Integrated demonstration, hardening, security, recovery, handover | M7 | J1–J7 | all |

> **Parallelism:** after Phase 5, Phases 7, 9 and 10 can run in parallel if staff allows, because each depends only on the financial core and compliance core. Phase 6 → Phase 8 is sequential.

**Critical path (from PM plan):** demo safety (Phase 2) → ledger (Phase 3) → orchestration (Phase 3) → dependent flows (Phases 5–10) → integrated reconciliation (Phase 11) → sign-off (Phase 12).

## G.2 Unified gate mapping

| PM Gate | PRD Gate | Meaning | Passed at end of |
|---|---|---|---|
| Gate 0 | Gate A | Requirements, P0 stories, journeys, open decisions, simulation boundary approved | Phase 0 |
| Gate 1 | Gate B | Architecture, ADRs, financial invariants, threat model, data ownership approved | Phase 3 (design part, before implementation) |
| Gate 2 | Gate C | Ledger property/concurrency evidence, idempotency, audit & tenant controls | Phase 3 (end) |
| Gate 3 | — | Domain feature acceptance + contract checks | Each of Phases 4–11 |
| Gate 4 | Gate D | All seven journeys E2E on seeded data incl. failure paths + reconciliation | Phase 11/12 |
| Gate 5 | Gate E | Security, recovery, isolation, bilingual UI, labels, no live network, signed checklist | Phase 12 |
| — | Gate F | Future live release (out of scope) | Never in this plan |

**Stop-work triggers (any phase):** critical vulnerability, ledger imbalance, live-connectivity exposure → stop, open P0 incident, triage per Part I.6.

## G.3 Scheduling
Per the PM plan, **no fixed dates are invented**. After Phase 0, the team sizes each Spec Kit feature (S/M/L/XL, or story points), records velocity per two-week sprint, and produces a capacity-based forecast range for each milestone. Update the forecast at every sprint review.

---

# Part H — Phases 0–12 in Detail

---

## Phase 0 — Setup, Governance & Control Baseline (M0 → Gate 0 / Gate A)

### Objective
Prepare the tools, repository, governance artifacts and approved scope so the team can build safely. No product code yet.

### PRD coverage
PRD §2, §3 (SoD principle), §14 Gate A, §16 decision register; PM §2–§11 (governance, RACI, DoR/DoD, risk/decision control).

### Entry criteria
Sponsor nominated; product owner, engineering lead and security lead named (even if one person holds several roles — record it).

### Step-by-step tasks
1. Complete Part E.1 and E.2 (install tools, `specify init`).
2. Run `/speckit.constitution` with the text in Part E.4. Commit.
3. Create `docs/decisions/decision-register.md` from PRD §16 (D-01…D-12) with columns: ID, question, options, decision, owner, date, rationale, consequences, review date (PM §11).
4. Create `docs/risk/risk-register.md` from PM §10; add R-01…R-20 from Part B.
5. Create `docs/governance/raci.md` (copy PM §3) and `docs/governance/roles-assignment.md` (who holds each role).
6. Create `docs/governance/definition-of-ready.md` and `definition-of-done.md` (Part I.1, I.2).
7. Create `docs/legal/assumption-log.md` — every regulatory assumption, flagged "unvalidated" until counsel reviews.
8. Create `docs/simulation-charter.md` — copy the "Operating principle and regulatory boundary" + Terminology sections verbatim; sponsor signs.
9. Set up GitHub repository: branch protection on `main` (PR required, 1+ approval not from author, status checks required, no force push), CODEOWNERS (Part D), PR template (Part I.3).
10. Create the backlog hierarchy in GitHub Projects: Epic (domain) → Feature Spec (Spec Kit feature) → User Story → Task → Test Case → Evidence. Label scheme: `P0/P1/P2`, `domain:*`, `phase:*`, `gate:*`.
11. Draft ADR-001…ADR-015 as "Proposed" in `docs/adr/` (template Part J.4).
12. Hold the Gate 0/A review meeting; record decisions.

### Spec Kit feature
None in this phase except the constitution. (You may run `/speckit.specify` for `000-governance-baseline` if you want the artifacts tracked as a feature — optional.)

### UI/UX design (kick-off)
Start Phase 1 discovery in parallel (stakeholder interviews and research plan).

### Database / Backend / Frontend / Mobile
None (skeleton only created in Phase 2).

### Deliverables
- `.specify/memory/constitution.md` (approved)
- Decision register, risk register, RACI + role assignment, DoR, DoD, assumption log, simulation charter
- Repository with branch protection, CODEOWNERS, PR template, labels, project board
- Draft ADR set
- Approved P0 scope list (all P0 IDs in Part F.1) and journey list J1–J7 (D-10)

### Acceptance criteria
- [ ] `specify check` passes on the implementer's machine.
- [ ] Constitution committed, includes all 11 articles.
- [ ] Every D-01…D-12 has an owner and status; none marked "decided" without a named approver.
- [ ] Simulation charter signed by sponsor (name + date in file).
- [ ] Branch protection proven: a direct push to `main` is rejected; a PR without review cannot merge.
- [ ] P0 list and J1–J7 approved by sponsor = **Gate 0 / Gate A passed**.

---

## Phase 1 — UX/UI Design Track: From Scratch to Final Product (continuous, M0 → M7)

### Objective
Design every interface (mobile app + all web portals and consoles) from research through to a production design system and pixel-level specs, in Arabic and English, accessible, and clearly labeled as simulation. Design runs **one phase ahead** of engineering: designs for Phase N must be approved before Phase N's `/speckit.plan`.

### PRD coverage
PRD §3 personas, §8 journeys, §10 information architecture and state requirements, NFR-006, FR-DEMO-002, §13 dashboard labeling rules.

### 1.1 Stage 1 — Discovery & research (2 sprints suggested)
| Step | Activity | Output (in `docs/design/`) |
|---|---|---|
| 1 | Stakeholder interviews (sponsor, product, finance, compliance) | `research/stakeholder-notes.md` |
| 2 | Proto-persona workshop from PRD §3 (10 personas) | `personas/*.md` — goals, pains, devices, language, literacy, accessibility needs |
| 3 | Context research: mobile-first usage, Arabic-first users, low-bandwidth conditions, shared devices, ILS/JOD/USD cash habits | `research/context.md` |
| 4 | Competitive/pattern review (wallet apps, merchant QR, remittance apps, exchange UIs) — patterns only, no copying | `research/patterns.md` |
| 5 | Usability test plan with 5–8 synthetic-scenario participants per round | `research/test-plan.md` |
| 6 | Design principles: *Clarity over cleverness · Always-visible simulation status · Arabic-first · Confirm before money moves · Explain every number* | `principles.md` |

### 1.2 Stage 2 — Information architecture & flows
1. **Sitemaps** for each app (from PRD §10): consumer (mobile + web), merchant, business, ops, compliance, finance, investor, dev portal.
2. **User flows** for J1–J7 including every exception path listed in PRD §8 (e.g., J1: insufficient balance, duplicate submission, blocked recipient, timeout, reversal).
3. **Navigation model**
   - Mobile: bottom tab bar — Home · Pay/Scan · Send · Markets · Profile; floating "SIMULATION" pill in header.
   - Web consoles: left side nav (mirrored in RTL), top bar with tenant switcher, role badge, environment badge "DEMO".
4. **Content model**: transaction status vocabulary (Draft, Pending, Held, Under review, Completed, Failed, Reversed, Expired) with Arabic equivalents agreed with the localization reviewer.
5. **Permission matrix in UI**: which persona sees which navigation item.

### 1.3 Stage 3 — Wireframes (low fidelity)
- Greyscale wireframes for every screen in Part J.6 screen inventory, mobile (360×800 and 390×844) and web (1280, 1440; tablet 768).
- Each screen wireframed in **five states**: populated, empty, loading (skeleton), error (with retry + correlation ID), permission-denied.
- Money-moving screens follow the **3-step pattern**: Enter → Review (fees, FX, exact received amount, "simulated") → Result (receipt + status + trace ID).
- Test wireframes as a clickable prototype with 5 participants (J1 and J2 first). Record findings.

### 1.4 Stage 4 — Visual design & design system
**Design tokens (Figma Tokens Studio → `packages/design-tokens`)**
| Token group | Content |
|---|---|
| Color | Brand primary (to be decided by sponsor, D-04), neutrals 0–950, semantic: success, warning, danger, info; **simulation accent** (a distinct hatched/amber treatment reserved only for simulation labels); data-viz palette (colorblind-safe) |
| Typography | Arabic: IBM Plex Sans Arabic or Noto Kufi/Naskh Arabic; Latin: IBM Plex Sans / Inter; numeric tabular figures; scale 12/14/16/18/20/24/30/36 |
| Spacing | 4-pt base: 0, 4, 8, 12, 16, 24, 32, 48, 64 |
| Radius, elevation, motion | radius 4/8/12/full; 3 elevation levels; motion 150/250ms, reduced-motion variants |
| Breakpoints | sm 360, md 768, lg 1024, xl 1280, 2xl 1536 |

**Component library (Figma + code parity)**
Foundations: Button, IconButton, Link, Input, MoneyInput (bigint-safe, locale digits), Select, Combobox, Checkbox, Radio, Switch, DatePicker, OTP input, Textarea, FileUpload (synthetic docs).
Feedback: Toast, Alert, Banner, **SimulationBanner** (non-dismissible), **SimulatedBadge**, Skeleton, Spinner, EmptyState, ErrorState (with correlation ID copy), PermissionDenied.
Data: Table (sortable, paginated, RTL), DataList, KeyValue, **MoneyText** (sign, currency, direction-safe), **StatusChip** (txn vocabulary), Timeline (state events), AuditTrail, **TraceLink**, Chart wrappers (with definition/denominator/timestamp footer), KPI tile (with "SIMULATED" tag).
Navigation: AppShell (web), SideNav, TopBar, Tabs, Breadcrumbs, BottomTabBar (mobile), Stepper.
Overlays: Modal, Drawer, Sheet (mobile), ConfirmDialog (money), **MakerCheckerPanel** (requester, approver, reason, SoD warning).
Domain: QRDisplay, QRScanner frame, ReceiptCard, QuoteCard (rate, fee, expiry countdown, exact received), OrderBook, OrderTicket, DepthChart, ReserveCoverageGauge, CaseCard, EvidenceList.

**Accessibility rules baked into components:** contrast ≥ 4.5:1 text / 3:1 UI; focus ring visible; touch target ≥ 44×44; every icon button has a label; form errors linked via `aria-describedby`; no information by color alone (status chips have icons + text); live regions for async status.

**RTL rules:** use logical properties (`margin-inline-start`), mirror directional icons (arrows, chevrons) but **not** logos, media controls or numbers; keep amounts and IDs in LTR isolates (`<bdi>` / `unicode-bidi: isolate`); support both Western (0-9) and Arabic-Indic digits as a user setting (default Western for money clarity — confirm with research).

### 1.5 Stage 5 — High-fidelity design per phase
For each engineering phase, the designer delivers (before `/speckit.plan`):
1. Hi-fi screens (AR + EN, light theme; dark theme optional later) for all states.
2. Interactive prototype for the phase's journey.
3. Redlines/specs via Figma Dev Mode: tokens used, spacing, component variants.
4. Copy deck (`packages/i18n` keys) with Arabic and English strings reviewed by legal for regulated wording (PM RACI "Regulatory representations").
5. Usability test (5 participants) for every journey; fix critical issues before handoff.

### 1.6 Stage 6 — Design QA & final product polish (continuous + Phase 12)
- Visual regression: Playwright screenshots (web) and Maestro screenshots (mobile) compared with approved designs for AR and EN.
- Design review checklist (Part J.5) in every UI PR.
- Phase 12: full heuristic review, accessibility audit (WCAG 2.2 AA), RTL audit, copy audit for prohibited claims ("guaranteed", "deposit protected", "licensed", "redeem for real", etc.).

### Deliverables
Personas, research reports, sitemaps, J1–J7 flows with exceptions, wireframes (all screens, five states), Figma design system + token JSON, component library spec, hi-fi screens per phase, prototypes, copy decks AR/EN, usability test reports, design QA reports.

### Acceptance criteria (per design handoff)
- [ ] Every screen exists in AR and EN, mobile and/or web sizes, all five states.
- [ ] SimulationBanner present on every screen and export mock-up.
- [ ] Tokens exported and building in `packages/design-tokens` (CSS vars + TS theme) without manual edits.
- [ ] Contrast checks pass for all token pairs used in text/UI.
- [ ] Journey prototype tested with ≥5 participants; no unresolved critical usability issues.
- [ ] Legal/compliance approved all regulated copy for the phase.
- [ ] Product owner approval recorded in Figma + `docs/design/approvals.md`.

---

## Phase 2 — Platform Foundation (M1 → part of Gate 1)

### Objective
Build the skeleton every feature relies on: monorepo, CI/CD, local environment, identity, tenancy, RBAC, maker-checker framework, audit log, configuration management, adapter registry with fail-closed egress, simulation labeling, deterministic scenario engine, observability, and empty app shells for all web apps and the mobile app.

### PRD coverage
FR-SEC-001, FR-AUD-001, FR-INT-002, FR-ADM-001, FR-DEMO-001, FR-DEMO-002, FR-DEMO-003, NFR-001, NFR-003, NFR-004 (baseline), NFR-005, NFR-007, NFR-009 (baseline), NFR-011.

### Entry criteria
Gate 0/A passed; Phase 1 app-shell, login and navigation designs approved.

### Spec Kit features (run in order)

**001-monorepo-ci-devenv**
```
/speckit.specify Create the PDFE development foundation: a single repository containing the backend API,
background worker, mock adapter hub, seven web apps (consumer, merchant, business, console, investor,
devportal) and a mobile app, plus shared packages. A new developer must be able to clone the repository and
start the full stack locally with one command, run all tests with one command, and see every app open with a
visible SIMULATION banner. Continuous integration must run linting, type checking, unit tests, secret
scanning, forbidden-URL scanning and dependency scanning on every pull request and block merging on failure.
Covers NFR-007 and FR-DEMO-003 (CI portion).
```
**002-observability-correlation**
```
/speckit.specify Every request, background job and adapter call must carry a correlation ID that appears in
logs, traces, metrics, audit events and error messages shown to users, so an operator can follow one user
action across all components (NFR-005, FR-TXN-002 groundwork). Provide a local dashboard to search by
correlation ID.
```
**003-simulation-labels**
```
/speckit.specify All screens in web and mobile apps, all downloadable files (PDF, CSV) and all emails or
notifications must display a prominent, non-dismissible "SIMULATION — NOT REAL MONEY" label in Arabic and
English (FR-DEMO-002). Automated checks must fail the build if a page or export lacks the label.
```
**004-identity-rbac-tenancy**
```
/speckit.specify Provide sign-in for synthetic demo users with roles from the PRD personas (individual,
freelancer, merchant owner/staff, business finance user/manager, exchange user, operations analyst,
compliance analyst, compliance approver, finance analyst, finance approver, issuer operator, platform
administrator, read-only demo viewer). Enforce multi-factor authentication for privileged roles, tenant
isolation so no user can see another tenant's data, least-privilege permissions, separation of duties
(requesters cannot approve their own high-risk operations; no single role can alter journals, approve
issuance and erase audit) and a reusable maker-checker approval capability. Administrators cannot change the
DEMO/LIVE boundary. Covers FR-SEC-001, NFR-003, NFR-011.
```
**005-audit-log**
```
/speckit.specify Record append-only, tamper-evident audit events for every privileged action and financial
decision with actor, role, tenant, action, target, reason, timestamp, correlation ID and approval reference.
Provide verification that detects any tampering, plus search and export for auditors (FR-AUD-001).
```
**006-adapter-registry-egress**
```
/speckit.specify All external dependencies (bank, payment, chain, KYC, sanctions, FX, market price,
notification) are accessed through adapter interfaces. In DEMO only mock adapters are permitted; the system
must refuse to start if any configured adapter is not a mock or is unknown, and live adapter interfaces exist
but are disabled by default. Outbound network access from application containers must be blocked except to
internal services, and automated tests must prove that attempts to reach the internet fail. Repository scans
block real URLs, credentials, private keys and mainnet/testnet RPC endpoints. Covers FR-INT-002,
FR-DEMO-003, NFR-001.
```
**007-config-management**
```
/speckit.specify Administrators manage system configuration (fees, limits, FX spreads, rule thresholds,
feature flags, scenario parameters) with version history, maker-checker approval, effective dates, diff view
and one-click rollback to a previous version; every change is audited (FR-ADM-001). Safety-boundary settings
are not editable through configuration.
```
**008-scenario-engine**
```
/speckit.specify Operators can reset the environment and seed a named synthetic scenario with a recorded
version and seed; running the same scenario with the same seed and version produces identical IDs, balances,
timestamps and outputs (FR-DEMO-001, NFR-007). Scenario manifests are versioned files. A scenario run report
lists what was created.
```
**009-app-shells**
```
/speckit.specify Create the navigable shells for all web apps and the mobile app following the approved
designs: sign-in, role-based navigation, tenant/role/environment badges, language switch Arabic/English with
correct RTL/LTR layout, empty/loading/error/permission-denied state components, and the simulation banner.
No business features yet.
```

### UI/UX design (needed from Phase 1)
Sign-in (+MFA OTP), role picker for demo users, app shells (web side nav, mobile bottom tabs), language switcher, global error page with correlation ID, permission-denied page, admin: users/roles, config list/diff/approve, scenario controller, audit search.

### Database (migrations `db/migrations/0001…`)
Create schemas: `platform`, `iam`, `audit`, `config`, `demo`, `integration`. Install extensions: `pgcrypto`.

```sql
-- 0001_platform.sql
CREATE SCHEMA platform;
CREATE TABLE platform.tenants (
  id UUID PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('platform','consumer_pool','merchant','business','issuer','partner')),
  status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL, version INT NOT NULL DEFAULT 1);
CREATE TABLE platform.legal_entities (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
  code TEXT NOT NULL, name TEXT NOT NULL, is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic),
  created_at TIMESTAMPTZ NOT NULL, UNIQUE (tenant_id, code));
CREATE TABLE platform.organizations (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
  legal_entity_id UUID REFERENCES platform.legal_entities(id),
  type TEXT NOT NULL CHECK (type IN ('merchant','business','issuer','partner_bank','platform')),
  display_name TEXT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, version INT NOT NULL DEFAULT 1);

-- 0002_iam.sql
CREATE SCHEMA iam;
CREATE TABLE iam.users (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
  external_subject TEXT UNIQUE NOT NULL,            -- Keycloak sub
  display_name TEXT NOT NULL, locale TEXT NOT NULL DEFAULT 'ar', status TEXT NOT NULL,
  is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic), created_at TIMESTAMPTZ NOT NULL, version INT NOT NULL DEFAULT 1);
CREATE TABLE iam.roles (code TEXT PRIMARY KEY, description TEXT NOT NULL, privileged BOOLEAN NOT NULL);
CREATE TABLE iam.permissions (code TEXT PRIMARY KEY, description TEXT NOT NULL, high_risk BOOLEAN NOT NULL);
CREATE TABLE iam.role_permissions (role_code TEXT REFERENCES iam.roles, permission_code TEXT REFERENCES iam.permissions,
  PRIMARY KEY (role_code, permission_code));
CREATE TABLE iam.user_roles (user_id UUID REFERENCES iam.users, role_code TEXT REFERENCES iam.roles,
  organization_id UUID REFERENCES platform.organizations, granted_by UUID, granted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, role_code, organization_id));
CREATE TABLE iam.sod_conflicts (role_a TEXT REFERENCES iam.roles, role_b TEXT REFERENCES iam.roles,
  reason TEXT NOT NULL, PRIMARY KEY (role_a, role_b));
CREATE TABLE iam.approval_requests (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, action_type TEXT NOT NULL, target_type TEXT NOT NULL,
  target_id UUID, payload JSONB NOT NULL, payload_hash TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES iam.users, reason TEXT NOT NULL,
  required_approvals INT NOT NULL DEFAULT 1, status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL, correlation_id TEXT NOT NULL, version INT NOT NULL DEFAULT 1);
CREATE TABLE iam.approval_decisions (
  id UUID PRIMARY KEY, approval_request_id UUID NOT NULL REFERENCES iam.approval_requests,
  decided_by UUID NOT NULL REFERENCES iam.users, decision TEXT NOT NULL CHECK (decision IN ('approve','reject')),
  reason TEXT NOT NULL, decided_at TIMESTAMPTZ NOT NULL,
  UNIQUE (approval_request_id, decided_by));
-- enforced in service AND by trigger: decided_by <> requested_by

-- 0003_audit.sql
CREATE SCHEMA audit;
CREATE TABLE audit.audit_events (
  seq BIGSERIAL PRIMARY KEY, id UUID UNIQUE NOT NULL, tenant_id UUID, actor_id UUID, actor_role TEXT,
  action TEXT NOT NULL, target_type TEXT, target_id TEXT, reason TEXT, approval_request_id UUID,
  correlation_id TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL, data JSONB NOT NULL DEFAULT '{}',
  prev_hash TEXT NOT NULL, hash TEXT NOT NULL);   -- hash = sha256(prev_hash || canonical_json(row))
CREATE TABLE audit.anchors (id BIGSERIAL PRIMARY KEY, up_to_seq BIGINT NOT NULL, hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL);
-- trigger: BEFORE UPDATE OR DELETE ON audit.audit_events → RAISE EXCEPTION 'audit is append-only'
-- grants: app_role has INSERT, SELECT only

-- 0004_config.sql
CREATE SCHEMA config;
CREATE TABLE config.config_items (key TEXT PRIMARY KEY, schema JSONB NOT NULL, safety_locked BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE config.config_versions (
  id UUID PRIMARY KEY, key TEXT REFERENCES config.config_items, version INT NOT NULL, value JSONB NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL, status TEXT NOT NULL CHECK (status IN ('draft','pending_approval','active','superseded','rolled_back')),
  approval_request_id UUID REFERENCES iam.approval_requests, created_by UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (key, version));

-- 0005_demo_integration.sql
CREATE SCHEMA demo;
CREATE TABLE demo.scenarios (code TEXT PRIMARY KEY, title TEXT NOT NULL, manifest_version TEXT NOT NULL, manifest_sha256 TEXT NOT NULL);
CREATE TABLE demo.scenario_runs (id UUID PRIMARY KEY, scenario_code TEXT REFERENCES demo.scenarios, seed BIGINT NOT NULL,
  manifest_version TEXT NOT NULL, started_at TIMESTAMPTZ NOT NULL, finished_at TIMESTAMPTZ, status TEXT NOT NULL,
  result_digest TEXT, report JSONB);
CREATE SCHEMA integration;
CREATE TABLE integration.partner_adapters (code TEXT PRIMARY KEY, kind TEXT NOT NULL, adapter_type TEXT NOT NULL
  CHECK (adapter_type LIKE 'mock:%'), enabled BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE integration.idempotency_keys (
  tenant_id UUID NOT NULL, scope TEXT NOT NULL, key TEXT NOT NULL, request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress','completed','failed')), response JSONB,
  created_at TIMESTAMPTZ NOT NULL, expires_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (tenant_id, scope, key));
CREATE TABLE integration.outbox (
  id UUID PRIMARY KEY, tenant_id UUID, topic TEXT NOT NULL, payload JSONB NOT NULL, correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, published_at TIMESTAMPTZ, attempts INT NOT NULL DEFAULT 0);
```
**RLS pattern (apply to every tenant-owned table):**
```sql
ALTER TABLE iam.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON iam.users
  USING (tenant_id = current_setting('app.tenant_id')::uuid OR current_setting('app.cross_tenant','t') = 'on');
-- app sets `SET LOCAL app.tenant_id = '<uuid>'` per transaction; cross_tenant only for platform-ops roles, audited.
```

### Backend (apps/api, apps/worker, apps/mock-hub)
- **Core infrastructure:** `ClockService`, `IdGenerator` (UUIDv7; deterministic in scenarios), `RandomService` (seeded), `CorrelationInterceptor` (reads/creates `X-Correlation-Id`), `TenantContext` (from token → `SET LOCAL`), global exception filter returning `{error:{code,message_key,correlation_id}}`.
- **Identity module:** OIDC JWT validation against Keycloak; `@RequirePermission('ledger.post')` guard; `PermissionService` with SoD check on role grant; MFA claim (`acr`/`amr`) required for privileged roles.
- **Approvals module (maker-checker):** `POST /v1/approvals` create; `POST /v1/approvals/{id}/decisions`; rules: approver ≠ requester, approver holds approve permission, payload hash unchanged, not expired; on approval emits `approval.approved` to outbox; consumers execute the action.
- **Audit module:** `AuditService.record()` within the same DB transaction as the action; hash chain computed with advisory lock `pg_advisory_xact_lock(hashtext('audit'))`; `GET /v1/audit/events?…`; `POST /v1/audit/verify` returns first broken seq or OK; export CSV/JSON.
- **Config module:** typed config with Zod schema per key; `GET /v1/config/{key}` (active), `POST /v1/config/{key}/versions` (draft→approval), rollback = new version copying old value.
- **Adapter registry (integration module):** `AdapterRegistry.register(kind, impl)`; at boot reads config; **if `APP_MODE !== 'DEMO'` → exit(1)** (LIVE unsupported); if any adapter type not in `mock:*` allowlist → exit(1). Live adapter interfaces exist as TypeScript interfaces + `DisabledLiveAdapter` throwing `LiveAdapterDisabledError`.
- **Egress:** Node global `http(s).Agent` guard + `undici` dispatcher that rejects non-internal hosts (defense in depth) + Docker network `internal: true` for app networks + CI job running `curl https://example.com` inside the api container expecting failure.
- **Idempotency middleware:** `Idempotency-Key` header required on all POST/PUT/PATCH mutating endpoints; stores request hash; same key + same hash → stored response; same key + different hash → 422 `IDEMPOTENCY_KEY_REUSED`.
- **Outbox relay (worker):** polls `integration.outbox` with `FOR UPDATE SKIP LOCKED`, publishes to BullMQ queues, marks published.
- **Scenario engine (demo module):** `POST /v1/demo/scenarios/{code}/runs {seed}` (admin/operator only) → truncate demo data in safe order (DEMO only), set deterministic clock base + id seed, load manifest from `db/seeds/scenarios/<code>/<version>.yaml`, create entities via domain services (never raw inserts into ledger), compute `result_digest` (sha256 of canonical export).
- **Mock hub:** Express/Nest app with endpoints simulating bank, PSP, chain, KYC, sanctions, FX, price feeds; behavior controllable (latency, failure rate, scripted outcomes) via scenario.
- **Rate limiting:** per-user and per-IP token bucket (Redis) — baseline values configurable (NFR-009).

### Frontend (web) — all apps
- Next.js App Router apps share `packages/ui-web` `AppShell`, `SimulationBanner` (rendered in root layout; cannot be removed by page), `LocaleProvider` (sets `<html dir lang>`), `AuthProvider` (OIDC PKCE via Keycloak), `PermissionGate` component, error boundary showing correlation ID.
- Pages: `/sign-in`, `/` (role landing), `/settings/language`, `/403`, `/error`.
- Console additions: `/admin/users`, `/admin/roles`, `/admin/config` (list, version history, diff, request change, approve), `/admin/scenarios` (choose scenario, seed, run, view report), `/audit` (search, verify, export).

### Mobile app (apps/mobile)
- Expo Router project with tabs placeholder (Home, Pay, Send, Markets, Profile), `SimulationBanner` in root layout, i18next with `I18nManager.forceRTL` handling (requires reload — show prompt), OIDC via `expo-auth-session` against Keycloak (demo realm), tokens in `expo-secure-store`, app lock screen with **simulated** biometric prompt (`expo-local-authentication` used only as a local unlock; never as identity verification).
- Network layer only talks to the API base URL from config; build-time check rejects any non-internal URL in DEMO profile.
- Error screen shows correlation ID; offline banner when no connectivity.

### Testing
- Unit: guards, SoD rules, approval rules, hash chain, idempotency middleware, config schema validation.
- Integration (Testcontainers Postgres + Redis + Keycloak): RLS isolation (user from tenant A queries tenant B → 0 rows/403), audit append-only (UPDATE raises), approval self-approve rejected.
- **Negative authorization suite:** for every endpoint, a table-driven test of each role → expected allow/deny.
- Safety: boot test with `adapter_type='http:real'` → process exits non-zero; container egress test fails to reach internet; gitleaks + custom forbidden-pattern scan (mainnet RPC hosts, `https://` outside allowlist, PEM private keys) blocking.
- Determinism: run scenario `baseline-v1` twice with seed 42 → identical `result_digest`.
- Label checks: Playwright crawls every route in each app and asserts SimulationBanner visible; mobile Maestro flow asserts banner text on each tab.
- Accessibility: axe on app shells (0 serious/critical).

### Deliverables
Running local stack (`pnpm dev:all` / `docker compose up`), CI pipeline, Keycloak realm with all demo roles, RBAC + SoD + maker-checker framework, audit log with verify/export, config management, adapter registry + egress deny, scenario engine with `baseline-v1` manifest, app shells (6 web apps + mobile) in AR/EN, ADR-001/002/009/010/011/012/013/014/015 accepted, `docs/runbooks/local-setup.md`.

### Acceptance criteria
- [ ] Fresh clone → `pnpm bootstrap && pnpm dev:all` brings up everything; documented in `quickstart.md` and verified by a second person.
- [ ] CI blocks merge on lint/type/test/secret/forbidden-URL failure (proved with a deliberate failing PR).
- [ ] API refuses to start with a non-mock or unknown adapter (automated test).
- [ ] Egress test from api, worker, mock-hub containers to a public host fails.
- [ ] Negative authorization suite passes for all Phase 2 endpoints; cross-tenant read returns nothing.
- [ ] Self-approval of a maker-checker request is rejected (service + DB trigger).
- [ ] Audit verify detects a manually tampered row in a test database.
- [ ] Config change requires approval; rollback restores prior value; both audited.
- [ ] Same scenario + seed + version → identical digest across two runs and two machines.
- [ ] Every web route and mobile tab shows the simulation label in AR and EN; RTL layout correct (visual snapshot approved).
- [ ] Privileged roles cannot sign in without MFA.
- [ ] Correlation ID visible from UI error → log → trace.

---

## Phase 3 — Financial Core (M2 → Gate 1/B design, Gate 2/C evidence)

### Objective
Build the correct, concurrent-safe, immutable double-entry ledger and the transaction orchestration engine that every product uses. This is the highest-risk phase; take it slowly.

### PRD coverage
FR-LED-001…005, FR-TXN-001, FR-TXN-002, FR-ACC-001, Business rules 1, 2, 3, 6, 7, 9; NFR-002, NFR-005.

### Entry criteria
Phase 2 accepted. **Before implementation (Gate 1/B):** finance/ledger specialist approves the chart of accounts and accounting mappings; security lead approves the threat model (STRIDE for ledger, auth, adapters, scenario reset).

### Gate 1/B design package (create first, as part of 010 plan)
1. `docs/adr/ADR-003-money.md`, `ADR-004-ledger.md`, `ADR-005-concurrency.md`, `ADR-006-idempotency.md`, `ADR-007-state-machines.md`, `ADR-008-outbox.md` → Accepted.
2. `docs/finance/chart-of-accounts.md` — the synthetic chart of accounts (below).
3. `docs/finance/accounting-mappings.md` — debit/credit table for every transaction type in the PRD (wallet transfer, funding, withdrawal, payment capture, fee, refund, payout, remittance in/out, FX conversion, mint, burn, reserve allocation/release, order hold, fill, cancel, crypto deposit/withdrawal, reversal).
4. `docs/security/threat-model.md` — STRIDE table with mitigations and test IDs.
5. `docs/finance/invariants.md` — invariants I-1…I-12 (below) each mapped to a test.

**Synthetic chart of accounts (per legal entity, per currency)**
| Code | Name | Type | Normal |
|---|---|---|---|
| 1000 | Mock settlement bank — ILS/USD/JOD/EUR | Asset | Debit |
| 1100 | Mock partner receivable | Asset | Debit |
| 1200 | Simulated reserve assets (PSH program) | Asset | Debit |
| 1300 | Paper crypto custody (BTC/ETH) | Asset | Debit |
| 2000 | Customer wallet liabilities (subledger per wallet) | Liability | Credit |
| 2100 | Merchant payable (per merchant) | Liability | Credit |
| 2200 | Remittance in transit | Liability | Credit |
| 2300 | PSH token liability (subledger per holder) | Liability | Credit |
| 2400 | Exchange customer asset liabilities | Liability | Credit |
| 2500 | Suspense / unmatched | Liability | Credit |
| 3000 | Synthetic funding equity (demo seed) | Equity | Credit |
| 4000 | Fee revenue | Revenue | Credit |
| 4100 | FX spread revenue | Revenue | Credit |
| 5000 | FX rounding / gain-loss | Expense/Revenue | Debit |
| 9000 | FX position bridge (per currency) | Memo/Bridge | — |

**Invariants**
- I-1 Every posted journal: Σdebit = Σcredit **per currency**.
- I-2 Posted journals and lines are never updated or deleted.
- I-3 `available = posted_balance − active_holds` for liability accounts (customer perspective); never < 0 unless `overdraft_allowed` approved.
- I-4 Idempotency key posts at most one journal.
- I-5 Reversal journal = exact mirror of original lines, references original, original remains.
- I-6 Sum of all balances per currency across the whole ledger = 0 (trial balance balances).
- I-7 Value only created via `synthetic_funding` or `simulated_issuance` journal types, which require an approval reference.
- I-8 Balance projection equals recomputation from lines (nightly + on-demand check).
- I-9 Transaction state transitions only along the allowed table.
- I-10 Every journal links to a transaction and a correlation ID.
- I-11 Holds are released exactly once (captured, released or expired).
- I-12 FX conversion posts balanced legs in each currency through bridge accounts.

### Spec Kit features

**010-ledger-core**
```
/speckit.specify Build the core double-entry ledger as the single source of truth for all simulated value.
It maintains ledger accounts per legal entity, currency/asset and owner; posts journals whose debits equal
credits per currency; forbids any modification of posted entries; supports reversal only by new
compensating journals linked to the original; records journal type, transaction link, correlation ID and
approval reference; and provides trial balance, account statements and balance recomputation checks.
Value can only be created by approved synthetic funding or approved simulated issuance.
Covers FR-LED-001, FR-LED-004, business rules 1-3 and 9, invariants I-1, I-2, I-5, I-6, I-7, I-8, I-10.
```
**011-balances-holds**
```
/speckit.specify Accounts expose posted, pending, held and available amounts. Products place holds before
executing (e.g., transfers, orders, payouts); holds are captured into postings, released or expire exactly
once. Spending more than the available balance is rejected, including when many requests arrive at the same
time, unless an approved overdraft configuration exists. Covers FR-LED-002, FR-LED-005, rule 7, rule 8
groundwork, invariants I-3 and I-11.
```
**012-idempotency**
```
/speckit.specify Every money-moving command requires an idempotency key; repeating a request with the same
key returns the original result without posting again; reusing a key with different content is rejected;
retries after timeouts are safe. Covers FR-LED-003, rule 6, invariant I-4.
```
**013-txn-orchestrator**
```
/speckit.specify Provide a transaction orchestration engine with typed state machines for each business
transaction type, recording every state change as an event, handling retries, timeouts and errors, and
refusing transitions that are not allowed. Each business transaction is linked to its ledger journals,
external (mock) adapter events and audit records through a correlation ID, and an operator can view the full
trace. Covers FR-TXN-001, FR-TXN-002, rule 6, invariant I-9.
```
**014-accounts-provisioning**
```
/speckit.specify Provision synthetic users, merchants and businesses with their wallets and ledger accounts
automatically and through scenarios, with correct permissions and ownership; support ILS, USD, JOD, EUR
wallets for individuals and businesses. Covers FR-ACC-001.
```
Run `/speckit.checklist ledger-correctness` and `/speckit.checklist security-authz` for 010–013.

### UI/UX design
Finance console v1: Chart of accounts list, Account detail (balances: posted/pending/held/available, lines with running balance), Journal detail (lines table, type, links, reversal relationship), Trial balance (per entity/currency, balanced indicator), Transaction trace view (timeline of state events, journals, adapter events, audit, correlation ID copy), Post manual synthetic funding (maker-checker panel).

### Database (schema `ledger`, `txn`)
```sql
CREATE SCHEMA ledger;
CREATE TABLE ledger.assets (code TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('fiat','stable_sim','crypto_paper')),
  scale SMALLINT NOT NULL CHECK (scale BETWEEN 0 AND 18), display_name_en TEXT NOT NULL, display_name_ar TEXT NOT NULL);
-- seed: ILS 2, USD 2, JOD 3, EUR 2, PSH 2, BTC 8, ETH 18

CREATE TABLE ledger.accounts (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, legal_entity_id UUID NOT NULL REFERENCES platform.legal_entities,
  coa_code TEXT NOT NULL, asset_code TEXT NOT NULL REFERENCES ledger.assets,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense','bridge')),
  normal_side CHAR(1) NOT NULL CHECK (normal_side IN ('D','C')),
  owner_type TEXT, owner_id UUID, overdraft_limit NUMERIC(38,0) NOT NULL DEFAULT 0,
  overdraft_approval_id UUID, status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL, UNIQUE (legal_entity_id, coa_code, asset_code, owner_type, owner_id));

CREATE TABLE ledger.journals (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, legal_entity_id UUID NOT NULL,
  journal_type TEXT NOT NULL,                  -- e.g. wallet_transfer, synthetic_funding, mint, reversal ...
  transaction_id UUID NOT NULL, reverses_journal_id UUID REFERENCES ledger.journals,
  idempotency_key TEXT NOT NULL, approval_request_id UUID, correlation_id TEXT NOT NULL,
  description TEXT, effective_at TIMESTAMPTZ NOT NULL, posted_at TIMESTAMPTZ NOT NULL,
  UNIQUE (tenant_id, idempotency_key));
CREATE UNIQUE INDEX one_reversal_per_journal ON ledger.journals(reverses_journal_id) WHERE reverses_journal_id IS NOT NULL;

CREATE TABLE ledger.journal_lines (
  id UUID PRIMARY KEY, journal_id UUID NOT NULL REFERENCES ledger.journals,
  line_no SMALLINT NOT NULL, account_id UUID NOT NULL REFERENCES ledger.accounts,
  asset_code TEXT NOT NULL REFERENCES ledger.assets, side CHAR(1) NOT NULL CHECK (side IN ('D','C')),
  amount NUMERIC(38,0) NOT NULL CHECK (amount > 0), memo TEXT, UNIQUE (journal_id, line_no));

-- Balanced check (deferred constraint trigger, fires at COMMIT)
CREATE FUNCTION ledger.assert_balanced() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM ledger.journal_lines WHERE journal_id = NEW.journal_id
             GROUP BY asset_code
             HAVING SUM(CASE side WHEN 'D' THEN amount ELSE 0 END) <> SUM(CASE side WHEN 'C' THEN amount ELSE 0 END))
  THEN RAISE EXCEPTION 'LEDGER_UNBALANCED journal %', NEW.journal_id; END IF;
  IF (SELECT COUNT(*) FROM ledger.journal_lines WHERE journal_id = NEW.journal_id) < 2
  THEN RAISE EXCEPTION 'LEDGER_TOO_FEW_LINES'; END IF;
  RETURN NULL; END $$ LANGUAGE plpgsql;
CREATE CONSTRAINT TRIGGER journal_balanced AFTER INSERT ON ledger.journal_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION ledger.assert_balanced();

-- Immutability
CREATE FUNCTION ledger.forbid_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'LEDGER_IMMUTABLE'; END $$ LANGUAGE plpgsql;
CREATE TRIGGER journals_immutable BEFORE UPDATE OR DELETE ON ledger.journals FOR EACH ROW EXECUTE FUNCTION ledger.forbid_mutation();
CREATE TRIGGER lines_immutable BEFORE UPDATE OR DELETE ON ledger.journal_lines FOR EACH ROW EXECUTE FUNCTION ledger.forbid_mutation();
REVOKE UPDATE, DELETE, TRUNCATE ON ledger.journals, ledger.journal_lines FROM app_role;
-- Scenario reset uses a separate, DEMO-only `demo_reset_role` that drops and recreates the demo database
-- (never row deletes in place), and the reset is audited.

CREATE TABLE ledger.balances (               -- projection, updated in the same transaction as posting
  account_id UUID PRIMARY KEY REFERENCES ledger.accounts,
  posted NUMERIC(38,0) NOT NULL DEFAULT 0,   -- signed in normal-side terms
  pending_in NUMERIC(38,0) NOT NULL DEFAULT 0, pending_out NUMERIC(38,0) NOT NULL DEFAULT 0,
  held NUMERIC(38,0) NOT NULL DEFAULT 0 CHECK (held >= 0),
  version BIGINT NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ NOT NULL);
-- available = posted - held - pending_out  (+ overdraft_limit when approved)

CREATE TABLE ledger.holds (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, account_id UUID NOT NULL REFERENCES ledger.accounts,
  amount NUMERIC(38,0) NOT NULL CHECK (amount > 0), remaining NUMERIC(38,0) NOT NULL CHECK (remaining >= 0),
  status TEXT NOT NULL CHECK (status IN ('active','captured','released','expired','partially_captured')),
  transaction_id UUID NOT NULL, reason TEXT NOT NULL, expires_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, closed_at TIMESTAMPTZ, version BIGINT NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, idempotency_key));
CREATE TABLE ledger.hold_events (id UUID PRIMARY KEY, hold_id UUID REFERENCES ledger.holds, event TEXT NOT NULL,
  amount NUMERIC(38,0) NOT NULL, journal_id UUID, occurred_at TIMESTAMPTZ NOT NULL);

CREATE TABLE ledger.balance_check_runs (id UUID PRIMARY KEY, started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ,
  accounts_checked INT, mismatches INT, details JSONB);

CREATE SCHEMA txn;
CREATE TABLE txn.transactions (
  id UUID PRIMARY KEY, tenant_id UUID NOT NULL, type TEXT NOT NULL, state TEXT NOT NULL,
  initiator_user_id UUID, amount NUMERIC(38,0), asset_code TEXT, metadata JSONB NOT NULL DEFAULT '{}',
  idempotency_key TEXT NOT NULL, correlation_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL, timeout_at TIMESTAMPTZ, version BIGINT NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, type, idempotency_key));
CREATE TABLE txn.transaction_state_events (
  id UUID PRIMARY KEY, transaction_id UUID NOT NULL REFERENCES txn.transactions, from_state TEXT, to_state TEXT NOT NULL,
  cause TEXT NOT NULL, actor_id UUID, adapter_event_id UUID, journal_id UUID, error_code TEXT, data JSONB,
  occurred_at TIMESTAMPTZ NOT NULL);
CREATE TABLE txn.allowed_transitions (txn_type TEXT, from_state TEXT, to_state TEXT, PRIMARY KEY (txn_type, from_state, to_state));
CREATE TABLE txn.adapter_events (
  id UUID PRIMARY KEY, transaction_id UUID REFERENCES txn.transactions, adapter_code TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('request','response','callback')), external_ref TEXT, payload JSONB,
  status TEXT, correlation_id TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL);
```
Add RLS on all tenant tables. Indexes: `journal_lines(account_id)`, `journals(transaction_id)`, `transactions(state, timeout_at)`, `holds(account_id) WHERE status='active'`.

### Backend
**`LedgerService` (the only code allowed to write ledger tables):**
```
post(cmd: PostJournalCommand): Journal
  1. validate: ≥2 lines, amounts > 0 bigint, assets exist, accounts open & same legal entity,
     balanced per asset (pre-check in code; DB trigger is the final guard), journal_type allowed,
     value-creating types require approval_request_id with status approved.
  2. BEGIN (READ COMMITTED for normal; SERIALIZABLE for journal types mint/burn/reserve_*)
  3. idempotency: INSERT journal … ON CONFLICT (tenant_id, idempotency_key) → return existing journal
  4. lock balance rows: SELECT … FROM ledger.balances WHERE account_id = ANY($ids) ORDER BY account_id FOR UPDATE
  5. for each debit on a liability (customer spend): check available (or capture hold) else throw INSUFFICIENT_FUNDS
  6. insert lines; update balances (posted, version+1)
  7. audit.record(...) + outbox('ledger.journal.posted')
  8. COMMIT; on serialization failure retry ≤3 with jitter (idempotent)
reverse(journalId, reason, approvalId?) → mirror lines, journal_type='reversal', reverses_journal_id
placeHold(accountId, amount, txnId, key, expiresAt) → lock balance, check available, held += amount
captureHold(holdId, amount, postingCmd) → in one DB txn: post journal, remaining -= amount, held -= amount
releaseHold(holdId) / expireHolds() (worker job every minute)
trialBalance(entity, asset, asOf) ; recomputeBalances() (I-8) ; accountStatement(accountId, from, to)
```
**`TxnOrchestrator`:**
- State machine definitions in `packages/domain-types/state-machines/*.ts`, e.g. wallet transfer: `CREATED → RISK_CHECK → HELD → POSTED → COMPLETED`; branches `RISK_CHECK → UNDER_REVIEW → (RELEASED→HELD | REJECTED)`, `HELD → FAILED (release)`, `COMPLETED → REVERSED`.
- Each step is a handler `(txn, ctx) => NextState`; transitions validated against `txn.allowed_transitions` (seeded from the TS definitions by migration script) and optimistic `version`.
- Retries via BullMQ with exponential backoff; `timeout_at` scanned by worker → `TIMED_OUT` handler (release holds, mark failed, enqueue ops queue).
- Replay: `POST /v1/ops/transactions/{id}/replay` re-runs the current step idempotently (Phase 11 UI).
- Trace API: `GET /v1/transactions/{id}/trace` → transaction + state events + journals + lines + holds + adapter events + audit events by correlation ID.

**APIs (Phase 3)**
| Method | Path | Permission |
|---|---|---|
| GET | `/v1/ledger/accounts?owner=&asset=` | `ledger.read` |
| GET | `/v1/ledger/accounts/{id}` (balances) | `ledger.read` or owner |
| GET | `/v1/ledger/accounts/{id}/lines?from&to&cursor` | `ledger.read` or owner |
| GET | `/v1/ledger/journals/{id}` | `ledger.read` |
| POST | `/v1/ledger/synthetic-funding` (creates approval request) | `ledger.fund.request` |
| POST | `/v1/ledger/journals/{id}/reversal` (approval) | `ledger.reverse.request` |
| GET | `/v1/ledger/trial-balance?entity&asset&asOf` | `finance.read` |
| POST | `/v1/ledger/balance-checks` | `finance.ops` |
| GET | `/v1/transactions/{id}` , `/trace` | owner or `ops.read` |

Note: there is **no generic "post journal" API**. Products call `LedgerService` internally through typed commands.

### Frontend (web-console/finance)
Pages: `/finance/accounts`, `/finance/accounts/[id]`, `/finance/journals/[id]`, `/finance/trial-balance`, `/finance/funding/new` (maker), `/approvals` (checker inbox, shared), `/ops/transactions/[id]/trace`. Use `MoneyText`, `Table`, `Timeline`, `MakerCheckerPanel`, `TraceLink`. Balanced indicator: green check + text "Balanced / متوازن" or red banner with stop-work instruction.

### Mobile
No new screens; the API client package is generated and the mobile app shows a placeholder wallet balance read from `/v1/ledger/accounts/{id}` for the seeded user (proves end-to-end connectivity).

### Testing (Gate 2/C evidence)
- **Property tests (fast-check):** generate random sequences of funding, transfers, holds, captures, releases, reversals across N accounts; assert I-1, I-3, I-5, I-6, I-8, I-11 after every step (≥10,000 runs in CI nightly, 500 in PR).
- **Concurrency:** 100 parallel spends of 10.00 from a 500.00 balance → exactly 50 succeed, 50 `INSUFFICIENT_FUNDS`, final available 0, no negative; 50 parallel requests with the same idempotency key → 1 journal.
- **DB-level:** attempt UPDATE/DELETE on journals → exception; insert unbalanced lines → commit fails.
- **State machine:** for every type, every non-allowed (from,to) pair rejected; replay produces no extra journal.
- **Timeout:** forced adapter delay → transaction TIMED_OUT, hold released, available restored.
- **Trace:** E2E test asserts trace contains txn, ≥1 state event, journal, adapter event, audit with same correlation ID.
- **Load smoke (k6):** 50 virtual users transfers for 5 min — zero invariant violations (baseline only; no SLO claimed).

### Deliverables
Ledger module, txn orchestrator, account provisioning, finance console v1, Gate 1/B package (ADRs, chart of accounts, mappings, invariants, threat model) approved, Gate 2/C evidence pack in `docs/evidence/gate-2/` (test reports, property test stats, concurrency results, trigger proofs).

### Acceptance criteria
- [ ] Finance specialist signed chart of accounts + accounting mappings **before** 010 implementation.
- [ ] Threat model approved by security lead.
- [ ] All invariants I-1…I-12 have automated tests that pass (I-12 test stub completed in Phase 7).
- [ ] Unbalanced journal cannot be committed; posted rows cannot be changed (DB proofs).
- [ ] Duplicate idempotency key → one posting, identical response; different payload → 422.
- [ ] Concurrency test passes 20 consecutive CI runs without flake.
- [ ] Trial balance per currency equals zero for seeded scenario.
- [ ] Reversal creates linked mirror journal; original intact; double reversal rejected.
- [ ] Synthetic funding without approval is rejected; with approval posts and audits.
- [ ] Trace view shows the full chain for a sample transaction.
- [ ] **Gate 2/C signed** by finance + security + QA.

---

## Phase 4 — Compliance & Risk Core (M2/M6 → Gate 3)

### Objective
Provide the synthetic onboarding (KYC/KYB), screening, transaction monitoring, risk scoring and case management that wallet, merchant, remittance, stable-value and exchange flows call. Built **before** the product journeys so J1–J5 can include their risk steps. Everything is explicitly labeled "synthetic screening — not real AML compliance".

### PRD coverage
FR-CMP-001…004, J6 engine, separation of duties, rule 9; PRD non-goal "representing mock screening as real AML compliance".

### Entry criteria
Phase 3 accepted (orchestrator available for holds/review states). Compliance console designs approved.

### Spec Kit features
**015-kyc-kyb**
```
/speckit.specify Simulate customer (KYC) and business (KYB) onboarding using only synthetic identities and
synthetic document records. Individuals and businesses submit profile data and mock documents; the mock
identity adapter returns scripted outcomes; compliance analysts review, request more information, approve or
reject; risk tier (low/medium/high) and allowed limits follow the outcome. Every decision is audited and
sensitive decisions require a second approver. Screens state that this is a simulation and not real identity
verification. Covers FR-CMP-001.
```
**016-screening**
```
/speckit.specify Screen synthetic parties against synthetic sanctions and PEP watchlists only, using
configurable fuzzy name matching that explains why a match occurred (matched fields, similarity score,
list entry). Possible matches create alerts that analysts disposition as true match / false positive with
reason; dispositions on true matches require maker-checker. Screening is triggered at onboarding, on
beneficiary creation and on payments over configurable thresholds. Covers FR-CMP-002.
```
**017-monitoring-rules**
```
/speckit.specify Provide configurable transaction monitoring rules (amount thresholds, velocity, new-
beneficiary large transfer, structuring pattern, high-risk corridor, dormant account burst) and a fraud risk
score per transaction. Rules are versioned through configuration approval. When a rule matches, the
transaction is held and an alert is raised; rule evaluation results are explainable and logged.
Covers FR-CMP-003.
```
**018-case-management**
```
/speckit.specify Group alerts into cases with assignment, priority, SLA timers, evidence attachments
(synthetic), notes, escalation and decisions (release, reject, request info, escalate). Sensitive
dispositions require an independent approver; the case history is a complete audit report that can be
exported. Releasing a case resumes the held transaction; rejecting it fails the transaction and releases
holds. Covers FR-CMP-004 and J6 engine.
```

### UI/UX design
Consumer/mobile: onboarding wizard (personal info → synthetic document "upload" picker with sample docs → selfie placeholder (simulated) → review → status screen: Pending/Approved/More info/Rejected). Merchant/business: KYB wizard (company info, synthetic registration doc, owners, review). Compliance console: onboarding review queue, review detail (side-by-side data and mock doc preview), alerts list, alert detail with match explanation, case queue (filters by status/priority/SLA), case detail (timeline, evidence, linked transactions with trace link, decision panel with maker-checker), rules list/editor (draft → approval), risk score explanation drawer. Copy: banner "Synthetic screening — not a real compliance check".

### Database (schema `cmp`)
```sql
CREATE SCHEMA cmp;
CREATE TABLE cmp.identity_profiles (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, subject_type TEXT CHECK (subject_type IN ('person','organization')),
  subject_id UUID NOT NULL, full_name TEXT NOT NULL, full_name_ar TEXT, date_of_birth DATE, nationality_code TEXT, country_code TEXT,
  registration_no TEXT, address JSONB, is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic),
  created_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0);
CREATE TABLE cmp.kyc_cases (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, profile_id UUID REFERENCES cmp.identity_profiles,
  kind TEXT CHECK (kind IN ('KYC','KYB')), status TEXT CHECK (status IN ('draft','submitted','in_review','more_info','approved','rejected')),
  risk_tier TEXT CHECK (risk_tier IN ('low','medium','high')), mock_adapter_result JSONB, assigned_to UUID,
  decided_by UUID, approval_request_id UUID, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0);
CREATE TABLE cmp.kyc_documents (id UUID PRIMARY KEY, kyc_case_id UUID REFERENCES cmp.kyc_cases, doc_type TEXT NOT NULL,
  synthetic_sample_code TEXT NOT NULL, status TEXT CHECK (status IN ('received','verified_sim','rejected_sim','expired_sim')), created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE cmp.watchlists (id UUID PRIMARY KEY, code TEXT UNIQUE NOT NULL, kind TEXT CHECK (kind IN ('sanctions_sim','pep_sim')),
  version TEXT NOT NULL, is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic));
CREATE TABLE cmp.watchlist_entries (id UUID PRIMARY KEY, watchlist_id UUID REFERENCES cmp.watchlists, name TEXT NOT NULL,
  name_ar TEXT, aliases TEXT[], dob DATE, country_code TEXT, notes TEXT);
CREATE TABLE cmp.screening_results (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, subject_type TEXT, subject_id UUID,
  trigger TEXT, watchlist_version TEXT, best_score NUMERIC(5,4), matches JSONB, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE cmp.rules (id UUID PRIMARY KEY, code TEXT NOT NULL, version INT NOT NULL, definition JSONB NOT NULL,
  severity TEXT, action TEXT CHECK (action IN ('alert','hold','block')), status TEXT, config_version_id UUID, UNIQUE (code, version));
CREATE TABLE cmp.rule_evaluations (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, transaction_id UUID NOT NULL,
  rule_code TEXT, rule_version INT, matched BOOLEAN, score NUMERIC(6,2), explanation JSONB, evaluated_at TIMESTAMPTZ NOT NULL);
CREATE TABLE cmp.risk_alerts (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, source TEXT CHECK (source IN ('screening','monitoring','surveillance','kyc')),
  source_ref UUID, transaction_id UUID, subject_id UUID, severity TEXT, status TEXT CHECK (status IN ('open','in_case','closed')),
  created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE cmp.compliance_cases (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, title TEXT NOT NULL, priority TEXT,
  status TEXT CHECK (status IN ('new','triage','investigating','pending_approval','released','rejected','escalated','closed')),
  assigned_to UUID, sla_due_at TIMESTAMPTZ, decision TEXT, decision_reason TEXT, approval_request_id UUID,
  created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0);
CREATE TABLE cmp.case_alerts (case_id UUID REFERENCES cmp.compliance_cases, alert_id UUID REFERENCES cmp.risk_alerts, PRIMARY KEY (case_id, alert_id));
CREATE TABLE cmp.case_events (id UUID PRIMARY KEY, case_id UUID REFERENCES cmp.compliance_cases, actor_id UUID, event TEXT NOT NULL,
  note TEXT, evidence JSONB, occurred_at TIMESTAMPTZ NOT NULL);
```

### Backend
- `KycService`: submit → mock identity adapter (`mock:kyc`) returns scripted result by synthetic profile code → `in_review`; analyst decisions; high-risk approvals and rejections of business accounts require approval request. Account limits are config keys by risk tier (`limits.tier.low.daily_ILS`, placeholder values).
- `ScreeningService`: normalize names (Arabic diacritics removal, Latin transliteration table, case folding), Jaro-Winkler + token set similarity; threshold config; returns explanation `{field, input, entry, score}`.
- `RulesEngine`: rule definitions in JSON (`{type:'threshold', field:'amount', op:'>', value: '500000', asset:'ILS'}`, `velocity {count, window}`, etc.) evaluated synchronously in the orchestrator's `RISK_CHECK` step; returns `{action, score, explanations[]}`.
- `CaseService`: auto-create case from alert(s); assignment; SLA timer job; decision → if requires approval, create approval request; on approved release → emit `cmp.case.released` → orchestrator resumes `UNDER_REVIEW → HELD/POSTED`; on reject → `REJECTED` + release holds.
- Orchestrator integration: a reusable `RiskCheckStep` used by all transaction types.
- APIs: `/v1/kyc/cases` (POST submit, GET mine), `/v1/compliance/kyc-cases/*` (review), `/v1/compliance/alerts/*`, `/v1/compliance/cases/*` (assign, note, evidence, decide), `/v1/compliance/rules/*` (draft, approve via config), `/v1/compliance/cases/{id}/report` (PDF/JSON export, watermarked).

### Frontend (web)
Compliance console pages: `/compliance/onboarding`, `/compliance/onboarding/[id]`, `/compliance/alerts`, `/compliance/alerts/[id]`, `/compliance/cases`, `/compliance/cases/[id]`, `/compliance/rules`, `/compliance/rules/[code]`. Merchant/business portals: `/kyb` wizard. Consumer web: `/onboarding`.

### Mobile
Onboarding flow screens (`/onboarding/*`): welcome (simulation explanation), personal info, synthetic document picker (choose a sample document card: "Sample ID — Synthetic"), simulated selfie step (static illustration; no camera capture of real faces in DEMO), review & submit, status screen with polling and pull-to-refresh; limits screen in Profile.

### Testing
Unit: name normalization (Arabic/Latin variants), rule types, scoring explanations. Integration: KYC approve/reject/more-info flows; maker-checker on sensitive dispositions (same user cannot approve own); held transaction resumes on release and fails on reject (holds released, I-11). E2E (J6 core): seeded transaction over threshold → hold → alert → case → evidence → independent approval → release → audit report export contains all events. Label check on all compliance screens and exports.

### Deliverables
KYC/KYB, screening, rules engine, case management, compliance console v1, onboarding flows on web + mobile, synthetic watchlists (`db/seeds/watchlists/sim-v1.yaml`), rules seed set, J6 engine E2E test.

### Acceptance criteria
- [ ] Synthetic onboarding: approve, reject, more-info paths work for KYC and KYB on web and mobile.
- [ ] Screening alerts show explanation (field, score, list entry); only synthetic lists exist (DB check constraint).
- [ ] Rules are versioned and changed only through approval; each evaluation is stored and explainable.
- [ ] A rule hit holds the transaction; release resumes; reject fails and releases hold — ledger reconciles.
- [ ] Sensitive dispositions require a second, different user.
- [ ] Case report export is watermarked and lists every action with actor/time/reason/correlation ID.
- [ ] Every compliance screen states "synthetic screening — not real compliance" (AR/EN).

---

## Phase 5 — Consumer Wallet & Mobile App v1 (M3 → J1, Gate 3)

### Objective
Deliver the first full product journey (J1): synthetic onboarding → mock bank funding → balance → transfer to another user with risk check, hold, posting, notification, statement and reconciliation, on **mobile (primary)** and consumer web.

### PRD coverage
FR-WAL-001, FR-WAL-002, FR-ACC-002, J1 (all exceptions), rule 7, NFR-006.

### Entry criteria
Phases 3 and 4 accepted. Mobile and web wallet designs approved and usability-tested.

### Spec Kit features
**020-wallet-p2p**
```
/speckit.specify Individuals can send synthetic ILS (and other demo currencies) to another wallet user
chosen by phone number, username or QR contact code. The sender sees available balance, enters amount and an
optional note, reviews the transfer (amount, fee placeholder, recipient name masked), confirms with app
unlock, and receives a receipt with status and reference. The recipient is notified and sees the credit.
Risk evaluation runs before funds move; funds are held, then posted; blocked recipients, insufficient
balance, duplicate submissions and timeouts are handled with clear messages; completed transfers can be
reversed only by authorized operations staff through maker-checker. Both parties' histories and the ledger
reconcile. Covers FR-WAL-001 and J1.
```
**021-mock-bank-funding**
```
/speckit.specify Individuals can simulate adding money from and withdrawing money to a mock bank account
(synthetic bank names and masked account numbers). Funding requests go through the mock bank adapter with
scripted outcomes (success, delayed, failed) and produce ledger postings via the settlement bank account;
withdrawals hold funds until the mock bank confirms. No real banking rail is reachable. Covers FR-WAL-002.
```
**022-statements-notifications-history**
```
/speckit.specify Users see a transaction history with filters and details, receive in-app notifications for
credits, debits and status changes, and can download monthly or custom-range statements (PDF and CSV) in
Arabic or English that carry a SIMULATION watermark and reconcile exactly to posted ledger activity, with a
checksum tied to a ledger snapshot. Covers FR-ACC-002 and J1 notification/statement steps.
```

### Accounting mappings (approved in Phase 3, implemented here)
| Event | Debit | Credit |
|---|---|---|
| Mock bank funding settled | 1000 Mock settlement bank (ILS) | 2000 Wallet liability — user |
| P2P transfer | 2000 Wallet liability — sender | 2000 Wallet liability — recipient |
| P2P fee (if configured, default 0) | 2000 Wallet liability — sender | 4000 Fee revenue |
| Withdrawal (on mock confirm) | 2000 Wallet liability — user | 1000 Mock settlement bank |
| Reversal | mirror of original | mirror of original |

### State machines
- `wallet_transfer`: CREATED → RISK_CHECK → (UNDER_REVIEW →) HELD → POSTED → COMPLETED; FAILED, REJECTED, TIMED_OUT, REVERSED.
- `bank_funding`: CREATED → SENT_TO_BANK → (PENDING_BANK) → SETTLED → COMPLETED | FAILED.
- `bank_withdrawal`: CREATED → RISK_CHECK → HELD → SENT_TO_BANK → CONFIRMED → POSTED → COMPLETED | FAILED (release).

### UI/UX design
**Mobile:** Home (balance cards per currency, quick actions Send / Request / Add money / Scan, recent activity), Add money (choose mock bank → amount → review → pending/success), Withdraw, Send (recipient search, contacts, QR scan of a contact code, amount keypad with currency, note, review sheet, unlock, result screen with animated status, share receipt as watermarked image), Request money (shows QR/link), Activity list (grouped by date, filters), Transaction detail (status timeline, reference, trace ID for support), Statements (month picker, language, download/share), Notifications center, Error states (insufficient balance with "Add money" CTA, blocked recipient, under review explanation, timeout with "We'll update you").
**Web consumer:** same flows in responsive layout.

### Database (schema `wallet`, `notify`)
```sql
CREATE SCHEMA wallet;
CREATE TABLE wallet.wallets (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, owner_type TEXT CHECK (owner_type IN ('user','merchant','business')),
  owner_id UUID NOT NULL, asset_code TEXT NOT NULL, ledger_account_id UUID NOT NULL UNIQUE REFERENCES ledger.accounts,
  status TEXT CHECK (status IN ('active','frozen','closed')), contact_code TEXT UNIQUE, created_at TIMESTAMPTZ NOT NULL,
  UNIQUE (owner_type, owner_id, asset_code));
CREATE TABLE wallet.transfers (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, transaction_id UUID UNIQUE REFERENCES txn.transactions,
  from_wallet_id UUID REFERENCES wallet.wallets, to_wallet_id UUID REFERENCES wallet.wallets, amount NUMERIC(38,0) NOT NULL CHECK (amount > 0),
  asset_code TEXT NOT NULL, fee_amount NUMERIC(38,0) NOT NULL DEFAULT 0, note TEXT, created_at TIMESTAMPTZ NOT NULL,
  CHECK (from_wallet_id <> to_wallet_id));
CREATE TABLE wallet.mock_bank_accounts (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID NOT NULL, bank_code TEXT NOT NULL,
  masked_number TEXT NOT NULL, holder_name TEXT NOT NULL, is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic));
CREATE TABLE wallet.bank_movements (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, transaction_id UUID UNIQUE REFERENCES txn.transactions,
  direction TEXT CHECK (direction IN ('funding','withdrawal')), wallet_id UUID REFERENCES wallet.wallets, mock_bank_account_id UUID,
  amount NUMERIC(38,0) NOT NULL, asset_code TEXT NOT NULL, mock_bank_ref TEXT, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE wallet.blocked_recipients (user_id UUID, blocked_wallet_id UUID, reason TEXT, PRIMARY KEY (user_id, blocked_wallet_id));
CREATE TABLE wallet.statements (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, wallet_id UUID, period_from DATE, period_to DATE,
  locale TEXT, format TEXT, ledger_snapshot_hash TEXT NOT NULL, opening NUMERIC(38,0), closing NUMERIC(38,0), file_ref TEXT, created_at TIMESTAMPTZ NOT NULL);
CREATE SCHEMA notify;
CREATE TABLE notify.notifications (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID NOT NULL, kind TEXT, title_key TEXT,
  params JSONB, read_at TIMESTAMPTZ, correlation_id TEXT, created_at TIMESTAMPTZ NOT NULL);
```

### Backend
- `WalletService`: `getWallets(user)`, `resolveRecipient(query)` (masked display name), `createTransfer(cmd, idemKey)` → orchestrator `wallet_transfer`.
- Transfer handlers: `RISK_CHECK` (Phase 4 step + blocked list + KYC tier limits), `HELD` (placeHold on sender), `POSTED` (captureHold + post journal), `COMPLETED` (notify both, outbox `wallet.transfer.completed`).
- `FundingService`: mock bank adapter `mock:bank` with scripted behaviors by scenario; callback endpoint inside internal network `/internal/mock-bank/callbacks` with HMAC signature verification.
- `StatementService`: compute opening/closing from ledger lines; render HTML template (RTL for Arabic, Noto Naskh Arabic font) → PDF via Playwright; watermark diagonal "SIMULATION — NOT REAL MONEY / محاكاة"; footer: period, generation time, `ledger_snapshot_hash` = sha256 of ordered line IDs + amounts; CSV with header row comment "# SIMULATION".
- `NotificationService`: in-app (DB + SSE/WebSocket for web, polling/local notifications for mobile); no external push provider in DEMO.
- APIs: `GET /v1/me/wallets`, `GET /v1/wallets/{id}/activity`, `POST /v1/transfers` (Idempotency-Key), `GET /v1/transfers/{id}`, `GET /v1/recipients/resolve?q=`, `POST /v1/funding`, `POST /v1/withdrawals`, `GET/POST /v1/me/bank-accounts` (synthetic), `POST /v1/statements`, `GET /v1/statements/{id}/file`, `GET /v1/me/notifications`, `POST /v1/ops/transfers/{id}/reversal` (approval).

### Frontend (web-consumer)
Routes: `/home`, `/send`, `/send/review`, `/send/result/[id]`, `/add-money`, `/withdraw`, `/activity`, `/activity/[id]`, `/statements`, `/notifications`, `/profile`. Use TanStack Query; never compute balance in the client — always display API `available`.

### Mobile (apps/mobile)
Screens in Expo Router: `(tabs)/home`, `send/index`, `send/amount`, `send/review`, `send/result`, `scan` (expo-camera for QR of contact codes / payment intents later), `add-money`, `withdraw`, `activity/index`, `activity/[id]`, `statements`, `notifications`, `profile`. Native concerns: secure store tokens; app lock on resume (configurable timeout); haptics on success; share receipt as image via `react-native-view-shot` (watermarked); deep links `pdfe://pay/...` (internal scheme only); offline: disable send buttons, show cached activity with "last updated" time; idempotency key generated on the review screen and reused on retry.

### Testing
- Integration: all J1 exceptions — insufficient balance, duplicate submission (same idempotency key → one journal), blocked recipient, mock bank timeout, reversal via maker-checker; statement totals equal ledger sums.
- Property: random transfers among 20 wallets preserve Σ wallet liabilities = Σ funding − Σ withdrawals.
- E2E web (Playwright) and mobile (Maestro): onboarding → add money → send → recipient sees credit → download statement; AR and EN runs.
- Accessibility: axe on web pages; mobile accessibility labels checked by Maestro + manual TalkBack/VoiceOver test.
- Egress: mock bank calls stay internal (network test).

### Deliverables
Wallet module, funding/withdrawal simulation, statements (PDF/CSV, AR/EN), notifications, consumer web wallet, **mobile app v1** (installable dev build for Android and iOS simulator), J1 E2E evidence (`docs/evidence/J1/`).

### Acceptance criteria
- [ ] J1 happy path completes on mobile and web in AR and EN with an auditable event and ledger trail.
- [ ] All five J1 exceptions behave as specified with user-friendly messages (copy approved).
- [ ] Sender and recipient balances, histories and ledger reconcile after every test.
- [ ] Duplicate tap / retry never double-posts.
- [ ] Statement PDF/CSV is watermarked, in the selected language, and reconciles exactly to posted lines; snapshot hash verifies.
- [ ] No live rail reachable (egress test); mock bank only.
- [ ] Mobile app passes Maestro J1 flow on Android emulator and iOS simulator.
- [ ] Product owner accepts J1 demo; finance specialist confirms postings match mappings.

---

## Phase 6 — Merchant Payments, Refunds & Settlement + Merchant-Lite Mobile (M3 → J2, Gate 3)

### Objective
Merchants (after synthetic KYB) create payment intents/QR codes, customers pay from wallets, merchants refund partially or fully, and merchant balances settle in batches to mock bank accounts with reconciliation.

### PRD coverage
FR-PAY-001, FR-PAY-002, J2 with exceptions (expired intent, duplicate capture, disputed transaction, partial settlement failure).

### Entry criteria
Phase 5 accepted. Merchant portal and merchant-lite mobile designs approved.

### Spec Kit features
**030-payment-intents-qr**
```
/speckit.specify Approved merchants create payment intents (fixed or open amount, reference, expiry) shown as
QR codes or payment links, both static (store QR with amount entry) and dynamic (per order). Customers scan or
open them in the consumer app, see merchant name and amount, authorize payment, and both sides get a receipt.
Each intent can be captured only once and only before expiry; expired or duplicate captures are rejected.
A fee allocation placeholder (configurable, default zero) is recorded. Covers FR-PAY-001 and J2 first half.
```
**031-refunds-settlement**
```
/speckit.specify Merchants issue partial or full refunds (never exceeding the captured amount minus prior
refunds) with reason; refunds credit the customer wallet and debit the merchant payable. Captured funds
accumulate as merchant payable and are paid out through scheduled or on-demand settlement batches to a mock
bank account; a batch may partially fail and failed items are retried or returned to payable. Customers can
open a simulated dispute that places the related amount under review. Statements and reconciliation link
original payment, refunds and payouts. Covers FR-PAY-002 and J2 second half.
```

### Accounting mappings
| Event | Debit | Credit |
|---|---|---|
| Capture | 2000 Wallet — payer | 2100 Merchant payable — merchant |
| Fee (placeholder) | 2100 Merchant payable | 4000 Fee revenue |
| Refund | 2100 Merchant payable | 2000 Wallet — payer |
| Settlement payout (confirmed) | 2100 Merchant payable | 1000 Mock settlement bank |
| Payout item failed after posting | 1000 Mock settlement bank | 2100 Merchant payable (compensating) |
| Dispute hold | hold on 2100 Merchant payable (no posting) | — |

### State machines
`payment_intent`: CREATED → (EXPIRED | AUTHORIZING → CAPTURED → (PARTIALLY_REFUNDED → REFUNDED)) ; `refund`: CREATED → HELD → POSTED → COMPLETED | FAILED ; `settlement_batch`: OPEN → CLOSED → SENT → (SETTLED | PARTIALLY_SETTLED | FAILED) → RECONCILED ; `dispute`: OPENED → UNDER_REVIEW → (RESOLVED_MERCHANT | RESOLVED_CUSTOMER).

### UI/UX design
**Merchant portal (web):** KYB status, dashboard (today's sales, payable balance, next settlement — all SIMULATED tags), create payment (amount, reference, expiry → QR + link + print view), static store QR, transactions list (filters, statuses), payment detail (capture, refunds history, refund button with amount and reason), refunds list, settlements (batches, items, statuses, retry failed), payout bank account (synthetic), staff management (owner/cashier roles), statement downloads.
**Merchant-lite mobile mode:** role switch "Merchant mode" for merchant users: Charge (keypad → dynamic QR full-screen, countdown, real-time "Paid" confirmation), Today's payments, Refund flow, Payout status.
**Consumer mobile/web:** Scan QR → payment sheet (merchant name, amount, expiry countdown, pay button) → result; dispute button on payment detail.

### Database (schema `pay`)
```sql
CREATE SCHEMA pay;
CREATE TABLE pay.merchants (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, organization_id UUID REFERENCES platform.organizations,
  kyb_case_id UUID, display_name TEXT NOT NULL, display_name_ar TEXT, category_code TEXT, payable_account_id UUID REFERENCES ledger.accounts,
  payout_mock_bank_account_id UUID, settlement_schedule TEXT DEFAULT 'daily', status TEXT, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE pay.payment_intents (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, merchant_id UUID REFERENCES pay.merchants,
  kind TEXT CHECK (kind IN ('dynamic','static')), amount NUMERIC(38,0), asset_code TEXT NOT NULL, reference TEXT,
  status TEXT NOT NULL, expires_at TIMESTAMPTZ, capture_transaction_id UUID UNIQUE, payer_wallet_id UUID,
  captured_amount NUMERIC(38,0) NOT NULL DEFAULT 0, refunded_amount NUMERIC(38,0) NOT NULL DEFAULT 0,
  fee_amount NUMERIC(38,0) NOT NULL DEFAULT 0, fee_schedule_version INT, qr_payload TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0,
  CHECK (refunded_amount <= captured_amount));
CREATE TABLE pay.refunds (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, payment_intent_id UUID REFERENCES pay.payment_intents,
  transaction_id UUID UNIQUE, amount NUMERIC(38,0) NOT NULL CHECK (amount > 0), reason TEXT NOT NULL, status TEXT, created_by UUID, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE pay.settlement_batches (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, merchant_id UUID, asset_code TEXT, cutoff_at TIMESTAMPTZ,
  status TEXT, total_amount NUMERIC(38,0), mock_bank_batch_ref TEXT, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE pay.settlement_items (id UUID PRIMARY KEY, batch_id UUID REFERENCES pay.settlement_batches, payment_intent_id UUID,
  refund_id UUID, amount NUMERIC(38,0) NOT NULL, status TEXT, journal_id UUID, failure_reason TEXT);
CREATE TABLE pay.disputes (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, payment_intent_id UUID, opened_by UUID, reason TEXT,
  hold_id UUID, status TEXT, resolution TEXT, case_id UUID, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE pay.fee_schedules (version INT PRIMARY KEY, rules JSONB NOT NULL, config_version_id UUID, effective_from TIMESTAMPTZ NOT NULL);
```
**QR payload:** `pdfe-sim://pay?i=<intent_id>&m=<merchant_id>&a=<amount>&c=<asset>&e=<expiry>&sig=<hmac>`; prefixed `SIM` text so it can never be confused with a real payment QR; signature verified server-side.

### Backend
- `MerchantService`, `PaymentIntentService.create/expire` (worker job), `CaptureService` (orchestrator `payment_capture`: verify signature, status=CREATED, not expired, lock intent row `FOR UPDATE`, risk check, hold payer, post capture + fee, mark CAPTURED — single-use guaranteed by unique `capture_transaction_id` + status check in same transaction).
- `RefundService` (validate cumulative ≤ captured, hold on merchant payable, post, notify).
- `SettlementService`: cron per schedule; close batch = sum available payable (excluding disputed holds); send to `mock:bank` (scripted partial failures); post payouts for succeeded items; compensating entries / return-to-payable for failed items; retry endpoint.
- `DisputeService`: open → hold on merchant payable → create compliance/ops case → resolution posts refund or releases hold.
- Real-time: SSE channel `merchant/{id}/payments` for "Paid" confirmation.
- APIs: `/v1/merchant/payment-intents` (POST, GET), `/v1/payment-intents/{id}` (public lookup for payer), `/v1/payment-intents/{id}/capture` (Idempotency-Key), `/v1/merchant/payments/{id}/refunds`, `/v1/merchant/settlements`, `/v1/merchant/settlements/{id}/retry`, `/v1/payments/{id}/disputes`, `/v1/merchant/staff`.

### Frontend / Mobile
Web-merchant routes: `/dashboard`, `/payments/new`, `/payments/[id]`, `/payments`, `/refunds`, `/settlements`, `/settlements/[id]`, `/qr/static`, `/staff`, `/statements`, `/kyb`. Mobile: `merchant/(tabs)/charge`, `merchant/payments`, `merchant/payments/[id]`, `merchant/refund`, `merchant/payouts`; consumer `scan` → `pay/[intentId]`.

### Testing
Expired intent rejected; second capture rejected under 20 concurrent attempts (exactly one success); refund > remaining rejected; partial refunds sum correctly; batch with scripted partial failure ends PARTIALLY_SETTLED, ledger balanced, failed items back in payable; dispute hold reduces settle-able amount; E2E J2 on web + mobile (merchant charges on mobile, customer pays on mobile, refund on web); fee placeholder 0 and non-zero configs both reconcile.

### Deliverables
Payments module, merchant portal, merchant-lite mobile mode, consumer scan-to-pay, settlement worker, disputes, J2 evidence pack.

### Acceptance criteria
- [ ] J2 happy path + four exceptions pass E2E in AR and EN.
- [ ] Single-use capture proven under concurrency; expired intents rejected.
- [ ] Original payment ↔ refunds ↔ settlement items ↔ journals linked in trace view.
- [ ] Settlement reconciliation: Σ captures − Σ refunds − Σ fees − Σ payouts = merchant payable balance.
- [ ] QR codes clearly marked simulated; signature tampering rejected.
- [ ] Merchant statement watermarked and reconciles.

---

## Phase 7 — Cross-Border Remittance & Mock FX (M4 → J3, Gate 3)

### Objective
Simulate an international transfer to a Palestinian freelancer/beneficiary: quote with synthetic FX and fees, synthetic foreign sender, mock funding, screening, partner transfer states, beneficiary wallet credit, receipt and reporting — with correct multi-currency accounting.

### PRD coverage
FR-REM-001, FR-REM-002, J3 (quote expiry, partner rejection, FX mismatch, review hold, payout failure), rule 2, invariant I-12, D-05 placeholders.

### Entry criteria
Phase 5 accepted. FX accounting mapping signed by finance specialist. Remittance designs approved.

### Spec Kit features
**041-fx-quotes**
```
/speckit.specify Provide synthetic, configurable FX rates per currency pair (USD, EUR, JOD to ILS and
reverse) from a mock rate feed, with a configurable spread and fee assumptions per corridor. A quote shows
send amount, rate, spread, fees, exact amount the beneficiary receives, and an expiry countdown; expired
quotes cannot be used and a re-quote is offered. All numbers are labeled illustrative. Conversions post
balanced entries in each currency through FX bridge accounts, with spread and rounding recorded explicitly.
Covers FR-REM-002, rule 2, invariant I-12.
```
**040-remittance-flow**
```
/speckit.specify Simulate inbound remittances from a synthetic foreign sender through a mock partner in a
configured corridor: create quote, capture sender and beneficiary details, mock funding confirmation,
screening of sender and beneficiary, partner transfer states (accepted, in transit, delivered, rejected),
credit to the beneficiary wallet, receipt and reporting. Also allow outbound simulated remittances from a
wallet to a synthetic beneficiary abroad. Handle quote expiry, partner rejection, FX mismatch between quote
and partner confirmation, compliance review hold and payout failure. Covers FR-REM-001 and J3.
```

### Accounting mappings (inbound USD → ILS beneficiary)
| Step | Debit | Credit |
|---|---|---|
| Partner funding confirmed (USD) | 1100 Mock partner receivable USD | 2200 Remittance in transit USD |
| FX conversion USD leg | 2200 Remittance in transit USD | 9000 FX bridge USD |
| FX conversion ILS leg | 9000 FX bridge ILS | 2000 Wallet — beneficiary ILS (received amount) |
| Spread revenue (ILS) | 9000 FX bridge ILS | 4100 FX spread revenue ILS |
| Fee (USD) | 2200 Remittance in transit USD | 4000 Fee revenue USD |
| Rounding residue | 9000 FX bridge ILS | 5000 FX rounding ILS |
| Partner settlement (later) | 1000 Mock settlement bank USD | 1100 Mock partner receivable USD |
Each currency's legs balance separately; the bridge position per currency is reported as the FX position (finance console). Mapping to be confirmed by the qualified accountant (D-11).

### UI/UX design
**Mobile/web consumer:** "Receive from abroad" info + share payout details (synthetic IBAN-like code clearly "SIM"), incoming remittance tracker (timeline: Initiated → Funded → Screening → In transit → Credited), receipt; "Send abroad": choose corridor/country, beneficiary (add/select, screening notice), amount (toggle send/receive amount), **QuoteCard** (rate, spread, fees, exact received, expiry countdown, "Illustrative rates"), review, result, tracking.
**Ops console:** partner simulator panel (advance states, inject rejection/FX mismatch/payout failure for demo), corridor config, FX rate board (synthetic, editable via config approval).

### Database (schema `rem`, `fx`)
```sql
CREATE SCHEMA fx;
CREATE TABLE fx.rate_snapshots (id UUID PRIMARY KEY, base TEXT, quote TEXT, rate_num NUMERIC(38,0) NOT NULL, rate_den NUMERIC(38,0) NOT NULL,
  source TEXT NOT NULL DEFAULT 'mock:fx', captured_at TIMESTAMPTZ NOT NULL, is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic));
CREATE TABLE fx.quotes (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, corridor_code TEXT, send_asset TEXT, receive_asset TEXT,
  send_amount NUMERIC(38,0), receive_amount NUMERIC(38,0), rate_snapshot_id UUID REFERENCES fx.rate_snapshots,
  applied_rate_num NUMERIC(38,0), applied_rate_den NUMERIC(38,0), spread_bps INT, fee_amount NUMERIC(38,0), fee_asset TEXT,
  rounding_mode TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, status TEXT CHECK (status IN ('active','used','expired')),
  created_at TIMESTAMPTZ NOT NULL);
CREATE SCHEMA rem;
CREATE TABLE rem.corridors (code TEXT PRIMARY KEY, from_country TEXT, to_country TEXT, send_assets TEXT[], receive_assets TEXT[],
  partner_adapter_code TEXT REFERENCES integration.partner_adapters, limits JSONB, fee_rules JSONB, active BOOLEAN, is_simulated BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_simulated));
CREATE TABLE rem.beneficiaries (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, owner_user_id UUID, full_name TEXT NOT NULL, country_code TEXT,
  payout_method TEXT CHECK (payout_method IN ('wallet','mock_bank')), payout_ref TEXT, screening_result_id UUID, is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic));
CREATE TABLE rem.remittances (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, direction TEXT CHECK (direction IN ('inbound','outbound')),
  transaction_id UUID UNIQUE, corridor_code TEXT REFERENCES rem.corridors, quote_id UUID REFERENCES fx.quotes,
  sender_profile JSONB NOT NULL, beneficiary_id UUID REFERENCES rem.beneficiaries, beneficiary_wallet_id UUID,
  partner_ref TEXT, partner_status TEXT, confirmed_rate_num NUMERIC(38,0), confirmed_rate_den NUMERIC(38,0),
  status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0);
```

### Backend
- `packages/money`: `convert(amountMinor, fromScale, toScale, rateNum, rateDen, rounding)` with exhaustive property tests (no floats; round-trip bounds; residue = exact difference).
- `FxQuoteService` (snapshot from `mock:fx`, apply spread, compute fee, expiry from config), `RemittanceService` (orchestrator `remittance_inbound`: QUOTED → FUNDING_PENDING → FUNDED → SCREENING → (UNDER_REVIEW) → PARTNER_SUBMITTED → IN_TRANSIT → DELIVERED → CREDITED → COMPLETED; failures: QUOTE_EXPIRED, PARTNER_REJECTED (refund to sender sim), FX_MISMATCH (tolerance config: if partner rate differs beyond tolerance → hold + ops exception), PAYOUT_FAILED (return to in-transit, retry)).
- Mock partner adapter `mock:partner-remit` with scripted outcomes and signed webhooks to internal callback.
- APIs: `POST /v1/fx/quotes`, `GET /v1/fx/quotes/{id}`, `GET /v1/remittance/corridors`, `/v1/remittance/beneficiaries`, `POST /v1/remittances` (Idempotency-Key), `GET /v1/remittances/{id}` (+tracking), `/v1/ops/remittance/simulator/*` (ops only, DEMO only), `GET /v1/reports/remittance-funnel`.

### Frontend / Mobile
Web consumer: `/remit/send`, `/remit/quote`, `/remit/review`, `/remit/[id]`, `/remit/receive`. Mobile: `remit/*` stack with same screens, quote countdown with re-quote button, push-style in-app notifications per state. Ops console: `/ops/remittance/simulator`, `/ops/fx/rates`, `/ops/corridors`. Finance console: `/finance/fx-position`.

### Testing
Money conversion property tests (≥10k cases per pair); quote expiry (deterministic clock); every exception path; I-12 per-currency balance; corridor limits; screening hit → review hold → release; E2E J3 mobile + web; reconciliation: Σ in-transit after completion = 0.

### Deliverables
FX + remittance modules, partner simulator, consumer remittance UI (web + mobile), FX position report, J3 evidence.

### Acceptance criteria
- [ ] Quote shows rate, spread, fees, exact received amount and expiry; expired quote unusable (test with fixed clock).
- [ ] Each currency's legs balance separately; spread/fee/rounding posted to named accounts.
- [ ] All five J3 exceptions reproducible from the ops simulator and handled correctly.
- [ ] Beneficiary credit, receipt and tracking correct; in-transit balance returns to zero.
- [ ] All FX figures labeled illustrative/synthetic.

---

## Phase 8 — Business Tools, Public API, Webhooks & Developer Sandbox (M4 → J7, Gate 3)

### Objective
Give businesses multi-user finance tools (invoices, receivables matching, supplier payouts with approval limits, reporting/export) and give developers a versioned, documented, demo-scoped API with signed webhooks.

### PRD coverage
FR-BIZ-001, FR-BIZ-002, FR-INT-001, NFR-009, J7, Business portal and Developer sandbox interfaces.

### Entry criteria
Phase 6 accepted (merchant/payment primitives). Business portal and dev portal designs approved.

### Spec Kit features
**050-invoicing**
```
/speckit.specify Business users create invoices for synthetic customers with line items, tax placeholder,
due date and payment link/QR; customers pay in simulation; incoming payments are matched to invoices
automatically by reference and manually by staff; invoice states open, partially paid, paid, overdue and
cancelled are always accurate; reminders and exports are available. Covers FR-BIZ-001 and J7 first half.
```
**051-business-approvals**
```
/speckit.specify Businesses manage staff with roles (viewer, preparer, approver, admin) and approval limits.
Supplier payouts above a user's limit require approval by another authorized user (dual control); approvers
cannot approve their own requests; approved payouts settle to mock supplier bank accounts and reconcile to a
mock bank statement; all actions are audited and exportable. Covers FR-BIZ-002 and J7 second half.
```
**052-public-api-webhooks**
```
/speckit.specify Publish versioned public APIs for wallets, payments, invoices and remittances usable with
demo-scoped API keys, documented in a developer portal with sample payloads and a sandbox. Deliver signed
webhooks for key events with retries, backoff, delivery log, replay and signature verification guidance.
Apply rate limiting and abuse protection. Covers FR-INT-001, NFR-009.
```

### Accounting mappings
| Event | Debit | Credit |
|---|---|---|
| Invoice payment received | 2000 Wallet — payer | 2000 Wallet — business (ILS) |
| Supplier payout (approved, confirmed) | 2000 Wallet — business | 1000 Mock settlement bank |
| Payout failed (after post) | compensating reverse | — |

### UI/UX design
**Business portal:** dashboard (receivables/payables summary, SIMULATED), invoices list, invoice editor (line items, totals with bigint math, preview PDF watermarked), invoice detail (payments matched, manual match drawer), customers (synthetic), suppliers + mock bank accounts, payout request form, **Approval inbox** (MakerCheckerPanel, limits shown, SoD warnings), bank statement reconciliation view (mock statement lines vs ledger, match/unmatch), reports & exports (CSV/PDF), team & limits, API keys page.
**Developer portal:** getting started, auth with demo keys, API reference (rendered OpenAPI via Redoc/Scalar), sample payloads, webhook event catalog, webhook delivery explorer (status, attempts, payload, replay), sandbox console ("try it" against demo tenant).

### Database (schema `biz`, `dev`)
```sql
CREATE SCHEMA biz;
CREATE TABLE biz.customers (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, business_id UUID, name TEXT, contact JSONB, wallet_id UUID, is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic));
CREATE TABLE biz.invoices (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, business_id UUID, customer_id UUID REFERENCES biz.customers,
  number TEXT NOT NULL, asset_code TEXT, subtotal NUMERIC(38,0), tax_placeholder NUMERIC(38,0) DEFAULT 0, total NUMERIC(38,0),
  paid_amount NUMERIC(38,0) NOT NULL DEFAULT 0, due_date DATE, status TEXT CHECK (status IN ('draft','open','partially_paid','paid','overdue','cancelled')),
  payment_intent_id UUID, created_by UUID, created_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0,
  UNIQUE (business_id, number), CHECK (paid_amount <= total));
CREATE TABLE biz.invoice_lines (id UUID PRIMARY KEY, invoice_id UUID REFERENCES biz.invoices, description TEXT, quantity NUMERIC(18,3), unit_price NUMERIC(38,0), line_total NUMERIC(38,0));
CREATE TABLE biz.invoice_payments (id UUID PRIMARY KEY, invoice_id UUID REFERENCES biz.invoices, transaction_id UUID, amount NUMERIC(38,0), match_type TEXT CHECK (match_type IN ('auto','manual')), matched_by UUID, matched_at TIMESTAMPTZ);
CREATE TABLE biz.suppliers (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, business_id UUID, name TEXT, mock_bank_account JSONB, is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic));
CREATE TABLE biz.staff_limits (business_id UUID, user_id UUID, role TEXT, payout_limit NUMERIC(38,0), asset_code TEXT, PRIMARY KEY (business_id, user_id, asset_code));
CREATE TABLE biz.payouts (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, business_id UUID, supplier_id UUID, amount NUMERIC(38,0), asset_code TEXT,
  reference TEXT, approval_request_id UUID, transaction_id UUID UNIQUE, status TEXT, created_by UUID, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE biz.bank_statement_lines (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, business_id UUID, value_date DATE, amount NUMERIC(38,0), direction CHAR(1),
  reference TEXT, matched_journal_id UUID, source TEXT DEFAULT 'mock:bank');
CREATE SCHEMA dev;
CREATE TABLE dev.api_keys (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, name TEXT, prefix TEXT UNIQUE, hash TEXT NOT NULL, scopes TEXT[],
  environment TEXT NOT NULL DEFAULT 'demo' CHECK (environment = 'demo'), created_by UUID, created_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ);
CREATE TABLE dev.webhook_endpoints (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, url TEXT NOT NULL, secret_ref TEXT NOT NULL, events TEXT[], active BOOLEAN,
  CHECK (url LIKE 'http://mock-hub%' OR url LIKE 'http://webhook-sink%'));   -- DEMO: internal sinks only
CREATE TABLE dev.webhook_deliveries (id UUID PRIMARY KEY, endpoint_id UUID REFERENCES dev.webhook_endpoints, event_id UUID, event_type TEXT, payload JSONB,
  signature TEXT, attempt INT, status TEXT, response_code INT, next_attempt_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL);
```

### Backend
- `InvoiceService` (numbering, totals in bigint, PDF, payment link via payment intent, overdue job), `MatchingService` (reference exact → amount+customer fuzzy → manual), `PayoutService` (limit check → if over limit create approval with `required_approvals` per policy; approver ≠ requester; on approve → orchestrator `supplier_payout`), `BankStatementReconService` (mock statement import, auto-match, exceptions).
- `PublicApiModule` with `/public/v1/*` routes guarded by API key (hashed with Argon2; prefix lookup), scopes, rate limits per key; OpenAPI published; versioning via URL + `Deprecation` headers policy.
- `WebhookService`: outbox consumer → sign payload (`HMAC-SHA256(secret, timestamp + '.' + body)`, headers `PDFE-Signature`, `PDFE-Timestamp`), deliver to **internal webhook sink only** in DEMO, retries with exponential backoff (e.g., 1m, 5m, 30m, 2h, 6h — configurable), delivery log, manual replay.
- APIs: `/v1/biz/invoices/*`, `/v1/biz/invoices/{id}/match`, `/v1/biz/suppliers/*`, `/v1/biz/payouts/*`, `/v1/biz/approvals/*` (uses shared approvals), `/v1/biz/bank-statements/*`, `/v1/biz/reports/*`, `/v1/dev/api-keys/*`, `/v1/dev/webhooks/*`, `/public/v1/...`.

### Frontend / Mobile
Web-business routes: `/dashboard`, `/invoices`, `/invoices/new`, `/invoices/[id]`, `/customers`, `/suppliers`, `/payouts/new`, `/payouts`, `/approvals`, `/reconciliation`, `/reports`, `/team`, `/developers/api-keys`. Web-devportal: `/docs`, `/reference`, `/webhooks`, `/webhooks/deliveries`, `/sandbox`. Mobile: consumer can pay an invoice via link/QR (reuses Phase 6 pay sheet); optional business approver view (approval inbox read + approve with app unlock) — include as P1 screen `biz/approvals`.

### Testing
Invoice status accuracy (property test on random partial payments); auto/manual matching; dual control (self-approve rejected, over-limit requires approval, under-limit passes); payout reconciliation to mock statement; API contract tests (schemathesis/Pact against OpenAPI); webhook signature verification sample code tested; retry/backoff with deterministic clock; rate-limit abuse test (429); API keys cannot be environment ≠ demo; webhook URL constraint blocks external URLs. E2E J7.

### Deliverables
Business portal, invoicing, approvals, supplier payouts, statement reconciliation, public API v1, webhooks, developer portal, J7 evidence, published OpenAPI file in `packages/contracts/openapi/public-v1.yaml`.

### Acceptance criteria
- [ ] J7 end to end: invoice → payment → match → approval → mock settlement → statement reconciliation → export.
- [ ] Invoice states always correct (open/partially paid/paid/overdue/cancelled).
- [ ] Dual control enforced and audited; requester cannot approve.
- [ ] Public API contract tests pass; breaking change detection in CI (openapi-diff).
- [ ] Webhooks signed, retried, logged, replayable; only internal sinks allowed.
- [ ] Rate limiting returns 429 with `Retry-After`.

---

## Phase 9 — Stable-Value Instrument Simulation "PSH" (M5 → J4, Gate 3)

### Objective
Simulate the proposed ILS-linked 1:1 stable-value instrument end to end with a synthetic qualified-issuer role: reserve allocation, dual approval, mock mint, holder allocation, transfer, redemption, burn, reserve release, and supply/reserve coverage reporting — with strict prevention of issuance on insufficient reserves. Language must never imply an approved or live asset.

### PRD coverage
FR-STB-001, FR-STB-002, FR-STB-003, J4 (insufficient reserves, approval conflict, out-of-balance → issuance must stop), rules 3, 4, 5; Terminology section; D-03, D-04, D-07 (placeholders).

### Entry criteria
Phase 3 and 4 accepted. Accounting mapping for issuance/redemption signed by finance specialist. **Legal/compliance approved all PSH copy** (mandatory).

### Spec Kit features
**060-psh-issuance**
```
/speckit.specify Simulate issuance of the placeholder stable-value instrument PSH (proposed, ILS-linked 1:1,
not approved, not live). A synthetic qualified-issuer operator requests issuance for an amount; synthetic
reserve assets must be allocated first; two different authorized approvers approve; then a mock mint event is
recorded and PSH is allocated to holder wallets. Issuance is blocked and an alert raised whenever reserves
would not fully cover the token liability after minting, when approvals conflict, or when any reconciliation
is out of balance. Simulated supply always equals the token-liability subledger. Covers FR-STB-001,
rules 3-5.
```
**061-psh-redemption**
```
/speckit.specify Holders request redemption of simulated PSH to simulated ILS wallet value; the issuer
operator processes redemptions with approval; a mock burn event reduces supply and token liability, and
reserve assets are released accordingly. Exceptions (insufficient holder balance, approval rejected, mock
chain event failure, reserve release mismatch) are handled and audited. Covers FR-STB-002.
```
**062-reserve-dashboard**
```
/speckit.specify Show simulated circulating supply, token liability, reserve composition (synthetic
categories), coverage ratio, shortfall alerts, mint/burn history and reconciliation status, all derived from
ledger journals (not separate counters), with simulation labels and metric definitions. Covers FR-STB-003.
```

### Accounting mappings (proposed, synthetic issuer entity — accountant to confirm, D-03/D-11)
**Flow A — reserve allocation (issuer funds reserves; needs approved synthetic funding):**
| Asset | Debit | Credit |
|---|---|---|
| ILS | 1200 Simulated reserve assets | 3000 Synthetic funding equity |

**Flow B — holder converts 100.00 ILS wallet value into 100.00 PSH (mint):**
| Asset | Debit | Credit |
|---|---|---|
| ILS | 2000 Wallet liability — holder (100.00) | 9000 PSH issuance bridge ILS (100.00) |
| PSH | 9000 PSH issuance bridge PSH (100.00) | 2300 PSH token liability — holder (100.00) |
| ILS | 1200 Simulated reserve assets (100.00) | 1000 Mock settlement bank (100.00) — earmarks backing cash |

**Flow C — redemption of 100.00 PSH back to ILS (burn):** exact mirror of Flow B (each asset leg balanced separately).

**Flow D — issuer-initiated mint to a holder allocation** (e.g., demo distribution): PSH leg as in Flow B; ILS leg debits 1200-backed reserve allocation account and credits the bridge — only allowed if coverage after mint stays ≥ minimum.

> **Note for the implementer:** because the issuance accounting model depends on D-03/D-11, the plan fixes only the **invariants** and requires the accountant to finalize mappings in `docs/finance/psh-mappings.md` before `/speckit.plan` of 060. Invariants to enforce in code regardless of mapping:
> - **S-1** Σ PSH token liability (2300) = circulating supply (mint − burn) at all times.
> - **S-2** Reserve coverage = reserve assets (1200, in ILS) ÷ PSH liability (1:1 ILS value) ≥ 1.0000 (configurable minimum, default 1.0) — checked inside the SERIALIZABLE mint transaction **after** the hypothetical mint.
> - **S-3** Mint and burn require approved approval requests with ≥2 distinct approvers, none equal to the requester.
> - **S-4** Any reconciliation mismatch sets program state `ISSUANCE_HALTED`; only a maker-checker "resume" after a clean reconciliation clears it.
> - **S-5** No PSH can exist outside journal-backed postings (no direct balance edits).

### State machines
`psh_program`: ACTIVE ↔ ISSUANCE_HALTED; `issuance_request`: DRAFT → RESERVE_CHECK → PENDING_APPROVAL → APPROVED → MINTING (mock chain event) → MINTED → ALLOCATED → COMPLETED | BLOCKED_INSUFFICIENT_RESERVE | REJECTED | FAILED; `burn_request`: REQUESTED → HOLD_TOKENS → PENDING_APPROVAL → APPROVED → BURNING → BURNED → RESERVE_RELEASED → COMPLETED | REJECTED (release hold) | FAILED.

### UI/UX design
**Finance/treasury console (issuer operator & approvers):** program overview (status ACTIVE/HALTED banner, supply, liability, reserves, coverage gauge), reserve accounts & snapshots, issuance request form (amount, target holders, reason), approval panel (two approvers, conflict warnings), mint/burn event log (fake tx IDs labeled "SIMULATED CHAIN EVENT"), redemption queue, reconciliation status, halt/resume with maker-checker.
**Consumer mobile/web:** PSH wallet card with persistent disclaimer "PSH is a placeholder for a proposed instrument — simulation only, not redeemable"; convert ILS→PSH (simulated) and redeem PSH→ILS (simulated) flows with review screens; history.
**Investor dashboard widget:** coverage over time with definition and timestamp.
Copy rules: never use "stablecoin launched", "backed by", "guaranteed", "redeemable at any time"; always "simulated", "proposed", "placeholder".

### Database (schema `stb`)
```sql
CREATE SCHEMA stb;
CREATE TABLE stb.programs (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, code TEXT UNIQUE NOT NULL DEFAULT 'PSH',
  issuer_organization_id UUID REFERENCES platform.organizations, peg_asset TEXT NOT NULL DEFAULT 'ILS', token_asset TEXT NOT NULL DEFAULT 'PSH',
  min_coverage_bps INT NOT NULL DEFAULT 10000, state TEXT CHECK (state IN ('ACTIVE','ISSUANCE_HALTED')), is_placeholder BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_placeholder),
  version BIGINT NOT NULL DEFAULT 0);
CREATE TABLE stb.reserve_accounts (id UUID PRIMARY KEY, program_id UUID REFERENCES stb.programs, category TEXT CHECK (category IN ('cash_sim','deposit_sim','tbill_sim')),
  ledger_account_id UUID REFERENCES ledger.accounts, custodian_label TEXT DEFAULT 'Synthetic custodian');
CREATE TABLE stb.reserve_snapshots (id UUID PRIMARY KEY, program_id UUID, taken_at TIMESTAMPTZ, reserves_total NUMERIC(38,0), liability_total NUMERIC(38,0),
  supply NUMERIC(38,0), coverage_bps INT, composition JSONB, journal_watermark BIGINT, status TEXT CHECK (status IN ('ok','shortfall','mismatch')));
CREATE TABLE stb.issuance_requests (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, program_id UUID, amount NUMERIC(38,0) CHECK (amount > 0),
  allocations JSONB NOT NULL, requested_by UUID, approval_request_id UUID, status TEXT, block_reason TEXT, mock_chain_tx TEXT,
  transaction_id UUID UNIQUE, created_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0);
CREATE TABLE stb.burn_requests (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, program_id UUID, holder_wallet_id UUID, amount NUMERIC(38,0) CHECK (amount > 0),
  requested_by UUID, approval_request_id UUID, hold_id UUID, status TEXT, mock_chain_tx TEXT, transaction_id UUID UNIQUE, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE stb.chain_events_sim (id UUID PRIMARY KEY, program_id UUID, kind TEXT CHECK (kind IN ('mint','burn','transfer')), fake_tx_id TEXT UNIQUE NOT NULL
  CHECK (fake_tx_id LIKE 'SIM-%'), amount NUMERIC(38,0), block_height_sim BIGINT, occurred_at TIMESTAMPTZ);
```

### Backend
- `ReserveService` (allocate via approved synthetic funding; snapshot job; coverage calc purely from ledger balances).
- `IssuanceService`: SERIALIZABLE transaction: lock program row → check state ACTIVE → compute post-mint coverage → if < min → `BLOCKED_INSUFFICIENT_RESERVE` + alert + audit (no posting) → else require approval (2 distinct approvers) → mock chain adapter `mock:chain` emits `SIM-` tx id → post journals → allocate to holder wallets (PSH wallets auto-created).
- `RedemptionService` (hold holder PSH → approval → mock burn → post burn + reserve release → credit ILS wallet).
- `StbReconciliationJob` (every N minutes and after each mint/burn): verify S-1, S-2, S-5 → mismatch → set `ISSUANCE_HALTED`, P0 alert to ops/finance, stop-work banner on console.
- APIs: `/v1/stb/programs/{code}`, `/v1/stb/reserves/*`, `/v1/stb/issuance-requests/*`, `/v1/stb/burn-requests/*`, `/v1/stb/programs/{code}/halt|resume` (approval), `/v1/stb/reports/coverage?from&to`, consumer `/v1/me/psh/convert`, `/v1/me/psh/redeem`.

### Frontend / Mobile
Finance console: `/finance/psh`, `/finance/psh/reserves`, `/finance/psh/issuance/new`, `/finance/psh/issuance/[id]`, `/finance/psh/redemptions`, `/finance/psh/events`, `/finance/psh/reconciliation`. Consumer web + mobile: `psh/index`, `psh/convert`, `psh/redeem`, `psh/history` with permanent disclaimer component `PlaceholderAssetNotice`.

### Testing
Property tests: random mint/burn/transfer sequences keep S-1 and S-2; issuance that would breach coverage always blocked (including 30 concurrent issuance requests racing for the same reserve — SERIALIZABLE retry proves no over-issuance); approval conflicts (same person twice, requester as approver) rejected; injected mismatch → program halts, issuance blocked until clean reconcile + approved resume; dashboard numbers equal ledger queries; copy lint test scans PSH screens/i18n for prohibited phrases. E2E J4 with all exceptions.

### Deliverables
STB module, treasury console PSH section, consumer PSH screens (web + mobile), reconciliation job, coverage report, J4 evidence, `docs/finance/psh-mappings.md` (signed), legal copy approval record.

### Acceptance criteria
- [ ] J4 complete: reserve allocation → dual approval → mock mint → holder allocation → transfer → redemption → burn → reserve release → coverage report.
- [ ] Insufficient reserves always blocks issuance (including under concurrency) and raises an alert.
- [ ] Approval conflicts rejected; ≥2 distinct approvers required.
- [ ] Out-of-balance state halts issuance automatically; resume requires approval after clean reconcile.
- [ ] Supply = token-liability subledger at all times; dashboard derived from journals.
- [ ] Every PSH screen and export carries placeholder/simulation disclaimer approved by legal; prohibited-phrase lint passes.

---

## Phase 10 — Paper Digital-Asset Exchange (M5 → J5, Gate 3)

### Objective
A practice ("paper") exchange: mock BTC/ETH deposits with fake tx IDs, synthetic price feed, market/limit orders with funds reserved, a deterministic matching engine with partial fills and cancellations, trade settlement in the internal ledger, simulated withdrawals, and demo surveillance alerts. Never creates a real chain transaction.

### PRD coverage
FR-EXC-001, FR-EXC-002, FR-EXC-003 (P1), J5 (price gap, insufficient asset, stale quote, order race, market halt), rule 8, D-06.

### Entry criteria
Phases 3–4 accepted. Exchange designs approved (mobile + web). Trading accounting mapping signed.

### Spec Kit features
**071-mock-crypto-deposits**
```
/speckit.specify Exchange users can simulate depositing and withdrawing paper BTC and ETH. The system shows a
clearly fake deposit address and fake transaction IDs, simulates network confirmations and states (pending,
confirming, confirmed, failed), credits the paper asset balance after the configured confirmations and
holds funds for withdrawals until the simulated network confirms. No real blockchain, testnet, wallet or key
is ever used; addresses and tx IDs are formatted so they cannot be valid on any real network.
Covers FR-EXC-002.
```
**070-paper-matching**
```
/speckit.specify Provide paper trading for BTC/ILS, ETH/ILS (and USD pairs) with a synthetic price feed,
market and limit orders, price-time priority matching, partial fills, cancellation of remainders, trade
history and portfolio balances. Orders reserve funds before execution; fills settle in the internal ledger;
cancellations and expiries release exact residual amounts. Handle price gaps with market-order protection
bands, insufficient asset, stale quotes, simultaneous order races and administrator market halts.
Covers FR-EXC-001, rule 8 and J5.
```
**072-market-surveillance**
```
/speckit.specify Generate demo surveillance alerts for wash-like trading (same beneficial owner on both
sides), spoofing-like rapid place/cancel, abnormal volume spikes and self-matching attempts, creating
synthetic compliance cases. Covers FR-EXC-003.
```

### Accounting mappings (internal ledger; exchange legal entity, synthetic)
| Event | Debit | Credit |
|---|---|---|
| Mock deposit confirmed (BTC) | 1300 Paper custody BTC | 2400 Exchange liability — user BTC |
| Order placed (buy BTC with ILS) | hold on 2400 user ILS (no posting) | — |
| Fill: buyer gets BTC, seller gets ILS | 2400 seller BTC D / 2400 buyer BTC C (BTC leg); 2400 buyer ILS D / 2400 seller ILS C (ILS leg) | each asset balanced separately |
| Trading fee (placeholder) | 2400 user ILS | 4000 Fee revenue ILS |
| Simulated withdrawal confirmed | 2400 user BTC | 1300 Paper custody BTC |
| Liquidity bot (synthetic market maker) | uses its own synthetic accounts funded by approved synthetic funding | — |

### UI/UX design
**Mobile (primary for exchange users):** Markets list (pairs, last price, 24h change — SIMULATED badge, price timestamp), Pair screen (price chart, order book depth, recent trades), Order ticket (buy/sell, market/limit, amount/price inputs with bigint validation, estimated cost incl. fee, available balance, protection band warning), Open orders (cancel), Trade history, Portfolio (paper balances, P&L labeled "paper"), Deposit (fake address with "SIMULATED — do not send real crypto" warning, QR intentionally invalid), Withdraw (fake destination format), Market halt banner.
**Web consumer:** full trading layout (chart, book, ticket, orders) — responsive.
**Ops/admin:** market status (halt/resume with approval), price feed controls (scenario-driven price paths, inject gaps/stale), surveillance alerts → cases.

### Database (schema `exc`)
```sql
CREATE SCHEMA exc;
CREATE TABLE exc.trading_pairs (code TEXT PRIMARY KEY, base_asset TEXT, quote_asset TEXT, tick_size NUMERIC(38,0), lot_size NUMERIC(38,0),
  min_notional NUMERIC(38,0), status TEXT CHECK (status IN ('open','halted')), protection_band_bps INT DEFAULT 500);
CREATE TABLE exc.price_ticks (id BIGSERIAL PRIMARY KEY, pair_code TEXT, price NUMERIC(38,0), source TEXT DEFAULT 'mock:price', ts TIMESTAMPTZ NOT NULL);
CREATE TABLE exc.orders (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID, pair_code TEXT REFERENCES exc.trading_pairs,
  side TEXT CHECK (side IN ('buy','sell')), type TEXT CHECK (type IN ('market','limit')), price NUMERIC(38,0), quantity NUMERIC(38,0) CHECK (quantity > 0),
  filled_qty NUMERIC(38,0) NOT NULL DEFAULT 0, status TEXT CHECK (status IN ('new','open','partially_filled','filled','cancelled','rejected','expired')),
  time_in_force TEXT DEFAULT 'GTC', hold_id UUID, seq BIGINT NOT NULL, idempotency_key TEXT, created_at TIMESTAMPTZ NOT NULL, version BIGINT NOT NULL DEFAULT 0,
  CHECK (filled_qty <= quantity), UNIQUE (tenant_id, idempotency_key));
CREATE TABLE exc.fills (id UUID PRIMARY KEY, pair_code TEXT, maker_order_id UUID REFERENCES exc.orders, taker_order_id UUID REFERENCES exc.orders,
  price NUMERIC(38,0), quantity NUMERIC(38,0), journal_id UUID, fee_maker NUMERIC(38,0), fee_taker NUMERIC(38,0), ts TIMESTAMPTZ NOT NULL);
CREATE TABLE exc.crypto_movements_sim (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID, asset_code TEXT CHECK (asset_code IN ('BTC','ETH')),
  direction TEXT CHECK (direction IN ('deposit','withdrawal')), amount NUMERIC(38,0), fake_address TEXT CHECK (fake_address LIKE 'SIM%'),
  fake_tx_id TEXT CHECK (fake_tx_id LIKE 'SIM-%'), confirmations INT DEFAULT 0, required_confirmations INT, status TEXT, transaction_id UUID UNIQUE, created_at TIMESTAMPTZ NOT NULL);
CREATE TABLE exc.market_events (id UUID PRIMARY KEY, pair_code TEXT, kind TEXT CHECK (kind IN ('halt','resume','price_gap','stale_feed')), actor_id UUID, approval_request_id UUID, ts TIMESTAMPTZ NOT NULL);
```

### Backend
- **Matching engine** (`exc/engine`): single-threaded per pair (one BullMQ queue per pair with concurrency 1 = deterministic sequencing; `seq` assigned on enqueue); in-memory book rebuilt from DB on start; price-time priority; market orders constrained by protection band (reject remainder beyond band); limit orders rest; each match produces a fill and calls `LedgerService` (captureHold for buyer quote asset + seller base asset) in one DB transaction; residual hold released on cancel/fill.
- Order placement: validate pair open, tick/lot/min notional, stale quote check (last tick age < config), reserve funds via hold (buy: price×qty+fee for limit, band-max for market; sell: qty), enqueue.
- `PriceFeedService` (`mock:price`) driven by scenario price paths (deterministic seed); stale/gap injection for demos.
- `CryptoSimService` (`mock:chain`): generates `SIM`-prefixed addresses/tx IDs (not valid base58/bech32/hex lengths), confirmation ticks by worker.
- Synthetic market-maker bot (worker) with its own funded synthetic accounts to provide liquidity; clearly labeled in UI as "Simulated liquidity".
- Surveillance job (P1): rules on fills/orders → `cmp.risk_alerts` source `surveillance`.
- APIs: `/v1/exc/pairs`, `/v1/exc/pairs/{code}/book`, `/trades`, `/ticks`, `POST /v1/exc/orders` (Idempotency-Key), `DELETE /v1/exc/orders/{id}`, `GET /v1/exc/me/orders|fills|portfolio`, `/v1/exc/deposits`, `/v1/exc/withdrawals`, admin `/v1/exc/pairs/{code}/halt|resume` (approval). WebSocket/SSE stream for book and trades.

### Frontend / Mobile
Mobile: `markets/index`, `markets/[pair]`, `markets/[pair]/order`, `portfolio`, `orders`, `deposit/[asset]`, `withdraw/[asset]`. Web consumer: `/markets`, `/markets/[pair]` (trading view), `/portfolio`, `/orders`. Ops console: `/ops/markets`, `/ops/price-feed`, compliance `/compliance/alerts?source=surveillance`.

### Testing
Matching engine unit tests (price-time priority, partial fills, cancel remainder) + property tests: Σ holds released + captured = Σ placed; per-asset ledger balance; no negative balances; replay of same order sequence → identical fills (determinism). Race: 50 concurrent sells against same resting buy → fills never exceed quantity. Exceptions: price gap (band reject), insufficient asset, stale quote reject, halt rejects new orders and allows cancel. Deposit/withdraw: no outbound network; fake IDs fail real-format validators (test against bech32/base58/0x-hex regex). E2E J5 on mobile + web.

### Deliverables
Exchange module, matching engine, price feed simulator, crypto deposit/withdraw simulation, market-maker bot, trading UI (mobile + web), surveillance alerts, J5 evidence.

### Acceptance criteria
- [ ] J5 complete: mock deposit → quote → limit order → hold → partial fill → settlement → cancel remainder → simulated withdrawal.
- [ ] All five J5 exceptions behave correctly.
- [ ] Funds reserved before execution; residuals exactly released (property tests).
- [ ] Deterministic replay produces identical fills and balances.
- [ ] No real chain transaction possible; fake addresses/tx IDs invalid for real networks; egress test passes.
- [ ] Surveillance demo alerts create synthetic cases (P1).

---

## Phase 11 — Operations, Finance & Compliance Consoles, Reconciliation, Inclusion & Analytics (M6 → J6 full, Gate 3, prepares Gate 4/D)

### Objective
Complete the internal consoles and the controls that tie everything together: reconciliation of mock partner statements vs ledger vs settlement batches, operational exception queues with safe reprocessing, daily simulated close, full J6 incident flow, inclusion referrals with consent, synthetic KPI analytics and the investor/regulator demo dashboard.

### PRD coverage
FR-OPS-001, FR-OPS-002, FR-INC-001, J6 (complete), PRD §10 consoles, §13 analytics rules, NFR-012, risk "inaccurate dashboards".

### Entry criteria
Phases 5–10 accepted (or those in scope for the demo). Console and investor dashboard designs approved; metric dictionary drafted.

### Spec Kit features
**080-reconciliation**
```
/speckit.specify Reconcile mock partner and bank statements, internal ledger balances and settlement batches
per currency and legal entity on demand and in a daily simulated close. Matching rules pair items by
reference, amount and date; differences become reconciliation exceptions with category, aging and owner,
which operators resolve through documented actions (match, create approved adjusting entry, escalate) with
audit. The close report shows trial balance, reconciliations status and open exceptions. Covers FR-OPS-001,
NFR-012.
```
**081-ops-queues**
```
/speckit.specify Operations analysts work queues of failed, held, reversed and timed-out transactions across
all products with filters, detail and trace views, and can retry, cancel, force-fail or request reversal
through safe, idempotent actions that never double-post; sensitive actions require maker-checker. Includes
partner/scenario simulator controls for demos. Covers FR-OPS-002.
```
**082-analytics-investor-dashboard**
```
/speckit.specify Provide synthetic KPI analytics (registered users, active wallets, payment count/value,
merchant conversion, remittance funnel, simulated FX spread and fees, order fills, supply/reserve coverage,
settlement aging, failed transaction rate, fraud alerts, case aging, reconciliation differences, referral
conversion, inclusion indicators) derived from source data, and a read-only investor/regulator dashboard
with guided scenarios, explanatory diagrams and system health. Every metric shows simulation status,
data timestamp, definition and denominator, and modeled impact is never presented as observed impact.
Covers PRD section 13 and the investor demo dashboard.
```
**083-inclusion-referrals**
```
/speckit.specify Users can consent to share selected synthetic data and be referred to a mock licensed
finance partner for products the platform does not offer; consent is explicit, revocable and recorded; the
platform makes no credit decision and does no lending. Referral funnel analytics are synthetic.
Covers FR-INC-001.
```

### UI/UX design
**Operations console:** home (queue counts, aging), transaction explorer (search by ID/correlation/user/amount), exception queues by type, transaction detail with trace + action panel, settlement batches overview (all products), partner simulator, scenario controller (from Phase 2, extended), reconciliation runs list, run detail (matched/unmatched, exceptions), exception detail (resolution actions with MakerChecker), daily close report.
**Finance console additions:** general ledger browser, trial balance (all entities), close dashboard, FX position, PSH (Phase 9).
**Compliance console additions:** full J6 workflow polish, case aging dashboard, audit report export center.
**Investor dashboard (web-investor, responsive for tablets):** landing with large SIMULATION header, "Guided scenarios" (step-through J1–J7 with narration text and live data), KPI grid (each tile: value, definition tooltip, denominator, timestamp, SIMULATED tag), architecture & controls diagrams, system health (uptime of demo services, last reconciliation status), "What is simulated / what is undecided / future path" page (PM playbook step 7).
**Inclusion:** consumer mobile/web "Explore partner products" (mock partners), consent screen (what data, purpose, partner, revoke), referral status.

### Database (schema `ops`, `recon`, `analytics`, `inc`)
```sql
CREATE SCHEMA recon;
CREATE TABLE recon.external_statements (id UUID PRIMARY KEY, tenant_id UUID, source TEXT CHECK (source LIKE 'mock:%'), legal_entity_id UUID, asset_code TEXT,
  statement_date DATE, opening NUMERIC(38,0), closing NUMERIC(38,0), file_ref TEXT, imported_at TIMESTAMPTZ);
CREATE TABLE recon.external_statement_lines (id UUID PRIMARY KEY, statement_id UUID REFERENCES recon.external_statements, value_date DATE,
  amount NUMERIC(38,0), direction CHAR(1), reference TEXT, counterparty TEXT);
CREATE TABLE recon.reconciliation_runs (id UUID PRIMARY KEY, kind TEXT CHECK (kind IN ('bank','partner','settlement','psh','exchange_custody','trial_balance')),
  legal_entity_id UUID, asset_code TEXT, as_of TIMESTAMPTZ, status TEXT, matched_count INT, exception_count INT, difference NUMERIC(38,0),
  started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, report JSONB);
CREATE TABLE recon.matches (id UUID PRIMARY KEY, run_id UUID REFERENCES recon.reconciliation_runs, statement_line_id UUID, journal_line_id UUID, settlement_item_id UUID, rule TEXT);
CREATE TABLE recon.reconciliation_exceptions (id UUID PRIMARY KEY, run_id UUID REFERENCES recon.reconciliation_runs, category TEXT
  CHECK (category IN ('missing_in_ledger','missing_in_statement','amount_mismatch','duplicate','timing')), amount NUMERIC(38,0), refs JSONB,
  status TEXT CHECK (status IN ('open','investigating','resolved','escalated')), owner_id UUID, resolution TEXT, adjusting_journal_id UUID,
  approval_request_id UUID, opened_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ);
CREATE TABLE recon.daily_closes (id UUID PRIMARY KEY, business_date DATE UNIQUE, status TEXT, trial_balance_ok BOOLEAN, open_exceptions INT, report JSONB, closed_by UUID, closed_at TIMESTAMPTZ);
CREATE SCHEMA ops;
CREATE TABLE ops.queue_items (id UUID PRIMARY KEY, tenant_id UUID, transaction_id UUID, queue TEXT CHECK (queue IN ('failed','held','reversed','timed_out','manual_review')),
  reason TEXT, status TEXT, assigned_to UUID, created_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ);
CREATE TABLE ops.operator_actions (id UUID PRIMARY KEY, queue_item_id UUID, action TEXT, idempotency_key TEXT UNIQUE, actor_id UUID, approval_request_id UUID, result JSONB, created_at TIMESTAMPTZ);
CREATE SCHEMA analytics;
CREATE TABLE analytics.metric_definitions (code TEXT PRIMARY KEY, name_en TEXT, name_ar TEXT, definition_en TEXT, definition_ar TEXT,
  numerator_sql TEXT, denominator_sql TEXT, unit TEXT, owner TEXT, version INT, approved_by UUID);
CREATE TABLE analytics.metric_values (metric_code TEXT REFERENCES analytics.metric_definitions, bucket_start TIMESTAMPTZ, dims JSONB, value NUMERIC(38,6),
  denominator NUMERIC(38,6), computed_at TIMESTAMPTZ, source_watermark BIGINT, is_simulated BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_simulated),
  PRIMARY KEY (metric_code, bucket_start, dims));
CREATE SCHEMA inc;
CREATE TABLE inc.partners_mock (id UUID PRIMARY KEY, name TEXT, product_types TEXT[], is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic));
CREATE TABLE inc.consents (id UUID PRIMARY KEY, tenant_id UUID, user_id UUID, partner_id UUID, data_scopes TEXT[], purpose TEXT, granted_at TIMESTAMPTZ, revoked_at TIMESTAMPTZ, version INT);
CREATE TABLE inc.referrals (id UUID PRIMARY KEY, tenant_id UUID, user_id UUID, partner_id UUID, consent_id UUID REFERENCES inc.consents, product_type TEXT,
  status TEXT CHECK (status IN ('submitted','acknowledged_sim','declined_sim','withdrawn')), created_at TIMESTAMPTZ);
-- No lending tables exist by design (FR-INC-001 "no internal lending").
```

### Backend
- `ReconciliationService`: import mock statements (generated by mock-hub from scenario, including injected discrepancies), match engine (exact ref → amount+date window → many-to-one), exceptions, resolution actions (adjusting entries only via approved journal types), daily close orchestration (cut-off at scenario business date, trial balance, all recon kinds, report).
- `OpsQueueService`: queue population from transaction state events (outbox consumer); actions: `retry` (re-run current step idempotently), `cancel` (only from allowed states, release holds), `force_fail` (approval), `request_reversal` (approval); every action carries its own idempotency key; tests prove no double-posting.
- `AnalyticsService`: metric computation jobs from source tables/ledger (never from UI counters), stored with `source_watermark`; metric dictionary is approved data; API returns value + definition + denominator + timestamp + `simulated:true`.
- `InvestorDashboardService`: read-only, aggregated, no PII; guided scenario scripts (YAML) that trigger scenario steps in a dedicated demo tenant.
- `InclusionService`: consent capture/revoke, referral to `mock:partner-finance` adapter.
- APIs: `/v1/recon/*`, `/v1/close/*`, `/v1/ops/queues/*`, `/v1/ops/actions`, `/v1/analytics/metrics?codes&from&to`, `/v1/investor/*` (read-only role), `/v1/inc/partners`, `/v1/inc/consents`, `/v1/inc/referrals`.

### Frontend / Mobile
Web-console: `/ops`, `/ops/explorer`, `/ops/queues/[queue]`, `/ops/transactions/[id]`, `/ops/settlements`, `/ops/simulator`, `/recon/runs`, `/recon/runs/[id]`, `/recon/exceptions/[id]`, `/finance/close`, `/finance/gl`, `/compliance/reports`. Web-investor: `/`, `/scenarios`, `/scenarios/[code]`, `/kpis`, `/controls`, `/health`, `/about-simulation`. Consumer web + mobile: `explore/partners`, `explore/consent/[partner]`, `profile/consents`, `explore/referrals`. Use the dataviz rules: KPI tiles always with footer (definition • denominator • timestamp • SIMULATED).

### Testing
Reconciliation with injected discrepancies of every category → correct exceptions; resolution via adjusting entry requires approval and rebalances; daily close fails if trial balance ≠ 0 or P0 exceptions open; ops retry/cancel under concurrency never double-post; metric values equal independent SQL recomputation (test per metric); investor role cannot call any mutating endpoint (negative suite); consent revoke stops further referral data sharing; J6 full E2E with audit report.

### Deliverables
Reconciliation and daily close, ops queues and actions, completed consoles, analytics engine + metric dictionary, investor dashboard, inclusion referrals, J6 full evidence, daily close evidence pack.

### Acceptance criteria
- [ ] Reconciliation surfaces every injected exception; each resolvable with audit; close report produced daily in the scenario.
- [ ] Reprocessing from any queue never double-posts (concurrency tests).
- [ ] J6 complete: rule match → hold → alert → triage → evidence → independent approval → release/reject → audit report.
- [ ] Every KPI equals independent recomputation and shows definition, denominator, timestamp, SIMULATED.
- [ ] Investor dashboard is read-only (negative tests) and contains no PII.
- [ ] Inclusion: consent explicit/revocable; no lending capability exists.

---

## Phase 12 — Integrated Demonstration, Hardening, Security, Recovery & Handover (M7 → Gate 4/D, Gate 5/E)

### Objective
Prove that all seven journeys work together on one seeded environment, including failure paths and reconciliation; measure performance baselines; pass security, isolation, recovery and accessibility reviews; finalize the UI polish; rehearse the stakeholder demonstration; and hand over everything listed in PM §15.

### PRD coverage
Gate D, Gate E; NFR-001…NFR-012 final evidence; FR-DEMO-001/002/003 final; PM §13 playbook, §15 closure.

### Entry criteria
Phases 2–11 accepted; no open P0 defects; all features' evidence linked in the traceability matrix.

### Spec Kit features
**090-integrated-scenarios**
```
/speckit.specify Create the integrated demo scenario catalog: a baseline scenario that seeds all personas,
tenants, merchants, businesses, issuer, corridors, pairs, watchlists and rules, plus one named scenario per
journey J1-J7 including each listed exception path, and a "full showcase" scenario that runs the stakeholder
playbook in order. Each scenario is versioned, deterministic, resettable in one action and produces a run
report and evidence bundle (ledger digest, reconciliation results, audit verification, screenshots).
```
**091-hardening-release**
```
/speckit.specify Prepare the demo release: performance baseline measurement, security testing and fixes,
tenant isolation testing, backup and restore drill with measured recovery point and recovery time, demo
environment deployment from scratch, final accessibility and RTL audit, prohibited-claims copy audit,
signed demo checklist and handover package.
```

### Work packages
**12.1 Integrated E2E (Gate 4/D)**
- Scenario manifests in `db/seeds/scenarios/`: `baseline-v1`, `j1-wallet-v1` … `j7-business-v1`, `showcase-v1`.
- Playwright + Maestro suites tagged `@journey:J1..J7` and `@exception:<name>` run nightly on a fresh environment.
- After each journey: run reconciliation (all kinds), trial balance check, audit verify, invariants checker (`pnpm invariants:check` — runs I-1…I-12, S-1…S-5 SQL assertions).
- Evidence bundle generator: `pnpm evidence:build --scenario showcase-v1` → `docs/evidence/release-<tag>/` with HTML index linking test reports, screenshots (AR/EN, web/mobile), ledger digest, recon reports, audit verify output.

**12.2 Performance baseline (NFR-010, D-09)**
- k6 scripts per journey with ramp profiles; measure p50/p95/p99 latency, throughput, error rate, DB CPU/locks; record environment specs.
- Output `docs/evidence/performance-baseline.md` — **measurements only**; proposed SLOs go to the decision register for product + engineering approval.

**12.3 Security (Gate 5/E)**
- Threat model refresh; SAST (Semgrep), dependency + image scan (Trivy), DAST baseline (OWASP ZAP against demo), secrets scan of full history (gitleaks), manual review of auth, tenancy, maker-checker, adapters, scenario reset, file exports.
- Independent tenant-isolation and authorization test (someone who did not build the feature) — PRD NFR-011, risk "tenant isolation defect".
- Mobile: check no secrets in bundle, secure-store usage, certificate handling for internal TLS, debug flags off in demo build, deep-link validation.
- Fix all critical/high; record accepted medium/low with owner and date. **Zero critical findings required** (PRD success measure).

**12.4 Recovery (NFR-008)**
- Automated PostgreSQL backups (pg_dump + WAL archiving to local volume / object storage), Redis persistence settings documented.
- Drill: destroy demo DB → restore → run invariants + recon → measure RPO/RTO; write `docs/runbooks/backup-restore.md`; propose targets to decision register.

**12.5 Demo environment**
- `infra/docker-compose.demo.yml` (or Kubernetes manifests) with `internal: true` networks, no published ports except reverse proxy; TLS with internal CA; environment banner "DEMO".
- One-command provision: `make demo-up SCENARIO=showcase-v1 SEED=2026`.
- Fresh-environment smoke test (NFR-007): new VM → provision → smoke suite green.

**12.6 UX final polish & audits**
- Full WCAG 2.2 AA audit (axe automated + manual keyboard + NVDA/VoiceOver/TalkBack spot checks).
- RTL audit across all apps (mirroring, bidi isolation of amounts/IDs, PDF exports).
- Copy audit: prohibited claims lint (`pnpm copy:lint`) + legal read-through of all i18n catalogs and exports.
- Visual regression baseline approved by design lead.
- Mobile store-quality polish (icons, splash with "Simulation" notice, app name "PDFE Demo"); distribute **internal builds only** (Expo EAS internal distribution / TestFlight internal) — never public store listing.

**12.7 Rehearsal & playbook (PM §13)**
Run the 8-step playbook twice with a timer and an observer:
1. No-live-egress checklist (`pnpm safety:check` prints egress test, adapter registry, config review results).
2. Reset + seed `showcase-v1` with recorded version and seed.
3. J1 wallet transfer (mobile), J2 merchant payment/refund (mobile merchant mode + web), J3 remittance.
4. J4 PSH issuance/redemption + reserve shortfall prevention (attempt blocked issuance live).
5. J5 paper exchange + J6 compliance case.
6. Reconciliation, immutable journal (show trigger rejecting an edit), audit trail verification, reporting.
7. "What is simulated / undecided / future path" page.
8. Capture questions, change requests, decisions into the decision register.

**12.8 Handover (PM §15)**
Release tag, source repository, infrastructure configuration, scenario catalog, test evidence, demo runbook, backup/restore verification, risk/decision registers, unresolved items list, security report, stakeholder sign-off, and a **separately scoped feasibility plan outline for regulated live operations** (Gate F prerequisites only — legal opinions, licenses, partners, safeguarding, independent assessments; no build work).

### Deliverables
Scenario catalog, integrated E2E suites, evidence bundle, performance baseline report, security report, isolation test report, backup/restore runbook + drill results, demo environment, accessibility/RTL/copy audit reports, rehearsal notes, signed demo checklist (Part J.7), handover package.

### Acceptance criteria
- [ ] **Gate 4/D:** all seven journeys and every listed exception execute on seeded synthetic data with reconciliation, trial balance = 0, audit verify OK, invariants OK — 3 consecutive nightly runs green.
- [ ] Same seed + version on a fresh environment reproduces identical ledger digest.
- [ ] Performance baseline measured and recorded (no invented SLOs).
- [ ] Zero critical security findings; all highs fixed or formally risk-accepted by sponsor + security lead.
- [ ] Independent tenant isolation test passed.
- [ ] Restore drill completed; measured RPO/RTO recorded.
- [ ] Egress tests pass in the demo environment; no live adapters configured.
- [ ] Bilingual UI complete; WCAG 2.2 AA target met or gaps logged with owner; every screen/export labeled.
- [ ] Rehearsal completed twice; playbook fits the agreed time.
- [ ] **Gate 5/E:** signed demo checklist by sponsor, product, security, finance, QA; legal confirms wording.

---

# Part I — Cross-Cutting Standards

## I.1 Definition of Ready (story level — PM §7)
- [ ] User outcome stated ("As a … I want … so that …")
- [ ] Actors and permissions listed (roles from Phase 2 matrix)
- [ ] Business rules and invariants referenced (rule #, I-#, S-#)
- [ ] Data contract (request/response/event schema) drafted in `contracts/`
- [ ] Error cases listed with error codes and user messages (AR/EN keys)
- [ ] Ledger implications: accounting mapping row(s) referenced (P0 financial: **reviewed** by finance)
- [ ] Demo/live boundary statement (which mock adapters; confirm none live)
- [ ] Acceptance tests (positive + negative) written as Given/When/Then
- [ ] Dependencies identified; designs approved (link to Figma frame)
- [ ] Reviewer(s) named (product + required specialist)

## I.2 Definition of Done (PM §8, expanded)
- [ ] Code reviewed by someone other than the author; CODEOWNERS approvals present
- [ ] Unit, property, integration tests green; coverage of changed money logic ≥ 90% lines/branches
- [ ] Auth and tenancy verified (negative tests updated)
- [ ] Logs with correlation ID; audit events for privileged/financial actions
- [ ] No live adapter exposure (CI safety job green)
- [ ] OpenAPI/event contracts updated; generated clients rebuilt; no unapproved breaking change
- [ ] Arabic/English strings added; RTL verified; accessibility checks pass (axe 0 serious/critical)
- [ ] SimulationBanner/labels present on new screens and exports
- [ ] Docs and ADRs updated; `quickstart.md` still works
- [ ] Seeded E2E scenario for the feature passes
- [ ] Acceptance evidence linked in the PR and traceability matrix
- [ ] Product owner and specialist reviewers approved
- [ ] `/speckit.analyze` showed no unresolved CRITICAL/HIGH items

## I.3 Pull request template (`.github/pull_request_template.md`)
```
## Summary
## PRD IDs / Journey
## Spec link: specs/NNN-.../spec.md
## Changes (backend / database / web / mobile / design)
## Accounting impact (mapping rows, invariants touched)  [ ] none
## Tests added (unit / property / integration / E2E / a11y)
## Evidence (screenshots AR/EN, reports)
## Safety
- [ ] No real URLs, credentials, keys, RPC endpoints or real personal data
- [ ] Only mock:* adapters used
- [ ] Simulation labels on all new screens/exports
## Reviewers required: product / finance / security / legal (copy) / QA
```

## I.4 CI/CD pipeline stages (GitHub Actions)
1. **setup** — pnpm install with cache, Turborepo affected detection.
2. **static** — ESLint (incl. `no-floating-money` custom rule: forbid `Number`/`parseFloat` on money types), Prettier check, TypeScript `tsc --noEmit`.
3. **safety** — gitleaks; forbidden-pattern scan (`scripts/safety/forbidden-patterns.txt`: mainnet/testnet RPC host patterns, real bank API hosts, `-----BEGIN .*PRIVATE KEY-----`, non-allowlisted `https?://`); adapter config validation; copy lint for prohibited claims.
4. **unit + property** — Vitest + fast-check (PR: reduced runs; nightly: full).
5. **integration** — Testcontainers (Postgres, Redis, Keycloak, mock-hub); migrations applied from zero; RLS and trigger tests.
6. **contracts** — OpenAPI lint (Spectral), openapi-diff vs main, schemathesis against running API.
7. **build** — all apps; Docker images; Trivy scan.
8. **e2e** — Playwright (web, AR+EN), Maestro (mobile, Android emulator) on affected journeys; nightly full.
9. **a11y + visual** — axe + screenshot comparison.
10. **egress** — run containers on internal network; assert outbound fails.
11. **evidence** — upload reports as artifacts; nightly evidence bundle.
Merges to `main` require 1–8 green; nightly runs 1–11 on `main`.

## I.5 Testing strategy summary
| Level | Tool | What | When |
|---|---|---|---|
| Unit | Vitest | Pure logic, money math, state machines, rules | Every PR |
| Property | fast-check | Ledger invariants, FX conversion, matching, PSH supply | PR (fast), nightly (deep) |
| Integration | Testcontainers | DB triggers, RLS, idempotency, orchestrator, adapters | Every PR |
| Contract | Spectral, openapi-diff, schemathesis | API and event schemas | Every PR |
| E2E web | Playwright | Journeys + exceptions, AR/EN | Affected on PR, all nightly |
| E2E mobile | Maestro | Journeys on Android/iOS | Affected on PR, all nightly |
| Accessibility | axe-core, manual | WCAG 2.2 AA | Every UI PR + Phase 12 audit |
| Load/concurrency | k6, custom race tests | Overspend, double capture, issuance race | Nightly + Phase 12 |
| Security | Semgrep, Trivy, ZAP, gitleaks, manual | SAST/DAST/secrets/isolation | PR + Phase 12 |
| Recovery | scripted drill | Backup/restore | Phase 12 (+ before each major demo) |

## I.6 Incident and stop-work procedure
Triggers: ledger imbalance, invariant failure, live-connectivity exposure, critical vulnerability, tenant data leak.
1. Stop merges (`main` locked by engineering lead), freeze demo environment.
2. Open P0 issue: severity, reproduction, owner, ETA, release impact (PM §11).
3. Preserve evidence (DB snapshot, logs by correlation ID).
4. Root cause → fix with regression test → independent review → specialist sign-off.
5. Record in risk register and decision log; communicate in weekly dashboard.

## I.7 Change control (PM §11)
Any change affecting postings, access control, regulatory wording, live integration interfaces or core architecture requires: change proposal (`docs/changes/CP-NNN.md`), risk assessment, ADR (if architectural), test plan, approvals — **before** merge. In Spec Kit terms: create a new feature (`/speckit.specify`) or amend the existing spec and re-run `/speckit.clarify → plan → tasks → analyze`.

## I.8 Localization & RTL standards
- Message keys in `packages/i18n/{ar,en}/*.json` (ICU format), no hard-coded strings (lint rule).
- `dir` set at `<html>` (web) and via `I18nManager` (mobile); layout with logical properties only (lint for `margin-left`, `left:` etc.).
- Amounts: `Intl.NumberFormat` with explicit `numberingSystem` per user setting; currency code shown beside amount; isolate with `<bdi>`.
- Dates: Gregorian default, Asia/Jerusalem default time zone for display (user-configurable), store UTC.
- Pseudo-localization (`ar-XA` expansion) build to find truncation.
- PDF exports: embedded Arabic font, `dir="rtl"` templates, tested by text extraction.

## I.9 Accessibility standards
WCAG 2.2 AA target; keyboard reachable everything; focus order matches visual order in both directions; motion respects `prefers-reduced-motion`; mobile: `accessibilityLabel`, `accessibilityRole`, dynamic type support, minimum 44×44 targets; status changes announced (live regions / `AccessibilityInfo.announceForAccessibility`).

## I.10 Security standards
- OWASP ASVS L2 as a checklist reference; secure headers (CSP, HSTS internal), CSRF protection for cookie sessions, input validation with Zod at boundaries, output encoding.
- Secrets never in repo; SOPS-encrypted env files for demo; key rotation runbook (NFR-004).
- PII minimization: synthetic only; separate profile tables from transaction tables; logs never contain full names or document numbers (redaction middleware).
- Least privilege DB roles: `app_role` (no UPDATE/DELETE on ledger/audit), `migrator_role`, `readonly_role` (analytics), `demo_reset_role` (DEMO only, audited).

## I.11 Synthetic data & fixtures
- Generator in `packages/test-kit/synthetic` (seeded faker with Arabic/English name sets, synthetic phone ranges that can't be real e.g., `+970-SIM-…` display format, invented bank names).
- Fixture manifests versioned (`version`, `sha256`) — risk "Synthetic data inconsistent across domains".
- Real data detection: CI scan for patterns like real national ID formats and real IBANs; any hit fails the build.

## I.12 Sprint operating model (PM §6 applied to Spec Kit)
- **Sprint planning:** pick spec-approved features (spec + clarify + plan + tasks + analyze complete = "Ready").
- **Daily:** async update — yesterday/today/blockers, include task IDs from `tasks.md`.
- **Mid-sprint checkpoint:** engineering lead reviews progress against `tasks.md`, especially ledger/security tasks.
- **Review:** demo working scenario from seed; product accepts against acceptance criteria.
- **Retro:** record improvements in `docs/retros/sprint-NN.md`; update constitution only via ADR.
- **Weekly dashboard (PM §12):** milestone status, sprint scope, critical path, accepted stories, open P0, ledger/recon health (latest invariants run), journey test coverage, security findings, decisions required, risks, forecast range.

---

# Part J — Appendices

## J.1 Risk register → plan mitigations
| Risk (PM §10) | Where mitigated | Control evidence |
|---|---|---|
| Demo calls live service | Phase 2 (006), CI safety stage, Phase 12 egress | Boot guard test, egress tests, scans |
| Unbalanced/double-posted ledger | Phase 3, property tests in every financial phase | Gate 2 evidence, nightly invariants |
| Scope too broad | Phase map with gates, vertical slices per journey | Gate reviews, forecast |
| Stable asset represented as approved | Phase 9 copy rules, legal approval, copy lint | Legal sign-off record |
| Synthetic data inconsistent | I.11 versioned manifests, scenario engine | Digest comparisons |
| Unclear partner/regulatory requirements | Decision register, mock adapters, assumption log | D-xx status per phase |
| AI-generated code bypasses controls | Constitution, CODEOWNERS, `/speckit.analyze`, branch protection | PR checks |
| Demo outage/data corruption | Phase 12 recovery, rehearsal, snapshots | Restore drill report |
| Tenant isolation defect | RLS + guards (Phase 2), independent test (Phase 12) | Isolation report |
| Inaccurate dashboards | Metric dictionary, recomputation tests (Phase 11) | Metric tests |

## J.2 Decision register dependencies by phase
| Phase | Decisions needed | Default if undecided |
|---|---|---|
| 0 | D-10, D-12 | Seven journeys; sponsor assigns sign-off authority |
| 1 | D-04 (brand/symbol) | "PDFE Demo", PSH placeholder |
| 2 | D-08 (deployment) | Local Docker; cloud later |
| 3 | D-11 (accounting policy) | Synthetic chart of accounts, accountant review |
| 5–8 | D-07 (fees/limits) | Configurable placeholders, default fee 0 |
| 7 | D-05 (corridors) | Simulated corridors USD/EUR/JOD → ILS |
| 9 | D-01, D-03, D-07 | Synthetic issuer role, 1:1 placeholder, min coverage 100% |
| 10 | D-06 (assets/custody) | BTC/ETH paper only |
| 12 | D-09 (SLOs, RPO/RTO) | Measure first, then decide |
| Future | D-02 | Out of scope (Gate F) |

## J.3 Role/permission matrix (starter — refine in 004-identity-rbac-tenancy)
| Role | Key permissions | SoD conflicts |
|---|---|---|
| individual | wallet.read/send, remit.create, exc.trade, psh.convert | — |
| merchant_owner | pay.intent.create, pay.refund, merchant.staff.manage | — |
| merchant_cashier | pay.intent.create | cannot refund above limit |
| biz_preparer | biz.invoice.*, biz.payout.request | biz_approver for same request |
| biz_approver | biz.payout.approve | cannot approve own |
| ops_analyst | ops.read, ops.retry, ops.cancel, ops.reversal.request | finance_approver |
| compliance_analyst | cmp.review, cmp.case.manage, cmp.disposition.request | compliance_approver on same case |
| compliance_approver | cmp.disposition.approve | — |
| finance_analyst | finance.read, ledger.fund.request, recon.resolve.request | finance_approver on same request |
| finance_approver | ledger.fund.approve, recon.adjust.approve, ledger.reverse.approve | — |
| issuer_operator | stb.issuance.request, stb.burn.process | stb_approver, audit_admin |
| stb_approver | stb.issuance.approve (2 distinct required) | issuer_operator |
| platform_admin | iam.manage, config.request, demo.scenario.run | any approver role; cannot edit safety-locked config |
| auditor | audit.read, audit.export, audit.verify | no write permissions |
| demo_viewer | investor.read | read-only |
Rule enforced: no single user may hold permissions to (a) post/adjust journals, (b) approve issuance, and (c) administer audit.

## J.4 ADR template (`docs/adr/ADR-NNN-title.md`)
```
# ADR-NNN: <Title>
Status: Proposed | Accepted | Superseded by ADR-XXX
Date: YYYY-MM-DD   Deciders: <names/roles>
## Context
## Decision
## Options considered (pros/cons)
## Consequences (positive, negative, follow-ups)
## Linked requirements (PRD IDs, invariants)
## Verification (tests that prove the decision holds)
```

## J.5 Design review checklist (every UI PR)
- [ ] Matches approved Figma frame (AR and EN)
- [ ] All five states implemented (populated/empty/loading/error/permission-denied)
- [ ] SimulationBanner visible; exports watermarked
- [ ] Amounts via MoneyText; never computed client-side
- [ ] Review step before any money movement; result screen with reference + trace ID
- [ ] Keyboard and screen-reader tested; contrast OK; target sizes OK
- [ ] RTL mirroring correct; numbers/IDs isolated
- [ ] Copy uses approved i18n keys; no prohibited claims
- [ ] Responsive at 360/768/1280 (web) and small/large phones (mobile)

## J.6 Screen inventory (design + build checklist)
**Mobile app (consumer + merchant-lite):** Splash/simulation notice · Sign-in · MFA (privileged only) · App lock · Onboarding (welcome, personal info, synthetic doc, simulated selfie, review, status) · Home · Wallet detail per currency · Add money · Withdraw · Send (recipient, amount, review, result) · Request money · Scan QR · Pay sheet · Payment result · Activity list · Transaction detail · Statements · Notifications · Remittance (send abroad, beneficiary, quote, review, tracking, receive info) · PSH (overview, convert, redeem, history) · Markets · Pair detail · Order ticket · Open orders · Trades · Portfolio · Crypto deposit (sim) · Crypto withdraw (sim) · Explore partners · Consent · Referrals · Profile (language, digits, limits, KYC status, consents, security) · Support (simulated contact, FAQ about simulation) · Merchant mode: Charge, QR display, Today's payments, Payment detail, Refund, Payouts · (P1) Business approvals inbox · Error/offline/permission screens.
**Web consumer:** same functional set as mobile in responsive layout.
**Merchant portal:** KYB · Dashboard · Create payment/QR · Static QR · Payments · Payment detail · Refunds · Settlements · Settlement detail · Payout account · Staff · Statements · Invoices (shared with business).
**Business portal:** Dashboard · Invoices list/editor/detail · Customers · Suppliers · Payout request · Payouts · Approval inbox · Bank reconciliation · Reports/exports · Team & limits · API keys.
**Operations console:** Home · Transaction explorer · Queues · Transaction detail/trace · Settlements overview · Partner simulator · Scenario controller · Reconciliation runs/exceptions · Market controls · Price feed controls · Remittance simulator · Corridors.
**Compliance console:** Onboarding queue/detail · Alerts list/detail · Cases list/detail · Rules list/editor · Reports center · Audit search/verify/export.
**Finance/treasury console:** Accounts · Account detail · Journals · Trial balance · GL browser · Funding request · Approvals inbox · FX position · Close dashboard · PSH program/reserves/issuance/redemptions/events/reconciliation.
**Admin:** Users · Roles · Config (list/history/diff/approve/rollback) · Feature flags · Tenants.
**Investor dashboard:** Landing · Guided scenarios · KPIs · Controls & architecture · System health · About the simulation.
**Developer portal:** Getting started · Auth · API reference · Webhook catalog · Delivery explorer · Sandbox.

## J.7 Signed demo checklist (Gate 5/E)
| # | Check | Evidence | Signed by |
|---|---|---|---|
| 1 | `pnpm safety:check` green in demo env (egress, adapters, config) | report link | Security |
| 2 | Scenario `showcase-v1` reset with recorded seed/version | run report | Ops/QA |
| 3 | J1–J7 + exceptions green (3 nightly runs) | E2E reports | QA |
| 4 | Trial balance = 0; all reconciliations clean or explained | close report | Finance |
| 5 | Audit chain verified | verify output | Security |
| 6 | Zero critical findings; highs resolved/accepted | security report | Security + Sponsor |
| 7 | Restore drill done; RPO/RTO recorded | drill report | SRE/QA |
| 8 | Bilingual UI, accessibility audit, labels on all screens/exports | audit reports | Design + QA |
| 9 | Copy reviewed; no prohibited claims; PSH disclaimers present | legal record | Legal/Compliance |
| 10 | Rehearsal ×2 completed | notes | Product |
| 11 | Demo release approval | — | Sponsor (A), Product, Engineering, QA (R) |

## J.8 Beginner command cheat sheet
```bash
# Daily
git checkout main && git pull
pnpm install
docker compose -f infra/docker-compose.yml up -d     # db, redis, keycloak, mock-hub, grafana
pnpm db:migrate && pnpm db:seed --scenario baseline-v1 --seed 42
pnpm dev:all                                          # api, worker, web apps
pnpm --filter mobile start                            # Expo; press a (Android) / i (iOS)

# Quality
pnpm lint && pnpm typecheck
pnpm test                                             # unit + property (fast)
pnpm test:integration
pnpm e2e --grep @journey:J1
pnpm invariants:check
pnpm safety:check

# Spec Kit loop (inside Claude Code)
/speckit.specify <paste phase prompt>
/speckit.clarify
/speckit.checklist ledger-correctness
/speckit.plan <standard prefix + phase DB/backend/frontend/mobile sections>
/speckit.tasks
/speckit.analyze
/speckit.implement

# Finish a feature
git push -u origin <branch>      # open PR, fill template, request reviewers
```

## J.9 Troubleshooting (common beginner problems)
| Symptom | Likely cause | Fix |
|---|---|---|
| `specify: command not found` | uv tool path not on PATH | Run `uv tool update-shell`, restart terminal |
| Slash commands missing in agent | `specify init` used a different agent flag | Re-run `specify init . --ai claude --force` (commit first) |
| `LEDGER_UNBALANCED` on commit | Lines don't sum per asset | Print lines; check fee/rounding lines; never disable the trigger |
| `LEDGER_IMMUTABLE` | Code tries to UPDATE a journal | Use reversal journal instead |
| Serialization failure errors | Expected under SERIALIZABLE concurrency | Ensure retry wrapper + idempotency key reuse |
| RLS returns zero rows | `app.tenant_id` not set in transaction | Use the `withTenant()` DB helper |
| API exits on boot "adapter not allowed" | Non-mock adapter in config | Use `mock:*` types only (this is the safety guard working) |
| Arabic text shows boxes in PDF | Font not embedded | Use the shared PDF template with Noto Naskh Arabic |
| Layout not mirrored on mobile | RTL needs app reload | Use the language switch flow which reloads the app |
| Flaky concurrency test | Hidden shared state / real clock | Use injected clock and isolated test DB per worker |
| AI agent edits tests to pass | Constitution violation | Reject the change; re-run `/speckit.implement` for that task with the failing test as context |

## J.10 Glossary
**Adapter** — code that talks to an external system; in DEMO always a mock. **ADR** — architecture decision record. **Available balance** — posted minus holds minus pending outflows. **Bridge account** — account used to balance each currency leg of an FX conversion. **Correlation ID** — ID tracing one action across systems. **Double entry** — every journal debits and credits equal amounts. **Hold** — reserved funds not yet posted. **Idempotency key** — unique key making a retry safe. **Invariant** — rule that must always be true (I-#, S-#). **Journal** — group of balanced ledger lines. **Maker-checker** — one person requests, another approves. **Minor units** — smallest unit (agorot, satoshi, wei). **Outbox** — table that reliably publishes events after a DB commit. **PSH** — placeholder code for a proposed ILS-linked stable-value instrument; not approved or live. **RLS** — PostgreSQL row-level security. **Scenario** — versioned, seeded synthetic dataset/script. **SoD** — separation of duties. **Spec Kit** — GitHub's spec-driven development toolkit (`specify` CLI and `/speckit.*` commands). **Trial balance** — sum of balances per currency; must be zero.

## J.11 Feature index (Spec Kit run order)
| # | Feature | Phase | Priority |
|---|---|---|---|
| 001 | monorepo-ci-devenv | 2 | P0 |
| 002 | observability-correlation | 2 | P0 |
| 003 | simulation-labels | 2 | P0 |
| 004 | identity-rbac-tenancy | 2 | P0 |
| 005 | audit-log | 2 | P0 |
| 006 | adapter-registry-egress | 2 | P0 |
| 007 | config-management | 2 | P0 |
| 008 | scenario-engine | 2 | P0 |
| 009 | app-shells (web + mobile) | 2 | P0 |
| 010 | ledger-core | 3 | P0 |
| 011 | balances-holds | 3 | P0 |
| 012 | idempotency | 3 | P0 |
| 013 | txn-orchestrator | 3 | P0 |
| 014 | accounts-provisioning | 3 | P0 |
| 015 | kyc-kyb | 4 | P0 |
| 016 | screening | 4 | P0 |
| 017 | monitoring-rules | 4 | P0 |
| 018 | case-management | 4 | P0 |
| 020 | wallet-p2p | 5 | P0 |
| 021 | mock-bank-funding | 5 | P0 |
| 022 | statements-notifications-history | 5 | P0 |
| 030 | payment-intents-qr | 6 | P0 |
| 031 | refunds-settlement | 6 | P0 |
| 040 | remittance-flow | 7 | P0 |
| 041 | fx-quotes (run before 040) | 7 | P0 |
| 050 | invoicing | 8 | P1 |
| 051 | business-approvals | 8 | P1 |
| 052 | public-api-webhooks | 8 | P0 |
| 060 | psh-issuance | 9 | P0 |
| 061 | psh-redemption | 9 | P0 |
| 062 | reserve-dashboard | 9 | P0 |
| 070 | paper-matching | 10 | P0 |
| 071 | mock-crypto-deposits (run before 070) | 10 | P0 |
| 072 | market-surveillance | 10 | P1 |
| 080 | reconciliation | 11 | P0 |
| 081 | ops-queues | 11 | P0 |
| 082 | analytics-investor-dashboard | 11 | P0 |
| 083 | inclusion-referrals | 11 | P1 |
| 090 | integrated-scenarios | 12 | P0 |
| 091 | hardening-release | 12 | P0 |

> Spec Kit numbers branches automatically in creation order. If your numbers differ from this table, keep a mapping in `specs/README.md`.

---
*End of implementation plan. This document proposes a baseline; it doesn't decide anything that the PRD's decision register leaves open, it invents no costs, dates or performance figures, and it doesn't authorize any live financial activity.*
