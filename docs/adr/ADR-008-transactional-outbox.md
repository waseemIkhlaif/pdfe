# ADR-008: Transactional outbox for events and webhooks
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Events and signed mock webhooks must not be lost or published for rolled-back work (FR-INT-001).

## Decision

Transactional outbox for events and webhooks; at-least-once delivery with consumer de-duplication

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Transactional outbox written in the same database transaction, with at-least-once delivery and consumer de-duplication**: No lost or phantom events; consumers must de-duplicate.
- **Publish directly after commit**: Simple; a crash can lose the event.
- **Two-phase commit with a broker**: Strong; operationally heavy.

## Consequences

- Positive: events and state change atomically.
- Negative: a relay process and delivery log are needed.
- Follow-ups: retry and back-off policy.

## Linked requirements

PRD FR-INT-001, FR-TXN-002; constitution Article VI.

## Verification

Planned in Phase 2/3: contract tests and a delivery log; a crash-between-commit-and-publish test.
