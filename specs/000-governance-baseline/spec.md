# Feature Specification: Governance Baseline — Setup, Governance & Control Baseline (Phase 0)

**Feature Branch**: `000-governance-baseline`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "read PDFE_IMPLEMENTATION_PLAN.md carefully and create a specification for Phase 0 — Setup, Governance & Control Baseline (M0 → Gate 0 / Gate A)"

**Source**: `docs/source/PDFE_IMPLEMENTATION_PLAN.md` — Part H Phase 0, with Parts B.3, C.3, D, E.1–E.4, F.1, F.3, G.2, I.1–I.3, I.6–I.7, J.2, J.4

## Overview

PDFE (Palestinian Digital Financial Ecosystem) is a **simulation-only** demonstration platform that uses synthetic data. Phase 0 builds no product code. Its job is to give the team the tools, governance artifacts, controls and approved scope it needs to build safely. Phase 0 ends when PM **Gate 0**, which is the same gate as PRD **Gate A**, is passed: requirements, P0 stories, journeys, open decisions and the simulation boundary are approved.

This feature turns Phase 0 into verifiable outcomes: who must have what, approved by whom, before any engineering phase (Phase 2 onward) may start.

## Clarifications

### Session 2026-11-14

- Q: Where will the source text for the copied Phase 0 documents come from? → A: The product owner adds the original Master PRD v0.2 and PM Plan v0.2 to `docs/source/` before Phase 0 work starts. Copied artifacts are taken from those originals, not reconstructed from the implementation plan.
- Q: How many real people will fill the Phase 0 governance roles? → A: First answer: two people (a builder plus a second person who reviews, approves and acts as sponsor). **Revised 2026-11-14:** there is only one person. The implementer holds every role, including sponsor. Solo mode applies (see the last bullet of this session).
- Q: What counts as the sponsor's signature on the charter, the scope approval and the gate verdict? → A: The sponsor's name and date are written in the artifact, and the sponsor approves the pull request that adds or changes it from their own account. The recorded PR approval is the proof of signature. **Revised 2026-11-14 (solo mode):** the sponsor and the implementer are the same person, so no separate approval exists to verify. A signature is a dated self-attestation, written in the file with an explicit solo-mode attestation line, on a change that arrived through a pull request whose required checks passed.
- Q: Will the repository be public, private on a paid plan, or private on a free account? → A: First answer: private, on a paid plan. **Revised 2026-11-14:** a paid plan is not available, so the repository is **public on a free plan**, where GitHub enforces branch protection, required reviews and code-owner rules at no cost. Everything committed is therefore publicly readable, and the sponsor and product owner confirm before the first push that it is safe to publish (FR-018b).
- Q: Working alone, how should Phase 0 handle review and the sponsor's signature? → A: Solo mode with automated controls. `main` blocks direct pushes, force pushes and deletions and requires a pull request whose required status checks pass, but no human approval is required. "Signed" means a dated self-attestation, recorded as an accepted risk. A documented solo-mode exception to Article V and plan Part A.3 records what is relaxed, what compensates, and when it ends: an outside reviewer is named before Gate 1/B. The gate criterion "an unreviewed PR cannot merge" becomes "a PR with failing required checks cannot merge".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sponsor approves the simulation boundary and scope (Priority: P1)

The sponsor reads a simulation charter. The charter states that PDFE is a demonstration system using synthetic data and that it does not authorize, enable or imply any live financial service. The charter also defines the official terminology. The sponsor signs it. The sponsor then approves the P0 requirement list and the seven demonstration journeys (J1–J7). From that point the team has a fixed, signed scope and a fixed boundary.

**Why this priority**: Gate 0/A cannot pass without a signed boundary and approved scope. Every later phase has a "no live egress" criterion that relies on this charter. This is the minimum viable outcome of Phase 0.

**Independent Test**: Open the charter and the scope approval record. Confirm that the sponsor's name and signature date are present. In two-person mode, confirm that the sponsor's own account approved the pull request that added them. In solo mode, confirm that the explicit solo-mode attestation line is present and that the file arrived through a pull request whose required checks passed. Confirm that every P0 requirement ID in the traceability matrix and every journey J1–J7 appears with an "approved" status.

**Acceptance Scenarios**:

