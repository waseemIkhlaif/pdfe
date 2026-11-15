# Research: UX/UI Design Track (Phase 1)

**Feature**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md) · **Date**: 2026-11-15

Each entry gives the decision, why it was chosen, and what else was considered. Entries are numbered R-1 onward and referenced from the plan, the data model and the contracts. These numbers are separate from the plan's risk IDs (R-01…R-20). When a risk is meant, the text says "risk R-xx".

---

## R-1 Design tool

- **Decision**: **Figma** is the design source for wireframes, high-fidelity screens, components and prototypes, as recommended in plan §C.2. It is used on the free plan unless a limit blocks the work. Nothing in the evidence trail depends on a paid Figma feature:
  - Redlines are drawn as annotated spec frames inside the file and exported, rather than relying on Dev Mode.
  - Tokens come from the repository (R-2), not from a paid sync.
  - Approvals rest on the frozen export (R-5), not on Figma version history.
- **Rationale**: This follows the plan's stack and the largest body of tutorials, which suits a beginner. Keeping evidence tool-independent removes lock-in and cost risk. **Before Stage 3, confirm the current free-plan limits** (number of editable files, prototype sharing, inspect access) and record them in `docs/design/README.md`. If a limit blocks the work, use the fallback below.
- **Alternatives considered**:
  - **Penpot** (open source, free, has native design tokens and an inspect mode). This is the fallback if Figma's free-plan limits block the work. Switching costs little because tokens and evidence live in the repository.
  - **Code-first design** (designing directly in components). Rejected: it skips low-fidelity testing and goes against Stage 3.

## R-2 Single source and direction for design tokens

- **Decision**: The **repository is the single source of tokens**. Tokens are W3C Design Tokens Community Group (DTCG) JSON files in `packages/design-tokens/tokens/`. Two flows run from there:
  - **Repository → build**: Style Dictionary v4 generates web CSS custom properties and a typed TypeScript theme for React Native.
  - **Repository → Figma**: Tokens Studio's free tier loads the same JSON file into Figma as styles and variables.
  
  Token changes are made by pull request, so CI checks them (contrast, reserved accent) before anyone designs with them.
- **Rationale**:
  - FR-022 needs "no manual edits between the export and its use". Repository-first meets this with no paid sync feature.
  - Every token change gets the same pull-request evidence as all other governed artifacts.
  - The contrast check runs automatically (SC-004).
- **Alternatives considered**:
  - **Figma → JSON push through Tokens Studio GitHub sync**, the direction ADR-014's wording implies. Rejected: sync is a paid Tokens Studio feature, and changes would bypass pull-request review.
  - **Hand-maintained platform styles**. Rejected: this is the ADR-014 "drift" option.
- **Follow-up**: Amend ADR-014 (status still Proposed) to read "Repository DTCG JSON → Style Dictionary → web CSS vars + RN theme; Figma imports". Also change its follow-up line from "feature 001 or 002" to "Phase 1 (`000-ux-design-track`)". Both amendments are made before Gate 1/B ratification.

## R-3 Token pipeline before the monorepo exists

- **Decision**: `packages/design-tokens/` is created in Phase 1 as a **standalone Node package**:
  - Its own `package.json`, `engines.node >= 22`, and a pnpm lockfile.
  - `style-dictionary` pinned to an exact version, as the only runtime dependency of the build.
  - The contrast checker is a dependency-free script.
  
  Build output (`dist/`) is already ignored by `.gitignore` and is built in CI. Feature 001 (monorepo) later adds the package to the pnpm workspace without changing its interface: the output paths stay fixed by [contracts/token-pipeline.md](./contracts/token-pipeline.md).
- **Rationale**: Phase 2 planning needs a token package that builds (spec, User Story 4). Waiting for feature 001 would put design behind engineering, which the spec forbids (FR-001). CI uses Node 22 LTS, the LTS version named in plan §C.2. The implementer's local Node 25 is newer and works, but CI is the reference.
- **Alternatives considered**:
  - Delay the build until feature 001. Rejected: it breaks FR-001 and FR-022 for Phase 2.
  - A hand-written build script with no Style Dictionary. Rejected: it reinvents a tool already named in ADR-014.

## R-4 Contrast checking

- **Decision**: A dependency-free Node script, `packages/design-tokens/scripts/check-contrast.mjs`, works as follows:
  - It computes the WCAG 2.x relative-luminance contrast for every **declared pair** in `tokens/pairs.json`, which lists each foreground/background pair used for text or UI and its required ratio.
  - It fails if any pair falls below its ratio: 4.5 for normal text, 3.0 for large text and UI components.
  - It also fails if a color token is used in a pair but missing from the token set, or if any pair outside the simulation-label group uses the simulation accent.
