---

description: "Task list for 000-governance-baseline (Phase 0 — Setup, Governance & Control Baseline)"
---

# Tasks: Governance Baseline (Phase 0)

**Input**: Design documents from `specs/000-governance-baseline/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (artifact-formats.md, repository-controls.md, governance-check.md), quickstart.md

**Tests**: There is no separate test suite. The checker `scripts/governance/check-phase0.sh` (checks C-1 to C-17) **is** the automated test, and each story adds its own checks before or alongside its artifacts. Repository rules are proven by tests P-1 to P-6.

**Organization**: Tasks are grouped by user story. Story phases are ordered by **dependency**, then priority: US3 → US2 → US1 → US4 → US5 → US6 → US7 → US8. US3 (workstation) is the base for everything else, and US8 (gate) needs everything else.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 to US8, matching spec.md
- **HUMAN** marks a step a person must do. The AI agent prepares everything else and stops at these steps.

## Path Conventions

- **Repository root**: `C:\dev\pdfe` after T001 (research R-1). Every path below is relative to it.
- **Placeholders**: `<owner>` is the GitHub org or user; `<implementer>` and `<sponsor>` are GitHub logins. All three are read from `scripts/governance/team.env` (created in T005), so they are never hard-coded twice.
- **PR rule**: after T024, every change goes through a PR to `main`. The PR is approved by the *other* team member; for signed artifacts, the approver is the sponsor. **Solo mode (clarified 2026-11-14):** there is no second approver. Every change still goes through a PR to `main` and may be merged by the author once the required checks pass; the solo-mode exception record explains why.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Move the project to a safe location, initialize git and the remote, and add the source documents.

- [X] T001 Move the project folder out of OneDrive to `C:\dev\pdfe`, a location OneDrive does not sync (research R-1). Close VS Code and any terminals in that folder first. Afterwards confirm that `C:\dev\pdfe\.specify\`, `C:\dev\pdfe\.claude\`, `C:\dev\pdfe\specs\000-governance-baseline\` and `C:\dev\pdfe\PDFE_IMPLEMENTATION_PLAN.md` exist, and that nothing is left in the OneDrive path.
- [X] T002 Run `git init -b main` in `C:\dev\pdfe`. Create `.gitignore` containing `.env`, `.env.*`, `*.pem`, `*.key`, `node_modules/`, `.DS_Store`, `Thumbs.db`, `*.log`.
- [X] T003 [P] Create the folders `docs/source/`, `docs/governance/`, `docs/decisions/`, `docs/risk/`, `docs/legal/`, `docs/adr/`, `docs/design/`, `docs/evidence/phase-0/`, `scripts/governance/checks/`, `scripts/safety/` and `.github/workflows/`. Put an empty `.gitkeep` in each folder that has no file yet.
- [X] T004 *(done 2026-11-14: all three source documents are in `docs/source/`)* Move `PDFE_IMPLEMENTATION_PLAN.md` from the root to `docs/source/PDFE_IMPLEMENTATION_PLAN.md`. **HUMAN (product owner)**: copy the original `01_MASTER_PRD.md` (v0.2) and `03_PROJECT_MANAGEMENT_PLAN.md` (v0.2) into `docs/source/`, unchanged (clarification Q1). If either is missing, stop: none of T030, T036, T044, T045 or T046 can start.
- [X] T005 *(progress 2026-11-14: repo `waseemIkhlaif/pdfe` created, public and empty (verified); `team.env` and `docs/evidence/phase-0/publication-check.md` written; only `git remote add origin` is left, which needs `git init` from T002)* **HUMAN (you)**: create the **public** repository `<owner>/pdfe` on a free GitHub account, per research R-2 (clarified 2026-11-14: no paid plan, so public hosting is what makes protection enforceable). Create it empty (no README, `.gitignore` or licence). **Before the first push**, the sponsor and the product owner each confirm that everything in the repository, including `docs/source/`, is safe to publish (FR-018b), and the implementer records both confirmations, with the date, in `docs/evidence/phase-0/publication-check.md`. Invite `<sponsor>` as a collaborator with Maintain (or Admin if org owner). Then create `scripts/governance/team.env` with the lines `OWNER=<owner>`, `REPO=pdfe`, `IMPLEMENTER_LOGIN=<implementer>` and `SPONSOR_LOGIN=<sponsor>`, with no secrets in it. Finally run `git remote add origin git@github.com:<owner>/pdfe.git`. **Solo mode (clarified 2026-11-14):** there is no second person, so skip the sponsor invitation. Set `SPONSOR_LOGIN` to the same login as `IMPLEMENTER_LOGIN` and add `SOLO_MODE=1` to `team.env`. The implementer records one publication confirmation covering both the sponsor and product owner roles (FR-018b).
- [X] T006 Set the repository merge options with `gh repo edit <owner>/pdfe --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false --delete-branch-on-merge`. Confirm with `gh repo view <owner>/pdfe --json visibility,squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed,deleteBranchOnMerge` that visibility is `PUBLIC`, and save the JSON output to `docs/evidence/phase-0/repo-settings.json`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the checker framework, safety scans, ownership rules, PR template and CI workflow, then make the single bootstrap commit and turn on `main` protection. **No user story work starts before T025.**

- [X] T007 Create `scripts/governance/lib.sh` per [contracts/governance-check.md](./contracts/governance-check.md). It must provide:
  - Global `GATE_MODE`, 0 or 1.
  - `pass <id> <msg>` and `fail <id> <msg>`, which print `PASS|FAIL <id> <msg>` to stdout and count failures.
  - `skip_if_absent <id> <file>`, which prints PASS "not present yet" and returns 1 in format mode, and FAILs in gate mode.
  - `table_rows <file> <header-line>`, which prints the data rows of the Markdown table whose header matches exactly, with cells trimmed and `|`-separated.
  - `is_date <s>`, which validates `YYYY-MM-DD`.
  - `load_team`, which sources `scripts/governance/team.env`.
  - Bash and coreutils/grep/awk/sed only.
- [X] T008 Create `scripts/governance/check-phase0.sh`. It should:
  - Parse the optional `--gate` flag. Any other argument prints usage and exits 2.
  - Source `lib.sh`, then every `scripts/governance/checks/c*.sh` in sorted order.
  - Call each function named `check_c<NN>` in numeric order.
  - Print `N passed, M failed` to stderr.
  - Exit 0 if there are no failures and 1 otherwise. Exit 2 if `lib.sh` is missing or a required tool (`git`, `awk`, `grep`, `sed`) is absent.
- [X] T009 [P] Create `scripts/governance/checks/c01-sources.sh`, defining `check_c01` (C-1). It requires `docs/source/01_MASTER_PRD.md` and `docs/source/03_PROJECT_MANAGEMENT_PLAN.md` to exist and be non-empty. This check runs in all modes.
- [X] T010 [P] Create `scripts/governance/checks/c03-verbatim.sh`, defining `check_c03` (C-3). It should:
  - For every tracked `*.md` outside `docs/source/`, find each block that starts with the line `> Source: docs/source/<file>.md §<section>` and ends with `> End source`.
  - Strip the marker lines, read the named source file into a variable, and FAIL unless `[[ "$src" == *"$block"* ]]`. Normalize CRLF to LF on both sides first.
  - FAIL if the named source file does not exist.
- [X] T011 [P] Create `scripts/governance/checks/c04-headers.sh`, defining `check_c04` (C-4). For each file that exists among `docs/governance/approved-scope.md`, `docs/governance/roles-assignment.md`, `docs/decisions/decision-register.md`, `docs/risk/risk-register.md`, `docs/legal/assumption-log.md` and `docs/governance/gate-0-review.md`, it requires the exact header line(s) from [contracts/artifact-formats.md §Table headers](./contracts/artifact-formats.md).
- [X] T012 [P] Create `scripts/safety/forbidden-patterns.txt`, with one extended regex per line and `#` comments allowed. It covers private-key headers, real blockchain RPC/testnet host patterns, real bank/PSP API hosts, payment-card-like numbers, and cloud/GitHub/Slack token formats (the full list is the file itself; this task list does not repeat it, because C-9 would flag the repetition). Also create `scripts/safety/allowed-hosts.txt` with `github.com`, `docs.github.com` and `www.w3.org`, one per line.
- [X] T013 Create `scripts/governance/checks/c09-forbidden.sh`, defining `check_c09` (C-9). It depends on T012. It scans `git ls-files`, excluding `docs/source/**` and `scripts/safety/**`. It FAILs on any match from `forbidden-patterns.txt`, and on any `https?://` URL whose host is not in `allowed-hosts.txt`. Output gives `file:line` for each failure.
- [X] T014 [P] Create `scripts/safety/prohibited-claims.txt` (the claim terms from plan Part I.4 and Article VIII, one per line; the file is the single list, and this task does not repeat the terms because C-16 would flag them). Create `scripts/governance/checks/c16-claims.sh`, defining `check_c16` (C-16). It does a case-insensitive whole-word search of tracked `*.md` files and skips text inside `> Source:`…`> End source` blocks. It excludes `docs/source/**`, `scripts/safety/**`, `.claude/**`, `.specify/templates/**` and `specs/000-governance-baseline/contracts/governance-check.md`, which lists the terms on purpose.
- [X] T015 Create `.github/CODEOWNERS` exactly as in [contracts/repository-controls.md §3](./contracts/repository-controls.md), with the real logins from `scripts/governance/team.env`. Keep the sponsor-only lines below the `*` line. **Solo mode (clarified 2026-11-14):** every line names only `<implementer>`.
- [X] T016 [P] Create `.github/pull_request_template.md`: the plan Part I.3 template verbatim (in `docs/source/PDFE_IMPLEMENTATION_PLAN.md`, §I.3), plus the Safety line `- [ ] If this PR changes a signed artifact, the sponsor's approval below is the re-signature`.
- [X] T017 [P] Create `.github/workflows/governance.yml`, per [contracts/repository-controls.md §5](./contracts/repository-controls.md). It should:
  - Trigger on `pull_request` and `push` to `main`, with `permissions: contents: read`.
  - Define job `governance-check`, which runs `actions/checkout` pinned to a full commit SHA, then `bash scripts/governance/check-phase0.sh`.
  - Define job `secret-scan`, which runs checkout with `fetch-depth: 0`, then `docker run --rm -v "$GITHUB_WORKSPACE:/repo" zricethezav/gitleaks:<version>@sha256:<digest> detect --source /repo --redact --exit-code 1`.
  - Pinned at implementation time: `actions/checkout` v4.2.2 by commit SHA `11bd7190…`, and gitleaks v8.30.1 by image digest `sha256:c00b6bd0…` (read from the Docker Hub tag API); the YAML was not parsed locally because no YAML tool is installed, so the first CI run is its validation.
