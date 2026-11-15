# Quickstart: Validate the Platform Foundation (Phase 2)

This guide proves the Phase 2 outcomes end to end. Commands run from the repository root, in Git Bash or PowerShell, on Windows 11 with Docker Desktop (WSL2), or on Linux. Each section names the success criteria it proves. Details: [contracts/runtime-config.md](./contracts/runtime-config.md), [contracts/http-api.md](./contracts/http-api.md), [contracts/ci-checks.md](./contracts/ci-checks.md).

## Prerequisites

- Git, Node 22 LTS or newer, pnpm 11.0.9 (`corepack enable && corepack prepare pnpm@11.0.9 --activate`), Docker Desktop 28 or newer with about 8 GB of memory allocated.
- For mobile only: Android Studio emulator (API 34) and the Maestro CLI.

## 1. Fresh clone to running stack (SC-001)

```bash
git clone <repo> pdfe-fresh && cd pdfe-fresh
pnpm bootstrap
pnpm dev:all
```

**Expected:**
- `dev:all` ends with every service healthy and prints the URLs.
- `http://localhost:3001` to `:3006` each show the sign-in page with the banner **SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية**.
- `curl http://localhost:4000/v1/health` returns `"mode":"DEMO"` and lists only `mock:*` adapters.

The CI `fresh-clone` job repeats this on every relevant pull request. Its passing run plus your dated note in `docs/evidence/phase-2/fresh-clone.md` is the FR-004 evidence.

## 2. Tests (SC-005, SC-007, SC-008)

```bash
pnpm test
```

**Expected:** unit, integration and end-to-end tests all pass. These include:
- the negative authorization suite (every route × every role);
- RLS cross-tenant reads returning 0 rows;
- self-approval refused by the service and by the database trigger;
- audit tamper detection naming the first broken `seq`.

## 3. Safety boundary (SC-003, SC-004)

```bash
APP_MODE=LIVE pnpm --filter api start:once                  # expected: exit 1, "LIVE mode is not supported"
ADAPTERS_CONFIG=test/fixtures/adapters.http-real.json pnpm --filter api start:once   # expected: exit 1, names "bank: http:real"
pnpm egress:probe                                           # expected: every probe FAILS to reach the internet
```

`egress:probe` runs the three probes inside api, worker and mock-hub against the running stack, and writes `egress-report.txt`.

## 4. Sign-in, second factor, isolation, elevation (SC-005, SC-006)

1. Open `http://localhost:3004` (console) and sign in as `demo.ops` (password in `infra/keycloak/README.md`). **Expected:** the OTP step appears. Without the code, there is no access.
2. Enter the TOTP from the fixed synthetic secret (`pnpm totp demo.ops`). **Expected:** the console opens with badges for tenant, role and DEMO.
3. At `/elevation`, choose tenant `demo-merchant` and give a reason. **Expected:** you can read that tenant's users; any change attempt is refused; after the time limit (set it to 5 minutes in config to test), access stops.
4. Search `/audit` for your correlation ID. **Expected:** `tenant.elevation_started`, `tenant.elevated_read` (one per read) and `tenant.elevation_ended`.

## 5. Maker-checker and configuration (SC-007, SC-009)

1. As `demo.admin.a`, propose `limits.transfer_max_minor = 750000` at `/admin/config`. **Expected:** the diff is shown; the active value is unchanged.
2. Still as admin A, open the approval. **Expected:** Approve is disabled, with "You cannot approve your own request".
3. As `demo.admin.b`, approve it. **Expected:** the value is active, and the previous version is `superseded`.
4. Roll back to the previous version (admin A requests, admin B approves). **Expected:** a new version holds the old value, and all steps appear in `/audit`.
5. Try to edit `app.mode`. **Expected:** it is not editable, and the API returns 409 `CONFIG_SAFETY_LOCKED`.

## 6. Audit verification (SC-008)

```bash
pnpm --filter api test:int -- audit.tamper     # alters one row in a disposable database and runs verify
```

**Expected:** `{ result: "broken", seq: <n>, reason: "hash_mismatch" }`. On the real stack, `/audit/verify` returns `ok`.

## 7. Determinism (SC-010)

```bash
pnpm scenario baseline --version v1 --seed 42   # prints digest D1
pnpm scenario baseline --version v1 --seed 42   # prints digest D2
cat db/seeds/scenarios/baseline/v1.digest-seed42.txt
```

**Expected:** D1 = D2 = the committed digest. CI computes it again on Linux, which is the second machine. With `--seed 43` the digest is different.

## 8. Labels, accessibility, design match (SC-011, SC-013)

```bash
pnpm test:e2e          # Playwright: banner on every route × {ar, en}; axe; visual comparison with phase-02 baselines
pnpm --filter mobile maestro   # Android emulator: banner, RTL and labels on every tab × {ar, en}
```

**Expected:** 0 missing labels, 0 serious or critical accessibility issues, and every shell route within the visual threshold or listed as an approved design change.

## 9. Correlation (SC-012)

1. In the consumer app, open `/error?simulate=500`, which is a DEMO-only test trigger, and copy the correlation ID shown.
2. Open Grafana at `http://localhost:3000`, dashboard **Find by correlation ID**, and paste the ID.

**Expected:** the API request trace, its log lines and the audit event appear, with no names or secrets in the logs.

## 10. Negative check: merges are blocked (SC-002)

On a scratch branch, open one pull request per category: a style error, a type error, a failing unit test, a fake AWS key, a non-allowlisted URL, and a dependency pinned to a version with a known high-severity advisory. **Expected:** each is blocked by `ci` (or by `secret-scan` / `governance-check`). Record the PR numbers in `docs/evidence/phase-2/blocked-prs.md`, then close the PRs.
