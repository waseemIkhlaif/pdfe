# ADR-006: Idempotency of mutating commands
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Retries and duplicate submissions must never double-post (constitution Article IV; FR-LED-003).

## Decision

Idempotency: `(tenant_id, scope, idempotency_key)` unique with request hash and stored response

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Unique (tenant_id, scope, idempotency_key) with a request hash and the stored response**: A replay returns the original result; a different payload with the same key is rejected.
- **Client-side de-duplication only**: Cheap; not trustworthy.
- **Natural business keys only**: No client key needed; many commands lack a natural key.

## Consequences

- Positive: safe retries across the API and the outbox.
- Negative: storage for responses and a retention policy.
- Follow-ups: key retention window set in Phase 3.

## Linked requirements

PRD FR-LED-003; constitution Article IV.

## Verification

Planned in Phase 3: duplicate-request tests post at most once; same key with a different hash is rejected.