- **Rationale**: SC-004 needs 100% of pairs that are *in use* to pass. Declaring the pairs makes "in use" explicit and reviewable. The WCAG formula is short and stable, so no dependency is needed (Article XI).
- **Alternatives considered**:
  - Checking every combination of colors. Rejected: it produces noise from pairs nobody uses.
  - Figma contrast plugins only. Rejected: they are manual and leave no CI evidence.

## R-5 Frozen exports as the record of truth (spec clarification Q4)

- **Decision**: When a package is approved, each screen frame is exported **as PDF**, one PDF per interface per language, at 1× scale. The files go under `docs/design/packages/phase-NN/export/`, together with `SHA256SUMS`.
  - `approvals.md` records the export path and the checksum file.
  - A change to an approved package creates a new version folder (`phase-NN/v2/`) and never overwrites the old one.
  - Soft limit: 10 MB per file, to keep repository growth manageable without Git LFS.
- **Rationale**: PDF keeps vector frames and text, so Arabic text can be searched and checked, and GitHub shows it inline. Checksums make "matches the approved version" (SC-013) a mechanical check.
- **Alternatives considered**:
  - PNG per frame. Kept only for screens that the visual comparison baseline needs (R-11).
  - Git LFS. Rejected for now: it adds tooling and has quota limits on the free plan. Revisit if the exports exceed 300 MB in total.

## R-6 URLs to the design tool vs the forbidden-URL check (C-9)

- **Decision**: Add `www.figma.com` to `scripts/safety/allowed-hosts.txt`, with a `# reason:` line. No other external host is added. Research notes and the pattern review **name products in text and contain no URLs**.
- **Rationale**: Approvals link to the live frames (FR-003), and the Phase 0 check C-9 fails on any host that is not allowlisted. Figma is a design tool, not a financial endpoint, so it does not weaken Article I.
- **Alternatives considered**:
  - Leaving the links out entirely. Rejected: the clarification keeps the live link for convenience.

## R-7 Machine-checkable artifact formats

- **Decision**: All Phase 1 artifacts are Markdown, with **fixed header rows for every table**, in the same style as the Phase 0 registers. This includes the screen inventory, approvals, copy decks, flows, exceptions, persona/navigation matrix, status vocabulary and usability findings. Diagrams (sitemaps, flows) use **Mermaid** blocks, which GitHub renders without any tool. The formats are defined in [contracts/artifact-formats.md](./contracts/artifact-formats.md).
- **Rationale**: This reuses the proven Phase 0 pattern: bash/awk checks, readable diffs and no new dependency.
- **Alternatives considered**:
  - YAML/JSON registers. Rejected: harder to read and harder to parse in bash.
  - Figma-only diagrams. Rejected: CI cannot check them.

## R-8 Copy deck format and the hand-off to `packages/i18n`

- **Decision**: Each phase has a copy deck at `docs/design/copy-decks/phase-NN.md`. It is a Markdown table, one row per message key, with these columns:
  - message key (namespaced, for example `wallet.send.review.title`)
  - English and Arabic text in ICU MessageFormat
  - the regulated-wording flag
  - the Arabic review status, the native-speaker spot-check status and the legal status
  - the overall status
  
  A later engineering feature (009 app shells, which owns i18n wiring) converts rows with status `approved` into `packages/i18n/{ar,en}/*.json`. Phase 1 does not create `packages/i18n`.
- **Rationale**:
  - One reviewable table carries the review trail that FR-028a and FR-029 require.
  - ICU syntax means the strings drop into next-intl / i18next unchanged (plan §I.8).
  - Keeping `packages/i18n` in feature 009 avoids building app plumbing in a design feature.
- **Alternatives considered**:
  - Writing `packages/i18n` JSON directly. Rejected: JSON has no room for review-status columns.
  - Spreadsheets. Rejected: they can't be diffed and live outside the repository.

## R-9 Usability testing method (spec clarifications Q1 and Q3)

- **Decision**:
  - **Participants**: volunteers from the implementer's network. Each round has at least 5 participants for a journey (J1–J7), or at least 3 for a package without a journey. Participants are recorded by code only (P1, P2, …), with an optional profile tag: `ar-first`, `mobile-first`, `low-tech`, `en-first`.
  - **Format**: moderated (remote or in person) or unmoderated. Unmoderated participants receive a prototype link and a **task sheet** (`docs/design/usability/task-sheet-template.md`), and reply in plain text with no sign-in. The implementer transcribes the replies as anonymized notes, and the raw replies are deleted.
  - **Measures**: for each task, completion without help (yes / with help / no). After the first screen, each participant answers "Is this real money?", which measures SC-007. A short ease-of-use rating is also collected.
  - **Severity** (Nielsen 0–4): **critical** means severity 4, or severity 3 or higher on any money-amount, review-step or simulation-understanding task. It also covers any participant who believes the money is real.
  - **Rounds for packages without a journey**: a key-task round plus a heuristic review against Nielsen's 10 heuristics and the 5 PDFE principles (`docs/design/heuristics/phase-NN.md`).
