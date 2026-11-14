# ADR-010: Identity with Keycloak OIDC
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Multi-factor authentication is required for privileged roles but no identity provider was chosen (R-12).

## Decision

Identity: Keycloak OIDC, MFA for privileged roles, tenant claim in token

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Keycloak (self-hosted) OIDC with TOTP for privileged roles and a tenant claim in the token; demo users seeded**: Runs locally, no external service; operational footprint.
- **Hosted identity provider**: Less to run; an external dependency conflicting with DEMO isolation.
- **Custom authentication**: Full control; high security risk.

## Consequences

- Positive: a standard protocol and local reproducibility.
- Negative: another service to run and seed.
- Follow-ups: role and permission matrix in feature 004.

## Linked requirements

R-12, R-15; PRD FR-SEC-001; constitution Article V.

## Verification

Planned in Phase 2 (004): authentication tests and a check that privileged roles require a second factor.
