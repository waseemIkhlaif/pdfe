# Contract: `scripts/governance/check-phase0.sh`

This script is the required status check `governance-check`.

**Interface**

```
bash scripts/governance/check-phase0.sh [--gate]
```

- Without `--gate`, the script checks the format of whatever artifacts exist, so drafts can be merged incrementally.
- With `--gate`, it also requires every artifact to be **complete**. Run it this way before the Gate 0/A review.
- **Output:** one line per check, `PASS <id> <message>` or `FAIL <id> <message>`, to stdout. A summary goes to stderr.
- **Exit codes:** `0` = all checks pass · `1` = one or more FAIL · `2` = the script itself errored (bad usage, missing tool).
- **Dependencies:** `bash`, `grep`, `awk`, `sed` and `git` only. No network access.

## Checks

The ID prefix `C-` is used in output. "Gate" means the check is enforced only with `--gate`; "Always" means it runs on every invocation. All file references are paths from [artifact-formats.md](./artifact-formats.md).

| ID | Check | Mode | Spec ref |
|---|---|---|---|
| C-1 | `docs/source/01_MASTER_PRD.md` and `03_PROJECT_MANAGEMENT_PLAN.md` exist and are non-empty | Always | FR-003 |
| C-2 | The constitution has no `[A-Z_]+` placeholder tokens; it has articles I–XI and a `## Governance` section with `Version` and `Ratified`. **Format mode tolerates the pristine Spec Kit template** (it still contains `[PROJECT_NAME]`) so the bootstrap commit can pass CI before ratification; any partly-filled file, and every file in gate mode, is checked strictly | Always (strict in gate mode) | FR-004, FR-005 |
| C-3 | Every verbatim block is an exact substring of its named source file | Always | FR-003, FR-006, FR-009 |
| C-4 | Each register's header row matches the contract exactly | Always | FR-013, FR-017, FR-018 |
| C-5 | Every decision row has an Owner. `decided`/`default-accepted` rows have an Approver and a valid Date; the Approver must differ from the Owner except in solo mode | Always | FR-014 |
| C-6 | D-01…D-12 are all present; D-10 and D-12 are `decided` or `default-accepted` | Gate | FR-013, FR-015 |
| C-7 | R-01…R-20 are present; no risk row has an empty Owner, Severity or Mitigated in | Gate | FR-017 |
| C-8 | Assumption rows with a status other than `unvalidated` have a Counsel reviewer and a Review date | Always | FR-018 |
| C-9 | **Forbidden patterns** in all tracked files except `docs/source/**`: `-----BEGIN [A-Z ]*PRIVATE KEY-----`; RPC/API host patterns from `scripts/safety/forbidden-patterns.txt`; any `https?://` URL whose host is not in `scripts/safety/allowed-hosts.txt` (initially `github.com`, `docs.github.com`, `www.w3.org`) | Always | FR-028 |
| C-10 | Role assignment has 8 roles. Two-person mode: exactly 2 distinct holders, Checker ≠ Holder on every row, and the Sponsor row's holder is not the implementer. Solo mode: exactly 1 distinct holder, who is the implementer and the sponsor, and Checker is `solo` on every row | Gate | FR-010, FR-011 |
| C-11 | DoR has ≥ 10 checkbox items, and DoD has ≥ 13 | Gate | FR-012 |
| C-12 | Approved scope contains all 34 P0 IDs and J1–J7; any non-`approved` row has a Decision ref | Gate | FR-007, FR-008 |
| C-13 | 15 ADR files exist; each has `Status: Proposed` (or later) and all six sections | Gate | FR-025 |
| C-14 | Each signed artifact has a Signature block with a name, `@login` and date, and the login equals the Sponsor in the role assignment. In solo mode the block also has the `Attestation:` line | Gate | FR-006a |
| C-15 | The Gate review verdict is `passed` only if every criterion Result is `pass` | Always (if the file exists) | FR-027 |
| C-16 | Prohibited claims ("guaranteed", "deposit protected", "licensed", "redeem for real") do not appear outside verbatim blocks or the prohibited-terms list itself | Always | FR-029 |
| C-17 | Solo mode only: `docs/governance/solo-mode-exception.md` exists with its four headings (`Rules relaxed`, `Compensating controls`, `Accepted risk`, `End condition`), and `RISK-P0-02` exists in the risk register | Gate | FR-011a |

## Not checked by the script

The script cannot check the following. They are verified manually and recorded in the gate review:

- **Whether the sponsor's PR approval exists.** This needs GitHub API access. It is checked by `scripts/governance/verify-signatures.sh`, run locally with `gh` and logged in, and its output is saved to `docs/evidence/phase-0/signatures.md`. In solo mode there is no approval to check: the helper verifies instead that the last change to each signed file arrived through a pull request, and reports `SELF-ATTESTED`.
- **Whether branch protection is active.** This is covered by the proof tests P-1 to P-6 in [repository-controls.md](./repository-controls.md).

## `verify-signatures.sh` (local helper)

For each signed artifact, the helper does the following:

1. It finds the last commit that touched the file: `git log -1 --format=%H -- <file>`.
2. It finds the PR for that commit: `gh api repos/{o}/{r}/commits/{sha}/pulls`.
3. It lists that PR's reviews: `gh api repos/{o}/{r}/pulls/{n}/reviews`.
4. It requires an `APPROVED` review from the sponsor's login whose `commit_id` equals the PR head.
5. It prints `SIGNED` or `UNSIGNED/LAPSED` for each file.
