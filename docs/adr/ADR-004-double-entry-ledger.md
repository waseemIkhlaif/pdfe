# ADR-004: Double-entry ledger design
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

All value must live in an immutable, balanced ledger per currency and legal entity (constitution Article II). Immutability was only stated as a rule (R-07).

## Decision

Double-entry ledger design: accounts, journals, lines, holds, balance projections; immutability via DB triggers and grants

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Accounts, journals, lines, holds and balance projections; immutability by database triggers and grants**: Enforced at the database; compensating entries needed for corrections.
- **Mutable balance table with an audit log**: Simple; balances can drift from history.
- **Event-sourced ledger only**: Strong history; heavier read models.

## Consequences

- Positive: debits equal credits by construction; the application role has no UPDATE or DELETE grant on posted journals.
- Negative: reversals are new entries; projections must be rebuilt from journals.
- Follow-ups: chart of accounts reviewed by a qualified accountant (D-11).

## Linked requirements

R-07, R-08; PRD FR-LED-001 to FR-LED-005; decision D-11; constitution Article II.

## Verification

Planned in Phase 3: invariant and property tests (no unbalanced posted journal); a test that UPDATE and DELETE on posted journals fail.
