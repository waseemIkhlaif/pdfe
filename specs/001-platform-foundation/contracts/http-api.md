# Contract: HTTP API v1 (Phase 2)

The service base is `http://api:4000` inside Docker and `http://localhost:4000` through the gateway. The machine-readable description is generated as `packages/contracts/openapi.json` (OpenAPI 3.1) from this contract. A CI check fails if the generated file does not match the routes below.

## Rules for every endpoint

| Rule | Detail |
|---|---|
| Auth | `Authorization: Bearer <access token>` from realm `pdfe-demo`. Web apps send it server-side (BFF, research R-4). Only `GET /v1/health` and `GET /v1/meta` are public |
| Second factor | If the caller holds any privileged role, the token must show OTP (`amr` contains `otp`). Otherwise 401 `MFA_REQUIRED` |
| Tenant | Taken only from the token claim `tenant_id`, or from the active elevation (read-only) |
| Permission | Each route lists its permission. A missing permission gives 403 `FORBIDDEN` |
| Idempotency | POST, PUT, PATCH and DELETE require `Idempotency-Key` (8–128 visible characters). Replay gives the stored response. A missing or malformed key gives 400 `IDEMPOTENCY_KEY_REQUIRED` **Δ**; a reused key with different content gives 422 `IDEMPOTENCY_KEY_REUSED`; a request still running gives 409 `IDEMPOTENCY_IN_PROGRESS`. A run that fails releases the key, so the client can retry **Δ** |
| Correlation | `X-Correlation-Id` is accepted if it matches `^[A-Za-z0-9._-]{8,64}$`, otherwise it is generated. Always echoed in the response header |
| Rate limit | Over the limit gives 429 `RATE_LIMITED`, with `Retry-After`. The limit is per user for signed-in calls and per IP for calls with no token (signed-in traffic is not counted per IP, because the web servers share addresses) **Δ**. Limits come from `api.rate_limit` |
| Elevation | While the caller has an active elevation, any POST, PUT, PATCH or DELETE (except the elevation routes below) gives 409 `ELEVATION_READ_ONLY` **Δ**. An elevation that has expired gives 403 on the next request and is closed |
| Errors | `{ "error": { "code": "UPPER_SNAKE", "message_key": "errors.<code_lower>", "correlation_id": "COR-…" } }`. Validation errors add `details: [{ path, message_key }]` |
| Mode | Every response carries `X-PDFE-Mode: DEMO` |

## Endpoints

