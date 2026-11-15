# Contract: CI checks and safety tests (Phase 2)

Workflow `.github/workflows/ci.yml`. A final aggregate job, **`ci`**, needs every job that ran and fails if any of them failed. The `ci` job is added to the `main-protection-solo` ruleset after its first green run. The existing required checks (`governance-check`, `secret-scan`, `design-check`) stay.

| Job | Runs on | Steps | Fails when |
|---|---|---|---|
| `static` | every PR | `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, OpenAPI lint plus drift check, route-manifest completeness | any error, including the determinism ban, physical CSS properties and a hard-coded UI string |
| `unit` | every PR | `pnpm test:unit` (Vitest, fast-check in reduced mode) | any failure |
| `deps` | every PR | `pnpm audit --audit-level=high`; Trivy filesystem scan, severity HIGH and CRITICAL | a high or critical finding without a documented, dated exception in `docs/security/dependency-exceptions.md` |
| `integration` | PRs touching `apps/api`, `apps/worker`, `db/**`, `packages/**`; nightly | Testcontainers (Postgres 16, Redis, Keycloak with the realm import): migrations from zero, RLS, triggers, approvals, audit chain and tamper detection, negative authorization suite, idempotency, determinism (two runs with seed 42) | any failure |
| `build` | every PR | `turbo build` for every app; `docker compose build` | any failure |
| `e2e-web` | PRs touching `apps/web-*`, `packages/ui-web`, `packages/i18n`; nightly | Start the Compose stack; Playwright: banner check on every manifest route × {ar, en}, axe scan (fail on serious or critical), visual comparison against the Phase 2 baselines (threshold: `maxDiffPixelRatio` 0.01 per screenshot) | any failure |
| `egress` | PRs touching `infra/**`, `apps/api`, `apps/worker`, `apps/mock-hub`; nightly | Start the stack; inside each of api, worker and mock-hub, run the probes below | any probe succeeds |
| `startup-guard` | part of `integration` | Start the api with `APP_MODE=LIVE`, then with an adapter `http:real`, then with an adapter `mock:unknown`, then with a missing kind | the process does not exit non-zero with the expected message |
| `fresh-clone` | PRs touching `package.json`, `pnpm-lock.yaml`, `infra/**`, `scripts/bootstrap*`; nightly | Clean checkout into an empty directory, `pnpm bootstrap`, `pnpm dev:all`, wait until healthy, then curl every web app and assert that the banner text is in the HTML; `GET /v1/health` shows `mode: DEMO` | any step fails. The passing run is the FR-004 evidence |
| `mobile` | PRs touching `apps/mobile`, `packages/ui-native`, `packages/i18n`; nightly | Build the Android debug APK; Maestro flows on an emulator (API 34) | any flow fails |

## Egress probes (each must fail)

1. `node -e "fetch('https://example.com').then(()=>process.exit(0),()=>process.exit(1))"`, expecting exit code 1. The in-process guard and the network block it.
2. A raw TCP connect to `1.1.1.1:443` with a 3-second timeout, expecting a failure. This proves the network layer alone blocks it, independent of the code guard.
3. DNS resolution of a public name, expecting a failure or no route.

The job records all probe outputs as the evidence artifact `egress-report.txt`.

## Repository scans (in the existing `governance-check` and new `static` steps)

`scripts/safety/forbidden-patterns.txt` gains:
- mainnet and testnet RPC host patterns (for example `infura`, `alchemy`, `quiknode`, `*.rpc.*`);
- real bank API host fragments;
- IBAN-like strings `[A-Z]{2}\d{2}[A-Z0-9]{11,30}` outside fixtures marked `SIM-`;
- 9-digit national-ID-like numbers next to "ID" or the Arabic word for ID.

These are covered by fixtures in the D-11 style.
