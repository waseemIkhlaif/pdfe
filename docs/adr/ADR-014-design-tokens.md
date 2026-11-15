# ADR-014: Design tokens as a single source
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B   Amended: 2026-11-15 (Phase 1 planning, specs/000-ux-design-track/research.md R-2, R-3)

## Context

Web and mobile must share one visual language, in Arabic and English, without drift (R-02, R-13).

## Decision

Design tokens single source: **repository DTCG JSON → Style Dictionary → web CSS vars + RN theme; Figma imports the same JSON (Tokens Studio)**.

The tokens live in `packages/design-tokens/tokens/` and change only by pull request, so CI checks every change (contrast, reserved simulation accent, deterministic build).

(Plan §C.3 originally read "Figma → Style Dictionary → web CSS vars + RN theme". The direction is reversed because the Figma-first sync is a paid feature and bypasses pull-request review. To be ratified at Gate 1/B.)

## Options considered

- **Repository JSON to Style Dictionary, producing web CSS variables and a React Native theme, with Figma importing the same JSON**: One source of truth; every change is reviewed and checked in CI; a build step.
- **Figma-first sync (Figma pushes tokens to the repository)**: The plan's original wording; the sync is a paid feature and changes would skip pull-request review.
- **Hand-maintained styles per platform**: Flexible; drift is likely.
- **Web tokens only**: Simple; mobile diverges.

## Consequences

- Positive: one change updates every platform; token changes get the same review and evidence as other governed files.
- Negative: a token pipeline to maintain; designers change tokens through a pull request, then re-import them into Figma.
- Follow-ups: the package is created in Phase 1 (`000-ux-design-track`) as a standalone package; feature 001 adds it to the pnpm workspace without changing its commands or output paths.

## Linked requirements

R-02, R-13; PRD NFR-006; FR-021, FR-022 (`specs/000-ux-design-track`); constitution Articles IX and X.

## Verification

- `pnpm --dir packages/design-tokens verify` builds twice and requires byte-identical output (web CSS, native theme, resolved JSON).
- `pnpm --dir packages/design-tokens check` fails on any declared text or UI pair below 4.5:1 or 3:1, and on any use of the simulation accent outside the simulation group; `bash scripts/design/check-design.sh` runs it as D-10 in CI.