- [X] T018 [P] Create `scripts/governance/ruleset-main-protection.json`, the body for `POST /repos/{owner}/{repo}/rulesets`. It must specify: **Solo mode (clarified 2026-11-14):** also create `scripts/governance/ruleset-main-protection-solo.json` (0 required approvals; no code-owner review, stale-approval dismissal or last-push approval; everything else identical). T023 applies it while `SOLO_MODE=1`.
  - name `main-protection`, target `branch`, enforcement `active`, `bypass_actors: []`
  - `conditions.ref_name.include: ["~DEFAULT_BRANCH"]`
  - rules `deletion`, `non_fast_forward` and `required_linear_history`
  - `pull_request` with `required_approving_review_count: 1`, `dismiss_stale_reviews_on_push: true`, `require_code_owner_review: true`, `require_last_push_approval: true` and `required_review_thread_resolution: true`
  - `required_status_checks` with contexts `governance-check` and `secret-scan`, and `strict_required_status_checks_policy: true`
- [X] T019 Run `bash scripts/governance/check-phase0.sh` locally in format mode, and fix scripts until it exits 0. If C-9 flags legitimate hosts inside `.specify/` or `.claude/` Spec Kit files, add those hosts to `scripts/safety/allowed-hosts.txt` with a `# reason` comment rather than excluding the folders.
- [X] T020 Run gitleaks locally with `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:<same pin> detect --source /repo --redact --no-git`, and confirm `no leaks found`.
- [X] T021 Make the **bootstrap commit**. Stage everything (`.specify/`, `.claude/`, `specs/`, `docs/source/`, `scripts/`, `.github/`, `.gitignore`, `.gitkeep` files) and commit it as `chore: bootstrap governance baseline (unprotected bootstrap commit)`, then run `git push -u origin main`. Write the SHA down; it is recorded in T026.
- [X] T022 Wait for the `governance-check` and `secret-scan` runs on the bootstrap push to finish green, checking with `gh run list --branch main`. Save the output to `docs/evidence/phase-0/bootstrap-ci.txt`. If either fails, fix it with a second direct commit, and record that SHA as part of the bootstrap too.
- [X] T023 Apply the ruleset with `gh api -X POST repos/<owner>/pdfe/rulesets --input scripts/governance/ruleset-main-protection.json`. Confirm with `gh api repos/<owner>/pdfe/rulesets` that `main-protection` exists with enforcement `active`. **Solo mode (clarified 2026-11-14):** apply `scripts/governance/ruleset-main-protection-solo.json`, then confirm `bypass_actors` is empty and both status checks are required.
- [X] T024 From now on, never push to `main`. Create the branch `000-governance-baseline` from `main`, and use short-lived branches named `000-<topic>` for each later PR. Add this rule and the protection-enabled time to `docs/evidence/phase-0/bootstrap.md` (which is written in T026).

