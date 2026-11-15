# Contract: Phase 1 Design Artifact Formats

Every path is relative to the repository root. A table whose **header row** is given here MUST use that header row exactly, column for column, because the design checker ([design-check.md](./design-check.md)) matches it literally. Cells may not contain the `|` character; use `/` instead. Dates use `YYYY-MM-DD`. Entity meanings are defined in [../data-model.md](../data-model.md).

## 1. Layout

```text
docs/design/
├── README.md                       # index, tool notes (free-plan limits), how to contribute
├── phase-1-kickoff.md              # exists (Phase 0)
├── principles.md
├── approvals.md
├── screen-inventory.md
├── research/
│   ├── stakeholder-notes.md
│   ├── context.md
│   ├── patterns.md
│   └── test-plan.md
├── personas/PER-01-individual.md … PER-10-demo-viewer.md
├── ia/
│   ├── sitemaps/CON-sitemap.md MER-sitemap.md BIZ-sitemap.md OPS-sitemap.md CMP-sitemap.md FIN-sitemap.md INV-sitemap.md DEV-sitemap.md
│   ├── navigation-model.md
│   └── permission-matrix.md
├── flows/J1.md … J7.md
├── content/status-vocabulary.md
├── system/
│   ├── components.md
│   ├── accessibility-rules.md
│   ├── rtl-rules.md
│   └── CHANGELOG.md
├── copy-decks/phase-02.md … phase-12.md
├── usability/
│   ├── task-sheet-template.md
│   └── UR-01.md …
├── heuristics/phase-NN.md
├── packages/phase-NN/[vN/]
│   ├── manifest.md
│   ├── export/<IF>-<lang>.pdf + SHA256SUMS
│   └── baseline/{ar,en}/<screen-id>@<size>.png
└── qa/phase-12-{heuristic,a11y,rtl,copy}.md
packages/design-tokens/            # see token-pipeline.md
scripts/design/                    # see design-check.md
```

## 2. `principles.md`
There are five `## ` headings in this exact order: `Clarity over cleverness`, `Always-visible simulation status`, `Arabic-first`, `Confirm before money moves`, `Explain every number`. Under each heading are the lines `**Statement**:`, `**Applied by**:` and `**Checked by**:`.

## 3. Persona files (`personas/PER-NN-<slug>.md`)
The title line is `# PER-NN: <English name> / <Arabic name>`. Below it come these `## ` sections, in order: `Core need (PRD §3)`, `Allowed demo capabilities (PRD §3)`, `Goals`, `Pains`, `Devices`, `Languages`, `Literacy`, `Accessibility needs`, `Roles`, `Interfaces`. Every section is non-empty.

## 4. `research/test-plan.md`
It contains these `## ` sections: `Participants`, `Session formats`, `Tasks by journey`, `Measures`, `Severity scale`, `Critical issue definition`, `Privacy`. The `Critical issue definition` section restates research R-9.

## 5. `ia/permission-matrix.md`
```
| Interface | Nav item | PER-01 | PER-02 | PER-03 | PER-04 | PER-05 | PER-06 | PER-07 | PER-08 | PER-09 | PER-10 |
```
Each persona cell is `full`, `read` or `—`.

## 6. Sitemaps (`ia/sitemaps/<IF>-sitemap.md`)
The `-sitemap` suffix is required: `CON` is a reserved device name on Windows, so a file named `CON.md` cannot be added to git there.
Each file has a Mermaid `flowchart` block and this table:
```
| Nav ID | Label key | Target screen | Roles |
```
`Nav ID` uses the pattern `<IF>-NAV-NN`. Every `Target screen` value appears in `screen-inventory.md`.

## 7. Flows (`flows/J<n>.md`)
Each file has a Mermaid `flowchart` block, a `## Main path` section listing screen IDs in order, and this table:
```
| Exception ID | PRD §8 term | Trigger | Screens | Outcome | Status term |
```
- `PRD §8 term` is copied word for word from the journey's **Exceptions** list (for J4, the stated failure terms; for J6 and J7, the failure points implied by their steps, each recorded with the term `step: <step name>`).
- `Status term` is an `ST-*` ID.

