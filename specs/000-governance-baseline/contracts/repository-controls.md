# Contract: Repository Controls

This contract covers FR-018a to FR-023, FR-011 and FR-006a. The background reasoning is in research R-2 to R-5.

`<implementer>` and `<sponsor>` stand for the two GitHub logins recorded in `docs/governance/roles-assignment.md`.

**Modes.** The repository runs in one of two modes, set by `SOLO_MODE` in `scripts/governance/team.env`: **two-person mode** (`SOLO_MODE=0`; a second person reviews and approves) or **solo mode** (`SOLO_MODE=1`; one person holds every role, in effect from 2026-11-14). In solo mode `<sponsor>` is the same login as `<implementer>`. Differences are marked **Solo:** below.

## 1. Repository

| Setting | Value |
|---|---|
| Visibility | **Public** (required: on the free plan, enforcement of the ruleset below needs a public repository; do not switch it to private) |
| Plan | GitHub Free (personal account or free organization) |
| Default branch | `main` |
| Merge methods | Squash only; auto-delete head branches on |
| Collaborators | Two-person mode: `<implementer>` Admin, `<sponsor>` Maintain. **Solo:** `<implementer>` only; no collaborators |

## 2. Ruleset `main-protection`

- Target: `refs/heads/main`. Enforcement: **Active**.
- **Bypass actors: none.**

| Rule | Setting |
|---|---|
| Restrict deletions | on |
| Block force pushes | on |
| Require linear history | on |
| Require a pull request before merging | on |
| ├ Required approvals | 1 |
| ├ Dismiss stale approvals on new commits | on |
| ├ Require review from Code Owners | on |
| ├ Require approval of most recent reviewable push | on |
| └ Require conversation resolution | on |
| Require status checks | `governance-check`, `secret-scan`; require branches up to date |

**Evidence:** `gh api repos/<owner>/pdfe/rulesets` → `docs/evidence/phase-0/ruleset.json`. The file must show `"enforcement": "active"` and `"bypass_actors": []`.

**Solo:** apply `scripts/governance/ruleset-main-protection-solo.json` instead. It is identical, except that `required_approving_review_count` is 0, and code-owner review, stale-approval dismissal and last-push approval are off, because they would make every change unmergeable for a lone author. Everything else stays: PR required, both status checks required and up to date, no force pushes or deletions, linear history, conversation resolution, and an empty bypass list. Evidence is the same export, saved to `docs/evidence/phase-0/ruleset.json`.

## 3. CODEOWNERS (`.github/CODEOWNERS`)

```
# Default: either team member; GitHub ignores the author's own approval,
# so the other person must approve (two-person maker-checker).
*                                   @<implementer> @<sponsor>

# Signed artifacts: sponsor approval is the signature (FR-006a)
/docs/simulation-charter.md         @<sponsor>
/docs/governance/approved-scope.md  @<sponsor>
/docs/governance/gate-0-review.md   @<sponsor>
/.specify/memory/constitution.md    @<sponsor>

# Control files: changes need the other person
/.github/                           @<implementer> @<sponsor>
/scripts/governance/                @<implementer> @<sponsor>

# Plan Part D ownership (paths created from Phase 2; listed now so they are protected from day one)
/apps/api/src/modules/ledger/       @<implementer> @<sponsor>
/db/migrations/                     @<implementer> @<sponsor>
**/adapters/**                      @<implementer> @<sponsor>
/infra/network/                     @<implementer> @<sponsor>
```

Rules:

- The sponsor-only lines must stay below the `*` line, because the last match wins.
- **Solo:** every line names only `<implementer>`. The lines stay in place so that review requirements resume if a reviewer is named; they cannot enforce independent review while there is one owner.
- When a third person joins (for example, a finance or security specialist), the Part D path lines are updated to name them. That update is a change-control item (plan I.7).

## 4. Pull request template (`.github/pull_request_template.md`)

The template copies plan Part I.3 exactly and adds one Phase 0 line under Safety:

```
- [ ] If this PR changes a signed artifact, the sponsor's approval below is the re-signature
```

## 5. Workflow (`.github/workflows/governance.yml`)

| Job name (= status check) | Trigger | Runs |
|---|---|---|
| `governance-check` | `pull_request` to `main`, `push` to `main` | `bash scripts/governance/check-phase0.sh` |
| `secret-scan` | same | `docker run --rm -v $PWD:/repo zricethezav/gitleaks:<pinned> detect --source /repo --redact` with `fetch-depth: 0` |

- Permissions: `contents: read` only.
- Third-party actions: only `actions/checkout`, pinned by commit SHA.

## 6. Proof tests (FR-023, SC-005)

| Test | Steps | Expected |
|---|---|---|
| P-1 Direct push | As `<implementer>`: commit on local `main`, then `git push origin main` | Rejected: `GH013: Repository rule violations found` |
| P-2 Force push | `git push --force origin main` | Rejected |
| P-3 Unreviewed merge | Open a PR, then run `gh pr merge --squash` as the author | Blocked: review required |
| P-4 Self-approval | Author runs `gh pr review --approve` on their own PR | Refused by GitHub |
| P-5 Stale approval | The sponsor approves; the author pushes a new commit | The approval is dismissed; merge is blocked again |
| P-6 Signed-file ownership | A PR touching `docs/simulation-charter.md` | Only `<sponsor>` is listed as required code owner |

The output of each test is saved under `docs/evidence/phase-0/`.

**Solo:** P-1 and P-2 apply unchanged. **P-3 becomes** "Failing check blocks merge": open a PR that deliberately fails `governance-check` (for example, add a line the forbidden-content scan rejects), run `gh pr merge --squash`, and expect it to be blocked while the check is failing; then close the PR unmerged. **P-4, P-5 and P-6 are not applicable** and are recorded as such in the evidence folder.

## 7. Backlog (`PDFE Delivery` project)

- Field `Level`: Epic · Feature Spec · User Story · Task · Test Case · Evidence.
- Parent linkage via sub-issues.
- Labels are created by `scripts/governance/labels.sh`. The script is idempotent (`gh label create --force`). See research R-7 for the label list.
