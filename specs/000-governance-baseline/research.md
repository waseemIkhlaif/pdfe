# Research: Governance Baseline (Phase 0)

**Feature**: `000-governance-baseline` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

Every Technical Context unknown is resolved below. Each entry gives a Decision, a Rationale and the Alternatives considered.

---

## R-1. Where the repository lives on disk

- **Decision**: The working copy lives at a path that OneDrive does **not** sync, for example `C:\dev\pdfe`. The original OneDrive copy of the project folder is moved there before `git init`.
- **Rationale**: OneDrive locks files and rewrites `.git` objects while it syncs. This is a well-known source of corrupted repositories and spurious "file changed on disk" events. Git, plus the private remote, already provides off-machine backup.
- **Alternatives considered**: Keeping the repo in OneDrive and excluding `.git`. Rejected, because OneDrive has no reliable per-folder exclusion inside a synced tree.

## R-2. Hosting plan and repository visibility

- **Decision**: A **public** GitHub repository on the **free plan**, under the implementer's personal account or a free organization, with the sponsor added as a collaborator (revised 2026-11-14; the first answer was private on a paid plan, which is not available).
- **Rationale**: Clarification Q4 requires protection to be enforced by the platform. On GitHub, rulesets, required reviews and code-owner enforcement are available on the free plan for public repositories only; private repositories need a paid plan. Public hosting is therefore the only free way to keep enforcement real. The cost is that every file is publicly readable, which is handled by FR-018b (a recorded publish-safety confirmation), the forbidden-content scans (C-9, gitleaks) and the rule that nothing confidential enters the repository.
- **Alternatives considered**: A private repository on a paid plan, which was the first choice but is not available. A free private repository, rejected because protection would not be enforced and the Gate 0/A criterion "branch protection proven" could not be met. A free paid-tier (Student Developer Pack or a verified nonprofit organization) remains a way back to private hosting if eligible; the rest of the plan does not change if so, apart from reversing this decision.

## R-3. Branch protection mechanism (FR-019, FR-020, FR-023)

- **Decision**: One **repository ruleset**, named `main-protection`, that targets the default branch `main`, with these rules:
  - Restrict deletions; block force pushes.
  - Require a pull request before merging, with these settings:
    - 1 required approval
    - **dismiss stale approvals when new commits are pushed**
    - **require review from Code Owners**
    - **require approval of the most recent reviewable push**
    - require conversation resolution
  - Require the status checks `governance-check` and `secret-scan` to pass, with "require branches to be up to date".
  - Require linear history (squash merge only).
  - **Bypass list: empty.** No role or app, including admins, may bypass.
  - **Solo mode (2026-11-14):** the approval-related settings above are dropped (0 required approvals; no code-owner review, stale-approval dismissal or last-push approval) because GitHub never counts an author's own approval and a lone author could otherwise never merge. The remaining rules, including the empty bypass list and both required status checks, are unchanged. Applied from `scripts/governance/ruleset-main-protection-solo.json`.
- **Rationale**:
  - "Dismiss stale approvals" makes a signature lapse automatically when signed content changes after approval (FR-006a and the edge case "signed artifact edited after approval").
  - "Require approval of the most recent push" stops an author from pushing new content after the reviewer has approved.
  - An empty bypass list is the only setting under which "a direct push to `main` is rejected" holds for the implementer, who is likely the repository admin.
- **Alternatives considered**: Classic branch protection. Rejected: it is equivalent in power, but rulesets can be exported as JSON for evidence (`gh api repos/{owner}/{repo}/rulesets/{id}`) and show bypass actors explicitly.

## R-4. Bootstrap order (protection needs checks that do not exist yet)

- **Decision**: Exactly one **bootstrap commit** is pushed to `main` before the ruleset is enabled. It contains `.specify/`, `.claude/`, `docs/source/`, `.github/` (CODEOWNERS, PR template, workflows) and the `scripts/governance/` folder. The ruleset is enabled immediately afterwards. Every later change goes through a PR. The bootstrap commit SHA is recorded in `docs/evidence/phase-0/bootstrap.md` as the only unprotected commit.
- **Rationale**: Required status checks can only be selected once a workflow has reported them at least once. Recording the exception keeps it auditable instead of hiding it.
- **Alternatives considered**: Enabling protection on an empty repository. Rejected, because the status checks could not be required and the first PR would deadlock.

## R-5. Two-person maker-checker mapped onto GitHub (FR-011, FR-006a)

- **Decision**:
  - `CODEOWNERS` lists **both** team members as owners of `*` and of every sensitive path. GitHub never counts an author's own approval, so the required code-owner approval is always given by the *other* person.
  - **Signed artifacts are always authored by the implementer and approved by the sponsor.** These are `docs/simulation-charter.md`, `docs/governance/approved-scope.md` and `docs/governance/gate-0-review.md`. Under the two-person model the sponsor is the reviewer, and GitHub does not let anyone approve their own PR.
  - Signed artifacts are additionally owned in CODEOWNERS by the sponsor **only**. This guarantees that the approving review on those files comes from the sponsor's account.
  - Artifacts the sponsor authors, such as decision entries the sponsor drafts, go through PRs that the implementer approves.
- **Rationale**: This satisfies Q2 (each person checks the other) and Q3 (the PR approval is the signature). It is enforced by the platform rather than by convention. **Solo mode (2026-11-14):** with one person none of this independent review exists. The replacement is a documented exception (FR-011a) with automated compensating controls, an accepted risk (`RISK-P0-02`), a dated self-attestation in place of the sponsor's PR approval, and an end condition (an outside reviewer before Gate 1/B). This is weaker than the original design, and the weakness is recorded rather than hidden.
- **Alternatives considered**: A separate e-signature tool. Rejected by Q3.

