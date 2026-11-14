# Solo-Mode Exception Record

Only one person is available for this project, so independent review cannot be provided. This record documents the exception (FR-011a).

## Rules relaxed

- Constitution Article V and plan Part A.3: maker-checker, where no one approves their own request.
- Required pull-request approval before merge (the repository ruleset requires 0 approvals and no code-owner review).
- Approval-based signatures: signed artifacts carry a dated self-attestation instead of an independent sponsor approval.
- The constitution's two-approver amendment rule is met only formally, because one person holds both roles.

## Compensating controls

- No direct pushes and no force pushes to `main`; no bypass actors.
- Every change arrives through a pull request that passes the required checks `governance-check` and `secret-scan`.
- Forbidden-content and secret scans (checks C-9 and gitleaks) run on every pull request.
- Linear history, squash merges only.
- Audit trail: pull requests, CI runs, exported ruleset and bootstrap evidence under `docs/evidence/phase-0/`.

## Accepted risk

`RISK-P0-02` in `docs/risk/risk-register.md`: no independent review; the author approves their own work. Status: accepted.

## End condition

An outside reviewer is named before Gate 1/B. Every pull request merged without independent review is then re-reviewed by that person.

## Signature
Signed by: waseemikhlaif (@waseemIkhlaif)
Signed on: 2026-11-14
Attestation: solo-mode self-attestation (see docs/governance/solo-mode-exception.md)
Proof: the pull request that last changed this file passed its required checks
