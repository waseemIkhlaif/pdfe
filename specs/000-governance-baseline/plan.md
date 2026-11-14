# Implementation Plan: Governance Baseline (Phase 0)

**Branch**: `000-governance-baseline` | **Date**: 2026-11-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/000-governance-baseline/spec.md`

## Summary

Phase 0 delivers no product code. It sets up a **public, platform-protected GitHub repository** (free plan) for a one-person team (solo mode, clarified 2026-11-14):

- A ratified **constitution**.
- A **sponsor-signed simulation charter and scope** (a dated self-attestation in solo mode).
- **Registers** for decisions, risks and regulatory assumptions.
- Role and quality definitions.
- **15 draft ADRs**.
- A backlog board.
- A **Gate 0/A review record**.

All of these are Markdown files in the repository. Each signature is the sponsor's own approval of the pull request that adds the file, which comes from clarification Q3. Repository rules make the two-person maker-checker rule impossible to bypass, which comes from clarifications Q2 and Q4. A lightweight bash checker runs as a required CI status check and validates artifact formats, completeness and forbidden content. Its contract is in [contracts/governance-check.md](./contracts/governance-check.md).

**Solo mode:** because only one person is available, independent review is replaced by a recorded exception (FR-011a). Repository rules still block direct and force pushes and require every change to arrive through a pull request with passing checks, but they cannot require a human approval. The checker accepts either mode, switched by `SOLO_MODE` in `scripts/governance/team.env`.

## Technical Context

**Language/Version**: Markdown (GFM) for artifacts; POSIX `bash` 5 for the checker and helper scripts. No application language is used in Phase 0; TypeScript starts in feature 001.

**Primary Dependencies**:

- Git
- GitHub (public repo on the free plan) with rulesets, CODEOWNERS, Actions and Projects v2
- `gh` CLI
- Spec Kit (`specify` CLI 1.0.x)
- gitleaks, run as a pinned container in CI

**Storage**: Files in the Git repository (`docs/**`, `.specify/memory/`, `.github/`). Repository settings are on GitHub and exported as JSON evidence.

**Testing**:

- `scripts/governance/check-phase0.sh` (checks C-1 to C-17)
- Proof tests P-1 to P-6 for repository rules
- `verify-signatures.sh`
- gitleaks

**Target Platform**: The implementer's Windows 11 workstation (Git Bash) and GitHub Actions `ubuntu-latest`.

**Project Type**: Governance/documentation baseline. A repository scaffold only, with no apps.

**Performance Goals**: Not applicable. The checker should finish in under 30 s on CI so that it does not slow PRs.

**Constraints**:

- The repository is public, so nothing confidential, no secrets and no personal data may ever be committed (FR-018b, FR-028); the sponsor and product owner confirm this before the first push.
- No real URLs, credentials or personal data.
- No invented dates, costs or SLOs.
- No new runtime dependency without an ADR (Article XI).
- Bypass of `main` protection: none.

**Scale/Scope**: About 30 Markdown artifacts, 15 ADRs, 40 labels, 1 project board, 1 ruleset and 2 people.

All unknowns have been resolved in [research.md](./research.md), entries R-1 to R-12.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still an **unfilled template**. Ratifying it is part of this feature (FR-004). The check below therefore uses the **intended articles from plan Part E.4** as the governing text.

| Article | Relevance to Phase 0 | Status |
|---|---|---|
| I. Simulation Boundary First | The charter states the boundary. The C-9 forbidden-pattern scan and gitleaks block real URLs, keys and endpoints from day one | ✅ Pass |
| II. Ledger Is Source of Truth | No ledger in Phase 0. ADR-004 is drafted | ✅ N/A |
| III. Money Safety | No money code. ADR-003 is drafted | ✅ N/A |
| IV. Idempotency & Explicit State | Artifact states (Draft → Signed → Lapsed, and the Decision states) are explicit and checker-enforced | ✅ Pass |
| V. Security, Tenancy, SoD | **Justified exception (solo mode).** Maker-checker and "no one approves their own request" cannot be met by one person. Mitigated by automated controls (no direct or force pushes, required checks, scans, audit trail), recorded as accepted risk `RISK-P0-02` and the exception record (FR-011a). Ends before Gate 1/B | ⚠ Exception |
| VI. Auditability & Traceability | Every artifact change is a reviewed PR; evidence is exported; registers carry owner, approver and date | ✅ Pass |
| VII. Test-First for P0 | The checker contract (C-1 to C-17) and proof tests are defined before the artifacts are written | ✅ Pass |
| VIII. Honest Representation | The charter carries the bilingual label; C-16 lints prohibited claims; PSH and figures stay placeholders (FR-029) | ✅ Pass |
| IX. Inclusive by Default | The charter label is bilingual. UI work is out of scope | ✅ N/A |
| X. Reproducibility | Labels script and checker are idempotent; evidence commands are in the quickstart | ✅ Pass |
| XI. Simplicity | Only bash and grep, plus gitleaks, which is already in the plan's stack. No Node toolchain until 001 | ✅ Pass |
| Governance clause | Amendments need ADR approval by the engineering lead and security lead. In solo mode both roles are held by the same person, so the clause is satisfied formally but not independently; covered by the same exception | ⚠ Exception |

**Result: PASS with one justified exception** (Article V in solo mode, see Complexity Tracking). One sequencing note: the very first commit (bootstrap) is unavoidably unprotected. It is recorded as a disclosed exception, not a violation (research R-4).

**Post-design re-check (after Phase 1 artifacts)**: PASS. The data model, contracts and quickstart add no services or dependencies beyond those listed. Every FR from FR-001 to FR-030 maps to a contract check, a proof test or a manual gate item (see the traceability table below).

## Project Structure

### Documentation (this feature)

```text
specs/000-governance-baseline/
├── spec.md
├── plan.md              # this file
├── research.md          # R-1 … R-12
├── data-model.md        # artifact entities, fields, states
├── quickstart.md        # validation guide
├── contracts/
│   ├── artifact-formats.md     # paths, headers, signature and verbatim blocks
│   ├── repository-controls.md  # ruleset, CODEOWNERS, PR template, workflow, proof tests
│   └── governance-check.md     # checker interface and checks C-1 … C-17
├── checklists/requirements.md
└── tasks.md             # produced by /speckit-tasks
```

### Repository layout created by this feature (repository root = `C:\dev\pdfe`)

```text
pdfe/
├── .specify/memory/constitution.md          # ratified (A-01)
├── .claude/                                 # Spec Kit agent skills (existing)
├── .github/
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   └── workflows/governance.yml             # governance-check, secret-scan
├── scripts/
│   ├── governance/
│   │   ├── check-phase0.sh
│   │   ├── verify-signatures.sh
│   │   └── labels.sh
│   └── safety/
│       ├── forbidden-patterns.txt
│       └── allowed-hosts.txt
├── docs/
│   ├── source/            # 01_MASTER_PRD.md, 03_PROJECT_MANAGEMENT_PLAN.md, PDFE_IMPLEMENTATION_PLAN.md
│   ├── simulation-charter.md
│   ├── governance/        # approved-scope, raci, roles-assignment, solo-mode-exception, definition-of-ready, definition-of-done, gate-0-review
│   ├── decisions/decision-register.md
│   ├── risk/risk-register.md
│   ├── legal/assumption-log.md
│   ├── adr/               # ADR-001 … ADR-015 (Proposed)
│   ├── design/phase-1-kickoff.md
│   └── evidence/phase-0/  # specify-check, ruleset.json, push-rejected, merge-blocked, signatures, bootstrap
└── specs/000-governance-baseline/
```

**Structure Decision**: This follows plan Part D, limited to the folders Phase 0 needs. `apps/`, `packages/`, `db/` and `infra/` are **not** created; that is feature 001. Their CODEOWNERS lines are added now so that protection exists before the paths do.

## Delivery sequence

These are inputs for `/speckit-tasks`. Steps 1 to 3 are strictly ordered; the rest can run in parallel after step 3.

1. **Bootstrap.** Do the following, in order:
   1. Move the folder out of OneDrive.
   2. Run `git init`.
   3. Add the source documents to `docs/source/`.
   4. Add the scripts, the workflow, CODEOWNERS and the PR template.
   5. Push the single bootstrap commit and record its SHA.
2. **Protect.** Create the ruleset, confirm that both status checks have reported, and run proof tests P-1 to P-6. From this point every change is a PR.
3. **Constitution.** Run `/speckit-constitution` with the E.4 text. The PR is approved by the sponsor. In solo mode the ratification date is the date the implementer merges the PR, and the constitution's Governance section points to the solo-mode exception record.
4. **Copied artifacts.** These are verbatim from `docs/source/`: the charter, the RACI and the PM risks.
5. **Registers.** Decision register (D-01 to D-12 with J.2 defaults), risk register (adding R-01 to R-20) and assumption log.
6. **Roles and quality.** Role assignment, DoR and DoD.
7. **Backlog.** Run `labels.sh`, create the project board and a sample hierarchy chain.
8. **ADRs.** Drafts ADR-001 to ADR-015.
9. **Phase 1 kick-off record.**
10. **Scope and sign-off.** The approved-scope PR is approved by the sponsor, and the D-10 and D-12 decisions are recorded.
11. **Gate 0/A.** Run `check-phase0.sh --gate` and `verify-signatures.sh`. Write the gate review, which the sponsor approves.

## Requirement traceability

| FR | Verified by |
|---|---|
| FR-001, FR-002 | Quickstart §1; bootstrap evidence |
| FR-003 | C-1, C-3 |
| FR-004, FR-005 | C-2 |
| FR-006, FR-006a | C-3, C-14, `verify-signatures.sh` |
| FR-007, FR-008 | C-12 |
| FR-009 | C-3 |
| FR-010, FR-011, FR-011a | C-10, C-17; CODEOWNERS (and P-4 in two-person mode) |
| FR-012 | C-11 |
| FR-013 to FR-016 | C-4, C-5, C-6 |
| FR-017 | C-4, C-7 |
| FR-018 | C-4, C-8 |
| FR-018a | `ruleset.json`; repository settings |
| FR-019 to FR-023 | P-1 to P-6; `ruleset.json`; PR template present |
| FR-024 | Quickstart §6 |
| FR-025 | C-13 |
| FR-026, FR-027 | C-15; gate review record |
| FR-028 | C-9; `secret-scan` |
| FR-029 | C-16; manual review in the gate |
| FR-030 | A-13 kick-off record (manual) |

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|-----------|------------|-------------------------------------|
| Article V maker-checker not met (solo mode) | Only one person is available (clarified 2026-11-14) | Requiring a second approver would make every change unmergeable; a named outside reviewer is not yet available. Compensated by automated controls, accepted risk `RISK-P0-02`, and a hard end condition: an outside reviewer is named before Gate 1/B |
