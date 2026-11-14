# ADR-011: Tenant isolation
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Tenant isolation defects are Critical (RISK-PM-09). Isolation must not depend on a single layer.

## Decision

Tenant isolation: `tenant_id` on every row + PostgreSQL Row-Level Security + app-level guards

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **tenant_id on every row, PostgreSQL Row-Level Security, and application-level guards**: Two independent layers; policies must be tested.
- **Application guards only**: Simpler; one bug leaks data.
- **Database per tenant**: Strong isolation; heavy for a demo.

## Consequences

- Positive: a missed guard is caught by the database policy.
- Negative: every query path needs a tenant context.
- Follow-ups: independent isolation test in Phase 12.

## Linked requirements

RISK-PM-09, R-15; PRD FR-SEC-001; constitution Article V.

## Verification

Planned in Phase 2 (004) and Phase 12: negative authorization tests across tenants; an isolation report.
