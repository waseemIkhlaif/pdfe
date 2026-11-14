# ADR-015: Mobile app with Expo React Native
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

The PRD lists a consumer app but not its platform (R-01).

## Decision

Mobile: Expo React Native, secure storage, simulated biometric lock, no real push provider in DEMO (local notifications/mock)

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Expo React Native with secure storage, a simulated biometric lock, and no real push provider in DEMO (local or mock notifications)**: One codebase, shared TypeScript; native limits apply.
- **Native apps per platform**: Best fit; double the effort.
- **Responsive web only**: Cheapest; not a mobile app.

## Consequences

- Positive: shared packages and types with the web apps.
- Negative: some native features are simulated.
- Follow-ups: merchant lite mode from Phase 2.

## Linked requirements

R-01, R-13; PRD consumer app; constitution Articles I and IX.

## Verification

Planned in Phase 2 onward: a launch smoke test in DEMO; a check that no real push provider is configured.
