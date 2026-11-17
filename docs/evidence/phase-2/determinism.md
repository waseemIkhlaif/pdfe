# Deterministic reset and seed (SC-010, quickstart §7)

The same scenario, version and seed give the same digest, on any machine.

## The digest

| Scenario | Version | Seed | Digest (SHA-256) |
|---|---|---|---|
| baseline | v1 | 42 | `8be99f2d4f98777e81225db00ec32ef10ed655c8db867a50238266e6561bb394` |

Committed in `db/seeds/scenarios/baseline/v1.digest-seed42.txt`. It was produced on the developer workstation (Windows 11,
Node 22, Postgres 16 in a container) from the code of this branch, by the integration test
`apps/api/test/determinism.int.spec.ts`, and is compared with:

- the same test in the `integration` job of CI, on a fresh Linux runner and fresh containers: a different operating system,
  the same digest (the CI run is linked below);
- `pnpm scenario baseline --seed 42` against the running stack in the `e2e-web` job, which exits 1 on a mismatch.

## What the digest covers

Every row the run created in `platform.tenants`, `platform.organizations`, `iam.users`, `iam.user_roles` and
`config.config_versions`, plus the run's own audit events by content (without `seq`, `prev_hash`, `hash` and `id`, which
depend on the history before the run). Rows are sorted, written as canonical JSON and hashed. The IDs, the timestamps and
the correlation ID all come from the scenario clock and the seeded generator, so they are part of what must be equal.

## What the tests show

| Test | Shows |
|---|---|
| `determinism.int.spec.ts` | seed 42 twice with a reset between: equal digests and equal IDs; equal to the committed file; seed 43 differs and is itself stable; the audit trail holding earlier runs changes nothing |
| `determinism-bypass.int.spec.ts` | a direct `Date.now`, `Math.random` or `crypto.randomUUID` from project code during a run fails it with `DETERMINISM_BYPASS`, and the tables are left reset; a clean run trips nothing; outside a run the three behave as before |
| `scenario.int.spec.ts` | the report matches the database; `scenario.run_started` and `scenario.run_finished` are audited; an `epoch_start` anchor is recorded and `audit/verify` from it is `ok`; a changed manifest gets 409; a concurrent run gets 409; outside DEMO the run is refused; a fault after the users were created leaves the tables reset and the run `failed` |
| `domain-types/test/scenario.test.ts` | the schema accepts the baseline manifest and refuses an unknown tenant, a conflicting role pair, a duplicate subject and a non-integer money value; the manifest's users are the realm's users |
| `mock-hub/test/control.spec.ts` | latency, seeded failures and scripted outcomes; the control endpoint needs the internal token |

## Finding on the way

The audit trail is append-only, so a reused seed repeated the audit event IDs and the anchor ID of the previous run and the
second run failed on a duplicate key. The first design made the digest depend on those IDs. They now come from the scenario
clock and system randomness, and the digest leaves them out (the contract says so).

## CI run

To be added when the pull request's CI has run.
