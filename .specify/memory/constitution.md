# PDFE Constitution

## Core Principles

### I. Simulation Boundary First

DEMO mode is the only supported mode. No code path may reach real banks, payment rails, blockchains (mainnet or public testnet), custody, identity verification, sanctions providers or market data. External dependencies are mock adapters only; unknown adapter types fail closed at startup. Outbound network is denied by default. Real URLs, credentials, private keys, RPC endpoints and real personal data are forbidden in the repository and are blocked by CI.

### II. Ledger Is the Source of Truth

All value lives in an immutable, balanced double-entry ledger per currency and legal entity. Posted entries are never updated or deleted; corrections are compensating entries. No value is created except by documented synthetic funding or authorized simulated issuance. Balances are never inferred from frontend state.

### III. Money Safety

Money is integer minor units (bigint / NUMERIC(38,0)). Floating point is forbidden in money paths. Rounding is explicit and residues post to named accounts.

### IV. Idempotency and Explicit State

Every mutating command takes an idempotency key. Transactions follow typed state machines; illegal transitions are rejected; retries never double-post.

### V. Security, Tenancy and Separation of Duties

Least privilege RBAC, tenant isolation (RLS + guards), MFA for privileged roles, maker-checker for high-risk actions; no one approves their own request; no single role can alter journals, approve issuance and erase audit.

### VI. Auditability and Traceability

Every privileged or financial action records actor, reason, timestamp, correlation ID and approval. Audit is append-only and tamper-evident. Every feature maps PRD ID → spec → ADR → tasks → tests → demo evidence.

### VII. Test-First for P0

P0 work requires positive and negative acceptance tests; financial stories require property-based tests and an accounting mapping reviewed before implementation. Tests are never deleted or weakened to make a build pass.

### VIII. Honest Representation

Every screen, export, statement and dashboard is labeled "SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية". PSH is a placeholder for a proposed instrument, never presented as approved, issued or redeemable. Figures are illustrative and configurable. Modeled impact is never presented as observed impact.

### IX. Inclusive by Default

Arabic (RTL) and English (LTR) are first-class; WCAG 2.2 AA is the target; every view has empty, loading, error and permission-denied states.

### X. Reproducibility

Deterministic seeds, injected clock/ID/random, versioned fixtures and migrations; a fresh environment can be built, seeded and reset with one command.

### XI. Simplicity

Modular monolith; no new service, dependency or pattern without an ADR. Governance: amendments require an ADR approved by the engineering lead and security lead; the constitution overrides any spec or plan; /speckit.analyze must report no constitution violations before /speckit.implement.

## Governance

This constitution supersedes all other practices. Every `/speckit-plan` and `/speckit-analyze` run MUST check the work against these articles; a conflict is a CRITICAL finding and is resolved by changing the work, not by silently reinterpreting an article.

**Amendments**: an amendment requires an ADR approved by the engineering lead and the security lead, a version bump, and a pull request that updates this file.

**Solo mode**: while one person holds every role, Article V (maker-checker) and the two-approver amendment rule are met only formally. The recorded exception, its compensating controls and its end condition are in `docs/governance/solo-mode-exception.md`.

**Version**: 1.0.0 | **Ratified**: 2026-11-14 | **Last Amended**: 2026-11-14
