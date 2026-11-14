# ADR-012: Audit with a hash chain
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Privileged and financial actions need append-only, tamper-evident audit (FR-AUD-001; constitution Article VI).

## Decision

Audit: append-only, hash-chained `audit_events` with periodic anchor snapshots

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Append-only audit_events, hash-chained, with periodic anchor snapshots**: Tampering is detectable; verification job needed.
- **Plain append-only table**: Simple; no tamper evidence.
- **External log service**: Strong; an external dependency conflicting with DEMO isolation.

## Consequences

- Positive: any alteration breaks the chain.
- Negative: ordering and concurrency on the chain head need care.
- Follow-ups: audit export format.

## Linked requirements

R-07; PRD FR-AUD-001; constitution Article VI.

## Verification

Planned in Phase 2/3: a tamper-detection test that modifies a row and fails verification; an export test.