**Checkpoint**: `main` is protected, CI is green, and the checker framework is in place. User story work can begin.

---

## Phase 3: User Story 3 — Implementer has a working, verified workstation and project (Priority: P1)

**Goal**: Provide recorded evidence that the tooling works and that the project and source documents are in place (FR-001 to FR-003, SC-010).

**Independent Test**: `docs/evidence/phase-0/specify-check.txt` shows every tool found. `bash scripts/governance/check-phase0.sh` reports C-1 PASS. `git log --oneline` shows the bootstrap commit.

- [X] T025 [P] [US3] Run `specify check` and save its output, followed by `git --version`, `node --version`, `pnpm --version`, `docker --version`, `uv --version` and `gh --version`, to `docs/evidence/phase-0/specify-check.txt`. If any tool is missing, install it per plan Part E.1, re-run, and add a `## Fixes` section noting what was fixed (SC-010).
- [X] T026 [P] [US3] Create `docs/evidence/phase-0/bootstrap.md`, recording the bootstrap commit SHA(s) from T021 and T022, the date, and the statement "These are the only commits pushed to `main` without a pull request; protection enabled at <date/time>" (research R-4).
- [X] T027 [US3] Open PR "Phase 0: workstation evidence" containing `docs/evidence/phase-0/specify-check.txt`, `docs/evidence/phase-0/bootstrap.md`, `docs/evidence/phase-0/repo-settings.json` and `docs/evidence/phase-0/bootstrap-ci.txt`. **HUMAN (sponsor)**: review and approve; then merge with `gh pr merge --squash`. **Solo mode (clarified 2026-11-14):** no approval step; merge your own PR once the required checks pass.

**Checkpoint**: US3 is verifiable on its own.

---

## Phase 4: User Story 2 — Engineering lead ratifies the project constitution (Priority: P1)

**Goal**: Fill `.specify/memory/constitution.md` with articles I–XI and the governance clause, version 1.0.0, approved by the sponsor (FR-004, FR-005, SC-003).

**Independent Test**: `bash scripts/governance/check-phase0.sh` reports C-2 PASS. The merged PR shows the sponsor's `APPROVED` review.

- [X] T028 [P] [US2] Create `scripts/governance/checks/c02-constitution.sh`, defining `check_c02` (C-2). In format mode it passes while the file is still the pristine template (contains `[PROJECT_NAME]`), so the bootstrap commit is not blocked; otherwise, and always in gate mode, it FAILs if `.specify/memory/constitution.md` contains any `\[[A-Z][A-Z0-9_]+\]` token, if it does not contain the eleven headings `### I.` through `### XI.` with the titles from plan Part E.4, or if it lacks a `## Governance` section with `**Version**:` and `**Ratified**:` lines that hold a valid version and date.
- [X] T029 [US2] Run `/speckit-constitution`, pasting the constitution prompt from `docs/source/PDFE_IMPLEMENTATION_PLAN.md` §E.4 verbatim. The output, `.specify/memory/constitution.md`, must have: **Solo mode (clarified 2026-11-14):** no approval step. The ratification date is the merge date, and the constitution's Governance section points to `docs/governance/solo-mode-exception.md`.
  - Project name `PDFE`.
  - Articles I–XI as `### I. Simulation Boundary First` … `### XI. Simplicity`, with their text unchanged in meaning.
  - A `## Governance` section with the amendment rule (ADR approved by the engineering lead and security lead), constitution precedence, and the `/speckit-analyze` rule.
  - `**Version**: 1.0.0 | **Ratified**: <expected approval date> | **Last Amended**: <same>`.

  Run the checker and confirm C-2 passes. Open PR "Ratify PDFE constitution v1.0.0". **HUMAN (sponsor)**: approve. If the approval falls on a different day, update the dates in the PR first; the earlier approval is dismissed, and the sponsor approves again.

**Checkpoint**: The constitution is ratified. Every later `/speckit-*` run checks against it.

---

## Phase 5: User Story 1 — Sponsor approves the simulation boundary and scope (Priority: P1) 🎯 MVP

**Goal**: A sponsor-signed simulation charter, plus an approved scope covering all 34 P0 IDs and J1–J7 (FR-006 to FR-008, SC-004).

**Independent Test**: The checker reports C-3, C-12 and C-14 PASS. `bash scripts/governance/verify-signatures.sh` prints `SIGNED` for `docs/simulation-charter.md` and `docs/governance/approved-scope.md`.

- [X] T030 [P] [US1] Create `docs/simulation-charter.md`. It must contain:
  - `# PDFE Simulation Charter`.
  - A one-paragraph purpose statement: demonstration only, synthetic data, no live financial service.
  - The bilingual label line `SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية`.
  - `## Operating principle and regulatory boundary`, holding a verbatim block (`> Source: docs/source/01_MASTER_PRD.md §<n>` … `> End source`) copied exactly from the PRD section of that name.
  - `## Terminology`, holding a verbatim block from the PRD Terminology section.
  - A closing `## Signature` block per [contracts/artifact-formats.md](./contracts/artifact-formats.md), with the sponsor's name and `@<sponsor>` and today's date.
