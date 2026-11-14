# Contract: Governance Artifact Formats

Phase 0 exposes no API. Its "interfaces" are the **artifact formats** that people review and that `check-phase0.sh` parses. Later phases and gate reviews depend on these formats, so changing them is a contract change and needs a PR (approved by a second reviewer in two-person mode).

Field rules and states are in [../data-model.md](../data-model.md). This file fixes **paths, headings and table headers** exactly.

## Paths

| ID | Artifact | Path | Signed? |
|---|---|---|---|
| A-01 | Constitution | `.specify/memory/constitution.md` | — (PR; sponsor-approved in two-person mode) |
| A-02 | Simulation charter | `docs/simulation-charter.md` | Yes |
| A-03 | Approved scope | `docs/governance/approved-scope.md` | Yes |
| A-04 | RACI | `docs/governance/raci.md` | — |
| A-05 | Role assignment | `docs/governance/roles-assignment.md` | — |
| A-06 | Definition of Ready | `docs/governance/definition-of-ready.md` | — |
| A-07 | Definition of Done | `docs/governance/definition-of-done.md` | — |
| A-08 | Decision register | `docs/decisions/decision-register.md` | — |
| A-09 | Risk register | `docs/risk/risk-register.md` | — |
| A-10 | Assumption log | `docs/legal/assumption-log.md` | — |
| A-11 | ADR drafts | `docs/adr/ADR-001-*.md` … `ADR-015-*.md` | — |
| A-12 | Gate 0/A review | `docs/governance/gate-0-review.md` | Yes |
| A-13 | Phase 1 kick-off | `docs/design/phase-1-kickoff.md` | — |
| A-14 | Evidence folder | `docs/evidence/phase-0/` | — |
| A-15 | Source documents | `docs/source/01_MASTER_PRD.md`, `docs/source/03_PROJECT_MANAGEMENT_PLAN.md`, `docs/source/PDFE_IMPLEMENTATION_PLAN.md` | — |
| A-16 | Solo-mode exception record (only while `SOLO_MODE=1`) | `docs/governance/solo-mode-exception.md` | Self-attested |
| A-17 | Publication-safety confirmation | `docs/evidence/phase-0/publication-check.md` | — |

## Signature block (A-02, A-03, A-12)

This block is the last section of the file:

```markdown
## Signature
Signed by: <Display Name> (@<sponsor-login>)
Signed on: YYYY-MM-DD
Proof: approval of the pull request that last changed this file (see docs/evidence/phase-0/signatures.md)
```

### Solo mode

When `SOLO_MODE=1`, each signed artifact's signature block carries one extra line, directly under `Signed on:`:

```markdown
Attestation: solo-mode self-attestation (see docs/governance/solo-mode-exception.md)
```

`Proof:` then reads `the pull request that last changed this file passed its required checks`. In the role assignment, `Checker` is the literal `solo` for every role, and `Holder` is the same login on all eight rows. Check C-14 requires the attestation line in solo mode.

## Verbatim block (A-02, A-04, and the PM risks in A-09)

```markdown
> Source: docs/source/<file>.md §<section>

<exact copied text, unchanged>

> End source
```

The checker extracts the text between the markers and requires it to be an exact substring of the named source file.

## Table headers (must match exactly, in this order)

**A-03 Approved scope**
```
| ID | Title | Status | Decision ref | Approver | Date |
```

**A-05 Role assignment**
```
| Role | Holder | Combined with | Checker | Assigned on |
```

**A-08 Decision register**
```
| ID | Question | Options | Decision | Status | Owner | Approver | Date | Rationale | Consequences | Needed by phase | Default if undecided | Review date |
```

**A-09 Risk register**
```
| ID | Description | Severity | Owner | Mitigation | Mitigated in | Status |
```

**A-10 Assumption log**
```
| ID | Assumption | Source | Validation status | Counsel reviewer | Review date |
```

**A-12 Gate review: criteria**
```
| Criterion | Result | Evidence |
```

**A-12 Gate review: actions**
```
| Action | Owner | Due |
```

## ADR file (A-11)

The file follows plan Part J.4. The first three lines must match:

```
# ADR-NNN: <Title>
Status: Proposed
Date: YYYY-MM-DD   Deciders: TBD at Gate 1/B
```

These `##` sections are required, in this order: `Context`, `Decision`, `Options considered`, `Consequences`, `Linked requirements`, `Verification`.

ADR titles (from plan C.3):

| ADR | Slug |
|---|---|
| 001 | modular-monolith |
| 002 | typescript-monorepo |
| 003 | money-minor-units |
| 004 | double-entry-ledger |
| 005 | ledger-concurrency |
| 006 | idempotency |
| 007 | txn-state-machines |
| 008 | transactional-outbox |
| 009 | adapter-registry-egress |
| 010 | identity-keycloak |
| 011 | tenant-isolation |
| 012 | audit-hash-chain |
| 013 | determinism |
| 014 | design-tokens |
| 015 | mobile-expo |