1. **Given** the charter is drafted from the PRD's "Operating principle and regulatory boundary" and Terminology sections, **When** the sponsor reviews it, **Then** the charter reproduces those sections verbatim and records the sponsor's name and signature date.
2. **Given** the traceability matrix lists 34 P0 functional requirements and journeys J1–J7, **When** the sponsor approves scope, **Then** the approved scope list contains every one of those IDs, and none are missing or added without a recorded decision.
3. **Given** the charter is not yet signed, **When** anyone asks for Gate 0/A to be declared passed, **Then** the gate stays "not passed".

---

### User Story 2 - Engineering lead ratifies the project constitution (Priority: P1)

The engineering lead adopts the PDFE constitution. It contains eleven non-negotiable articles: Simulation Boundary First, Ledger Is the Source of Truth, Money Safety, Idempotency and Explicit State, Security/Tenancy/Separation of Duties, Auditability and Traceability, Test-First for P0, Honest Representation, Inclusive by Default, Reproducibility, and Simplicity. It also contains a governance clause: amendments need an ADR approved by both the engineering lead and the security lead, the constitution overrides any spec or plan, and consistency analysis must show no constitution violations before implementation starts. The constitution is committed so that every later specification, plan and task list is checked against it.

**Why this priority**: The constitution is the control that stops AI-generated work from bypassing tests and safety rules (risk R-18). Every later Spec Kit feature depends on it. It is currently an unfilled template.

**Independent Test**: Open the project constitution. Confirm that all 11 articles and the governance clause are present with their intended meaning, that no template placeholders remain, and that ratification is recorded.

**Acceptance Scenarios**:

1. **Given** the constitution file contains only template placeholders, **When** it is created from the plan's constitution text, **Then** it contains articles I–XI and the governance clause, with no placeholder text left.
2. **Given** the constitution is ratified, **When** someone proposes an amendment without an ADR approved by both the engineering lead and the security lead, **Then** the amendment is not accepted.

---

### User Story 3 - Implementer has a working, verified workstation and project (Priority: P1)

The implementer, who is assumed to have no prior experience, installs the required tools and initializes the project. They place the two source documents (Master PRD and Project Management Plan) in the project so that every later command can read them. They confirm that the spec-driven tooling check passes.

**Why this priority**: Nothing else in Phase 0 or later can be produced or tracked without a verified workstation and an initialized project.

**Independent Test**: On the implementer's machine, run the tooling check and confirm it reports success. Confirm the project is under version control and that both source documents are in the agreed source folder.

**Acceptance Scenarios**:

1. **Given** a fresh machine, **When** the implementer follows the prerequisite steps, **Then** the tooling check passes, with every required tool detected.
2. **Given** the project is initialized, **When** a reviewer looks at the project's source-documents folder, **Then** it contains the Master PRD and the Project Management Plan.

---

### User Story 4 - Accountable roles and quality definitions are recorded (Priority: P2)

The product owner publishes four things:

- the RACI from the PM plan
- a role-assignment record that names who holds each role (sponsor, product owner, engineering lead, security lead, finance/ledger specialist, legal/compliance, QA lead, design lead), including people who hold several roles
- the Definition of Ready
- the Definition of Done

Everyone then knows who decides, who approves and what counts as "ready" and "done".

**Why this priority**: Gate sign-off and maker-checker approval depend on named roles. Sprint planning depends on DoR/DoD. Both are needed before Gate 0/A, but they rank below boundary, scope and constitution.

**Independent Test**: Open the RACI, the role assignment, the DoR and the DoD. Confirm that every role has a named holder. Confirm that wherever one person holds several roles, a different person is recorded as approver for that person's own work or, in solo mode, every role records the solo-mode attestation and links the exception record. Confirm that the DoR and DoD contain every item listed in the plan.

**Acceptance Scenarios**:

1. **Given** the PM plan's RACI, **When** the governance record is created, **Then** each role has a named holder and the date it was assigned.
2. **Given** one person holds several roles, **When** the role assignment is reviewed, **Then** it records a different named approver for work that person authors (the maker-checker rule), or, in solo mode, records `solo` for every role together with a link to the solo-mode exception record.
3. **Given** the plan defines 10 DoR items and 13 DoD items, **When** the DoR and DoD are published, **Then** all of those items are present.

---

### User Story 5 - Decisions, risks and regulatory assumptions are under control (Priority: P2)

The product owner sets up three registers:

