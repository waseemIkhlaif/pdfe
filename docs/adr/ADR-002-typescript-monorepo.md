# ADR-002: TypeScript monorepo (pnpm + Turborepo)
Status: Proposed
Date: 2026-11-14   Deciders: TBD at Gate 1/B

## Context

Web portals, a mobile app, the API and shared packages (money, design tokens, contracts) must share types and tooling. One language reduces handoff errors between backend and clients.

## Decision

TypeScript monorepo (pnpm + Turborepo)

(Plan §C.3. To be ratified at Gate 1/B.)

## Options considered

- **TypeScript monorepo with pnpm workspaces and Turborepo**: Shared types and packages, cached builds, one toolchain; requires workspace discipline.
- **Separate repositories per app**: Clear ownership; version drift and duplicated types.
- **Polyglot services**: Best tool per service; higher cognitive and operational cost.

## Consequences

- Positive: a single dependency graph and shared contract types.
- Negative: larger repository and CI scope.
- Follow-ups: workspace layout created in feature 001; the governance checker moves into the TypeScript CI stage.

## Linked requirements

R-04; constitution Articles X and XI; plan Part D.

## Verification

Planned in feature 001: a clean-clone install and build with one command; CI runs affected-package tasks.

## Implementation notes (Phase 2)

- **TypeScript version (2026-11-15):** TypeScript 7.0.2 compiles NestJS constructor injection correctly (`design:paramtypes` is emitted with `experimentalDecorators` and `emitDecoratorMetadata`). It cannot be used repository-wide, because `typescript-eslint` 8.x supports only TypeScript below 6.1 and TypeScript 7 has no JavaScript compiler API for it. The workspace therefore pins **TypeScript ~6.0.3** in the root `package.json`, one version for every package. Revisit when `typescript-eslint` supports 7.x.
- **PDF watermark dependencies (2026-11-17):** `pdfWithWatermark` (`packages/platform-core/src/sim-label-pdf.ts`, Node only) uses `pdf-lib` and `@pdf-lib/fontkit` to stamp the simulation label on every page, with the Arabic line in **Noto Naskh Arabic** from `@fontsource/noto-naskh-arabic` (SIL Open Font License 1.1; the licence file ships with the package and the font is not modified). Arabic is drawn shaped and also written once in invisible nominal glyphs, so text extraction returns the exact characters. `pdfjs-dist` is a dev dependency, used only by the test that extracts text from the stamped pages. The PDF code lives in its own module, `@pdfe/platform-core/sim-label-pdf`, so the pure label helpers in `sim-label.ts` stay importable from web and mobile code.