## R-6. Required status checks for a documentation-only phase (FR-020, FR-028)

- **Decision**: Two GitHub Actions jobs, on an `ubuntu-latest` runner:
  1. **`governance-check`** runs `scripts/governance/check-phase0.sh`, a small POSIX `bash` + `grep`/`awk` script with no package installs. It validates the artifact contracts in [contracts/](./contracts/), including the forbidden-pattern scan (contract C-9).
  2. **`secret-scan`** runs **gitleaks** from its official container image (`docker run zricethezav/gitleaks:<pinned-version> detect`) over the full history.
- **Rationale**:
  - Phase 0 has no Node toolchain; the monorepo arrives in feature 001. Bash and grep are already present on the CI runner and in Git for Windows locally, so no new dependency is added (Article XI).
  - gitleaks is already in plan Part C.2 and will be ratified in the ADR set. Running the container directly avoids `gitleaks-action`, which needs a licence key for organization accounts.
- **Alternatives considered**:
  - A Node/TypeScript checker. Deferred to feature 001, which can port the checks.
  - PowerShell 7. Rejected, because the local machine has only Windows PowerShell 5.1 and the CI default shell is bash.

## R-7. Backlog hierarchy (FR-024)

- **Decision**: One **GitHub Projects (v2)** board, `PDFE Delivery`, linked to the repository.
  - **Hierarchy**: a single-select field `Level` (Epic, Feature Spec, User Story, Task, Test Case, Evidence), plus GitHub **sub-issues** for parent → child linkage.
  - **Labels** (created by `scripts/governance/labels.sh` via `gh label create --force`):
    - `P0`, `P1`, `P2`
    - `domain:*` for the 17 domains: led, txn, acc, sec, aud, wal, pay, biz, rem, stb, exc, inc, int, cmp, ops, adm, demo
    - `phase:0` … `phase:12`
    - `gate:0` … `gate:5`
    - `stop-work`
- **Rationale**: Sub-issues are available on all plans and render the parent chain natively. A `Level` field avoids depending on organization-only issue types.
- **Alternatives considered**: Issue types. Org-only, so rejected for portability. A label-only hierarchy. Rejected, because it gives no parent linkage.
- **Note**: The domain label list is derived from the PRD ID prefixes in plan Part F.1 and is re-checked against PRD §-structure once `docs/source/` is populated.

## R-8. Artifact format and location

- **Decision**: All governance artifacts are **Markdown files in the repository**, at the paths in [contracts/artifact-formats.md](./contracts/artifact-formats.md). Registers are Markdown tables with fixed column headers, so that the checker script can parse them.
  - Each register row carries a stable ID (`D-01`, `RISK-PM-01`, `R-01`, `ASM-001`).
  - Status values come from closed lists ([data-model.md](./data-model.md)).
- **Rationale**: Every artifact then gets version history, PR-based approval (which is the signature) and diff review, with no extra tool. It also follows plan Part D's `docs/` layout.
- **Alternatives considered**: Spreadsheets or a GitHub wiki. Rejected, because neither is PR-reviewable, so the signature model breaks.

## R-9. Source documents (FR-003)

- **Decision**: `docs/source/` holds `01_MASTER_PRD.md` (v0.2), `03_PROJECT_MANAGEMENT_PLAN.md` (v0.2) and `PDFE_IMPLEMENTATION_PLAN.md` (moved from the root). Copied sections are quoted verbatim inside fenced blocks headed `Source: <file> §<section>`. The checker confirms that each quoted block appears byte-for-byte in the source file.
- **Rationale**: This makes "verbatim" mechanically testable (Q1).
- **Alternatives considered**: Linking instead of copying. Rejected, because FR-006 requires the charter to reproduce the sections.

## R-10. Spec Kit tooling check (FR-001, SC-010)

- **Decision**: `specify check` output is saved to `docs/evidence/phase-0/specify-check.txt`, along with `git --version`, `node --version`, `pnpm --version`, `docker --version` and `uv --version` from plan E.1.
- **Rationale**: This gives repeatable evidence for the gate record. Installing Node, pnpm and Docker now de-risks feature 001, even though Phase 0 does not use them.
- **Alternatives considered**: Only checking `specify`. Rejected, because plan E.1 lists all the prerequisites.

## R-11. Constitution ratification (FR-004, FR-005)

- **Decision**: Run `/speckit-constitution` with plan Part E.4 text verbatim. Version `1.0.0`; Ratified = date the sponsor approves the PR. The checker fails if any `[ALL_CAPS_PLACEHOLDER]` token remains in `.specify/memory/constitution.md` or if fewer than 11 roman-numbered articles are found.
- **Rationale**: The constitution is currently an unfilled template, so ratifying it is part of this feature rather than a precondition.

## R-12. ADR drafts (FR-025)

- **Decision**: Fifteen files `docs/adr/ADR-001-<slug>.md` … `ADR-015-<slug>.md`, using the plan Part J.4 template, with `Status: Proposed`. The Decision section restates the Part C.3 row. Options and Consequences are drafted from Part C.2's rationale column. `Deciders` is left `TBD at Gate 1/B`.
- **Rationale**: The ADRs are drafted now and ratified later (spec, Out of Scope). Drafting them early surfaces stack questions before Phase 2.