- **Decision register**: every open PRD decision (D-01 to D-12). Columns: ID, question, options, decision, owner, date, rationale, consequences, review date.
- **Risk register**: the PM plan's risks plus the architect's review findings R-01 to R-20.
- **Assumption log**: every regulatory assumption, flagged "unvalidated" until counsel reviews it.

Open questions can no longer be decided silently or forgotten.

**Why this priority**: Gate 0/A explicitly requires open decisions to be approved or assigned. The registers are the basis of change control and of the stop-work procedure.

**Independent Test**: Open the three registers. Confirm that D-01 to D-12 each have an owner and a status. Confirm that no decision is marked "decided" without a named approver. Confirm that R-01 to R-20 and the PM risks are present. Confirm that every regulatory assumption is marked "unvalidated" unless a counsel review is recorded.

**Acceptance Scenarios**:

1. **Given** the PRD lists decisions D-01 to D-12, **When** the decision register is created, **Then** all 12 appear with every required column, an owner and a status.
2. **Given** a decision's status is set to "decided", **When** the register is reviewed, **Then** it shows a named approver and a date. If either is missing, the entry fails review.
3. **Given** Phase 0 itself needs D-10 (journey set) and D-12 (sign-off authority), **When** Gate 0/A is reviewed, **Then** both are decided or have their documented default accepted. The defaults are "seven journeys" and "the sponsor assigns sign-off authority".
4. **Given** a regulatory assumption has no recorded counsel review, **When** the assumption log is read, **Then** it is flagged "unvalidated".

---

### User Story 6 - The code repository enforces review and ownership (Priority: P2)

The engineering lead configures protection on the main line of development:

- every change must arrive through a pull request
- in two-person mode, at least one approval must come from someone other than the author; in solo mode no human approval is required, and the required status checks are the gate
- required status checks must pass
- force-pushes are blocked

Ownership rules send changes to ledger and migration areas to the finance specialist and engineering lead, and changes to adapters and network policy to the security lead. A standard pull-request template requires PRD IDs, a spec link, accounting impact, tests, evidence and safety confirmations.

**Why this priority**: These controls make the constitution enforceable in practice rather than only on paper. They are a Phase 0 acceptance criterion. They can be verified on their own, after the project exists.

**Independent Test**: Try a direct push to the main line and confirm it is rejected. In two-person mode, open a pull request without an approving review and confirm it cannot merge, and open a pull request that changes a ledger, migration, adapter or network-policy file and confirm the correct owners are requested automatically. In solo mode, open a pull request that fails a required check and confirm it cannot merge. Confirm that a new pull request comes pre-filled with the template.

**Acceptance Scenarios**:

1. **Given** protection is configured, **When** anyone pushes directly to the main line, **Then** the push is rejected.
2. **Given** a pull request fails a required status check (or, in two-person mode, has no approval from a non-author), **When** someone tries to merge it, **Then** the merge is blocked.
3. **Given** two-person mode and a pull request that changes a ledger or migration area, **When** it is opened, **Then** the finance specialist and engineering lead are requested as required reviewers.
4. **Given** two-person mode and a pull request that changes an adapter or network-policy area, **When** it is opened, **Then** the security lead is requested as a required reviewer.
5. **Given** a new pull request is opened, **When** the description is shown, **Then** it contains the template sections, including the three safety checkboxes.

---

### User Story 7 - Backlog structure and draft architecture decisions exist (Priority: P3)

The product owner creates a backlog hierarchy: Epic (domain) → Feature Spec → User Story → Task → Test Case → Evidence. It uses a label scheme for priority (P0/P1/P2), domain, phase and gate. The engineering lead drafts ADR-001 to ADR-015, each with status "Proposed", using the standard ADR template. These ADRs are ratified later, at Gate 1/B.

**Why this priority**: Both items are Phase 0 deliverables and they speed up later phases. However, Gate 0/A can be judged without them being complete, and the ADRs are not approved until Gate 1/B.

**Independent Test**: Open the backlog and confirm that all six hierarchy levels and the four label families exist. Open the ADR folder and confirm that 15 ADRs exist, each with status "Proposed" and every template section.

**Acceptance Scenarios**:

1. **Given** the backlog is set up, **When** a reviewer creates a sample item at each level, **Then** each level can be linked to its parent, and priority, domain, phase and gate labels can be applied.
2. **Given** the ADR list in the plan, **When** the drafts are reviewed, **Then** ADR-001 to ADR-015 each exist with status "Proposed" and the sections Context, Decision, Options considered, Consequences, Linked requirements and Verification.

