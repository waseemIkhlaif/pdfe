# ADR-001: Modular monolith with schema-per-module PostgreSQL
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

The simulation has many domains (ledger, transactions, accounts, compliance, exchange, and others) but a small team and a need for one coherent, reproducible demo. Plan Parts B and C ask for one stack with strong consistency across ledger and transactions (R-04).

## Decision

Modular monolith with schema-per-module PostgreSQL

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Modular monolith, one PostgreSQL database, one schema per module**: Single deployable, ACID across modules, simple local setup; needs enforced module boundaries.
- **Microservices per domain**: Independent scaling; distributed transactions and operations overhead are not justified for a demo.
- **Single shared schema, no module boundaries**: Simplest; boundaries erode and ownership becomes unclear.

## Consequences

- Positive: one transaction can span ledger and business state; one command rebuilds the environment.
- Negative: module boundaries must be enforced by tooling and review.
- Follow-ups: boundary lint rules and CODEOWNERS per module path.

## Linked requirements

R-04, R-18; PRD FR-LED-001, FR-TXN-002; constitution Article XI.

## Verification

Planned in Phase 2/3: dependency-boundary lint in CI; a test that no module reads another module's schema directly.
