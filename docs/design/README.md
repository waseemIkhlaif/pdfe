# Design track (Phase 1)

Index of the PDFE UX/UI design artifacts. Source of truth for what each file must contain:
`specs/000-ux-design-track/contracts/artifact-formats.md` (AF). Checks: `bash scripts/design/check-design.sh`.

## The prototype (design source)

The screens are an HTML prototype in `prototype/` (research R-16): open `prototype/index.html` in a browser. Pick a screen, switch Arabic or English, the five states (populated, empty, loading, error, permission-denied), the size (360 to 1440) and hi-fi or wireframe mode in its toolbar. Screens are defined in `prototype/data-*.js`; tokens come from `packages/design-tokens`.

```bash
pnpm --dir packages/design-tokens build          # tokens
pnpm --dir scripts/design/render install         # once (uses your installed Chrome)
pnpm --dir scripts/design/render site            # inventory data and token CSS
pnpm --dir scripts/design/render verify          # every screen, both languages, all states
pnpm --dir scripts/design/render export          # PDFs, baselines, manifests, copy decks, heuristic reviews
```

Approvals and reviews are recorded by you with `node scripts/design/attest.mjs` (see its header). Usability testing with people is waived for the first build: `usability/WAIVER.md`.

## Layout

| Path | Contents |
|---|---|
| `principles.md`, `research/`, `personas/` | Stage 1: discovery and research |
| `ia/`, `flows/`, `content/` | Stage 2: sitemaps, navigation, permission matrix, journey flows, status vocabulary |
| `screen-inventory.md` | Every screen, its phase, sizes and status |
| `system/` | Stage 4: components, accessibility rules, RTL rules, changelog |
| `copy-decks/`, `usability/`, `heuristics/` | Stage 5: bilingual copy, test rounds, heuristic reviews |
| `packages/phase-NN/` | Handoff packages: manifest, frozen PDF export, baselines |
| `qa/` | Phase 12 audits |
| `approvals.md` | Append-only approval record |

Tokens live in `packages/design-tokens/` (repository is the single source, research R-2).

## Rules

- Everything is synthetic. No real names, contact details or personal data. Participants are `P1`, `P2`, …
- No URLs except allowlisted hosts (`www.figma.com` for live design frames).
- Never quote prohibited-claim terms; they live only in `scripts/safety/prohibited-claims.txt`.
- Every change goes through a pull request whose required checks pass (`governance-check`, `secret-scan`, `design-check`).
- Approving = appending a row to `approvals.md` (`Solo=yes` while one person holds every role, see
  `docs/governance/solo-mode-exception.md`; an outside reviewer re-reviews these rows later).

## Design tool limits (confirmed YYYY-MM-DD)

_Not yet confirmed. Record the Figma free-plan limits here (editable files, prototype sharing, inspect access).
If a limit blocks the work, record the switch to Penpot (research R-1)._

## How to export a package

1. Export each interface per language as PDF at 1x into `docs/design/packages/phase-NN/export/`
   (for example `CON-en.pdf`, `CON-ar.pdf`).
2. In that folder run `sha256sum *.pdf > SHA256SUMS`.
3. Export baselines as `baseline/{ar,en}/<screen-id>@<size>.png` (research R-5, R-11).
4. Fill `manifest.md` (copy `docs/design/packages/TEMPLATE/manifest.md`), then run
   `bash scripts/design/check-design.sh --gate phase-NN`.

## Changing an approved design

1. Propose the change in a pull request.
2. Create `packages/phase-NN/vN+1/` with the new export; the old version folder is never overwritten.
3. Set affected inventory screens to `Hi-fi=changed`, then `approved` after review.
4. Append a new approval row for the new version.
5. Log shared component changes in `system/CHANGELOG.md`.
6. Notify engineering by linking the PR in the affected feature's spec (FR-004, research R-15).