- [X] T031 [P] [US1] Create `docs/governance/approved-scope.md` with the header `| ID | Title | Status | Decision ref | Approver | Date |`. Add one row per ID, taking titles from the PRD:
  - FR-LED-001, FR-LED-002, FR-LED-003, FR-LED-004, FR-LED-005
  - FR-TXN-001, FR-TXN-002
  - FR-ACC-001, FR-ACC-002
  - FR-SEC-001
  - FR-AUD-001
  - FR-WAL-001, FR-WAL-002
  - FR-PAY-001, FR-PAY-002
  - FR-REM-001, FR-REM-002
  - FR-STB-001, FR-STB-002, FR-STB-003
  - FR-EXC-001, FR-EXC-002
  - FR-INT-001, FR-INT-002
  - FR-CMP-001, FR-CMP-002, FR-CMP-003, FR-CMP-004
  - FR-OPS-001, FR-OPS-002
  - FR-ADM-001
  - FR-DEMO-001, FR-DEMO-002, FR-DEMO-003 (34 P0 IDs in total)
  - J1 Consumer wallet transfer · J2 Merchant payment & refund · J3 Cross-border freelancer receipt · J4 Stable-value issuance/redemption · J5 Paper trading · J6 Compliance incident · J7 Business invoicing & supplier payment

  Set every Status to `approved`, Decision ref `—`, Approver `@<sponsor>` and Date to the date of approval. Add a note that a journey change requires decision D-10 (FR-008). End the file with a `## Signature` block.
- [X] T032 [P] [US1] Create `scripts/governance/checks/c12-scope.sh`, defining `check_c12` (C-12). In gate mode it requires all 34 P0 IDs and J1–J7 listed in T031, each exactly once. In all modes it requires a non-`—` Decision ref on rows whose Status is not `approved`, and on any ID not in that list.
- [X] T033 [P] [US1] Create `scripts/governance/checks/c14-signatures.sh`, defining `check_c14` (C-14). For each file that exists among `docs/simulation-charter.md`, `docs/governance/approved-scope.md` and `docs/governance/gate-0-review.md` (all three required in gate mode), it requires a `## Signature` section with `Signed by: <name> (@login)` and a valid `Signed on:` date. The login must equal the Sponsor holder in `docs/governance/roles-assignment.md` when that file exists, and `SPONSOR_LOGIN` from `team.env` otherwise. **Solo mode (clarified 2026-11-14):** `check_c14` is updated to require the `Attestation:` line when `SOLO_MODE=1`.
- [X] T034 [P] [US1] *(written and syntax-checked; it can only be run for real once the repo, `gh` and the PRs exist)* Create `scripts/governance/verify-signatures.sh`, per [contracts/governance-check.md §verify-signatures.sh](./contracts/governance-check.md). For each signed file it: **Solo mode (clarified 2026-11-14):** `verify-signatures.sh` reports `SELF-ATTESTED` (after verifying that the last change came through a PR) when `SOLO_MODE=1`.
  1. Finds the last commit that touched the file.
  2. Calls `gh api repos/$OWNER/$REPO/commits/<sha>/pulls` to find the PR.
  3. Calls `gh api repos/$OWNER/$REPO/pulls/<n>/reviews`.
  4. Prints `SIGNED <file> PR#<n> <date>` if an `APPROVED` review by `SPONSOR_LOGIN` exists on the PR's final head commit, and `UNSIGNED/LAPSED <file>` otherwise.

  It exits 1 if any file is unsigned, and loads values from `team.env`.
- [X] T035 [US1] Run the checker and confirm C-3, C-12 and C-14 pass. Open **separate** PRs: "Simulation charter" (T030), and "Approved P0 scope and journeys" (T031, T032, T033, T034). **HUMAN (sponsor)**: read each PR fully, then approve; the approval is the signature (FR-006a). After both merge, run `bash scripts/governance/verify-signatures.sh` and confirm both files show `SIGNED`. **Solo mode (clarified 2026-11-14):** no sponsor approval. The charter and scope each carry the `Attestation:` line, and the PRs pass the required checks before you merge them.

**Checkpoint (MVP)**: The boundary and scope are signed. This is the minimum outcome that makes Gate 0/A achievable.

---

## Phase 6: User Story 4 — Accountable roles and quality definitions are recorded (Priority: P2)

**Goal**: RACI, role assignment (two people, eight roles, cross-checkers), DoR and DoD, plus the Phase 1 kick-off record (FR-009 to FR-012, FR-030, SC-006).

**Independent Test**: The checker reports C-3, C-10 and C-11 PASS in gate mode, and the PR is approved by the non-author.

- [X] T036 [P] [US4] Create `docs/governance/raci.md`: `# RACI`, followed by a verbatim block (`> Source: docs/source/03_PROJECT_MANAGEMENT_PLAN.md §3` … `> End source`) of the PM plan's RACI, copied exactly.
- [X] T037 [P] [US4] Create `docs/governance/roles-assignment.md` with the header `| Role | Holder | Combined with | Checker | Assigned on |`. **Solo mode (clarified 2026-11-14):** all eight roles go to the implementer, Checker is `solo` on every row, and `team.env` has `SOLO_MODE=1`. The suggested default split between two people does not apply.
  - Add 8 rows: Sponsor, Product owner, Engineering lead, Security lead, Finance/ledger specialist, Legal/compliance, QA lead, Design lead.
  - **HUMAN (both)**: agree the split. The Sponsor must be `<sponsor>`. A suggested default: `<sponsor>` holds Sponsor, Product owner, Legal/compliance and QA lead; `<implementer>` holds Engineering lead, Security lead, Finance/ledger specialist and Design lead.
  - The Checker on each row is the *other* person.
  - Add a note that the implementer never approves, signs or merges their own work (FR-011).
  - Add a note that if a specialist joins later, this file and `.github/CODEOWNERS` are updated through change control.