---

### User Story 8 - Gate 0 / Gate A review is held and recorded (Priority: P1)

The sponsor chairs a Gate 0/A review. In solo mode the sponsor is the implementer, who holds the review in all roles. Attendees include the product owner, engineering lead and security lead (the same person in solo mode). They check every Phase 0 acceptance criterion, record decisions and open actions, and declare the gate passed or not passed.

**Why this priority**: This is the formal exit of Phase 0. Phase 2 entry criteria require "Gate 0/A passed".

**Independent Test**: Open the gate review record. Confirm that it lists attendees and their roles, the result for each acceptance criterion, decisions taken, open actions with owners, and a pass/not-pass verdict signed by the sponsor.

**Acceptance Scenarios**:

1. **Given** all Phase 0 acceptance criteria are met, **When** the review is held, **Then** the record shows each criterion as "pass" with evidence, and the sponsor declares Gate 0/A passed.
2. **Given** any acceptance criterion fails, **When** the review is held, **Then** the gate is recorded as "not passed", with the failing criteria, owners and a follow-up date.

---

### Edge Cases

- **One person holds every role** (solo mode, clarified 2026-11-14). The author of a change is then its only approver, so independent review does not exist. This is allowed only under the recorded solo-mode exception (FR-011a): it is an accepted risk, the automated controls compensate, and it ends when an outside reviewer is named.
- **A second person joins later.** Solo mode is switched off, the role assignment and ownership rules name the new person, the two-person ruleset replaces the solo ruleset, and every pull request merged without independent review is listed and re-reviewed before Gate 1/B.
- **Solo mode is still in effect at Gate 1/B.** Gate 1/B cannot pass. The architecture, the ADRs and the threat model need an independent reviewer.
- **The source PRD or PM plan is not available in the project.** Artifacts that copy from it (decision register, RACI, PM risks, simulation charter) cannot be completed. They stay "draft" and the gate cannot pass.
- **A decision is marked "decided" with no approver.** It fails review, and the gate is blocked until an approver and date are recorded.
- **The sponsor wants to change the P0 list or the journey set during review.** The change is recorded as a decision (D-10 for journeys) with its rationale, and the traceability matrix is updated before approval.
- **The tooling check fails on the implementer's machine.** Phase 0 cannot exit. The failure and its fix are recorded.
- **Repository protection cannot be proven, or stops being enforced** (for example, the repository is switched to private on the free plan, which silently stops enforcing the rules, or the ruleset is disabled). The gate is blocked, and a protection lapse after the gate is a stop-work event. Convention-only workarounds are not accepted, and the lapse is recorded in the risk register until enforcement is restored and re-proven.
- **Something confidential is found in the public repository**, including in the source documents. The content is removed, the exposure is recorded in the risk register, and any exposed credential is treated as compromised and replaced. Removing it from the latest commit does not remove it from history, so history is rewritten or the repository is recreated before work continues.
- **A real URL, credential or personal data item appears in any Phase 0 artifact.** This is a stop-work trigger: the item is removed, the event is recorded in the risk register, and a security-lead review is required.
- **A signed artifact is edited after it was signed.** The signature lapses. The artifact counts as unsigned until it is re-signed: in two-person mode by the sponsor approving the pull request containing the edit, and in solo mode by updating the dated attestation in that same pull request.
- **A regulatory assumption is quoted as fact in the charter or elsewhere.** It must link to the assumption log and keep its "unvalidated" flag.

## Requirements *(mandatory)*

### Functional Requirements

**Workstation & project**

- **FR-001**: The implementer's workstation MUST pass the spec-driven tooling check, with every prerequisite tool detected.
- **FR-002**: The project MUST be under version control and initialized for spec-driven development, with the agent command set installed.
- **FR-003**: The original Master PRD v0.2 and Project Management Plan v0.2 MUST be stored in the project's source-documents folder (`docs/source/`) before any copied artifact is drafted. Every copied artifact (simulation charter, decision register, RACI, PM risks) MUST cite the source document and section it was copied from. Content reconstructed from the implementation plan is not acceptable as a substitute.

**Constitution**

