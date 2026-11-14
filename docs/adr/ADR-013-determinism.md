# ADR-013: Determinism
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Scenario seeding and reset must give identical results (FR-DEMO-001) but real clocks, UUIDs and randomness break that (R-10).

## Decision

Determinism: injected Clock/IdGenerator/Random; seeded scenario runner

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Injected Clock, IdGenerator and Random with a seed in DEMO; a seeded scenario runner**: Reproducible runs; code must never call the system clock directly.
- **Snapshot restore only**: Fast; does not prove reproducibility.
- **Accept non-determinism**: No effort; fails the requirement.

## Consequences

- Positive: the same seed and version give the same digest.
- Negative: discipline is needed to avoid direct clock, ID and random calls.
- Follow-ups: a lint rule for direct calls.

## Linked requirements

R-10; PRD FR-DEMO-001; constitution Article X.

## Verification

Planned in Phase 2 onward: run a scenario twice and compare digests; a lint check for forbidden direct calls.