- [X] T038 [P] [US4] Create `docs/governance/definition-of-ready.md`: `# Definition of Ready`, then the 10 checkbox items from `docs/source/PDFE_IMPLEMENTATION_PLAN.md` §I.1 verbatim, as `- [ ]` lines.
- [X] T039 [P] [US4] Create `docs/governance/definition-of-done.md`: `# Definition of Done`, then the 13 checkbox items from §I.2 verbatim, as `- [ ]` lines.
- [X] T040 [P] [US4] Create `docs/design/phase-1-kickoff.md`. It should name the Design lead as owner and give a start date, a stakeholder interview list with roles only (no personal details), and a research-plan outline covering plan Phase 1, Stage 1 (FR-030).
- [X] T041 [P] [US4] Create `scripts/governance/checks/c10-roles.sh`, defining `check_c10` (C-10). In gate mode it requires 8 rows with exactly those role names and exactly 2 distinct Holders. In all modes it requires Checker ≠ Holder on every row, the Sponsor Holder to equal `@$SPONSOR_LOGIN`, and no row with Holder `@$IMPLEMENTER_LOGIN` to also have Checker `@$IMPLEMENTER_LOGIN`. **Solo mode (clarified 2026-11-14):** `check_c10` is updated for solo mode (1 distinct holder, Checker `solo`).
- [X] T042 [P] [US4] Create `scripts/governance/checks/c11-dor-dod.sh`, defining `check_c11` (C-11). In gate mode it requires at least 10 `- [ ]` items in `definition-of-ready.md` and at least 13 in `definition-of-done.md`.
- [X] T043 [US4] Run the checker in format mode and fix any failures. Open PR "Governance roles, RACI, DoR/DoD, Phase 1 kick-off". **HUMAN (sponsor)**: approve and merge. **Solo mode (clarified 2026-11-14):** no approval step; merge once the checks pass.

- [X] T074 [US4] Create `docs/governance/solo-mode-exception.md` (FR-011a) with the four headings `## Rules relaxed`, `## Compensating controls`, `## Accepted risk` and `## End condition`, written as specified in [data-model.md entity 16](./data-model.md). It must name Article V and plan Part A.3, list the compensating controls (no direct or force pushes, PR with passing required checks on every change, forbidden-content and secret scans, linear history, audit trail), reference `RISK-P0-02`, and state the end condition (outside reviewer named before Gate 1/B; every PR merged without independent review is then re-reviewed). End with a `## Signature` block that includes the `Attestation:` line. Open PR "Solo-mode exception record" and merge it once the checks pass. This task is numbered out of sequence because it was added after the list was generated; it belongs in this phase and must be done before T067.
- [X] T075 [P] [US4] Create `scripts/governance/checks/c17-solo.sh`, defining `check_c17` (C-17). When `SOLO_MODE=1` (from `team.env`) and in gate mode only, it requires `docs/governance/solo-mode-exception.md` to exist with its four headings and `RISK-P0-02` to exist in `docs/risk/risk-register.md`. In two-person mode it prints PASS "not applicable". This task is numbered out of sequence for the same reason as T074.

**Checkpoint**: Everyone knows who decides, who checks, and what "ready" and "done" mean.

---

## Phase 7: User Story 5 — Decisions, risks and regulatory assumptions are under control (Priority: P2)

**Goal**: A decision register (D-01 to D-12, with D-10 and D-12 settled), a risk register (PM §10 risks plus R-01 to R-20), and an assumption log (all entries unvalidated). Covers FR-013 to FR-018 and SC-002.

**Independent Test**: The checker reports C-4, C-5, C-6, C-7 and C-8 PASS in gate mode.

- [X] T044 [P] [US5] Create `docs/decisions/decision-register.md`, using the 13-column header from [contracts/artifact-formats.md](./contracts/artifact-formats.md).
  - Add rows D-01 to D-12. Take the Question and Options **from PRD §16** in `docs/source/01_MASTER_PRD.md`.
  - Fill `Needed by phase` and `Default if undecided` from plan §J.2: D-01 → 9 / "Synthetic issuer role"; D-02 → Future / "Out of scope (Gate F)"; D-03 → 9 / "1:1 placeholder, min coverage 100%"; D-04 → 1 / "PDFE Demo, PSH placeholder"; D-05 → 7 / "Simulated corridors USD/EUR/JOD → ILS"; D-06 → 10 / "BTC/ETH paper only"; D-07 → 5–9 / "Configurable placeholders, default fee 0"; D-08 → 2 / "Local Docker; cloud later"; D-09 → 12 / "Measure first, then decide"; D-10 → 0 / "Seven journeys"; D-11 → 3 / "Synthetic chart of accounts, accountant review"; D-12 → 0 / "Sponsor assigns sign-off authority".
  - Every row gets an Owner (a person from the role assignment) and a Review date.
  - Status is `open`, except D-10 and D-12, which are `default-accepted` (or `decided` if the sponsor chooses otherwise), with Owner `@<implementer>`, Approver `@<sponsor>` and Date, and with Rationale and Consequences filled. D-12's decision must state who signs off each gate.
  - Nothing may be marked `decided` without an Approver ≠ Owner and a Date (FR-014).
- [X] T045 [P] [US5] Create `docs/risk/risk-register.md`, using header `| ID | Description | Severity | Owner | Mitigation | Mitigated in | Status |`. **Solo mode (clarified 2026-11-14):** also add `RISK-P0-02`: "No independent review (solo mode): author approves own work", Severity High, Owner the implementer, Mitigation "automated controls; exception record; outside reviewer before Gate 1/B", Mitigated in "Gate 1/B entry criterion", Status `accepted`.
  - Start with a verbatim block of PM §10 (`> Source: docs/source/03_PROJECT_MANAGEMENT_PLAN.md §10`).
  - Then add one row per PM risk, `RISK-PM-01`…, with Mitigated in taken from plan §J.1.
  - Then rows R-01 to R-20 from plan §B.2, with Description = Finding, Severity as given, Mitigation = Resolution, Mitigated in = the phase/feature named in the resolution (for example R-05 → "Phase 3 (010), ADR-003"), Owner from the role assignment, and Status `open`.
  - Add `RISK-P0-01`: "Bootstrap commit(s) pushed to main without review" — Low, mitigated by `docs/evidence/phase-0/bootstrap.md`, status `accepted`.