- **FR-004**: The project constitution MUST contain articles I–XI exactly as stated in plan Part E.4 and the governance clause. No template placeholders may remain.
- **FR-005**: The constitution MUST record its version and ratification date, and MUST state that amendments require an ADR approved by both the engineering lead and the security lead.

**Simulation boundary & scope**

- **FR-006**: A simulation charter MUST reproduce the PRD's "Operating principle and regulatory boundary" and Terminology sections verbatim, and MUST record the sponsor's name and signature date.
- **FR-006a**: A sponsor "signature" on any Phase 0 artifact (simulation charter, approved scope record, Gate 0/A verdict) is valid only when, in two-person mode, both of these are true: (1) the sponsor's name and date are written in the artifact, and (2) the sponsor's own account has approved the pull request that adds or last changes that artifact. In solo mode a signature is valid when (1) the name and date are written in the artifact, (2) the artifact carries the line `Attestation: solo-mode self-attestation (see docs/governance/solo-mode-exception.md)`, and (3) the artifact arrived through a pull request whose required status checks passed. A signature missing any of these, or on content changed after the signature without re-signing, MUST be treated as unsigned.
- **FR-007**: An approved scope record MUST list every P0 requirement ID from the traceability matrix (Part F.1) and journeys J1–J7, each with an approval status, approver and date.
- **FR-008**: Changes to the approved P0 list or journey set MUST be recorded as decisions before approval.

**Governance roles & quality definitions**

- **FR-009**: A RACI record MUST reproduce the PM plan's RACI.
- **FR-010**: A role-assignment record MUST name a holder for each role: sponsor, product owner, engineering lead, security lead, finance/ledger specialist, legal/compliance, QA lead and design lead. Combined roles MUST be explicitly recorded.
- **FR-011**: The team is one person (solo mode, clarified 2026-11-14). The role-assignment record MUST name that person as the holder of all eight roles, including sponsor, and MUST record `solo` as the checker for each role. If a second person is named later, two-person mode applies instead: that person holds the sponsor role and is the required approver for everything the implementer authors, and the implementer MUST NOT approve, sign or merge their own work.
- **FR-011a**: While solo mode is in effect, a solo-mode exception record (`docs/governance/solo-mode-exception.md`) MUST exist. It MUST state (1) the rules relaxed: Article V and plan Part A.3 maker-checker, required pull-request approval, and approval-based signatures; (2) the compensating automated controls: no direct or force pushes, a pull request with passing required checks on every change, the forbidden-content and secret scans, linear history, and the audit trail; (3) the accepted risk, as risk-register entry `RISK-P0-02`; and (4) the end condition: an outside reviewer is named before Gate 1/B, and every pull request merged without independent review is then re-reviewed. Gate 1/B MUST NOT be passed while solo mode is still in effect.
- **FR-012**: A Definition of Ready MUST contain all 10 items from plan Part I.1, and a Definition of Done MUST contain all 13 items from plan Part I.2.

**Registers**

- **FR-013**: A decision register MUST contain D-01 to D-12 with the columns ID, question, options, decision, owner, date, rationale, consequences and review date. Each entry MUST have an owner and a status.
- **FR-014**: No decision may have status "decided" unless a named approver and a date are recorded. In solo mode the approver may be the same person as the owner, and the row records that.
- **FR-015**: Decisions D-10 (journey set) and D-12 (sign-off authority) MUST be decided, or their documented default accepted, before Gate 0/A.
- **FR-016**: The decision register MUST record, for each decision, the phase that needs it (per plan Part J.2) and the default used if it is still undecided.
- **FR-017**: A risk register MUST contain every risk from PM §10 and findings R-01 to R-20 from plan Part B. Each entry MUST have an owner, a severity, a mitigation and a link to where it is mitigated.
- **FR-018**: An assumption log MUST record every regulatory assumption, flagged "unvalidated" until a counsel review is recorded with reviewer and date.

**Repository controls**

