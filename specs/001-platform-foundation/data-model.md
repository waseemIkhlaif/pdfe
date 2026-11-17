# Data Model: Platform Foundation (Phase 2)

**Feature**: [spec.md](./spec.md) · **Research**: [research.md](./research.md)

**Storage**: PostgreSQL 16, one schema per module (ADR-001). This file is the source for migrations `db/migrations/0001…0007`. The plan's SQL sketch (Part H Phase 2) is the baseline. Changes from that sketch are marked **Δ**.

**Conventions**
- Every ID is UUIDv7 from `IdGenerator`, which is deterministic in scenario runs (R-13).
- Every timestamp is `TIMESTAMPTZ`, comes from `ClockService`, and is stored in UTC.
- Mutable tables carry `version INT` for optimistic concurrency.
- Every tenant-owned table has `tenant_id UUID NOT NULL` and the RLS policy in §RLS.
- `is_synthetic BOOLEAN NOT NULL DEFAULT TRUE CHECK (is_synthetic)` sits on every table that describes a person or a legal entity.

## Schemas and tables

### `platform`
| Table | Key fields | Constraints / notes |
|---|---|---|
| `schema_migrations` **Δ** | `filename` PK, `sha256`, `applied_at` | The runner refuses to start if an applied file's hash changed (R-3) |
| `tenants` | `id`, `code` UNIQUE, `name`, `kind` ∈ {platform, consumer_pool, merchant, business, issuer, partner}, `status`, `created_at`, `version` | Not tenant-scoped (it is the root); readable by platform roles |
| `legal_entities` | `id`, `tenant_id`, `code`, `name`, `is_synthetic` | UNIQUE (`tenant_id`, `code`); RLS |
| `organizations` | `id`, `tenant_id`, `legal_entity_id`?, `type` ∈ {merchant, business, issuer, partner_bank, platform}, `display_name`, `status`, `created_at`, `version` | RLS |

### `iam`
| Table | Key fields | Constraints / notes |
|---|---|---|
| `users` | `id`, `tenant_id`, `external_subject` UNIQUE (Keycloak `sub`), `display_name`, `locale` ∈ {ar, en} default `ar`, `status` ∈ {active, disabled}, `is_synthetic`, `created_at`, `version` | RLS. No PII beyond the synthetic display name |
| `roles` | `code` PK, `description`, `privileged` | Seeded from `rbac.ts`. `privileged = true` ⇒ second factor required (FR-012) |
| `permissions` | `code` PK, `description`, `high_risk` | Seeded |
| `role_permissions` | (`role_code`, `permission_code`) PK | Seeded |
| `user_roles` | UNIQUE NULLS NOT DISTINCT (`user_id`, `role_code`, `organization_id`) **Δ** (the organization may be empty, so this replaces the primary key), `granted_by`, `granted_at`, `approval_request_id` **Δ** | Trigger `trg_user_roles_sod` refuses grants that create a separation-of-duties conflict or the triple-rule violation (R-6) |
| `sod_conflicts` | (`role_a`, `role_b`) PK, `reason` | Stored symmetric (both orders inserted) |
| `approval_requests` | `id`, `tenant_id`, `action_type`, `target_type`, `target_id`?, `payload` JSONB, `payload_hash`, `requested_by`, `reason`, `required_approvals` ≥1, `status`, `expires_at`, `created_at`, `correlation_id`, `version` | RLS. `payload_hash` = sha256(RFC 8785 JSON of `payload`) |
| `approval_decisions` | `id`, `approval_request_id`, `decided_by`, `decision` ∈ {approve, reject}, `reason`, `decided_at` | UNIQUE (`approval_request_id`, `decided_by`). Trigger `trg_no_self_approval`: `decided_by <> requests.requested_by` (FR-016) |
| `tenant_elevations` **Δ** | `id`, `user_id`, `home_tenant_id`, `target_tenant_id`, `reason` (≥10 chars), `started_at`, `expires_at`, `ended_at`?, `end_reason` ∈ {user, expired, revoked}?, `correlation_id` | At most one active row per user (partial unique index `WHERE ended_at IS NULL`). Platform scope (not RLS). Only `tenant.elevate` holders can insert |
| `list_users_all()` **Δ** | function | SECURITY DEFINER, executable by `app_role` only. Returns non-PII directory columns of the users of every tenant. `iam.users` has forced row-level security and there is no bypass flag, so the function visits each tenant in turn, setting `app.tenant_id` for the step and restoring the caller's value at the end. The service calls it only for `platform_admin` |