- [X] T046 [P] [US5] Create `docs/legal/assumption-log.md`, using header `| ID | Assumption | Source | Validation status | Counsel reviewer | Review date |`.
  - Add `ASM-001`… for every regulatory assumption in the PRD (search §2, §3, the "Operating principle and regulatory boundary" section and §16 for statements about licensing, the regulator, the stable-value instrument, custody, KYC/AML and data protection).
  - Also add the plan's assumptions B.3 #3–#5 where they touch regulation or data.
  - Every row gets Validation status `unvalidated`, Counsel reviewer `—` and Review date `—`.
- [X] T047 [P] [US5] Create `scripts/governance/checks/c05-decisions.sh`, defining `check_c05` (C-5). It requires every decision row to have a non-`—` Owner. Rows with Status `decided` or `default-accepted` must have an Approver ≠ Owner and a Date that passes `is_date`. Status must be one of `open|proposed|decided|default-accepted|superseded`. **Solo mode (clarified 2026-11-14):** `check_c05` allows Approver = Owner when `SOLO_MODE=1`.
- [X] T048 [P] [US5] Create `scripts/governance/checks/c06-decisions-gate.sh`, defining `check_c06` (C-6). This check runs in gate mode only. It requires D-01 to D-12 all present, and D-10 and D-12 with Status `decided` or `default-accepted`.
- [X] T049 [P] [US5] Create `scripts/governance/checks/c07-risks.sh`, defining `check_c07` (C-7). This check runs in gate mode only. It requires R-01 to R-20 and at least one `RISK-PM-` row to be present, and every row to have non-empty Owner, Severity (`Critical|High|Medium|Low`) and Mitigated in.
- [X] T050 [P] [US5] Create `scripts/governance/checks/c08-assumptions.sh`, defining `check_c08` (C-8). Rows whose Validation status is not `unvalidated` must have a Counsel reviewer and a valid Review date. Status must be one of `unvalidated|validated|rejected`.
- [X] T051 [US5] Run the checker in gate mode for C-4 to C-8 and fix any failures. Open PR "Decision, risk and assumption registers" containing `docs/decisions/decision-register.md`, `docs/risk/risk-register.md`, `docs/legal/assumption-log.md` and `scripts/governance/checks/c05`–`c08` modules. **HUMAN (sponsor)**: approve. This approval is also the Approver record for D-10 and D-12. **Solo mode (clarified 2026-11-14):** no approval step; the D-10 and D-12 approver is the same person as the owner (allowed in solo mode).

**Checkpoint**: Every open question has an owner, and nothing is decided silently.

---

## Phase 8: User Story 6 — The code repository enforces review and ownership (Priority: P2)

**Goal**: Proof that `main` protection, code-owner routing and the PR template work (FR-018a to FR-023, SC-005). The configuration itself was done in T015 to T023.

**Independent Test**: The evidence files P-1 to P-6 exist under `docs/evidence/phase-0/`, and `ruleset.json` shows `"enforcement": "active"` and `"bypass_actors": []`.

- [X] T052 [US6] Export the ruleset with `gh api repos/<owner>/pdfe/rulesets/<id> > docs/evidence/phase-0/ruleset.json`, and confirm that `enforcement` is `active` and `bypass_actors` is `[]`.
- [X] T053 [US6] P-1 and P-2: on a local `main`, run `git commit --allow-empty -m "test: direct push"`, then `git push origin main 2>&1 | tee docs/evidence/phase-0/push-rejected.txt`, then `git push --force origin main 2>&1 | tee -a docs/evidence/phase-0/push-rejected.txt`. Then run `git reset --hard origin/main`. Expected: both pushes are rejected with a rule-violation error.
- [X] T054 [US6] P-3 and P-4: open a throwaway PR `000-proof-unreviewed` that changes `docs/evidence/phase-0/.gitkeep`. As the author, run `gh pr merge --squash 2>&1 | tee docs/evidence/phase-0/merge-blocked.txt` and `gh pr review --approve 2>&1 | tee -a docs/evidence/phase-0/merge-blocked.txt`. Expected: the merge is blocked and the self-approval is refused. Close the PR without merging and note its URL in the file. **Solo mode (clarified 2026-11-14):** P-3 becomes "failing check blocks merge" (contract repository-controls §6); P-4 is not applicable. Record that in `merge-blocked.txt`.
- [X] T055 [US6] P-5 and P-6: open a throwaway PR `000-proof-stale` that edits `docs/simulation-charter.md`, adding a trailing blank line. Capture the required reviewers with `gh pr view --json reviewRequests`, which should list only `<sponsor>` (P-6). **HUMAN (sponsor)**: approve. Then push one more commit and capture `gh pr view --json reviewDecision` showing `REVIEW_REQUIRED` (P-5). Save both outputs to `docs/evidence/phase-0/stale-approval.txt`, then close the PR unmerged. **Solo mode (clarified 2026-11-14):** P-5 and P-6 are not applicable in solo mode. Write `docs/evidence/phase-0/stale-approval.txt` stating "not applicable (solo mode)" instead of running them.
- [X] T056 [US6] Confirm that a new PR body is pre-filled from `.github/pull_request_template.md`, and save a screenshot or copied body to `docs/evidence/phase-0/pr-template.md`. Open PR "Repository control evidence" with T052 to T056. **HUMAN (sponsor)**: approve and merge. **Solo mode (clarified 2026-11-14):** no approval step; merge once the checks pass.

**Checkpoint**: The controls are proven by the platform, not by convention.

---

## Phase 9: User Story 7 — Backlog structure and draft architecture decisions exist (Priority: P3)

**Goal**: Backlog labels, a project board with the six-level hierarchy, and ADR-001 to ADR-015 as Proposed (FR-024, FR-025, SC-007).

**Independent Test**: The label count matches the quickstart (§6), a sample chain is visible on the board, and the checker reports C-13 PASS in gate mode.

- [X] T057 [P] [US7] Create `scripts/governance/labels.sh`, which is idempotent and uses `gh label create --force` with values loaded from `team.env`. It creates:
  - `P0`, `P1`, `P2`
  - `domain:led`, `domain:txn`, `domain:acc`, `domain:sec`, `domain:aud`, `domain:wal`, `domain:pay`, `domain:biz`, `domain:rem`, `domain:stb`, `domain:exc`, `domain:inc`, `domain:int`, `domain:cmp`, `domain:ops`, `domain:adm`, `domain:demo`
  - `phase:0` … `phase:12`
  - `gate:0` … `gate:5`
  - `stop-work` (red)

  Run it, then save `gh label list --limit 200` to `docs/evidence/phase-0/labels.txt`. Expect 40 labels.