- **FR-018a**: The repository MUST be a **public** repository on a free hosting plan, because that is the lowest-cost configuration in which the platform itself enforces branch protection, required reviews and code-owner rules (FR-019 to FR-021). It MUST NOT be switched to private while Phase 0 controls are relied on.
- **FR-018b**: Before the first push, the sponsor and the product owner MUST each confirm, in a committed evidence note (`docs/evidence/phase-0/publication-check.md`), that every file in the repository, including the source documents in `docs/source/`, is safe to publish. Anything confidential MUST stay out of the repository. The forbidden-content checks in FR-028 apply as before.
- **FR-019**: The main line of development MUST reject direct pushes and force-pushes, enforced by the platform rather than by convention.
- **FR-020**: Merging into the main line MUST require a pull request and passing required status checks. In two-person mode it MUST also require at least one approval from someone other than the author; in solo mode no human approval is required (clarified 2026-11-14).
- **FR-021**: Ownership rules MUST require finance specialist and engineering lead review for ledger and migration areas, and security lead review for adapter and network-policy areas. In solo mode these rules are recorded with the sole owner and cannot enforce independent review. They stay in place so enforcement resumes when a reviewer is named.
- **FR-022**: Every new pull request MUST be pre-filled with the standard template. The template covers summary, PRD IDs/journey, spec link, changes by layer, accounting impact, tests added, evidence, the three safety confirmations and required reviewers.
- **FR-023**: Proof of FR-019 and FR-020 MUST be captured as evidence: one rejected direct push, one rejected force push, and one blocked merge (in two-person mode an unreviewed pull request, in solo mode a pull request that fails a required check).

**Backlog & architecture drafts**

- **FR-024**: The backlog MUST support the hierarchy Epic → Feature Spec → User Story → Task → Test Case → Evidence, with labels for priority (P0/P1/P2), domain, phase and gate.
- **FR-025**: ADR-001 to ADR-015 MUST exist as drafts with status "Proposed", following the template in plan Part J.4. Their decision titles MUST match plan Part C.3.

**Gate review**

- **FR-026**: A Gate 0/A review record MUST capture date, attendees and roles, the result of each Phase 0 acceptance criterion with evidence links, decisions, open actions with owners, and a pass/not-pass verdict signed by the sponsor.
- **FR-027**: Gate 0/A MUST NOT be recorded as passed while any Phase 0 acceptance criterion is unmet.

**Safety & honesty (applies to all Phase 0 artifacts)**

- **FR-028**: No Phase 0 artifact may contain real URLs to financial or identity services, credentials, private keys, network endpoints of real blockchains, or real personal data.
- **FR-029**: Phase 0 artifacts MUST NOT present PSH, regulatory approvals, costs, dates or performance figures as decided or real. Such items stay placeholders or open decisions.
- **FR-030**: Phase 1 discovery (stakeholder interviews and research plan) MUST be started in parallel. Its kick-off MUST be recorded with an owner.

### Key Entities

- **Constitution**: The project's non-negotiable principles (11 articles plus governance). Attributes: version, ratification date, amendment rule. Overrides every spec and plan.
- **Simulation Charter**: The signed statement of the demonstration-only boundary and official terminology. Attributes: verbatim source sections, sponsor name, signature date.
- **Approved Scope Record**: The list of P0 requirement IDs and journeys J1–J7. Attributes: ID, status, approver, date.
- **Role Assignment**: Maps each governance role to a named person. Attributes: role, holder, combined-role flag, checker (a second person, or `solo`), date.
- **RACI**: Responsible/Accountable/Consulted/Informed per activity, from the PM plan.
- **Definition of Ready / Definition of Done**: Checklists that a story must satisfy to start and to finish.
- **Decision**: An entry in the decision register (D-01 to D-12). Attributes: question, options, decision, owner, approver, date, rationale, consequences, review date, needed-by phase, default.
- **Risk**: An entry in the risk register. Attributes: ID, description, severity, owner, mitigation, mitigation location, status.
- **Regulatory Assumption**: An entry in the assumption log. Attributes: statement, source, validation status (default "unvalidated"), counsel reviewer, date.
- **Repository Control Set**: Main-line protection rules, ownership rules and the pull-request template, together with evidence that they work.
- **Backlog Item**: A node in the hierarchy Epic → Feature Spec → User Story → Task → Test Case → Evidence, with labels.
- **ADR (draft)**: An architecture decision record, ADR-001 to ADR-015. Attributes: status (Proposed), date, deciders, context, decision, options, consequences, linked requirements, verification.
- **Gate Review Record**: The formal Gate 0/A outcome, with criteria results, evidence, decisions, actions and the sponsor's verdict.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Phase 0 acceptance criteria are recorded as "pass" with linked evidence in the Gate 0/A review record, and the sponsor's verdict is "passed".
- **SC-002**: 12 of 12 decisions (D-01 to D-12) have an owner and status. 0 decisions are marked "decided" without a named approver and date.
- **SC-003**: All 11 constitution articles and the governance clause are present, and 0 template placeholders remain.
- **SC-004**: 34 of 34 P0 requirement IDs in the traceability matrix and 7 of 7 journeys appear in the approved scope record with sponsor approval.
- **SC-005**: 1 of 1 direct-push attempt to the main line is rejected, 1 of 1 force-push attempt is rejected, and 1 of 1 blocked merge is demonstrated (an unreviewed pull request in two-person mode, a pull request with a failing required check in solo mode). All are captured as evidence.
- **SC-006**: 8 of 8 governance roles have a named holder. In two-person mode, 0 artifacts or PRs are approved, signed or merged solely by their own author. In solo mode, 8 of 8 roles record `solo`, 3 of 3 signed artifacts carry the attestation line, and the solo-mode exception record and risk `RISK-P0-02` exist.
- **SC-007**: 15 of 15 ADR drafts exist with status "Proposed" and all template sections present.
- **SC-008**: 0 real URLs, credentials, keys or real personal data items are found in any Phase 0 artifact when reviewed by the security lead.
- **SC-009**: A newcomer with no prior context can find the signed boundary, the approved scope, the current owner of any open decision, and who approves what, in under 10 minutes each, using only the project's documents.
- **SC-010**: The tooling check passes on the implementer's machine on the first run after the documented setup steps are followed, or any failure and its fix are recorded.

