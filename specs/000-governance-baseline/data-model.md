# Data Model: Governance Baseline (Phase 0)

**Feature**: `000-governance-baseline` | **Date**: 2026-11-14

Phase 0 has no database. Each entity below is a **Markdown artifact**, or a **row in a Markdown table**, stored in the repository. "Fields" are table columns or labelled lines. Validation rules are enforced by `scripts/governance/check-phase0.sh` (see [contracts/governance-check.md](./contracts/governance-check.md)) and by repository rules.

Common conventions:

- **Dates** use the format `YYYY-MM-DD`.
- **Person** is a GitHub login written as `@login`, plus the person's display name, and must appear in the Role Assignment.
- **Empty value** is written `—`. It never means "unknown"; the meaning of "unknown" is `TBD`.

---

## 1. Signed Artifact (abstract)

Applies to the **Simulation Charter**, the **Approved Scope Record** and the **Gate Review Record**.

| Field | Rule |
|---|---|
| `Signed by` | Sponsor display name and `@login`; must match the Sponsor in the Role Assignment |
| `Signed on` | Date |
| Approving PR | The last PR that changed the file has an `APPROVED` review from the sponsor's login, submitted after its last commit (two-person mode). In solo mode, instead: the file carries the line `Attestation: solo-mode self-attestation (see docs/governance/solo-mode-exception.md)`, and the last change arrived through a PR whose required checks passed |

**States**

```
Draft ──(sponsor approves PR)──▶ Signed ──(any later commit changes the file)──▶ Lapsed
  ▲                                                                                │
  └───────────────────────(PR with change approved by sponsor)─────────────────────┘
```

A Lapsed artifact counts as unsigned (FR-006a). In solo mode the transitions are the same, except that the sponsor's PR approval is replaced by a dated attestation written in the same PR (research R-5).

## 2. Constitution

`.specify/memory/constitution.md`

| Field | Rule |
|---|---|
| Articles | Exactly I–XI with the titles in plan E.4 |
| Governance clause | Must state: ADR amendment approved by the engineering lead and security lead; the constitution overrides specs and plans; `/speckit-analyze` must show no violations before implement |
| Version | Semantic version; `1.0.0` at ratification |
| Ratified / Last Amended | Date |
| Placeholders | None (no `[ALL_CAPS]` tokens) |

## 3. Simulation Charter

`docs/simulation-charter.md` (a Signed Artifact)

| Field | Rule |
|---|---|
| Boundary section | Verbatim block from PRD "Operating principle and regulatory boundary", headed `Source: docs/source/01_MASTER_PRD.md §<n>` |
| Terminology section | Verbatim block from PRD Terminology, with the same source header |
| Bilingual label | Contains "SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية" |

## 4. Approved Scope Record

`docs/governance/approved-scope.md` (a Signed Artifact)

| Column | Rule |
|---|---|
| ID | One of the 34 P0 IDs in plan Part F.1, or `J1`–`J7` |
| Title | Short title |
| Status | `approved` · `deferred` · `removed` |
| Decision ref | Required when Status ≠ `approved`; must reference a decision (FR-008) |
| Approver | The sponsor |
| Date | Date |

Validation: all 34 P0 IDs and J1–J7 are present exactly once. Any ID that is not in Part F.1 needs a decision reference.

## 5. Role Assignment

`docs/governance/roles-assignment.md`

| Column | Rule |
|---|---|
| Role | One of: Sponsor, Product owner, Engineering lead, Security lead, Finance/ledger specialist, Legal/compliance, QA lead, Design lead |
| Holder | Person |
| Combined with | Other roles held by the same person, or `—` |
| Checker | Two-person mode: the *other* team member, who must differ from Holder. Solo mode: the literal `solo` |
| Assigned on | Date |

Validation:

- 8 rows, one per role.
- Two-person mode: exactly 2 distinct holders; the Sponsor is the reviewer, not the implementer; Checker ≠ Holder on every row (FR-011, SC-006).
- Solo mode: exactly 1 distinct holder, who is both Sponsor and implementer; Checker is `solo` on every row; the solo-mode exception record (entity 16) must exist.

## 6. RACI

`docs/governance/raci.md`: a verbatim copy of PM §3, with a source header. No extra validation beyond the verbatim check.

## 7. Definition of Ready / Definition of Done

`docs/governance/definition-of-ready.md`, `docs/governance/definition-of-done.md`

Each is a checkbox list. The DoR has ≥ 10 items covering plan I.1. The DoD has ≥ 13 items covering plan I.2. Every plan item must appear as written (wording may be extended, not removed).

## 8. Decision

A row in `docs/decisions/decision-register.md`.

| Column | Rule |
|---|---|
| ID | `D-01`…`D-12` (from PRD §16); new IDs continue `D-13`… |
| Question | Text |
| Options | Text; `;`-separated |
| Decision | Text, or `—` while open |
| Status | `open` · `proposed` · `decided` · `default-accepted` · `superseded` |
| Owner | Person (required for every row) |
| Approver | Person; required when Status ∈ {decided, default-accepted}; must differ from Owner; may equal Owner in solo mode |
| Date | Date; required when Status ∈ {decided, default-accepted} |
| Rationale | Text, or `—` |
| Consequences | Text, or `—` |
| Needed by phase | From plan J.2 (for example `0`, `3`, `5–8`, `Future`) |
| Default if undecided | From plan J.2, or `—` |
| Review date | Date |