- [X] T058 [US7] Create the project board:
  1. Run `gh project create --owner <owner> --title "PDFE Delivery"`.
  2. Link it with `gh project link <n> --owner <owner> --repo <owner>/pdfe`.
  3. Add the single-select field `Level` with options Epic, Feature Spec, User Story, Task, Test Case, Evidence, using `gh project field-create`.
  4. Create a sample chain of six issues, each a sub-issue of the one before (`gh api -X POST repos/<owner>/pdfe/issues/<parent>/sub_issues -F sub_issue_id=<child id>`):
     - "Epic: Platform foundation" (`domain:sec`, `phase:2`, `P0`)
     - "Feature Spec: 000-governance-baseline"
     - "User Story: US1 sign boundary & scope"
     - "Task: T030 simulation charter"
     - "Test Case: C-14 signature check"
     - "Evidence: signatures.md"
  5. Set each issue's `Level` field.

  Record the project URL and issue numbers in `docs/evidence/phase-0/backlog.md`.
- [X] T059 [P] [US7] Create `docs/adr/ADR-001-modular-monolith.md`, `docs/adr/ADR-002-typescript-monorepo.md` and `docs/adr/ADR-003-money-minor-units.md`.
- [X] T060 [P] [US7] Create `docs/adr/ADR-004-double-entry-ledger.md`, `docs/adr/ADR-005-ledger-concurrency.md` and `docs/adr/ADR-006-idempotency.md`.
- [X] T061 [P] [US7] Create `docs/adr/ADR-007-txn-state-machines.md`, `docs/adr/ADR-008-transactional-outbox.md` and `docs/adr/ADR-009-adapter-registry-egress.md`.
- [X] T062 [P] [US7] Create `docs/adr/ADR-010-identity-keycloak.md`, `docs/adr/ADR-011-tenant-isolation.md` and `docs/adr/ADR-012-audit-hash-chain.md`.
- [X] T063 [P] [US7] Create `docs/adr/ADR-013-determinism.md`, `docs/adr/ADR-014-design-tokens.md` and `docs/adr/ADR-015-mobile-expo.md`.
- [X] T064 [P] [US7] Create `scripts/governance/checks/c13-adrs.sh`, defining `check_c13` (C-13). In gate mode it requires exactly 15 files matching `docs/adr/ADR-0[01][0-9]-*.md`, numbered 001 to 015. In all modes, each existing ADR file must have line 2 `Status: (Proposed|Accepted|Superseded by ADR-[0-9]{3})` and the six `##` sections in contract order, each non-empty.
- [X] T065 [US7] Run the checker in gate mode for C-13. Open PR "Backlog labels, project evidence, ADR drafts" containing `scripts/governance/labels.sh`, `docs/evidence/phase-0/labels.txt`, `docs/evidence/phase-0/backlog.md`, `docs/adr/ADR-001`…`ADR-015` and `scripts/governance/checks/c13-adrs.sh`. **HUMAN (sponsor)**: approve and merge. **Solo mode (clarified 2026-11-14):** no approval step; merge once the checks pass.

The ADR tasks T059 to T063 each follow the plan Part J.4 template, using the header from [contracts/artifact-formats.md §ADR file](./contracts/artifact-formats.md) with `Status: Proposed` and `Deciders: TBD at Gate 1/B`. Fill the sections as follows:

- **Context**: the problem, drawn from plan Parts B and C.
- **Decision**: the matching row of plan §C.3, verbatim.
- **Options considered**: at least two alternatives, with pros and cons.
- **Consequences**: positive, negative and follow-ups.
- **Linked requirements**: PRD IDs and B.2 finding IDs.
- **Verification**: the planned tests named in plan Part F and Phase 3.

**Checkpoint**: The backlog is ready for sizing, and ADRs are ready for Gate 1/B review.

---

## Phase 10: User Story 8 — Gate 0 / Gate A review is held and recorded (Priority: P1)

**Goal**: A signed Gate 0/A review record with a verdict backed by evidence (FR-026, FR-027, SC-001).

**Independent Test**: `bash scripts/governance/check-phase0.sh --gate` exits 0. `verify-signatures.sh` shows `SIGNED` for all three signed artifacts. `docs/governance/gate-0-review.md` states the verdict `passed`.

**Depends on**: Phases 3 to 9 complete.

- [X] T066 [P] [US8] Create `scripts/governance/checks/c15-gate.sh`, defining `check_c15` (C-15). If `docs/governance/gate-0-review.md` exists, every row of the `| Criterion | Result | Evidence |` table must have a Result of `pass` or `fail` and a non-empty Evidence value. The line `Verdict: passed` is allowed only when every Result is `pass`; otherwise the check FAILs. In gate mode the file is required.
- [X] T067 [US8] Run `bash scripts/governance/check-phase0.sh --gate 2>&1 | tee docs/evidence/phase-0/check-gate.txt` and `bash scripts/governance/verify-signatures.sh | tee docs/evidence/phase-0/signatures.md`, where the charter and scope must show SIGNED. Run gitleaks over the full history, as in T020 but without `--no-git`, saving to `docs/evidence/phase-0/secret-scan.txt`. Fix any failures through normal PRs before going further.
- [X] T068 [US8] Create `docs/governance/gate-0-review.md` with: **Solo mode (clarified 2026-11-14):** attendees are the implementer in all roles. Include a criterion row "solo-mode exception recorded (FR-011a)".
  - `# Gate 0 / Gate A Review`, Date, and Attendees (person and roles, from the role assignment).
  - A criteria table `| Criterion | Result | Evidence |` with one row for each of the six Phase 0 acceptance criteria in `docs/source/PDFE_IMPLEMENTATION_PLAN.md` §Phase 0 (specify check; constitution with 11 articles; D-01 to D-12 owners and approvers; charter signed; branch protection proven; P0 and J1–J7 approved), plus rows SC-001 to SC-010 from spec.md. Each Evidence cell is a relative link to a file under `docs/evidence/phase-0/` or to the artifact.
  - `## Decisions`: the D-IDs taken or updated.
  - `## Actions`, with `| Action | Owner | Due |`.
  - `Verdict: passed` or `Verdict: not passed`.
  - A `## Signature` block.