## Assumptions

- The team is one person (clarified 2026-11-14): the implementer, who uses an AI coding agent with spec-driven tooling and holds every role, including sponsor. Independent human review does not exist in this mode. It is a recorded exception to Article V, accepted as a risk and compensated by automated controls, and it ends when an outside reviewer is named (before Gate 1/B). The AI agent assists the implementer but is not an independent approver. If a second person is named at any time, the two-person rules in FR-011, FR-020 and FR-006a apply from then on.
- Gate 0 (PM) and Gate A (PRD) are the same gate, per the unified mapping in plan Part G.2.
- The hosting platform and tooling named in the plan (Git, a hosted repository with branch protection and code-owner rules, and GitHub Spec Kit) are the chosen platforms. Their specific configuration belongs in the plan stage, not in this spec.
- The product owner will add the original Master PRD (v0.2) and Project Management Plan (v0.2) to `docs/source/` before Phase 0 drafting begins. They are not in the workspace today, and artifacts that copy from them (decision register, RACI, PM risks, simulation charter) are blocked until they arrive.
- Defaults from plan Part J.2 apply to any decision not yet made: D-10 means seven journeys, and D-12 means the sponsor assigns sign-off authority.
- The constitution is created from the plan's Part E.4 text. It is currently an unfilled template.
- The feature number `000` follows the plan's suggestion (`000-governance-baseline`). This keeps `001` onward aligned with the feature index in plan Part J.11.
- Phase 0 produces documents, controls and approvals only. It includes no database, backend, frontend, mobile or design-system work. The project skeleton is built in Phase 2 (feature 001).
- No fixed dates, costs or performance figures are invented. Scheduling forecasts are produced after Phase 0, from measured velocity.
- Governance artifacts are stored in the project, in the locations named in plan Part D and Phase 0, so they are versioned and reviewable like code.
- The repository is public (clarified 2026-11-14, because no paid plan is available). The PRD, PM plan, registers and assumption log are marked as drafts and are published as such. The sponsor accepts this exposure when giving the FR-018b confirmation.

## Dependencies

- Entry criteria: the implementer is named as the holder of the sponsor, product owner, engineering lead and security lead roles (combined roles recorded). A second person is named if one is available.
- The source documents (Master PRD v0.2, PM Plan v0.2) are available to the team.
- A public repository on a free GitHub plan (a personal account or a free organization), where protected branches, required reviews and code-owner rules are enforced by the platform. The implementer's account owns the repository. A second account is added only if a reviewer is named.

## Out of Scope

- Any product code, database schema, application skeleton or CI pipeline implementation (Phase 2, feature 001 onward).
- Ratifying ADRs. They are drafted here and ratified at Gate 1/B in Phase 3.
- Phase 1 design deliverables beyond kick-off.
- Gate F (future live release). It is never in scope for this plan.
