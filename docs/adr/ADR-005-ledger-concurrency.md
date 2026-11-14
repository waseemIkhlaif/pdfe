# ADR-005: Ledger concurrency control
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Concurrent spends must not overdraw an account (FR-LED-005); the concurrency strategy was unspecified (R-06, Critical).

## Decision

Concurrency: ordered row locks (`SELECT … FOR UPDATE` by account id ascending), optimistic `version`, SERIALIZABLE for issuance/reserve; retry on serialization failure with idempotency

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Ordered row locks (SELECT FOR UPDATE by account id ascending), an optimistic version column, SERIALIZABLE for issuance and reserve operations, retry on serialization failure with idempotency**: Prevents overspend and deadlocks; retries needed.
- **Optimistic versioning only**: Fewer locks; more retries under contention.
- **Global lock**: Simple; throttles all throughput.

## Consequences

- Positive: deterministic lock order avoids deadlocks.
- Negative: retry logic must be idempotent.
- Follow-ups: baseline performance measured in Phase 12 (D-09); no invented targets.

## Linked requirements

R-06, R-16; PRD FR-LED-005; decision D-09.

## Verification

Planned in Phase 3: concurrent-spend race tests that reject overspend; deadlock tests with reversed account orders.