### `audit`
| Table | Key fields | Constraints / notes |
|---|---|---|
| `audit_events` | `seq` BIGSERIAL PK, `id` UNIQUE, `tenant_id`?, `actor_id`?, `actor_role`?, `action`, `target_type`?, `target_id`?, `reason`?, `approval_request_id`?, `elevation_id`? **Δ**, `correlation_id`, `occurred_at`, `data` JSONB, `prev_hash`, `hash` | Append-only: BEFORE UPDATE OR DELETE trigger raises `audit is append-only`. `app_role` has INSERT and SELECT only. `hash = sha256(prev_hash ‖ canonical_json(row without seq, hash))`; genesis `prev_hash` is 64 zeros. Indexes on (`tenant_id`, `occurred_at`), `correlation_id`, `actor_id`, `action` |
| `anchors` | `id`, `up_to_seq`, `hash`, `created_at` | Append-only like `audit_events`. Written by the worker every 100 events or hourly |

RLS for audit: auditors and platform roles read across tenants through their role. Tenant users never read audit directly in Phase 2.

### `config`
| Table | Key fields | Constraints / notes |
|---|---|---|
| `config_items` | `key` PK, `schema` JSONB (JSON Schema exported from Zod), `safety_locked`, `description` **Δ** | Seeded from `config-registry.ts`. A `safety_locked` key cannot get versions through the API (409 `CONFIG_SAFETY_LOCKED`) |
| `config_versions` | `id`, `key`, `version`, `value` JSONB, `effective_from`, `status`, `approval_request_id`?, `rollback_of_version`? **Δ**, `created_by`, `created_at` | UNIQUE (`key`, `version`). Partial unique index: one `active` per key. Platform scope (configuration is global in Phase 2) |

### `demo`
| Table | Key fields | Constraints / notes |
|---|---|---|
| `scenarios` | `code` PK, `title`, `manifest_version`, `manifest_sha256` | Registered from `db/seeds/scenarios/**` at start |
| `scenario_runs` | `id`, `scenario_code`, `seed` BIGINT, `manifest_version`, `started_at`, `finished_at`?, `status` ∈ {running, succeeded, failed}, `result_digest`?, `report` JSONB?, `requested_by`, `correlation_id` **Δ** | Not reset by runs (it is the history) |

### `integration`
| Table | Key fields | Constraints / notes |
|---|---|---|
| `partner_adapters` | `code` PK, `kind` ∈ {bank, psp, chain, kyc, sanctions, fx, price, notification}, `adapter_type` CHECK LIKE 'mock:%', `enabled` | The startup guard also checks the configuration file (R-9) |
| `idempotency_keys` | (`tenant_id`, `scope`, `key`) PK, `request_hash`, `status` ∈ {in_progress, completed, failed}, `response` JSONB?, `response_status` **Δ**, `created_at`, `expires_at` | RLS |
| `outbox` | `id`, `tenant_id`?, `topic`, `payload` JSONB, `correlation_id`, `created_at`, `published_at`?, `attempts` | Relay with `FOR UPDATE SKIP LOCKED`; index on `published_at IS NULL` |
| `inbox` **Δ** | (`consumer`, `event_id`) PK, `processed_at` | Consumer de-duplication: a consumer records the event in the same transaction as its work, so a repeated delivery does nothing. Approval handlers use it too, keyed `approval-handler:<action_type>` and the approval ID |

## RLS

Applies to every table with `tenant_id NOT NULL` except platform-scoped ones:

```text
USING      tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
WITH CHECK tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
```