## 8. `content/status-vocabulary.md`
```
| ID | English | Arabic | Meaning | Icon | Color token | Next statuses |
```
It has exactly 8 rows: `ST-DRAFT`, `ST-PENDING`, `ST-HELD`, `ST-UNDER-REVIEW`, `ST-COMPLETED`, `ST-FAILED`, `ST-REVERSED`, `ST-EXPIRED`.

## 9. `screen-inventory.md`
```
| Screen ID | Interface | Name | Phase | Journeys | PRD IDs | Sizes | Money | Skeleton | Wireframe | Hi-fi | States | Frame | Export |
```
- `Sizes` is a comma-separated list taken from `m360,m390,t768,w1280,w1440`.
- `Money` and `Skeleton` are `yes` or `no`.
- `Wireframe` is `not-started`, `done` or `retired`.
- `Hi-fi` is `not-started`, `draft`, `in-review`, `approved`, `changed` or `retired`.
- `States` is a subset of `P,E,L,X,D`.
- `Frame` is a Figma file link (host `www.figma.com`, allowlisted in `scripts/safety/allowed-hosts.txt`) or `—`.
- `Export` is a package export path or `—`.

The first version is generated from plan §J.6, with one row per listed screen.

## 10. `system/components.md`
```
| Component | Group | Variants | States | A11y | RTL | Tokens | Status | Frame |
```
`Group` is one of `foundations`, `feedback`, `data`, `navigation`, `overlays`, `domain`. `Status` is `draft` or `approved`.

## 11. Copy decks (`copy-decks/phase-NN.md`)
```
| Key | English | Arabic | Regulated | AR review | Native check | Legal | Status | Notes |
```
- `Regulated` is `yes` or `no`.
- `AR review` is `pending` or `done`.
- `Native check` is `pending`, `done` or `n/a`.
- `Legal` is `pending`, `approved` or `n/a`.
- `Status` is `draft`, `approved` or `retired`.

Text uses ICU MessageFormat. Amounts and IDs are written as placeholders (`{amount}`, `{traceId}`) and never as literal numbers. The required-review rules are in the data model.

## 12. Usability rounds (`usability/UR-NN.md`)
The file starts with these header lines: `**Scope**:`, `**Fidelity**:`, `**Format**:`, `**Dates**:`. It then has these tables:
```
| Participant | Profile |
| Participant | Task | Result |
| Participant | Thinks money is real |
| Finding ID | Screens | Description | Severity | Critical | Status | Fix ref | Verified in |
```
- `Participant` uses the pattern `P[0-9]+`.
- `Result` is `yes`, `help` or `no`.
- `Thinks money is real` is `yes` or `no`.
- `Severity` is 0–4.
- `Status` is `open`, `fixed`, `verified` or `accepted`.

## 13. Heuristic reviews (`heuristics/phase-NN.md`)
```
| Issue ID | Screen | Heuristic | Description | Severity | Status |
```
`Heuristic` is one of `N1`–`N10` (Nielsen) or one of `P1`–`P5` (the PDFE principles, in order).

## 14. `approvals.md`
```
| Artifact | Version | Approver role | Approver | Date | Solo | Export | Live link | Re-reviewed by | Re-review date |
```
- `Artifact` is a path or a `phase-NN` package ID.
- `Solo` is `yes` or `no`.
- `Export` is the package export folder, or `—` for artifacts that are not packages.
- Rows are append-only. A new approval for a new version is a new row.

## 15. Package manifest (`packages/phase-NN/[vN/]manifest.md`)
The file starts with these header lines: `**Phase**:`, `**Version**:`, `**Status**:` (`drafting`, `testing`, `ready-for-approval`, `approved` or `superseded`), `**Prototype**:`, `**Copy deck**:`, `**Testing**:` (the UR IDs and/or the heuristics file). It then has this table:
```
| Screen ID | Languages | States | Sizes | Spec frame | Baseline |
```
`Baseline` is `done` or `—`. `Sizes` lists the sizes that have PNG baselines (a subset of the screen's design sizes; research R-16). `export/SHA256SUMS` lists every PDF in `export/` in `sha256sum` format.

## 16. Phase 12 QA (`qa/phase-12-*.md`)
```
| Finding ID | Interface | Screen | Criterion | Severity | Status |
```
- `Severity` is `minor`, `moderate`, `serious` or `critical`.
- `Status` is `open`, `fixed` or `accepted`. Findings of severity `serious` or `critical` cannot be `accepted`.