| Method and path | Permission | Purpose | Notes |
|---|---|---|---|
| GET `/v1/health` | public | Liveness and readiness (database, Redis, Keycloak, mock-hub) | Reports `mode: DEMO` and the adapter types (all `mock:*`) |
| GET `/v1/meta` | public | API version and build | |
| GET `/v1/me` | `me.read` | User, tenant, roles, permissions, `mfa: true/false`, active elevation | Shells use this for navigation |
| GET `/v1/approvals?status=&action_type=` | `approvals.read` | List the requests the caller made or can decide | Paginated (`cursor`, `limit` ≤ 100) |
| GET `/v1/approvals/{id}` | `approvals.read` | Request with its decisions | |
| POST `/v1/approvals/{id}/decisions` | approve permission for its `action_type` | `{ decision: approve\|reject, reason }` | 409 `SELF_APPROVAL`, `NOT_PENDING`, `EXPIRED`, `PAYLOAD_CHANGED`; 403 if the approve permission is missing |
| POST `/v1/approvals/{id}/cancel` | requester only | `{ reason }` | |
| GET `/v1/iam/users` | `iam.read` | Users of the caller's tenant, or of all tenants for platform_admin | The all-tenants directory for `platform_admin` comes from the database function `iam.list_users_all()` and carries non-PII columns only (id, tenant_id, display_name, locale, status, created_at, roles) **Δ** |
| GET `/v1/iam/roles` | `iam.read` | Roles, permissions, conflicts | |
| POST `/v1/iam/users/{id}/role-grants` | `iam.role.grant.request` | `{ role_code, organization_id?, reason }` creates the approval `iam.role.grant` | 409 `SOD_CONFLICT`; `details` lists the requested role (`role_code`) and each conflicting held role (`held_role`) as `roles.<code>`, and the refusal is audited (`iam.role.grant_refused_sod`) **Δ** |
| POST `/v1/iam/users/{id}/role-revocations` | `iam.role.grant.request` | `{ role_code, organization_id?, reason }` creates the approval `iam.role.revoke` | |
| POST `/v1/demo/simulate-error` | `me.read` | DEMO only. Records the audit event `demo.error_simulated`, then fails with the ordinary 500 envelope, so the error page can show a correlation ID that is real | 500 `INTERNAL`; 404 outside DEMO mode |
| POST `/v1/elevations` | `tenant.elevate` | `{ target_tenant_id, reason }` starts a read-only elevation | 409 `ELEVATION_ACTIVE`; default TTL from `security.elevation.ttl_minutes` |
| GET `/v1/elevations/current` | `tenant.elevate` | The caller's active elevation or 204 | |
| POST `/v1/elevations/{id}/end` | owner | Ends the elevation | |
| GET `/v1/audit/events?actor=&action=&tenant=&from=&to=&correlation_id=` | `audit.read` | Search | Paginated |
| POST `/v1/audit/verify` | `audit.verify` | `{ from_seq?, to_seq? }` returns `{ result: ok }` or `{ result: broken, seq, reason }` | `reason` ∈ {hash_mismatch, prev_link_mismatch, seq_gap, anchor_mismatch} |
| GET `/v1/audit/export?format=csv\|json&…filters` | `audit.export` | Streamed export | CSV first line: `# SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية`. JSON: `{ meta: { label }, events: [...] }`. The export itself is audited |
| GET `/v1/config` | `config.read` | Settings with their active versions | Safety-locked items are marked `editable: false` |
| GET `/v1/config/{key}/versions` | `config.read` | Version history | |
| GET `/v1/config/{key}/diff?from=&to=` | `config.read` | JSON Patch between two versions | |
| POST `/v1/config/{key}/versions` | `config.request` | `{ value, effective_from?, reason }` creates the approval `config.change` | 422 `CONFIG_INVALID` with details; 409 `CONFIG_SAFETY_LOCKED` |
| POST `/v1/config/{key}/rollback` | `config.request` | `{ to_version, reason }` creates the approval `config.rollback` | 422 if the old value fails the current schema |
| GET `/v1/demo/scenarios` | `demo.scenario.run` | Registered scenarios, versions, checksums | |
| POST `/v1/demo/scenarios/{code}/runs` | `demo.scenario.run` | `{ version, seed }` resets, seeds and returns the run | 409 `MANIFEST_CHECKSUM_MISMATCH`, `RUN_IN_PROGRESS` |
| GET `/v1/demo/runs/{id}` | `demo.scenario.run` | Status, digest, report | |

## Mock hub (internal only; not published by the gateway)

`http://mock-hub:4100/mock/{kind}/...` for kind ∈ {bank, psp, chain, kyc, sanctions, fx, price, notification}. Phase 2 provides `GET /mock/{kind}/ping` and the control endpoint `POST /mock/_control { kind, latency_ms, failure_rate, script[] }`. Only the scenario engine calls the control endpoint. Domain endpoints come with their phases.

## Negative authorization suite

`apps/api/test/authz.matrix.int.spec.ts` iterates **every route above × every role in `rbac.ts`**, with and without a second factor, in-tenant and cross-tenant. It asserts the expected status (2xx/4xx) from the matrix. A route that is missing from the matrix fails the suite (SC-005).

## Machine-readable contract **Δ**

`packages/contracts/openapi.json` is generated from the routes by `pnpm --filter @pdfe/contracts generate`. The route list comes from the controller metadata, and what each route takes and returns comes from the registry in `apps/api/src/openapi/registry.ts` and the Zod schemas in `schemas.ts` (the request schemas are the ones the services validate with). A route with no registry entry fails `openapi.int.spec.ts`, real responses are checked against the schemas there, and CI fails when the committed document or the generated clients (`packages/contracts/src/clients/`) differ from a fresh generation. Spectral (`.spectral.yaml`) requires an `x-permission` on every protected operation, the one error envelope on every error response, and the `Idempotency-Key` header on every change.
