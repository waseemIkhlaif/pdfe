# ADR-014: Design tokens as a single source
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Web and mobile must share one visual language, in Arabic and English, without drift (R-02, R-13).

## Decision

Design tokens single source (Figma → Style Dictionary → web CSS vars + RN theme)

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **Figma to Style Dictionary, producing web CSS variables and a React Native theme**: One source of truth; a build step.
- **Hand-maintained styles per platform**: Flexible; drift is likely.
- **Web tokens only**: Simple; mobile diverges.

## Consequences

- Positive: one change updates every platform.
- Negative: a token pipeline to maintain.
- Follow-ups: the design-tokens package in feature 001 or 002.

## Linked requirements

R-02, R-13; PRD NFR-006; constitution Article IX.

## Verification

Planned in Phase 1/2: a build test that generates both outputs from one token file; a contrast check.
