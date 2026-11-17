# Evidence: fresh-clone run (FR-004, SC-001)

Status: **waiting for the owner's self-attestation.** The local run and the CI run both passed.

## Local run (workstation)

- Date: 2026-11-15
- Machine: Windows 11, Docker Desktop 28.1.1 (WSL2) with about 4 GB of memory available to Docker, Node 25.2.1, pnpm 11.0.9.
- Commands: `pnpm dev:all` (builds one image at a time, starts the stack, runs `scripts/smoke.mjs`).
- Result: all 11 containers healthy; `smoke: 7 checks passed (6 web apps show the simulation label; api reports DEMO)`.
- Timing: 17 min 46 s on a cold cache with sequential image builds. A first attempt with parallel builds crashed Docker's build engine on 4 GB of memory, so `dev:all`, `bootstrap` and CI now set `COMPOSE_PARALLEL_LIMIT=1`.
- Also confirmed by hand: `GET /v1/health` returns `{"status":"ok","mode":"DEMO","checks":{"database":"up","redis":"up"},"adapters":[]}`; `platform.schema_migrations` lists `0001_platform.sql`; the console sign-in page contains both label strings.

## CI run

- `fresh-clone` job, green on pull request #24 (4 min 26 s): the `ci` run for commit `0e0672a`'s branch. Pull request: https://github.com/waseemIkhlaif/pdfe/pull/24
- The `ci` check was added to the `main-protection-solo` ruleset on 2026-11-15 after this first green run. Export: `ruleset.json` in this folder.

## Later runs

`fresh-clone` has stayed green on every pull request since: #25 (safety boundary), #26 (identity, with Keycloak and migrations 0003 to 0006) and #27 (audit anchors, migration 0007). A run on #26 caught a real fault that the local tests could not, a migration statement that needs more than the migrator role's rights, which is now covered by `apps/api/test/migrate-as-migrator.int.spec.ts`.

Merges are blocked as required: see `blocked-prs.md` (SC-002).

## Self-attestation (solo mode)

Re-review pending: outside reviewer before Gate 1/B.

- Attested by: _owner login_
- Date: _YYYY-MM-DD_
