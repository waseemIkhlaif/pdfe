# Design approvals

Append-only record of approved design artifacts (specs/000-ux-design-track/contracts/artifact-formats.md section 14).

- One row per approved version. A new approval of a new version is a new row; rows are never edited or removed.
- `Solo=yes` means a dated self-attestation under `docs/governance/solo-mode-exception.md`; an outside reviewer re-reviews these rows once named (before Gate 1/B) and fills `Re-reviewed by` and `Re-review date`.
- `Export` is the committed frozen export folder for a handoff package (the record of truth), `—` for other artifacts. The live link is for convenience only.
- A package approval (`phase-NN`) must exist before `/speckit-plan` runs for that phase's UI features (check D-13).

| Artifact | Version | Approver role | Approver | Date | Solo | Export | Live link | Re-reviewed by | Re-review date |
|---|---|---|---|---|---|---|---|---|---|
| phase-02 | 1 | Design lead + Product owner + Legal/compliance | @waseemIkhlaif | 2026-11-15 | yes | docs/design/packages/phase-02/export | — | | |
