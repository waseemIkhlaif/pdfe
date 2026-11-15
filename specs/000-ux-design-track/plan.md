# Implementation Plan: UX/UI Design Track (Phase 1, continuous M0 → M7)

**Branch**: `000-ux-design-track` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/000-ux-design-track/spec.md`

## Summary

Phase 1 designs every PDFE interface, from research to a production design system, and then hands engineering an approved package one phase ahead of each engineering phase (2–12). Almost all of the output is **design work plus Markdown artifacts** under `docs/design/`. Two pieces of tooling make the spec's rules mechanical rather than a matter of trust:

1. **`packages/design-tokens`**: repository-first W3C DTCG token JSON. Style Dictionary builds web CSS variables and a React Native TS theme from it. A dependency-free contrast checker enforces WCAG ratios and the reserved simulation accent. See research R-2 to R-4 and [contracts/token-pipeline.md](./contracts/token-pipeline.md).
2. **`scripts/design/check-design.sh`**: a bash checker in the Phase 0 style, added as the required status check `design-check`. It runs checks D-1 to D-16: artifact formats, exception coverage, five-state completeness, copy review trail, the personal-data guard, prohibited claims, frozen-export checksums, minimum participant counts, and the **"designs before plans" gate** (D-13). See [contracts/design-check.md](./contracts/design-check.md).

Figma is the design tool, used on the free plan. Nothing in the evidence trail depends on it: an approved design is the **frozen PDF export plus checksums** committed to the repository (clarification Q4, research R-5). Usability testing uses anonymized volunteers: at least 5 per journey round and at least 3 plus a heuristic review for packages without a journey (clarifications Q1 and Q3, research R-9). Wireframing follows the hybrid schedule: a skeleton of every interface plus J1/J2 in full up front, with the remaining screens done on a rolling basis (clarification Q5, research R-14).

## Technical Context

**Language/Version**: Markdown (GFM) with Mermaid diagrams for the artifacts; POSIX bash 5 for the checker; Node.js 22 LTS (ES modules) for the token build and contrast script. TypeScript appears only as generated output (`theme.ts`).

**Primary Dependencies**:
- Figma (free plan), with Tokens Studio (free tier) for importing tokens. Penpot is the fallback (research R-1).
- `style-dictionary` v4, pinned exactly. It is the only npm dependency, covered by ADR-014.
- pnpm 9 or newer.
- The existing Phase 0 tooling: `scripts/governance/lib.sh`, `scripts/safety/*`, gitleaks, GitHub Actions and rulesets.

**Storage**: Files in Git: `docs/design/**`, `packages/design-tokens/**` and `scripts/design/**`. Frozen exports are PDF and PNG files committed without Git LFS, with a soft limit of 10 MB per file; LFS is revisited if exports exceed 300 MB in total (research R-5).

**Testing**:
- `scripts/design/tests/run.sh`: a passing and a failing fixture for every D-check, written before each check is implemented (Article VII).
- `pnpm --dir packages/design-tokens check`: the contrast check.
- A double-build determinism diff.
- The Phase 0 `check-phase0.sh` must stay green.
- Usability rounds and heuristic reviews are the human "tests" of the design itself.

**Target Platform**: The implementer's Windows 11 workstation (Git Bash, Node) and GitHub Actions `ubuntu-latest`. The designs target mobile 360×800 and 390×844, tablet 768, and web 1280 and 1440.

**Project Type**: A design track plus tooling: documentation artifacts, a small token package and a CI checker. It contains no application code.

**Performance Goals**: The `design-check` job finishes in under 60 s in CI, including the token build. Like Phase 0, this is a convenience target, not a product SLO.

**Constraints**:
- The repository is public: no real personal data, secrets or third-party brand assets, and no external URLs except allowlisted hosts. `www.figma.com` is added to the allowlist (research R-6).
- Solo mode: every approval is a dated self-attestation with `Solo=yes`, re-reviewed when an outside reviewer is named before Gate 1/B.
- No invented dates or costs.
- No new dependency without an ADR (Article XI).
- Design must stay one phase ahead (FR-001).

**Scale/Scope**:
- About 8 interfaces, 10 personas and 7 journey flows.
- About 200 screens in plan §J.6, each in 5 states across 2–5 sizes.
- About 45 components, 11 handoff packages (phases 2–12), and roughly 15–25 usability rounds over the track.

There is no `NEEDS CLARIFICATION` left in this plan. Every unknown is resolved in [research.md](./research.md) entries R-1 to R-15.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | How this plan complies | Result |
|---|---|---|
| I. Simulation Boundary First | The track adds no runtime that talks to the network. Prototypes use synthetic data only. Crypto deposit designs use intentionally invalid QR codes. The only new allowlisted host is `www.figma.com`, used for links in documentation (research R-6). | PASS |
| II. Ledger Is the Source of Truth | Designs never compute balances. The spec for `MoneyText`/`MoneyInput` states that amounts come from the server. Review screens show server-quoted values (plan §J.5, "never computed client-side"). | PASS |
| III. Money Safety | `MoneyInput` is specified as bigint-safe with locale digits. Copy decks use `{amount}` placeholders, never literal numbers (artifact-formats §11). | PASS |
| IV. Idempotency and Explicit State | Flows use the single status vocabulary with allowed next statuses. Duplicate-submission exceptions are designed explicitly, for example J1 "duplicate submission". | PASS |
| V. Security, Tenancy, SoD | The persona/navigation matrix follows plan §J.3. `MakerCheckerPanel` shows SoD warnings. Approvals use the recorded solo-mode exception (`docs/governance/solo-mode-exception.md`). | PASS (under the existing solo exception) |
| VI. Auditability and Traceability | Screen inventory rows carry PRD IDs. Approvals are append-only rows with checksummed exports. Packages link to rounds, copy decks and baselines. | PASS |
| VII. Test-First for P0 | Each D-check is written against failing and passing fixtures first. The contrast and determinism tests run in CI. | PASS |
| VIII. Honest Representation | `SimulationBanner` is non-dismissible. D-14 requires the exact bilingual label and scans for prohibited claims. Dashboard components carry a definition/denominator/timestamp footer. PSH screens carry the placeholder disclaimer. | PASS |
| IX. Inclusive by Default | This is the core of the track: five states (D-7), WCAG contrast (D-10), RTL rules, Arabic review trail (D-12), and the Phase 12 WCAG 2.2 AA audit. | PASS |
| X. Reproducibility | The token build is pinned (lockfile, exact version) and deterministic, which is verified by a double-build diff. Fixtures are versioned. | PASS |
| XI. Simplicity | One new npm dependency (Style Dictionary), covered by **ADR-014 (Proposed)**. The token package exists before the monorepo (feature 001). See Complexity Tracking. | PASS with justification |

**Post-design re-check (after Phase 1 artifacts)**: still all PASS. Three follow-ups come out of the design work, and each must be done before Gate 1/B or before its first use:

1. **ADR-014 amendment**: the token direction becomes repository JSON → Style Dictionary → web/RN, with Figma importing; the follow-up line moves to Phase 1 (research R-2).
2. **Ruleset update**: add `design-check` to the required status checks in `scripts/governance/ruleset-main-protection*.json` and re-apply the rules, with evidence recorded as in Phase 0.
3. **Allowlist update**: add `www.figma.com` to `scripts/safety/allowed-hosts.txt` with a `# reason:` line, so that C-9 stays green.

## Project Structure

### Documentation (this feature)

```text
specs/000-ux-design-track/
├── plan.md              # This file
├── research.md          # Phase 0 output (R-1…R-15)
├── data-model.md        # Phase 1 output: entities, IDs, lifecycles
├── quickstart.md        # Phase 1 output: validation guide
├── contracts/
│   ├── artifact-formats.md   # exact layouts and table headers
│   ├── design-check.md       # D-1…D-16 checker contract
│   └── token-pipeline.md     # packages/design-tokens contract
├── checklists/requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks; not created here)
```

### Source / artifacts (repository root)

```text
docs/design/                      # all design artifacts (layout: contracts/artifact-formats.md §1)
├── README.md, principles.md, approvals.md, screen-inventory.md
├── research/  personas/  ia/  flows/  content/  system/
├── copy-decks/  usability/  heuristics/
├── packages/phase-02 … phase-12/ (manifest, export PDFs + SHA256SUMS, PNG baselines)
└── qa/                           # Phase 12 audits

packages/design-tokens/           # contracts/token-pipeline.md
├── package.json, pnpm-lock.yaml, sd.config.mjs
├── tokens/*.json, tokens/pairs.json
└── scripts/check-contrast.mjs

scripts/design/
├── check-design.sh
├── checks/d01-formats.sh … d16-gate.sh
├── j6-screens.txt  prd8-exceptions.txt  components.txt  ui-features.txt
└── tests/{run.sh, fixtures/…}

.github/workflows/governance.yml  # + job "design-check" (setup-node 22 pinned by SHA, pnpm, check-design.sh)
scripts/safety/allowed-hosts.txt  # + www.figma.com
docs/adr/ADR-014-design-tokens.md # amended (Proposed)
specs/README.md                   # mapping already records 000-ux-design-track
```

**Structure decision**: The design artifacts live in `docs/design/`, next to the other governed documents, so they share the Phase 0 controls (pull requests, required checks, the C-9 URL scan and gitleaks). The token package sits at its final monorepo path, `packages/design-tokens`, so feature 001 only needs to register it in the workspace. The checker mirrors `scripts/governance/` so there is one pattern to learn.

## Delivery sequence

The track is continuous. This order is what `/speckit-tasks` will decompose. There are no dates, because sprint sizing happens at planning (plan §G.3).

| Step | Stage | Content | Exit evidence |
|---|---|---|---|
| 0 | Tooling | Checker skeleton plus fixtures (D-1, D-11, D-14 first); `allowed-hosts` update; `design-check` CI job and ruleset; token package scaffold | CI green, fixture suite green |
| 1 | Stage 1 | Stakeholder notes, 10 personas, context report (digit default), pattern review, test plan, task sheet, principles | Approval rows; D-1/D-11 green |
| 2 | Stage 2 | 8 sitemaps, navigation model, permission matrix, J1–J7 flows with all exceptions, status vocabulary (Arabic reviewed and spot-checked) | D-4/D-5 green; approval rows |
| 3 | Stage 3 (skeleton) | Screen inventory generated from §J.6; skeleton screens for every interface; J1/J2 wireframes in five states; usability round UR-01 (J1+J2, at least 5 participants) | D-3/D-6/D-15 green; no open critical findings |
| 4 | Stage 4 | Tokens (all groups, pairs), contrast pass, component library in Figma with A11y/RTL specs, `components.md`, a11y and RTL rule pages; ADR-014 amended | D-9/D-10 green; double-build diff clean |
| 5 | Stage 5, repeated per phase (2 → 12) | Rolling wireframes for the phase, hi-fi AR/EN in 5 states, prototype, spec frames, copy deck (AR review, native spot-check, legal), test round(s) or heuristic review, export plus checksums plus baselines, manifest | `check-design.sh --gate phase-NN` exit 0, then an approval row, **before** that phase's UI feature plans (D-13) |
| 6 | Stage 6, continuous | Design review checklist (plan §J.5) in every UI pull request; baselines consumed by the visual comparison in features 001/009 | PR evidence; comparison reports |
| 7 | Stage 6 in Phase 12 | Heuristic, WCAG 2.2 AA (including manual screen-reader pass), RTL and copy audits across all interfaces → Gate 5/E checklist | `qa/phase-12-*.md` with zero open serious or critical findings |

**First deadline that matters**: steps 0–4 plus the Phase 2 package (step 5 for `phase-02`) must be approved before `/speckit-plan` runs for features 003, 004, 005, 007, 008 and 009. Features 001, 002 and 006 have no UI and may be planned in parallel.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| A Node toolchain and `style-dictionary` introduced before feature 001 (Article XI) | FR-022 and User Story 4 need tokens that build for web and mobile before Phase 2 is planned; ADR-014 already names Style Dictionary | Waiting for 001 puts design behind engineering (FR-001). A hand-written generator duplicates a tool ADR-014 already chose |
| A second required CI check (`design-check`) | The solo mode exception relies on automated checks instead of review; the "designs before plans" and personal-data rules otherwise rely on trust | Folding it into `check-phase0.sh` mixes Phase 0 gate logic with continuous design rules and makes both harder to keep |
| A direction change in ADR-014 (repository → Figma instead of Figma → repository) | Free-plan constraint, PR review of token changes, CI contrast check | The Figma-first sync is a paid feature and bypasses pull-request review |
