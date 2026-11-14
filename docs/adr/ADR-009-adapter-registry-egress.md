# ADR-009: Adapter registry, DEMO allowlist and egress deny
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

No code path may reach external financial services (constitution Article I). Failing closed on unknown adapter types had no mechanism (R-11).

## Decision

Adapter registry with DEMO allowlist (`mock:*`), fail-closed startup guard, network egress deny

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Adapter registry with an allowlist of mock:* types; startup fails if any other type is configured in DEMO; network egress denied at the container level and scanned in CI**: Defense in depth; configuration must be strict.
- **Convention only (developers avoid live adapters)**: No effort; unenforced.
- **Code stripping of live adapters**: Strong; harder to evolve toward a later regulated program.

## Consequences

- Positive: the boot guard and egress rules make live connectivity technically unreachable.
- Negative: adding any adapter type needs an explicit allowlist change.
- Follow-ups: egress tests in Phase 12.

## Linked requirements

R-11; PRD FR-INT-002, FR-DEMO-003; RISK-PM-01; constitution Article I.

## Verification

Planned in Phase 2 (006) and Phase 12: a boot-guard test with an unknown adapter type, and egress tests that outbound connections fail.