**States**

```
open → proposed → decided ──▶ superseded (by D-nn)
   └─────────────→ default-accepted
```

Validation:

- D-01…D-12 are all present.
- Every row has an Owner.
- `decided` and `default-accepted` rows have an Approver and a Date (FR-014).
- D-10 and D-12 are `decided` or `default-accepted` before Gate 0/A (FR-015).

## 9. Risk

A row in `docs/risk/risk-register.md`.

| Column | Rule |
|---|---|
| ID | `RISK-PM-nn` (from PM §10) or `R-01`…`R-20` (from plan Part B) |
| Description | Text |
| Severity | `Critical` · `High` · `Medium` · `Low` |
| Owner | Person |
| Mitigation | Text |
| Mitigated in | Phase / feature / control reference (for example `Phase 2 (006)`) |
| Status | `open` · `mitigating` · `closed` · `accepted` |

Validation: R-01…R-20 are present; every PM §10 risk is present; Owner, Severity and Mitigated in are non-empty (FR-017).

## 10. Regulatory Assumption

A row in `docs/legal/assumption-log.md`.

| Column | Rule |
|---|---|
| ID | `ASM-001`… |
| Assumption | Text |
| Source | Document and section |
| Validation status | `unvalidated` (default) · `validated` · `rejected` |
| Counsel reviewer | Required if status ≠ `unvalidated` |
| Review date | Required if status ≠ `unvalidated` |

**States**: `unvalidated → validated | rejected` (FR-018).

## 11. Repository Control Set

These live in GitHub configuration, not in Markdown. Evidence is exported to `docs/evidence/phase-0/`.

| Element | Location / evidence |
|---|---|
| Ruleset `main-protection` | `ruleset.json` (exported via `gh api`) |
| CODEOWNERS | `.github/CODEOWNERS` |
| PR template | `.github/pull_request_template.md` |
| Workflows | `.github/workflows/governance.yml` |
| Proof of rejected push | `push-rejected.txt` (terminal output) |
| Proof of blocked merge | `merge-blocked.txt` (`gh pr merge` output plus PR URL) |
| Bootstrap commit | `bootstrap.md` (SHA, date) |

Full rules are in [contracts/repository-controls.md](./contracts/repository-controls.md).

## 12. Backlog Item

A GitHub issue on the `PDFE Delivery` project.

| Field | Rule |
|---|---|
| Level | Epic · Feature Spec · User Story · Task · Test Case · Evidence |
| Parent | A sub-issue link to the item one level up (Epic has no parent) |
| Labels | Exactly one priority label (`P0`/`P1`/`P2`); ≥1 `domain:*`; ≥1 `phase:*`; `gate:*` optional |

## 13. ADR (draft)

`docs/adr/ADR-NNN-<slug>.md`, with fields per plan J.4.

| Field | Rule |
|---|---|
| Status | `Proposed` in Phase 0 |
| Date | Date |
| Deciders | `TBD at Gate 1/B` |
| Sections | Context, Decision, Options considered, Consequences, Linked requirements, Verification (all non-empty) |

**States**: `Proposed → Accepted → Superseded by ADR-XXX`. Only Gate 1/B moves an ADR to `Accepted`.

## 14. Gate Review Record

`docs/governance/gate-0-review.md` (a Signed Artifact)

| Field | Rule |
|---|---|
| Date, Attendees (person + roles) | Required |
| Criteria table | One row per Phase 0 acceptance criterion (plan H Phase 0, six items) plus SC-001…SC-010; columns: Criterion · Result (`pass`/`fail`) · Evidence link |
| Decisions | List of decision IDs taken or updated |
| Actions | Action · Owner · Due date |
| Verdict | `passed` / `not passed`; `passed` is allowed only if every Result is `pass` (FR-027) |

## 15. Phase 1 Kick-off Record

`docs/design/phase-1-kickoff.md`

| Field | Rule |
|---|---|
| Owner | Design lead from the Role Assignment |
| Started on | Date |
| Contents | Interview list and research plan outline |

## 16. Solo-mode Exception Record

`docs/governance/solo-mode-exception.md`. Required while `SOLO_MODE=1` in `scripts/governance/team.env`.

| Field | Rule |
|---|---|
| Rules relaxed | Names Article V and plan Part A.3 (maker-checker), required pull-request approval, and approval-based signatures |
| Compensating controls | Lists: no direct or force pushes, a PR with passing required checks on every change, forbidden-content and secret scans, linear history, audit trail |
| Accepted risk | References `RISK-P0-02` in the risk register |
| End condition | An outside reviewer is named before Gate 1/B; every PR merged without independent review is then re-reviewed |
| Signature | Dated self-attestation by the sole role holder |

Validation: the file exists, has the four headings above, and `RISK-P0-02` exists in the risk register (check C-17).

## Relationships

```
Constitution ──governs──▶ every spec/plan/tasks
Role Assignment ──names──▶ Owner/Approver/Checker in Decision, Risk, Signed Artifacts
Approved Scope ──changes require──▶ Decision (FR-008)
Decision D-10 ──determines──▶ journeys in Approved Scope
Risk R-01…R-20 ──mitigated by──▶ ADR drafts / later features
Solo-mode Exception ──accepted as──▶ RISK-P0-02; ends before Gate 1/B
Gate Review Record ──links evidence for──▶ every other artifact
```
