# Contract: Scenario manifests and determinism (Phase 2)

## File

`db/seeds/scenarios/<code>/<version>.yaml`, for example `db/seeds/scenarios/baseline/v1.yaml`. Each manifest is listed in `db/seeds/scenarios/SHA256SUMS`, which keeps LF line endings (`.gitattributes`). At start, the API registers each manifest in `demo.scenarios` with its SHA-256. A run whose file hash differs from the registered or listed hash is refused (`MANIFEST_CHECKSUM_MISMATCH`).

```yaml
code: baseline
version: v1
title: { en: "Baseline platform", ar: "المنصة الأساسية" }
clock:
  base: "2026-01-15T08:00:00Z"   # scenario time zero (UTC)
  step_ms: 1000                  # each created entity advances the clock by this amount
tenants:                           # each has a fixed ID (the realm carries it in `tenant_id`); see infra/keycloak/README.md
  - { code: platform, kind: platform, name: "PDFE Platform (demo)" }
  - { code: consumers, kind: consumer_pool, name: "Consumer pool (demo)" }
  - { code: demo-merchant, kind: merchant, name: "Demo Merchant" }
organizations:
  - { tenant: demo-merchant, type: merchant, display_name: "Demo Cafe" }
users:                             # subjects must exist in infra/keycloak/realm-pdfe-demo.json
  - { subject: "11111111-0000-7000-8000-000000000001", tenant: platform, display_name: "Demo Admin A", roles: [platform_admin] }
  - { subject: "11111111-0000-7000-8000-000000000002", tenant: platform, display_name: "Demo Admin B", roles: [platform_admin] }
  # ... one user per role in rbac.ts (individual, merchant_owner, merchant_cashier, biz_preparer, biz_approver,
  #     ops_analyst, compliance_analyst, compliance_approver, finance_analyst, finance_approver,
  #     issuer_operator, stb_approver, auditor, demo_viewer)
config:                            # initial active versions (defaults from the registry when omitted)
  - { key: fees.default_minor, value: 0 }
mock_hub:
  - { kind: bank, latency_ms: 50, failure_rate: 0 }
```

Validation: a Zod schema in `packages/domain-types/src/scenario.ts`. Users with conflicting roles fail the run before anything is written.

## Run algorithm

1. Refuse the run if `APP_MODE ≠ DEMO`, if another run is `running`, or if the checksum mismatches.
2. Insert a `scenario_runs` row (`running`), outside the seeding transaction.
3. In one transaction, as `demo_reset_role`, then `app_role` (`SET LOCAL ROLE`):
   1. Truncate the demo-resettable tables (data-model §Demo-resettable) in the listed order.
   2. Set the scenario clock to `clock.base` and the ID and random generators to `seed`.
   3. Record an audit anchor that marks the epoch start.
   4. Create the entities **through the module services**: tenants, organizations, users and role grants (SoD checked), and configuration versions (active directly, attributed to `system:scenario`). Each creation records its normal audit event.
   5. Configure the mock hub.
4. **Digest**: export every row created in step 3.4 from the demo-resettable tables, plus the run's audit events with `seq`, `prev_hash` and `hash` removed. Sort by table, then primary key. Serialize as RFC 8785 canonical JSON and hash with SHA-256 (hex).
5. On success: commit, set `succeeded`, store the digest and the report (counts and IDs per table), and emit `scenario.run.finished`. On failure: roll back the transaction, set `failed` with an error code, and leave the environment in the reset state.

## Determinism guarantees (FR-035, SC-010)

- The same `code`, `version` and `seed` give the **same digest** on any machine. CI runs `baseline v1 --seed 42` twice, and compares the result with a digest stored in `db/seeds/scenarios/baseline/v1.digest-seed42.txt`, produced on the developer workstation.
- A different seed must give a different digest (test).
- The scenario code path touches only `ClockService`, `IdGenerator` and `RandomService`. An ESLint rule bans `Date.now`, `new Date()` with no arguments, `Math.random` and `crypto.randomUUID` outside `packages/platform-core`, and a test fails if any runtime call bypasses the injected sources during a run.
