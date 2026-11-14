# ADR-003: Money as integer minor units
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Floating-point amounts cause rounding errors and break ledger balance (R-05, Critical). Amount representation was unspecified in the PRD.

## Decision

Money as integer minor units, `NUMERIC(38,0)`; per-asset scale; banker's rounding prohibited unless documented; rounding residue to explicit account

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Integer minor units, bigint in TypeScript and NUMERIC(38,0) in SQL, with a per-asset scale table; banker's rounding prohibited unless documented; rounding residue posts to an explicit account**: Exact arithmetic; display formatting is needed at the edge.
- **Decimal strings or a decimal library everywhere**: Readable; slower and easy to misuse.
- **Floating point**: Convenient; unacceptable for money.

## Consequences

- Positive: exact, deterministic arithmetic; the scale lives in the assets table.
- Negative: every UI edge needs a formatting helper and care with scale (ILS=2, USD=2, JOD=3, EUR=2, PSH=2, BTC=8, ETH=18).
- Follow-ups: a shared money package and a lint rule forbidding number and float in money paths.

## Linked requirements

R-05, R-08, R-09; PRD FR-LED-001; constitution Article III.

## Verification

Planned in Phase 3: property tests on rounding and conservation; a static check that no floating-point type appears in money paths.
