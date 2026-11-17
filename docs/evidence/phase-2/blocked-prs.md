# Evidence: merges are blocked (SC-002, quickstart §10)

Date: 2026-11-17. One scratch pull request per defect category, each branched from `main` with a single deliberate defect. All six were closed without merging and their branches deleted.

The ruleset `main-protection-solo` requires `ci`, `governance-check`, `secret-scan` and `design-check` (see `ruleset.json`). Every pull request below showed merge state **BLOCKED**.

| # | Category | Defect | Pull request | Check that blocked it |
|---|---|---|---|---|
| 1 | Style error | A file that Prettier would reformat | #28 | `static` (format step), therefore `ci` |
| 2 | Type error | `const x: number = 'text'` | #29 | `static` (type check), and the jobs that build from it: `build`, `integration`, `fresh-clone`, `egress`, `unit`; therefore `ci` |
| 3 | Failing unit test | `expect(1 + 1).toBe(3)` | #30 | `unit`, therefore `ci` |
| 4 | Fake AWS key | An invented key in the AWS format (opens nothing) | #31 | `secret-scan` (gitleaks) and `governance-check` (the forbidden-pattern scan, C-9) |
| 5 | Non-allowlisted URL | A URL whose host is not in `scripts/safety/allowed-hosts.txt` | #32 | `governance-check` (C-9) |
| 6 | Vulnerable dependency | `lodash@4.17.20`, which has known high-severity advisories | #33 | `deps` (`pnpm audit`), therefore `ci` |

## What the run showed

- Each pull request was blocked by the check that matches its own defect. Rows 1, 2, 3 and 6 are blocked through `ci`, which fails when any job it depends on fails. Rows 4 and 5 are blocked directly by `secret-scan` and `governance-check`.
- **Side effect worth knowing.** `secret-scan` scans the full history of every branch on the remote (`fetch-depth: 0`). While the fake-key branch existed, `secret-scan` failed on **all** open pull requests, not just its own. After that pull request was closed and its branch deleted, the checks of the other five were re-run and `secret-scan` passed on each, leaving only the failures listed above. A secret pushed to any branch therefore blocks every pull request until the branch is deleted, and the secret still has to be rotated if it was real.
- The fake key was invented for this test and was never valid.
