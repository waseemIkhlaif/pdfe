# ADR-007: Transaction orchestration with typed state machines
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Transactions need explicit states, retries, timeouts and error handling; illegal transitions must be rejected (FR-TXN-001).

## Decision

Transaction orchestration: explicit typed state machines persisted with `transaction_state_events`; transitions validated by a transition table

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Typed state machines persisted as transaction_state_events, validated by a transition table**: Replayable and auditable; needs one table per transaction type.
- **Ad hoc status columns**: Quick; illegal transitions slip in.
- **External workflow engine**: Powerful; a new dependency that needs its own ADR.

## Consequences

- Positive: every transition is recorded and replayable.
- Negative: transition tables must be maintained with the code.
- Follow-ups: status vocabulary agreed with the localization reviewer (plan Phase 1).

## Linked requirements

PRD FR-TXN-001, FR-TXN-002, FR-OPS-002; constitution Article IV.

## Verification

Planned in Phase 3 and later: transition-table tests and replay tests; illegal transitions rejected.