- [ ] T069 [US8] **HUMAN (sponsor + implementer)**: hold the Gate 0/A review meeting. Walk through every criteria row, update Results and Actions in the PR as agreed, and set the Verdict. Open PR "Gate 0/A review record". **HUMAN (sponsor)**: approve; this approval is the gate signature. After it merges, re-run `bash scripts/governance/verify-signatures.sh | tee docs/evidence/phase-0/signatures.md`, which should show SIGNED for all three files, and commit it in a final PR "Gate 0/A signature evidence", approved by the sponsor. **Solo mode (clarified 2026-11-14):** the meeting is the implementer's own review. The verdict is a self-attestation; there is no sponsor approval to wait for.

**Checkpoint**: **Gate 0 / Gate A passed.** Phase 2 (feature 001) may start.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T070 [P] Create `specs/README.md`, a feature-number map. It should note that `000-governance-baseline` is Phase 0, and that later Spec Kit numbers follow plan §J.11. Any mismatch between the auto-assigned number and J.11 is recorded here.
- [ ] T071 [P] Update `specs/000-governance-baseline/spec.md`, changing `**Status**: Draft` to `**Status**: Accepted (Gate 0/A passed <date>)`.
- [X] T072 [P] Open backlog issue "Port governance checker to monorepo tooling" (labels `phase:2`, `P1`), referencing feature 001, so that C-1 to C-17 move into the TypeScript CI stage (plan §I.4, *safety* stage) without being lost. Add the issue number to `docs/evidence/phase-0/backlog.md`.
- [ ] T073 Run every step of [quickstart.md](./quickstart.md) from §1 to §8 on a clean clone in a different folder (`git clone … C:\dev\pdfe-verify`), and confirm that each expected result holds. Record the outcome in `docs/evidence/phase-0/quickstart-run.md` and merge it through a PR approved by the sponsor.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T004 and T005 are blocking HUMAN steps.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all stories. T021 → T022 → T023 must run in that order (the bootstrap order in research R-4).
- **US3 (Phase 3)**: After Foundational. It is the first PR through the protected `main`.
- **US2, US1, US4, US5, US7**: After Foundational. They are independent of each other and can run in parallel as separate PRs.
- **US6 (Phase 8)**: After Foundational. T055 needs `docs/simulation-charter.md` (T030, US1) to exist on `main`.
- **US8 (Phase 10)**: After all of US1 to US7.
- **Polish**: After US8. T072 can happen any time after T058.

### User Story Dependencies

| Story | Depends on | Notes |
|---|---|---|
| US3 | Foundational | — |
| US2 | Foundational | — |
| US1 | Foundational | C-14 uses `team.env` until US4's role file exists |
| US4 | Foundational | — |
| US5 | Foundational | Owners refer to people in the role assignment; `team.env` logins are enough to draft |
| US6 | Foundational, plus T030 merged | for proof P-6 |
| US7 | Foundational | — |
| US8 | US1 to US7 | gate |

### Within Each Story

- Write the story's checker module(s) first, or in the same PR as the artifacts. Run the checker before opening the PR.
- Every story ends with a PR approved by the non-author. Signed artifacts are approved by the sponsor.

### Parallel Opportunities

- **Phase 2**: T009, T010, T011, T012, T014, T016, T017 and T018 are separate files. T013 waits for T012, and T019 waits for all of them.
- **US1**: T030 to T034 can all run in parallel.
- **US4**: T036 to T042 can all run in parallel.
- **US5**: T044 to T050 can all run in parallel.
- **US7**: T057 and T059 to T064 can run in parallel.
- **Across stories**: US2, US1, US4, US5 and US7 can all be in review at the same time as separate PRs. The only limit is how fast the sponsor reviews.

---

## Parallel Example: User Story 5

```bash
Task: "Create docs/decisions/decision-register.md (T044)"
Task: "Create docs/risk/risk-register.md (T045)"
Task: "Create docs/legal/assumption-log.md (T046)"
Task: "Create scripts/governance/checks/c05-decisions.sh (T047)"
Task: "Create scripts/governance/checks/c06-decisions-gate.sh (T048)"
Task: "Create scripts/governance/checks/c07-risks.sh (T049)"
Task: "Create scripts/governance/checks/c08-assumptions.sh (T050)"
```

## Parallel Example: User Story 7 (ADR drafts)

```bash
Task: "ADR-001..003 (T059)"
Task: "ADR-004..006 (T060)"
Task: "ADR-007..009 (T061)"
Task: "ADR-010..012 (T062)"
Task: "ADR-013..015 (T063)"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup, then Phase 2 Foundational, so that `main` is protected.
2. US3 (evidence), then US2 (constitution), then **US1 (signed boundary and scope)**.
3. **STOP and VALIDATE**: `verify-signatures.sh` shows SIGNED for the charter and scope. The project now has a fixed, signed boundary and scope, which is the core of Gate 0/A.

### Incremental Delivery

1. Add US4 (roles), then US5 (registers), then US6 (control proofs), then US7 (backlog and ADRs). Each is its own PR, each is verifiable on its own, and each passes the format-mode checker.
2. Run US8 last: the gate-mode checker, signatures, the meeting and the signed verdict.
3. Polish: the clean-clone quickstart run.

### Two-person working rhythm

- **Implementer, with the AI agent**: prepares every artifact, script and PR.
- **Sponsor**: reviews and approves, which is the checker role and the signature.
- **Rhythm**: batch sponsor reviews, for example one review session for the US1, US2 and US4 PRs together.

---

## Notes

- Never push directly to `main` after T023. If you ever need to, that is a stop-work event under plan §I.6.
- Never weaken a check to make a PR pass (Article VII). Fix the artifact, or change the contract through a PR approved by both people.
- If a source document lacks a section that a verbatim block needs, do not paraphrase. Record the gap as a Gate action and keep the artifact in draft.
- Total: 73 tasks. HUMAN steps: T004, T005, T027, T029, T035, T037, T043, T051, T055, T056, T065 and T069 (sponsor approvals and the meeting).
