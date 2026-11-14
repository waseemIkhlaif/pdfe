# Quickstart: Validate the Governance Baseline (Phase 0)

This is a run-and-check guide that proves Phase 0 is complete. It is **not** the build guide; the build steps are in `tasks.md`. Commands are written for Git Bash. Placeholders: `<owner>` is the GitHub org or user, `<sponsor>` is the sponsor's login, and `<implementer>` is your own login.

## 0. Prerequisites

- The implementer has a GitHub account that owns the public repository `<owner>/pdfe` on a free plan (a second account only if a reviewer is later named), and `docs/evidence/phase-0/publication-check.md` records the implementer's confirmation that everything in it is safe to publish ([research R-2](./research.md)). `team.env` has `SOLO_MODE=1`.
- The working copy is at a path that OneDrive does not sync, for example `C:\dev\pdfe` ([research R-1](./research.md)).
- The original Master PRD v0.2 and PM Plan v0.2 are available.
- The tools from plan Part E.1 are installed, and `gh auth status` shows you are logged in.

## 1. Workstation and tooling (FR-001, SC-010)

```bash
specify check | tee docs/evidence/phase-0/specify-check.txt
```

**Expected:** every required tool is reported as found, and the exit code is 0.

## 2. Artifact checks: format mode, then gate mode

```bash
bash scripts/governance/check-phase0.sh          # during drafting
bash scripts/governance/check-phase0.sh --gate   # before the gate review
```

**Expected:** every line starts with `PASS`, and the exit code is 0. The check IDs C-1 to C-17 are defined in [contracts/governance-check.md](./contracts/governance-check.md).

## 3. Repository protection proofs (FR-019 to FR-023, SC-005)

Run the proof tests P-1 to P-6 from [contracts/repository-controls.md §6](./contracts/repository-controls.md). Quick version:

```bash
gh api repos/<owner>/pdfe/rulesets --jq '.[0].id' \
  | xargs -I{} gh api repos/<owner>/pdfe/rulesets/{} > docs/evidence/phase-0/ruleset.json
git checkout main && git commit --allow-empty -m "test: direct push" \
  && git push origin main 2>&1 | tee docs/evidence/phase-0/push-rejected.txt
git reset --hard origin/main
```

**Expected:**

- `ruleset.json` shows `"enforcement": "active"` and `"bypass_actors": []`.
- The push is rejected with a rule-violation error.
- An unreviewed PR cannot be merged, and its `gh pr merge` output is saved to `merge-blocked.txt`.

## 4. Signatures (FR-006a, SC-001)

```bash
bash scripts/governance/verify-signatures.sh | tee docs/evidence/phase-0/signatures.md
```

**Expected:** `SIGNED` for `docs/simulation-charter.md`, `docs/governance/approved-scope.md` and `docs/governance/gate-0-review.md`.

**Negative check:** edit any of those files in a PR and push. The sponsor's earlier approval is dismissed, and the helper reports `UNSIGNED/LAPSED` until the sponsor approves again.

**Solo mode:** the helper reports `SELF-ATTESTED` instead of `SIGNED`, because there is no second approver. Each file must carry the `Attestation:` line, and its last change must have arrived through a pull request. Editing a file removes the signature until the attestation date is updated in the same PR.

## 5. Maker-checker (FR-011, SC-006)

- Open `docs/governance/roles-assignment.md`. It should list 8 roles held by 2 people, with Checker ≠ Holder on every row.
- Two-person mode: on any merged PR, run `gh pr view <n> --json reviews,author`. At least one `APPROVED` review should come from a login other than the author.
- **Solo mode:** `roles-assignment.md` lists 8 roles held by 1 person with Checker `solo` on every row, `docs/governance/solo-mode-exception.md` exists, and the risk register has `RISK-P0-02`. Check C-10 and C-17 report PASS.

## 6. Backlog (FR-024)

```bash
gh label list --limit 200 | grep -E '^(P[012]|domain:|phase:|gate:)' | wc -l
gh project list --owner <owner>
```

**Expected:**

- The count is 39 (3 priority, 17 domain, 13 phase, 6 gate). Together with `stop-work`, that makes 40 labels.
- The `PDFE Delivery` project exists.
- A sample chain Epic → Feature Spec → User Story → Task → Test Case → Evidence has been created using sub-issues and can be viewed.

## 7. Safety scan (FR-028, SC-008)

This runs in CI as `secret-scan`. To run it locally:

```bash
docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:<pinned> detect --source /repo --redact
```

**Expected:** `no leaks found`, plus C-9 PASS from step 2.

## 8. Gate 0/A

Open `docs/governance/gate-0-review.md`. The following should all be true:

- Every criterion row says `pass` and has an evidence link.
- The verdict is `passed`.
- The signature block names the sponsor.
- Step 4 reports it as `SIGNED`.

When they are, **Gate 0 / Gate A has passed**, and Phase 2 (feature 001) may start.