- **Rationale**: This method is practical for one person, keeps participants private, and makes SC-006 and SC-007 measurable.
- **Alternatives considered**:
  - Paid testing panels. Rejected: they cost money and collect personal data.
  - Online survey services. Rejected: they collect metadata and need allowlisted hosts.

## R-10 Gate enforcement: designs before plans

- **Decision**: The design checker includes a gate check (D-13, see [contracts/design-check.md](./contracts/design-check.md)). It works from `scripts/design/ui-features.txt`, which lists each engineering feature number that has UI and the phase it belongs to. When `specs/<feature>/plan.md` exists for a listed feature, `docs/design/approvals.md` must hold an `approved` row for that phase's package, dated on or before the plan's first commit date.
  - Phase 2 UI features: 003, 004, 005, 007, 008, 009.
  - Features without UI, such as 001, 002 and 006, are not blocked.
- **Rationale**: The rule "designs for Phase N approved before Phase N's plan" (FR-001, User Story 5 scenario 2) is enforced mechanically, without slowing features that have no UI.
- **Alternatives considered**:
  - Blocking every plan in a phase. Rejected: this would hold back the monorepo/CI and observability work for no gain.
  - Relying on a manual check against the Definition of Ready. Rejected: in solo mode it would be silently skipped.

## R-11 Visual comparison of built screens (Stage 6)

- **Decision**: Phase 1 defines the **baseline contract** only: for each approved screen, a PNG baseline at fixed sizes for both languages, stored under `docs/design/packages/phase-NN/baseline/{ar,en}/<screen-id>@<size>.png`. The comparison runners are built by the engineering features that own the apps: Playwright for web (features 001/009) and Maestro for mobile (feature 009). Phase 1's own CI checks only that the baselines exist for approved screens.
- **Rationale**: There are no apps to run comparisons against yet. Fixing the file contract now lets feature 009 consume it directly (FR-033).
- **Alternatives considered**:
  - Starting comparison tooling now. Rejected: it has nothing to test, and it would duplicate the work owned by 001/009.

## R-12 Personal data guard for research notes

- **Decision**: The design checker scans `docs/design/research/**` and `docs/design/usability/**` for patterns that suggest personal data: email addresses, phone numbers (`+970`, `+972`, `05x` and general E.164 patterns), and Palestinian/Israeli national-ID-like 9-digit numbers next to the words "ID" or "هوية". It also requires participant references to match `P[0-9]+`. Any match fails CI.
- **Rationale**: The repository is public, and SC-012 is a hard zero, so it needs a mechanical guard, not just a convention.
- **Alternatives considered**:
  - Relying only on gitleaks. Rejected: gitleaks targets secrets, not personal data.

## R-13 Fonts

- **Decision**: **IBM Plex Sans Arabic** for Arabic UI, **IBM Plex Sans** for Latin UI (matching metrics and one type family), and **Noto Naskh Arabic** for long-form Arabic and PDF statements, with tabular figures enabled. All are released under the SIL Open Font License. The font files are not committed in Phase 1; the token typography group refers to them by family name.
- **Rationale**: The plan lists these fonts (§1.4, §C.2). The OFL licenses carry no cost and allow embedding in PDFs. Using one family across scripts keeps the visual rhythm in mixed Arabic/Latin screens.
- **Alternatives considered**:
  - Inter for Latin. Rejected as the default: Plex Sans pairs more closely with Plex Sans Arabic. Inter stays a fallback.
  - Noto Kufi Arabic. Rejected: it is less readable at small UI sizes.

## R-14 Skeleton scope (spec clarification Q5)

- **Decision**: "Key screens of every interface" (FR-016a) means, for each of the 8 interfaces: the entry or home screen, the primary navigation shell, one representative list screen and one representative detail screen. Interfaces with money movement add one Enter→Review→Result flow. The skeleton also includes every J1 and J2 screen. Skeleton screens are tagged `skeleton=yes` in the screen inventory.
- **Rationale**: This gives a fixed, countable definition (about 8 × 4 = 32 screens plus J1/J2), so completion can be checked by the design checker (check D-6).

## R-15 Engineering phases with parallel design work

- **Decision**: Each package is a separate folder and approval row (`phase-07`, `phase-09`, `phase-10`). Shared components that are changed while parallel packages are in progress go through one design-system change (versioned in `docs/design/system/CHANGELOG.md`), which is approved before either package that uses it.
- **Rationale**: This covers the parallel-phases edge case in the spec without packages conflicting over shared components.