- The API sets `SET LOCAL app.tenant_id` in every transaction from the validated token, or from the active elevation's target tenant, in which case the transaction is `READ ONLY`.
- A missing or empty `app.tenant_id` matches no row (`nullif` and the `missing_ok` form of `current_setting`), which also covers a pooled connection that carries an empty value from an earlier transaction **Δ**.
- There is **no** `cross_tenant` bypass flag **Δ**.
- `app_role` has no BYPASSRLS. Platform-scoped tables are protected by permission guards and grants instead.

## Lifecycles

**Approval request**
```text
pending ──approve (count reached)──> approved ──(outbox approval.approved; action executed once)
pending ──reject──> rejected
pending ──requester cancels──> cancelled
pending ──expires_at passed──> expired         (checked on read and by the worker)
```
A decision is refused when any of these holds:
- the decider is the requester;
- the decider lacks the approve permission for `action_type`;
- the status is not `pending`;
- the request has expired;
- the current payload hash ≠ the stored hash.

**Config version**
```text
draft ─submit─> pending_approval ─approved─> active (effective_from ≤ now) | scheduled→active (worker, at effective_from)
pending_approval ─rejected─> rejected **Δ**    pending_approval ─another version of same key approved─> stale **Δ**
active ─newer version activated─> superseded   rollback = new version (rollback_of_version = N) through the same path
```

**Tenant elevation**: `active → ended (user | expired | revoked)`. An expired elevation is treated as ended on the next request even before the worker updates it.

**Scenario run**: `running → succeeded | failed`. A failure rolls the demo tables back to the reset state.

**Outbox event**: `unpublished → published` (`attempts++` on each try; after 10 failures it raises an alert log and is retried with backoff).

## RBAC (Phase 2 permissions)

The roles are those of plan §J.3. Phase 2 adds or uses these permissions:

| Permission | High risk | Held by |
|---|---|---|
| `me.read` | no | every role |
| `iam.read` | no | platform_admin, auditor |
| `iam.role.grant.request` | yes | platform_admin |
| `iam.role.grant.approve` | yes | platform_admin (approver ≠ requester) |
| `approvals.read` | no | every role that can request or approve something |
| `audit.read` / `audit.export` / `audit.verify` | no / yes / no | auditor; `audit.read` also compliance_analyst, compliance_approver |
| `config.read` | no | platform_admin, ops_analyst, finance_analyst, auditor |
| `config.request` | yes | platform_admin |
| `config.approve` | yes | platform_admin (approver ≠ requester) |
| `demo.scenario.run` | yes | platform_admin, ops_analyst |
| `tenant.elevate` | yes | ops_analyst, platform_admin |
| `audit.admin` | yes | *(no Phase 2 holder; reserved for the triple rule)* |

**Privileged roles** (second factor required): ops_analyst, compliance_analyst, compliance_approver, finance_analyst, finance_approver, issuer_operator, stb_approver, platform_admin, auditor.

**Separation-of-duties conflicts** (seeded symmetric, from plan §J.3):
- biz_preparer–biz_approver;
- compliance_analyst–compliance_approver;
- finance_analyst–finance_approver;
- issuer_operator–stb_approver;
- ops_analyst–finance_approver;
- platform_admin–{biz_approver, compliance_approver, finance_approver, stb_approver};
- auditor–{every role holding a write permission}.

Plus the triple rule (R-6).

## Demo-resettable tables (truncation order)

`integration.outbox`, `integration.idempotency_keys`, `iam.tenant_elevations`, `iam.approval_decisions`, `iam.approval_requests`, `iam.user_roles`, `iam.users`, `config.config_versions` (the seeded defaults are re-created by the run), `platform.organizations`, `platform.legal_entities`, `platform.tenants`.

Never reset: `platform.schema_migrations`, `iam.roles`, `iam.permissions`, `iam.role_permissions`, `iam.sod_conflicts`, `config.config_items`, `demo.*`.

Audit is append-only, so a reset cannot truncate it. Instead, each run starts a new **audit epoch**: the run records `audit.anchors` at its start, verification works per epoch, and digests include only the run's own events. **Δ**
