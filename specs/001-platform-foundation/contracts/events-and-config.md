# Contract: Outbox events, configuration settings and audit actions (Phase 2)

## Outbox events

Every event is written in the same transaction as its cause and relayed at least once. Each event looks like this:

```json
{ "id": "<uuidv7>", "topic": "approval.approved", "tenant_id": "<uuid|null>", "correlation_id": "COR-…",
  "occurred_at": "<ISO-8601 UTC>", "payload": { ... }, "schema_version": 1 }
```

Consumers de-duplicate on `id`.

| Topic | Payload | Consumer |
|---|---|---|
| `approval.requested` | `{ approval_id, action_type, target_type, target_id }` | notifications (log-only in Phase 2) |
| `approval.approved` | `{ approval_id, action_type, target_type, target_id, payload_hash }` | the owning module executes the action once (keyed by `approval_id`) |
| `approval.rejected` / `approval.expired` / `approval.cancelled` | `{ approval_id, action_type }` | owning module (marks proposals) |
| `config.activated` | `{ key, version, effective_from }` | api caches (reload) |
| `scenario.run.finished` | `{ run_id, code, version, seed, status, result_digest }` | none (audit and reporting) |

## Configuration settings (seeded in `config_items`)

| Key | Schema | Default | Safety-locked |
|---|---|---|---|
| `app.mode` | `"DEMO"` literal | `DEMO` | **yes** |
| `adapters.allowlist` | array of `mock:*` patterns | `["mock:*"]` | **yes** |
| `egress.internal_hosts` | array of hostnames | Compose service names | **yes** |
| `security.elevation.ttl_minutes` | integer 5–120 | 30 | no |
| `approvals.default_expiry_hours` | integer 1–168 | 24 | no |
| `api.rate_limit` | `{ per_user_per_minute: 10–6000, per_ip_per_minute: 10–6000 }` | `{ 600, 1200 }` (placeholders) | no |
| `idempotency.ttl_hours` | integer 1–168 | 24 | no |
| `fees.default_minor` | integer ≥ 0 | 0 (decision D-07 placeholder) | no |
| `limits.transfer_max_minor` | integer ≥ 0 | 500000 (placeholder) | no |
| `fx.spread_bps` | integer 0–1000 | 0 (placeholder) | no |
| `features.flags` | `{ [flag]: boolean }` | `{ paper_trading: false, remittance: false }` | no |

Money values in configuration are integer minor units (Article III). Safety-locked settings are read from the deployment environment at start and must equal their row values. A mismatch stops the process.

## Audit actions (Phase 2)

Every action records an event with these fields: actor, role, tenant, action, target, reason, correlation ID, approval reference, elevation reference.

| Action | When |
|---|---|
| `auth.signin` / `auth.signin_denied_mfa` | API first sees a session, or rejects one for a missing second factor |
| `approval.created` / `approval.decided` / `approval.cancelled` / `approval.expired` | Maker-checker steps |
| `iam.role.granted` / `iam.role.revoked` / `iam.role.grant_refused_sod` | Role changes and refusals |
| `tenant.elevation_started` / `tenant.elevated_read` / `tenant.elevation_ended` | Elevation (every read is recorded) |
| `config.proposed` / `config.activated` / `config.rolled_back` / `config.refused_locked` | Configuration |
| `scenario.run_started` / `scenario.run_finished` | Scenario engine |
| `audit.exported` / `audit.verified` | Auditor actions |
| `demo.error_simulated` | A signed-in user asks the DEMO-only endpoint `POST /v1/demo/simulate-error` for a failure to look at (the error page's demonstration) |
| `system.start_refused` | Logged to stderr and, when the database is reachable, recorded (startup guard) |

### Audit actions not yet implemented

`apps/api/test/audit.coverage.int.spec.ts` reads this file. Every action in the table above must either be triggered and checked by that test (one event, every required field) or be listed here with the task that will implement it. When a story implements an action it moves out of this table, and the test then requires it to be covered.

| Action | Implemented by |
|---|---|
| `config.proposed`, `config.activated`, `config.rolled_back`, `config.refused_locked` | T157 (US7) |
| `scenario.run_started`, `scenario.run_finished` | T170 (US8) |
| `system.start_refused` | T160 (US7): until then it is only written to stderr |
