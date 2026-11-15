---

description: "Task list for 000-ux-design-track (Phase 1 — UX/UI Design Track, continuous M0 → M7)"
---

# Tasks: UX/UI Design Track (Phase 1)

**Input**: Design documents from `specs/000-ux-design-track/`

**Prerequisites**: plan.md, spec.md, research.md (R-1 to R-15), data-model.md, contracts/ (artifact-formats.md, design-check.md, token-pipeline.md), quickstart.md

**Tests**: Article VII and the plan require test-first tooling. Every design check D-n gets a passing fixture and a failing fixture in `scripts/design/tests/fixtures/` **before** the check itself is written. The design itself is "tested" by usability rounds and heuristic reviews, and those are tasks too.

**Organization**: Tasks are grouped by user story, in dependency order US1 → US2 → US3 → US4 → US5 → US6 → US7. US4 token work (T053–T058) may start in parallel with US2, but visual design (T059 onward) waits for the tested skeleton (FR-016a).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, and no dependency on an incomplete task)
- **[Story]**: US1 to US7, matching spec.md
- **HUMAN**: a step a person must do (interviews, Figma work, test sessions, Arabic review, approvals). The AI agent prepares drafts, templates and checks, and stops at these steps.

## Path Conventions

- The repository root is `C:\dev\pdfe`. All paths below are relative to it.
- Artifact layouts and exact table headers: `specs/000-ux-design-track/contracts/artifact-formats.md` (cited as **AF §n**).
- Check definitions: `contracts/design-check.md` (cited as **D-n**). Token rules: `contracts/token-pipeline.md` (cited as **TP**).
- **PR rule** (solo mode): every change goes through a PR to `main` and is merged by the author once the required checks (`governance-check`, `secret-scan`, and `design-check` after T012) pass.
- **Approval rule**: approving an artifact means appending a row to `docs/design/approvals.md` (AF §14) with `Solo=yes`, merged through a PR.
- **Never** put real names, contact details or URLs other than `www.figma.com` links into `docs/design/**`, and never quote prohibited-claim terms outside `scripts/safety/prohibited-claims.txt`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The branch, folder skeleton and tool decisions.

- [X] T001 Create and switch to the branch `000-ux-design-track` from `main`, and commit the existing spec artifacts in `specs/000-ux-design-track/` and `specs/README.md`
- [X] T002 [P] Create the folder skeleton from AF §1: `docs/design/{research,personas,ia/sitemaps,flows,content,system,copy-decks,usability,heuristics,packages,qa}/`, each with a `.gitkeep`
- [X] T003 [P] Write `docs/design/README.md`: an index of the artifacts (AF §1), the PR and approval rules above, the solo-mode note linking `docs/governance/solo-mode-exception.md`, and an empty "Design tool limits (confirmed YYYY-MM-DD)" section
- [ ] T004 HUMAN: create a Figma account (free plan) and a team project named "PDFE Demo". Install the Tokens Studio plugin. Record the confirmed free-plan limits (editable files, prototype sharing, inspect access) under "Design tool limits" in `docs/design/README.md`. If any limit blocks the work, record the switch to Penpot (research R-1)
- [X] T005 [P] Add `www.figma.com` to `scripts/safety/allowed-hosts.txt` with the line `# reason: live design-frame links in docs/design (research R-6)`, then run `bash scripts/governance/check-phase0.sh` and confirm C-9 still passes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design checker framework, its test harness and the required CI check. Every story adds its checks on top of this.

**⚠️ CRITICAL**: Stories cannot record a checked approval until this phase is done.

- [X] T006 Create `scripts/design/check-design.sh` following the `scripts/governance/check-phase0.sh` pattern: parse `--gate phase-NN` into exported `GATE_MODE=1` and `GATE_PHASE=NN`; check for `bash grep awk sed git sha256sum` (exit 2 if one is missing); source `scripts/governance/lib.sh`; source `scripts/design/checks/d*.sh`; run every `check_dNN` function in `sort -V` order; print the summary to stderr; exit 0, 1 or 2 per D contract
- [X] T007 Create `scripts/design/lib-design.sh` with helpers used by several checks: `design_table <file> <header>` (wraps `table_rows`), `in_set <value> <comma-list>`, `iso_date_ok <date>` (valid and not in the future), and `first_commit_date <path>` (`git log --diff-filter=A --format=%cs -- <path> | tail -1`). Source it from `check-design.sh`
- [X] T008 Create the test harness `scripts/design/tests/run.sh`. For each folder `scripts/design/tests/fixtures/<dNN>-<pass|fail>-<name>/`, it copies the fixture tree into a temporary git repository (`git init`, commit) together with `scripts/`, runs `check-design.sh` (or `--gate phase-02` when the fixture contains a `GATE` file), and asserts that the output contains `PASS D-n` or `FAIL D-n` as the folder name says. It prints `ok`/`not ok` per fixture and exits 1 on any `not ok`
- [X] T009 Write fixtures `d01-pass-minimal/` and `d01-fail-bad-header/` (a `docs/design/approvals.md` whose header is missing the `Solo` column) and `d01-fail-bad-enum/` (a screen inventory row with `Hi-fi=done`) in `scripts/design/tests/fixtures/`
- [X] T010 Implement D-1 in `scripts/design/checks/d01-formats.sh`. For each table defined in AF §5–§16 that exists, it verifies the exact header row and the allowed enumerated values (`Solo`, `Money`, `Skeleton`, `Wireframe`, `Hi-fi`, `States`, `Regulated`, `AR review`, `Native check`, `Legal`, `Status`, `Result`, `Severity`, `Critical`). Missing files PASS with "not present yet". Make T009 pass
- [X] T011 Create `docs/design/approvals.md` with only its title, a one-line rule ("append-only; one row per approved version; Solo=yes = dated self-attestation, re-review pending") and the AF §14 header row
- [X] T012 Add the job `design-check` to `.github/workflows/governance.yml`. It runs `actions/checkout` (same pinned SHA), then `actions/setup-node` pinned by commit SHA with `node-version: 22`, then `corepack enable`, then `bash scripts/design/tests/run.sh`, then `bash scripts/design/check-design.sh`, with `timeout-minutes: 5`
- [ ] T013 (JSON files updated; HUMAN apply and evidence still pending) Add `design-check` to the required status checks in `scripts/governance/ruleset-main-protection.json` and `scripts/governance/ruleset-main-protection-solo.json`. HUMAN: re-apply the solo ruleset with `gh api` as done in Phase 0, then save the exported ruleset as evidence in `docs/evidence/phase-1/ruleset.json`
- [ ] T014 Open the PR for Phases 1–2 and confirm that all three required checks pass. Record the PR number in `docs/evidence/phase-1/README.md`

**Checkpoint**: `design-check` is required on `main`, and the fixture suite runs in CI.

---

## Phase 3: User Story 1 - Design lead grounds the product in its real users (Priority: P1) 🎯 MVP start

**Goal**: Stage 1 artifacts (stakeholder notes, 10 personas, context report, pattern review, test plan, principles), synthetic and anonymized.

**Independent Test**: All Stage 1 files exist. The 10 persona files follow AF §3. `check-design.sh` passes D-1 and D-11. Each artifact has an approval row.

### Tests for User Story 1

- [X] T015 [P] [US1] Write fixtures `d11-pass-clean/`, `d11-fail-email/`, `d11-fail-phone/` (`+970 59 000 0000` in `docs/design/research/context.md`), `d11-fail-national-id/` (`ID 123456789`) and `d11-fail-participant-name/` (a usability file whose Participant cell is `Sara`) in `scripts/design/tests/fixtures/`
- [X] T016 [US1] Implement D-11 in `scripts/design/checks/d11-personal-data.sh`. Over `docs/design/research/**` and `docs/design/usability/**` it flags: email `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}`; phone `(\+97[02]|00 ?97[02]|\b05[0-9])[ -]?[0-9]{2,3}[ -]?[0-9]{3}[ -]?[0-9]{3,4}` and generic E.164 `\+[1-9][0-9]{7,14}`; a 9-digit number within 10 characters of `ID` or `هوية`. It also flags any `Participant` cell not matching `^P[0-9]+$`. Make T015 pass

### Implementation for User Story 1

- [X] T017 [P] [US1] Draft `docs/design/research/stakeholder-notes.md`: one `## ` section per role (Sponsor, Product owner, Finance/ledger specialist, Legal/compliance), each with the subsections `Questions`, `Answers`, `Implications for design`. The questions come from PRD §2, §3, §8, §13 and §16 (D-04). Leave the answers empty
- [ ] T018 [US1] HUMAN: hold (or self-interview, in solo mode) the four role interviews and fill in the `Answers` and `Implications for design` sections of `docs/design/research/stakeholder-notes.md`
- [X] T019 [P] [US1] Draft the 10 persona files `docs/design/personas/PER-01-individual.md` … `PER-10-demo-viewer.md` in PRD §3 order (Individual, Freelancer/remittance recipient, Merchant, Business finance user, Exchange user, Operations analyst, Compliance analyst, Finance/treasury analyst, Platform administrator, Investor/regulator demo viewer). Follow AF §3. Copy `Core need` and `Allowed demo capabilities` word for word from PRD §3, take `Roles` from plan §J.3 and `Interfaces` from plan §F.4. Mark other sections `DRAFT — confirm in workshop`
- [ ] T020 [US1] HUMAN: run the proto-persona workshop (solo: a structured self-review using the stakeholder notes). Complete `Goals`, `Pains`, `Devices`, `Languages`, `Literacy` and `Accessibility needs` in every `docs/design/personas/PER-*.md` and remove the DRAFT markers
- [X] T021 [P] [US1] Draft `docs/design/research/context.md` with the sections `Mobile-first usage`, `Arabic-first users`, `Low-bandwidth conditions`, `Shared devices`, `Cash habits (ILS/JOD/USD)`, `Digit system recommendation`, `Design implications`. Pre-fill the implications from plan §1.4 (RTL rules) and §I.8, with no URLs
- [ ] T022 [US1] HUMAN: complete the context research findings in `docs/design/research/context.md`. Record the digit default decision (Western for money unless the findings say otherwise) with its rationale
- [X] T023 [P] [US1] Write `docs/design/research/patterns.md` with one section each for wallet apps, merchant QR, remittance apps and exchange UIs. Each section has a table `| Pattern | Problem it solves | Use in PDFE | Risk |`. Name products in text only: no URLs, no screenshots, no brand assets
- [X] T024 [P] [US1] Write `docs/design/research/test-plan.md` following AF §4 and research R-9: participants (volunteers from the implementer's network, codes `P1…`, profile tags, ≥5 per journey round and ≥3 for rounds without a journey); session formats (moderated remote or in person, or unmoderated with a task sheet); tasks by journey (J1–J7, written from PRD §8); measures (task completion `yes/help/no`, "Is this real money?", ease rating); Nielsen 0–4 severity; the critical-issue definition; privacy (no recordings committed, raw replies deleted after transcription)
- [X] T025 [P] [US1] Write `docs/design/usability/task-sheet-template.md`: a neutral intro stating that the product is a simulation with no real money, prototype link placeholder, numbered task slots, per-task "Done? yes / needed help / no" lines, the question "After the first screen: is this real money? yes / no", and a 1–5 ease rating. No name or contact fields
- [X] T026 [P] [US1] Write `docs/design/principles.md` per AF §2: the five principles in plan order, each with `**Statement**`, `**Applied by**` (concrete component or rule, for example `SimulationBanner`, the 3-step money pattern, MoneyText) and `**Checked by**` (D-check, J.5 checklist item or usability measure)
- [X] T027 [US1] Run `bash scripts/design/check-design.sh` and fix any D-1 or D-11 failure in the US1 files
- [ ] T028 [US1] HUMAN: review and approve the Stage 1 set. Append one row to `docs/design/approvals.md` for each of `docs/design/research/stakeholder-notes.md`, `docs/design/personas/`, `docs/design/research/context.md`, `docs/design/research/patterns.md`, `docs/design/research/test-plan.md` and `docs/design/principles.md`, with Version `1`, Approver role `Design lead + Product owner`, `Solo=yes` and Export `—`. Merge through a PR

**Checkpoint**: Stage 1 is approved, and the personas and principles are fixed for Stage 2.

---

## Phase 4: User Story 2 - Every app has an agreed structure, flows and vocabulary (Priority: P1)

**Goal**: 8 sitemaps, the navigation model, the persona/navigation matrix, J1–J7 flows covering every PRD §8 exception, and a bilingual status vocabulary.

**Independent Test**: D-4 and D-5 pass. Every PRD §8 exception term has a flow row. The status vocabulary has 8 rows, with Arabic reviewed and spot-checked.

### Tests for User Story 2

- [X] T029 [P] [US2] Create `scripts/design/prd8-exceptions.txt`, one line per `J<n>|<term>`, copied word for word from PRD §8: J1 insufficient balance, duplicate submission, blocked recipient, service timeout, reversal; J2 expired intent, duplicate capture, disputed transaction, partial settlement failure; J3 quote expiry, partner rejection, FX mismatch, review hold, payout failure; J4 insufficient reserves, approval conflict, out-of-balance state; J5 price gap, insufficient asset, stale quote, order race, market halt; J6 `step: hold`, `step: independent approval`, `step: release/reject`; J7 `step: customer pays`, `step: matching`, `step: manager approves`, `step: mock settlement`, `step: bank statement reconciliation`
- [X] T030 [P] [US2] Write fixtures `d04-pass-j1-complete/`, `d04-fail-missing-exception/` (a J1 flow without the `blocked recipient` row), `d04-fail-unknown-status/` (Status term `ST-DONE`), `d05-pass/`, `d05-fail-nav-not-in-matrix/` and `d05-fail-viewer-full/` (a PER-10 cell set to `full`) in `scripts/design/tests/fixtures/`
- [X] T031 [US2] Implement D-4 in `scripts/design/checks/d04-flows.sh`. For each existing `docs/design/flows/J<n>.md`, every `prd8-exceptions.txt` term for that journey appears in the `PRD §8 term` column, every row has a non-empty `Outcome`, and every `Status term` exists in `docs/design/content/status-vocabulary.md`. Make the d04 fixtures pass
- [X] T032 [US2] Implement D-5 in `scripts/design/checks/d05-ia.sh`. Every sitemap `Nav ID` appears in `docs/design/ia/permission-matrix.md`, every `Target screen` value exists in `docs/design/screen-inventory.md` (skipped with a PASS note until the inventory exists), and no `PER-10` cell is `full`. Make the d05 fixtures pass

### Implementation for User Story 2

- [X] T033 [US2] Write `docs/design/content/status-vocabulary.md` per AF §8: 8 rows (`ST-DRAFT` … `ST-EXPIRED`) with English label, a draft Arabic label marked `(draft)`, plain-language meaning, distinct icon name, semantic color token path (for example `color.semantic.warning.fg`), and allowed next statuses taken from typical transaction state flows (for example `ST-PENDING → ST-HELD, ST-UNDER-REVIEW, ST-COMPLETED, ST-FAILED, ST-EXPIRED`)
- [ ] T034 [US2] HUMAN: review the 8 Arabic labels in `docs/design/content/status-vocabulary.md` (implementer review) and get a volunteer native speaker to spot-check them. Remove the `(draft)` markers and add a line under the table: `Arabic reviewed YYYY-MM-DD; native spot-check YYYY-MM-DD (volunteer, anonymous)`
- [X] T035 [P] [US2] Write `docs/design/ia/navigation-model.md`. Mobile: bottom tabs Home · Pay/Scan · Send · Markets · Profile, a persistent `SIMULATION` pill in the header, merchant-mode switch. Web consoles: side navigation mirrored in RTL, top bar with tenant switcher, role badge and `DEMO` environment badge. Include a Mermaid diagram for each
- [X] T036 [P] [US2] Write the sitemaps `docs/design/ia/sitemaps/CON-sitemap.md`, `MER-sitemap.md`, `BIZ-sitemap.md`, `OPS-sitemap.md`, `CMP-sitemap.md`, `FIN-sitemap.md`, `INV-sitemap.md` and `DEV-sitemap.md` per AF §6, using PRD §10 and plan §J.6 (admin pages go inside the console sitemaps). Each has a Mermaid flowchart and the `| Nav ID | Label key | Target screen | Roles |` table. Target screens use provisional IDs `<IF>-NNN`, which are reconciled with the inventory in T042
- [X] T037 [US2] Write `docs/design/ia/permission-matrix.md` per AF §5. One row per `Nav ID` from T036, with `full`/`read`/`—` per persona, consistent with plan §J.3 (PER-10 is `read` or `—` only; consoles are `—` for PER-01…PER-05)
- [X] T038 [P] [US2] Write `docs/design/flows/J1.md` and `J2.md` per AF §7: a Mermaid flowchart, `## Main path` with screen IDs (consumer send for J1; merchant charge, consumer pay and refund for J2), and an exceptions table covering every `prd8-exceptions.txt` term for J1/J2, each ending in an outcome and an `ST-*` term
- [X] T039 [P] [US2] Write `docs/design/flows/J3.md`, `J4.md` and `J5.md` per AF §7. They cover remittance (with QuoteCard and the expiry path), PSH issuance/redemption (dual approval, halt on insufficient reserves) and paper trading (order hold, partial fill, cancel remainder, market halt)
- [X] T040 [P] [US2] Write `docs/design/flows/J6.md` and `J7.md` per AF §7, covering compliance incident (rule match → hold → alert → case → independent approval → release/reject → audit report) and business invoicing (invoice → payment → matching → approval → settlement → reconciliation → export), with the `step:` exception rows
- [ ] T041 [US2] Run `bash scripts/design/check-design.sh`, fix the D-1/D-4/D-5 failures, then HUMAN: approve. Append rows to `docs/design/approvals.md` for `docs/design/ia/`, `docs/design/flows/` and `docs/design/content/status-vocabulary.md` (`Solo=yes`), and merge through a PR

**Checkpoint**: The IA, flows and vocabulary are approved, so wireframes have a fixed map.

---

## Phase 5: User Story 3 - Wireframes prove the flows work before visual design (Priority: P1)

**Goal**: The full screen inventory, the up-front skeleton (key screens of every interface plus all of J1/J2) in five states, and usability round UR-01 with at least 5 participants.

**Independent Test**: `check-design.sh --gate phase-02` reports PASS for D-3, D-6, D-8 and D-15. UR-01 has no open critical finding.

### Tests for User Story 3

- [X] T042 [P] [US3] Create `scripts/design/j6-screens.txt` with one line per screen name, `<IF>|<Screen name>`, transcribed from plan §J.6 (mobile app, web consumer, merchant, business, operations, compliance, finance/treasury, admin, investor, developer portal). Treat merchant-mode and P1 business-approval screens on mobile as `CON`
- [X] T043 [P] [US3] Write fixtures `d03-pass/` and `d03-fail-missing-screen/`; `d06-pass/` and `d06-fail-interface-short/` (MER with only 3 skeleton rows, with a `GATE` file); `d07-pass/` and `d07-fail-missing-state/` (approved with `P,E,L,X`) and `d07-fail-missing-size/` (an approved `CON` screen without `m390`); `d08-pass/` and `d08-fail-no-review/`; `d15-pass/`, `d15-fail-four-for-journey/` and `d15-fail-critical-accepted/`, all in `scripts/design/tests/fixtures/`
- [X] T044 [US3] Implement D-3 in `scripts/design/checks/d03-inventory.sh`: every `j6-screens.txt` entry matches an inventory row by `Interface` and `Name`, and screen IDs are unique
- [X] T045 [US3] Implement D-6 in `scripts/design/checks/d06-skeleton.sh`, running in gate mode for `phase-02` only. Each of the 8 interfaces has at least 4 rows with `Skeleton=yes` and `Wireframe=done`, and every screen whose `Journeys` contains `J1` or `J2` has `Wireframe=done`
- [X] T046 [US3] Implement D-7 in `scripts/design/checks/d07-states.sh` (`Hi-fi=approved` requires `States=P,E,L,X,D` and the full size set: `CON` = `m360,m390,t768,w1280,w1440`, the others `t768,w1280,w1440`) and D-8 in `scripts/design/checks/d08-money.sh` (every `Money=yes` name stem has `– enter` or a first step, plus `– review` and `– result`)
- [X] T047 [US3] Implement D-15 in `scripts/design/checks/d15-rounds.sh`. For each `docs/design/usability/UR-*.md`, count the distinct participants: at least 5 if `**Scope**:` contains `J[1-7]`, otherwise at least 3. No finding row has `Critical=yes` and `Status=accepted`. Make all US3 fixtures pass with `bash scripts/design/tests/run.sh`

### Implementation for User Story 3

- [X] T048 [US3] Generate `docs/design/screen-inventory.md` per AF §9: one row per `j6-screens.txt` entry, with ID `<IF>-NNN`, Phase (from each plan phase's "UI/UX design" section: shells, sign-in and admin = 2, finance console v1 = 3, KYC/KYB and compliance = 4, wallet = 5, merchant = 6, remittance = 7, business and dev portal = 8, PSH = 9, exchange = 10, ops, finance and compliance additions plus investor = 11), Journeys, PRD IDs (plan §F.1), Sizes per FR-018, `Money` for money-moving screens, and `Skeleton=yes` on the research R-14 key screens (home, nav shell, one list and one detail per interface) plus all J1/J2 screens. Align the sitemap target IDs from T036 to these IDs
- [ ] T049 [US3] HUMAN: in Figma, wireframe (greyscale) every `Skeleton=yes` screen at its sizes in all five states (populated, empty, loading skeleton, error with retry and a copyable correlation ID, permission-denied). Money screens follow Enter → Review (fees, FX, exact received, "simulated") → Result (receipt, status, reference, trace ID). Set `Wireframe=done` and the `Frame` links in `docs/design/screen-inventory.md`
- [ ] T050 [US3] HUMAN: link the J1 and J2 wireframes into a clickable Figma prototype. Fill `docs/design/usability/task-sheet-template.md` into J1/J2 tasks, and run round UR-01 with at least 5 volunteers (moderated or unmoderated)
- [ ] T051 [US3] Record UR-01 in `docs/design/usability/UR-01.md` per AF §12 (Scope `J1, J2`, Fidelity `wireframe`, codes P1…P5+, results, real-money answers, findings with severity and the critical flag from research R-9). HUMAN: fix the critical findings in Figma, re-check them with participants, and set them to `verified`
- [ ] T052 [US3] Run `bash scripts/design/check-design.sh` (D-1, D-3, D-5, D-8, D-11, D-15). HUMAN: approve the skeleton, appending a row for `docs/design/screen-inventory.md` (skeleton) and `docs/design/usability/UR-01.md` to `docs/design/approvals.md`. Merge through a PR

**Checkpoint**: The skeleton is tested and approved, so visual design may start (FR-016a).

---

## Phase 6: User Story 4 - A design system makes every screen consistent, accessible and bilingual (Priority: P1)

**Goal**: DTCG tokens that build to web and mobile outputs with no manual edits, a contrast-checked set of pairs, a reserved simulation accent, and the full component library with accessibility and RTL specs.

**Independent Test**: The quickstart §2–§3 commands pass. D-9 and D-10 pass. The one-token change test and the double-build diff are clean.

### Tests for User Story 4

- [X] T053 [P] [US4] Create the scaffold `packages/design-tokens/package.json` per TP: name `@pdfe/design-tokens`, `private: true`, `type: module`, `engines.node >=22`, `style-dictionary` pinned to an exact 4.x version, and the scripts `build` (`node sd.build.mjs`) and `check` (`node scripts/check-contrast.mjs`). Run `pnpm --dir packages/design-tokens install` to create `pnpm-lock.yaml`
- [X] T054 [P] [US4] Write a self-test for the contrast checker, `packages/design-tokens/scripts/check-contrast.test.mjs` (using `node:test`). It covers: black on white = 21.0; `#777777` on white fails text (about 4.48) and passes UI; a `general` pair that uses a `simulation-only` token fails; a missing token reference fails. Add `"test": "node --test scripts/"` to `package.json`
- [X] T055 [US4] Implement `packages/design-tokens/scripts/check-contrast.mjs` (research R-4, no dependencies). It loads `tokens/*.json` plus `dist/tokens.resolved.json` if present (otherwise resolves aliases itself), applies the WCAG relative-luminance formula, derives the required ratio from `usage`, enforces the reserved accent, prints `PASS`/`FAIL <id> <ratio> < <required>`, and exits 1 on any failure. Make T054 pass

### Implementation for User Story 4

- [X] T056 [US4] Write the token files in `packages/design-tokens/tokens/` per FR-021 and TP:
  - `color.json`: `brand.primary`, a replaceable placeholder for D-04, with brand tints aliasing it; `neutral.0…950`; `semantic.{success,warning,danger,info}.{fg,bg,border}`; `simulation.{accent,accentFg,hatch}` with `$extensions.pdfe.reserved`; an 8-color `dataviz` set safe for colorblind users.
  - `typography.json`: families IBM Plex Sans Arabic, IBM Plex Sans and Noto Naskh Arabic; sizes 12/14/16/18/20/24/30/36; a tabular-nums feature.
  - `spacing.json`, `radius.json`, `elevation.json`, `breakpoint.json`.
  - `motion.json`: durations with `motion.reduced.*` twins.
- [X] T057 [US4] Write `packages/design-tokens/tokens/pairs.json`, declaring every text and UI pair the components will use: body and muted text on neutral surfaces, semantic fg on bg, button labels on brand and danger, focus ring on surfaces, borders (ui), the simulation banner text on its accent (`group: simulation`), and chart series on the chart background (ui). Run `pnpm --dir packages/design-tokens check` and adjust token values (never remove pairs) until everything passes
- [X] T058 [US4] Write `packages/design-tokens/sd.config.mjs` and `sd.build.mjs` (Style Dictionary v4, DTCG). The outputs are `dist/web/tokens.css` (`--pdfe-<kebab-path>` on `:root`), `dist/native/theme.ts` (`export const theme = {…} as const`, camelCase keys) and `dist/tokens.resolved.json`, with no timestamps or headers containing dates. Add a `verify` script that builds twice into temporary folders and runs `diff -r` (TP rule 6)
- [X] T059 [P] [US4] Write fixtures `d09-pass/`, `d09-fail-missing-component/` and `d09-fail-banner-dismissible/`, plus `d10-pass/` and `d10-fail-low-contrast/` (a token tree with a failing text pair), in `scripts/design/tests/fixtures/`. Create `scripts/design/components.txt` with every component named in plan Phase 1 Stage 4, one per line as `<group>|<Name>`
- [X] T060 [US4] Implement D-9 in `scripts/design/checks/d09-components.sh` (every `components.txt` entry is in `docs/design/system/components.md` under the right group; the SimulationBanner and SimulatedBadge rows contain `non-dismissible`) and D-10 in `scripts/design/checks/d10-tokens.sh` (if `node` exists, run `node packages/design-tokens/scripts/check-contrast.mjs`; otherwise PASS with "node not installed — runs in CI"). Extend the T012 CI job to run `pnpm --dir packages/design-tokens install --frozen-lockfile && pnpm --dir packages/design-tokens test && pnpm --dir packages/design-tokens build && pnpm --dir packages/design-tokens verify` before `check-design.sh`. Make the fixtures pass
- [X] T061 [P] [US4] Write `docs/design/system/accessibility-rules.md`, covering the FR-024 rules and plan §I.9: contrast ratios (pointing to `pairs.json`), focus indicator, 44×44 targets, labels on icon-only controls, errors linked to their fields, no information by color alone, live-region announcements, reduced motion and dynamic type. For each rule, give how it is verified in design review and in code
- [X] T062 [P] [US4] Write `docs/design/system/rtl-rules.md`, covering FR-025 and plan §I.8: logical properties only, what mirrors (layout, arrows, chevrons) and what does not (logos, media controls, numbers, charts' time axis), isolated LTR runs for amounts, currency codes, IDs and IBAN-like codes, the digit setting (default from T022), expansion and truncation checks, and Gregorian dates in the Asia/Jerusalem display zone
- [X] T063 [US4] Write `docs/design/system/components.md` per AF §10: one row per `components.txt` entry, with variants, states, A11y (role, label rule, focus, announcements), RTL (mirrors or not, isolated runs), tokens used, `Status=draft` and Frame `—`. Required behavior: SimulationBanner (non-dismissible, cannot be covered, bilingual label), MoneyInput (bigint-safe, locale digits), MoneyText (server value only), chart wrappers and KPI tile (definition, denominator, timestamp, SIMULATED tag), MakerCheckerPanel (requester, approver, reason, SoD warning), QuoteCard (rate, fee, expiry countdown, exact received, "Illustrative rates")
- [X] T064 [US4] Create `docs/design/system/CHANGELOG.md` with a `## 1.0.0 (initial)` entry. Amend `docs/adr/ADR-014-design-tokens.md` (still `Status: Proposed`): Decision becomes "Repository DTCG JSON → Style Dictionary → web CSS vars + RN theme; Figma imports the same JSON (Tokens Studio)"; add the option "Figma-first sync (paid; bypasses PR review)" to Options considered; change the follow-up to "Phase 1, `000-ux-design-track`"; and update Verification to point to `pnpm --dir packages/design-tokens verify` and `check`
- [ ] T065 [US4] HUMAN: import `packages/design-tokens/dist/tokens.resolved.json` into Figma with Tokens Studio. Build every component in `docs/design/system/components.md` in Figma, with variants, the five relevant states, and AR/RTL versions. Fill the `Frame` links and set `Status=approved` once each one is reviewed against `accessibility-rules.md` and `rtl-rules.md`
- [ ] T066 [US4] Run quickstart §2 and §3 (including the one-token change test and the negative contrast cases, then revert them) and `bash scripts/design/check-design.sh`. HUMAN: approve. Append rows for `packages/design-tokens/tokens/`, `docs/design/system/components.md`, `accessibility-rules.md` and `rtl-rules.md` to `docs/design/approvals.md`, and merge through a PR

**Checkpoint**: The design system is approved, and the tokens build in CI for web and mobile.

---

## Phase 7: User Story 5 - Engineering receives an approved, complete handoff package before each phase is planned (Priority: P1)

**Goal**: The handoff gate tooling, then the Phase 2 package (the MVP finish line), then one package per engineering phase 3–12, each approved before that phase's UI feature plans.

**Independent Test**: `bash scripts/design/check-design.sh --gate phase-NN` exits 0, an approval row exists, and D-13 stays green after the phase's UI feature plans are created.

### Tests for User Story 5

- [X] T067 [P] [US5] Create `scripts/design/ui-features.txt` as `NNN phase-NN` lines: `003 004 005 007 008 009` → phase-02; `010 011 013 014` → phase-03; `015 016 017 018` → phase-04; `020 021 022` → phase-05; `030 031` → phase-06; `040 041` → phase-07; `050 051 052` → phase-08; `060 061 062` → phase-09; `070 071 072` → phase-10; `080 081 082 083` → phase-11; `090` → phase-12. Start the file with the comment `# features with no UI (001 002 006 012 091) are not listed`
- [X] T068 [P] [US5] Write the fixtures:
  - `d02-pass/` (an export folder with a valid `SHA256SUMS`), `d02-fail-checksum/` (one PDF byte changed) and `d02-fail-future-date/`
  - `d12-pass/`, `d12-fail-legal-pending/` (`Regulated=yes`, `Legal=pending`, `Status=approved`) and `d12-fail-native-missing/` (a `money.` key with `Native check=n/a`)
  - `d13-pass-no-ui/` (`specs/001-x/plan.md` committed, no approvals) and `d13-fail-no-approval/` (`specs/009-x/plan.md` committed with no phase-02 approval)
  - `d14-pass/`, `d14-fail-claim/` (an English copy row containing the first term of `scripts/safety/prohibited-claims.txt`) and `d14-fail-banner-text/` (`sim.banner` English text wrong)
  - `d16-pass/` and `d16-fail-unapproved-screen/` (with a `GATE` file)
  
  All go in `scripts/design/tests/fixtures/`.
- [X] T069 [US5] Implement D-2 in `scripts/design/checks/d02-approvals.sh` (every `approvals.md` row has a valid date that is not in the future and an approver role; for package rows, the `Export` folder exists and `(cd <folder> && sha256sum -c --quiet SHA256SUMS)` passes) and D-12 in `scripts/design/checks/d12-copy.sh` (per-row review rules from the data model: native check required for `money.`, `status.`, `sim.` keys or `Regulated=yes`; legal required for `Regulated=yes`)
- [X] T070 [US5] Implement D-13 in `scripts/design/checks/d13-designs-before-plans.sh`: for each `ui-features.txt` line whose `specs/NNN-*/plan.md` exists, take its first commit date (`first_commit_date`) and require an `approvals.md` row with Artifact `phase-NN` whose Date is on or before it. Otherwise print `FAIL D-13 NNN plan exists without approved phase-NN package`
- [X] T071 [US5] Implement D-14 in `scripts/design/checks/d14-claims-labels.sh`. It scans `docs/design/copy-decks/**`, `docs/design/flows/**`, `docs/design/ia/**` and `docs/design/system/components.md` for every term in `scripts/safety/prohibited-claims.txt` (whole word, case-insensitive), and requires each copy deck to have a `sim.banner` row with English exactly `SIMULATION — NOT REAL MONEY` and Arabic exactly `محاكاة — ليست أموالاً حقيقية`. Do not add any `docs/design/**` path to the C-9 or C-16 exclusions: those files must stay scanned by the Phase 0 checks too
- [X] T072 [US5] Implement D-16 in `scripts/design/checks/d16-gate.sh` (gate mode only, for `GATE_PHASE`): the manifest at `docs/design/packages/phase-NN/` (latest `vN`) has `**Status**: approved` or `ready-for-approval`; every inventory screen with that `Phase` is in the manifest with `Hi-fi=approved`; every copy deck row is `approved` or `retired`; every named UR or heuristics file exists and has no `Critical=yes` finding that is not `verified`; every manifest row has `Baseline=done` and the matching PNGs exist under `baseline/{ar,en}/`. Run `bash scripts/design/tests/run.sh` until every fixture passes

### Implementation for User Story 5 — package template

- [X] T073 [P] [US5] Create `docs/design/packages/TEMPLATE/manifest.md` per AF §15, plus `docs/design/copy-decks/TEMPLATE.md` (the AF §11 header and the mandatory `sim.banner` row) and `docs/design/heuristics/TEMPLATE.md` (AF §13). Add a section "How to export a package" to `docs/design/README.md`: export each interface per language to PDF at 1× into `export/`, run `sha256sum *.pdf > SHA256SUMS`, and export baselines as `baseline/{ar,en}/<screen-id>@<size>.png` (research R-5, R-11)

### Implementation for User Story 5 — Phase 2 package (needed before features 003/004/005/007/008/009 are planned) 🎯 MVP finish

- [ ] T074 [US5] HUMAN: wireframe (five states, all sizes) every remaining `Phase=2` screen in `docs/design/screen-inventory.md` that is not part of the skeleton: sign-in, MFA OTP, demo role picker, app shells (web side nav, mobile bottom tabs), language switcher, global error page with correlation ID, permission-denied page, admin users/roles, config list/diff/approve, scenario controller, audit search. Set `Wireframe=done`
- [ ] T075 [US5] HUMAN: design the high-fidelity versions of all `Phase=2` screens in AR and EN, five states, every required size, using only approved components and tokens. Build spec frames (tokens, spacing, component variants annotated) and an interactive prototype. Set `Hi-fi=in-review`
- [X] T076 [US5] Draft `docs/design/copy-decks/phase-02.md` from TEMPLATE: every string on the Phase 2 screens, with English text in ICU, an Arabic draft, `Regulated` flags (any string about money, the simulation boundary or roles → review), and the `sim.banner` row
- [ ] T077 [US5] HUMAN: complete the Arabic review of every row in `docs/design/copy-decks/phase-02.md`, get the native-speaker spot-check on the `money.`, `status.`, `sim.` and regulated rows, and do the legal self-review on `Regulated=yes` rows. Set the statuses to `approved`
- [ ] T078 [US5] HUMAN: Phase 2 has no PRD journey, so run a key-task round `docs/design/usability/UR-02.md` with at least 3 volunteers (sign in, switch role and language, find and approve a config change, run a scenario, search audit), and write `docs/design/heuristics/phase-02.md` (Nielsen N1–N10 plus PDFE principles P1–P5). Fix and verify every critical finding
- [ ] T079 [US5] HUMAN: set the `Phase=2` screens to `Hi-fi=approved`. Export the PDFs, `SHA256SUMS` and baselines into `docs/design/packages/phase-02/` and fill `manifest.md` (`Status: ready-for-approval`). Run `bash scripts/design/check-design.sh --gate phase-02` until it exits 0
- [ ] T080 [US5] HUMAN: approve the Phase 2 package. Set the manifest to `Status: approved`, append the row `phase-02 | 1 | Design lead + Product owner + Legal/compliance | <login> | <date> | yes | docs/design/packages/phase-02/export | <figma link> | | ` to `docs/design/approvals.md`, and merge through a PR **before** `/speckit-plan` runs for 003, 004, 005, 007, 008 or 009

### Implementation for User Story 5 — packages for phases 3–12 (each done before that phase's UI features are planned)

For each package, apply the same four steps used for Phase 2: rolling wireframes → hi-fi, spec frames and prototype → copy deck and reviews → testing, export, gate and approval. Journey phases test with at least 5 participants; phases without a journey use at least 3 plus a heuristic review.

- [ ] T081 [US5] Phase 3 package (finance console v1, features 010/011/013/014; plan Phase 3 "UI/UX design"): HUMAN: wireframes and hi-fi for chart of accounts, account detail (posted/pending/held/available, running balance), journal detail (reversal links), trial balance, transaction trace view (timeline, journals, adapter events, audit, correlation copy) and manual synthetic funding with MakerCheckerPanel; draft and review `docs/design/copy-decks/phase-03.md`; run key-task round UR-03 (≥3) plus `docs/design/heuristics/phase-03.md`
- [ ] T082 [US5] Phase 3 package close-out: export to `docs/design/packages/phase-03/`, run `bash scripts/design/check-design.sh --gate phase-03` until it exits 0, and append the approval row to `docs/design/approvals.md` before features 010/011/013/014 are planned
- [ ] T083 [US5] Phase 4 package (KYC/KYB and compliance, features 015–018): HUMAN: consumer onboarding wizard (personal info → synthetic document picker → simulated selfie → review → status Pending/Approved/More info/Rejected), merchant/business KYB wizard, compliance onboarding queue/detail, alerts list/detail with match explanation, case queue/detail with a maker-checker decision panel, rules list/editor (draft → approval), risk explanation drawer, and the banner "Synthetic screening — not a real compliance check"; copy deck `phase-04.md`; round UR-04 (J6 engine screens, ≥5) plus heuristics
- [ ] T084 [US5] Phase 4 package close-out: export to `docs/design/packages/phase-04/`, run `check-design.sh --gate phase-04` until it exits 0, and add the approval row before 015–018 are planned
- [ ] T085 [US5] Phase 5 package (consumer wallet J1 hi-fi, features 020–022): HUMAN: mobile and web Home (balance cards, quick actions, recent activity), Add money, Withdraw, Send (recipient search, contacts, contact QR, amount keypad, note, review sheet, unlock, animated result, share watermarked receipt), Request money, Activity list, Transaction detail (status timeline, reference, trace ID), Statements (month, language, download), Notifications, and the error states (insufficient balance with Add money CTA, blocked recipient, under review, timeout); copy deck `phase-05.md`; hi-fi round UR-05 on J1 (≥5)
- [ ] T086 [US5] Phase 5 package close-out: watermarked statement and receipt export mock-ups in AR/EN, export to `docs/design/packages/phase-05/`, run `check-design.sh --gate phase-05` until it exits 0, and add the approval row before 020–022 are planned
- [ ] T087 [US5] Phase 6 package (merchant J2, features 030/031): HUMAN: merchant portal (KYB status, dashboard with SIMULATED tags, create payment/QR with print view, static QR, transactions, payment detail with refund, refunds, settlements and retry, payout account, staff, statements), merchant-lite mobile (Charge keypad → full-screen dynamic QR with countdown and "Paid" confirmation, Today's payments, Refund, Payout status), and consumer Scan QR → pay sheet → result plus dispute; copy deck `phase-06.md`; round UR-06 on J2 (≥5)
- [ ] T088 [US5] Phase 6 package close-out: export to `docs/design/packages/phase-06/`, run `check-design.sh --gate phase-06` until it exits 0, and add the approval row before 030/031 are planned
- [ ] T089 [US5] Phase 7 package (remittance J3, features 040/041): HUMAN: Receive from abroad (payout details with the synthetic code clearly marked SIM), incoming tracker (Initiated → Funded → Screening → In transit → Credited), Send abroad (corridor, beneficiary with screening notice, send/receive amount toggle, QuoteCard with expiry countdown and "Illustrative rates", review, result, tracking), and ops partner simulator, corridor config and FX rate board; copy deck `phase-07.md`; round UR-07 on J3 (≥5)
- [ ] T090 [US5] Phase 7 package close-out: export to `docs/design/packages/phase-07/`, run `check-design.sh --gate phase-07` until it exits 0, and add the approval row before 040/041 are planned
- [ ] T091 [US5] Phase 8 package (business J7 and developer portal, features 050–052): HUMAN: business dashboard, invoices list/editor (preview PDF watermarked)/detail with match drawer, customers, suppliers, payout request, approval inbox (MakerCheckerPanel, limits, SoD warnings), bank reconciliation view, reports and exports, team and limits, API keys; developer portal getting started, auth with demo keys, API reference, sample payloads, webhook catalog, delivery explorer, sandbox; copy deck `phase-08.md`; round UR-08 on J7 (≥5) plus a dev-portal key-task round (≥3)
- [ ] T092 [US5] Phase 8 package close-out: export to `docs/design/packages/phase-08/`, run `check-design.sh --gate phase-08` until it exits 0, and add the approval row before 050–052 are planned
- [ ] T093 [US5] Phase 9 package (PSH J4, features 060–062): HUMAN: finance console program overview (ACTIVE/HALTED banner, supply, liability, reserves, coverage gauge), reserve accounts and snapshots, issuance request, two-approver panel with conflict warnings, mint/burn log marked "SIMULATED CHAIN EVENT", redemption queue, reconciliation status, halt/resume with maker-checker; consumer PSH card with the persistent placeholder disclaimer, convert and redeem flows (simulated) with review, history; investor coverage widget with definition and timestamp; copy deck `phase-09.md` (every PSH string `Regulated=yes`); round UR-09 on J4 (≥5)
- [ ] T094 [US5] Phase 9 package close-out: export to `docs/design/packages/phase-09/`, run `check-design.sh --gate phase-09` until it exits 0, and add the approval row before 060–062 are planned
- [ ] T095 [US5] Phase 10 package (paper exchange J5, features 070–072): HUMAN: mobile Markets list (SIMULATED badge, price timestamp), Pair screen (chart, depth, trades), Order ticket (market/limit, bigint-validated inputs, estimated cost with fee, available balance, protection-band warning), Open orders, Trade history, Portfolio ("paper" P&L), simulated Deposit (fake address, "SIMULATED — do not send real crypto", deliberately invalid QR), simulated Withdraw, market halt banner; web trading layout; ops market status, price feed controls, surveillance alerts; copy deck `phase-10.md`; round UR-10 on J5 (≥5)
- [ ] T096 [US5] Phase 10 package close-out: export to `docs/design/packages/phase-10/`, run `check-design.sh --gate phase-10` until it exits 0, and add the approval row before 070–072 are planned
- [ ] T097 [US5] Phase 11 package (consoles, J6 full, investor dashboard, inclusion; features 080–083): HUMAN: ops home (queue counts, aging), transaction explorer, exception queues, transaction detail with trace and action panel, settlement batches, reconciliation runs/detail/exception (MakerChecker), daily close report; finance GL browser, trial balance (all entities), close dashboard, FX position; compliance J6 polish, case aging, audit export center; investor landing, guided scenarios, KPIs (definition, denominator, timestamp, SIMULATED), controls and architecture, system health, about the simulation; Explore partners, Consent, Referrals; copy deck `phase-11.md`; round UR-11 on J6 (≥5) plus an investor key-task round (≥3)
- [ ] T098 [US5] Phase 11 package close-out: export to `docs/design/packages/phase-11/`, run `check-design.sh --gate phase-11` until it exits 0, and add the approval row before 080–083 are planned
- [ ] T099 [US5] Phase 12 package (integrated demo, feature 090): HUMAN: design every `Phase=12` inventory screen (guided-scenario updates for J1–J7 and any polish changes raised by the US6 QA reports), copy deck `phase-12.md`, and an end-to-end round UR-12 across J1–J7 (≥5)
- [ ] T100 [US5] Phase 12 package close-out: export to `docs/design/packages/phase-12/`, run `check-design.sh --gate phase-12` until it exits 0, and add the approval row before 090 is planned

**Checkpoint**: Each package is approved before its phase is planned, and D-13 proves the order in CI.

---

## Phase 8: User Story 6 - Built screens are checked against the approved designs throughout delivery (Priority: P2)

**Goal**: The design review checklist in every UI PR, and baselines that the engineering features' visual comparison consumes.

**Independent Test**: Every merged PR that touches UI paths has the J.5 checklist ticked with evidence, and the visual comparison reports cover AR and EN.

- [X] T101 [US6] Add a "Design review (UI changes only — plan §J.5)" section with the nine §J.5 checkbox items and an "Approved frame / export path" field to `.github/pull_request_template.md`
- [X] T102 [P] [US6] Write `docs/design/qa/visual-comparison-contract.md`, the hand-off note for features 001 and 009: baselines are read from `docs/design/packages/phase-NN/<latest vN>/baseline/{ar,en}/<screen-id>@<size>.png`; web uses Playwright screenshots and mobile uses Maestro screenshots at the same sizes; a difference must be fixed, or approved as a design change (new package version plus an approval row), before merge (FR-033, research R-11)
- [X] T103 [US6] Add a `docs/design/README.md` section "Changing an approved design" covering FR-004 and research R-15: propose the change in a PR; create `packages/phase-NN/vN+1/`; set the inventory screens to `Hi-fi=changed`, then `approved`; append a new approval row; log shared component changes in `docs/design/system/CHANGELOG.md`; notify engineering by linking the PR in the affected feature's spec
- [ ] T104 [US6] HUMAN (continuous, from feature 009 onward): for every UI PR, complete the design review section against the approved export, and confirm that the visual comparison report covers both languages before merge

**Checkpoint**: Design QA runs on every UI PR.

---

## Phase 9: User Story 7 - The final product passes a full design audit before sign-off (Priority: P3)

**Goal**: The Phase 12 heuristic, WCAG 2.2 AA, RTL and copy audits across all 8 interfaces, feeding Gate 5/E.

**Independent Test**: The four `docs/design/qa/phase-12-*.md` files cover all 8 interfaces, and no `serious` or `critical` finding is `open` or `accepted`.

- [X] T105 [P] [US7] Create the four audit files `docs/design/qa/phase-12-heuristic.md`, `phase-12-a11y.md`, `phase-12-rtl.md` and `phase-12-copy.md`, each with an intro naming the method (Nielsen N1–N10 plus P1–P5; WCAG 2.2 AA with automated scan plus manual screen-reader pass on iOS VoiceOver, Android TalkBack and one desktop screen reader; the RTL rules in `docs/design/system/rtl-rules.md`; the prohibited-claims list plus the simulation-label check on every screen and export) and the AF §16 table header
- [X] T106 [US7] Extend D-1 in `scripts/design/checks/d01-formats.sh` to fail any `docs/design/qa/phase-12-*.md` row with `Severity` of `serious` or `critical` and `Status=accepted`. Add the fixture `d01-fail-qa-serious-accepted/` and make it pass
- [ ] T107 [US7] HUMAN: run the four audits on the integrated Phase 12 build across CON (mobile and web), MER, BIZ, OPS, CMP, FIN, INV and DEV, and record every finding in the four audit files
- [ ] T108 [US7] HUMAN: fix every `serious` and `critical` finding (through the US6 change process where a design changes), re-audit, and set the statuses to `fixed`. Then add rows to `docs/design/approvals.md` for each `qa/phase-12-*.md` file and link them from the Gate 5/E signed demo checklist (plan §J.7)

**Checkpoint**: The track is complete; the design quality record is ready for Gate 5/E.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T109 [P] Update `docs/design/phase-1-kickoff.md` with a "Status" line pointing to `docs/design/approvals.md` and `specs/000-ux-design-track/`
- [ ] T110 [P] Add a `## Phase 1 (000-ux-design-track)` section to `docs/evidence/phase-1/README.md` listing the evidence: the ruleset export, CI run links, the approvals table and the package export folders
- [ ] T111 Run the whole `specs/000-ux-design-track/quickstart.md` (§1–§6, reverting every negative test) and record the results with the date in `docs/evidence/phase-1/quickstart-run.md`
- [ ] T112 Run `bash scripts/governance/check-phase0.sh` and `bash scripts/design/check-design.sh` on `main`, and confirm both exit 0 with no regression in the C-checks (especially C-9 and C-16 on the new `docs/design/**` files)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T005)**: none. T004 (Figma) is needed only from T049 onward.
- **Foundational (T006–T014)**: depends on Setup and blocks every checked approval.
- **US1 (T015–T028)**: depends on Foundational.
- **US2 (T029–T041)**: depends on the US1 approval (personas and principles).
- **US3 (T042–T052)**: depends on the US2 approval (IA and flows). T042–T047 (tooling) may start after Foundational.
- **US4 (T053–T066)**: the token tooling (T053–T058) and D-9/D-10 (T059–T060) may start after Foundational, in parallel with US1–US3. Component design in Figma (T065) depends on the US3 checkpoint (FR-016a).
- **US5 (T067–T100)**: the gate tooling (T067–T072) may start after Foundational. The Phase 2 package (T074–T080) depends on US3 and US4. Each later package T081–T100 depends on the previous phase's package being approved, except that the Phase 7, 9 and 10 packages may run in parallel after the Phase 6 package (research R-15).
- **US6 (T101–T104)**: T101–T103 may run after Foundational. T104 starts when feature 009 begins building.
- **US7 (T105–T108)**: depends on the Phase 12 build (engineering feature 090).
- **Polish (T109–T112)**: after the stories it reports on. T111/T112 are re-run at each package milestone.

### Within each story

Fixtures come before checks, which come before artifacts, which come before HUMAN review and the approval row. The check must fail on its failing fixture before it is implemented.

### Parallel opportunities

- Setup: T002, T003 and T005.
- US1: T015, T017, T019, T021 and T023–T026 (separate files).
- US2: T029 and T030; T035, T036, T038, T039 and T040.
- US3: T042 and T043.
- US4: T053 and T054; T059, T061 and T062; the whole token track runs alongside US1–US3.
- US5: T067, T068 and T073; packages 7, 9 and 10 in parallel.
- US6: T102 runs alongside T101/T103. US7: T105.

## Parallel Example: User Story 1

```text
# After T016 (D-11) is green, draft these together:
T017 docs/design/research/stakeholder-notes.md
T019 docs/design/personas/PER-01…PER-10
T021 docs/design/research/context.md
T023 docs/design/research/patterns.md
T024 docs/design/research/test-plan.md
T025 docs/design/usability/task-sheet-template.md
T026 docs/design/principles.md
```

## Parallel Example: User Story 4 (alongside US1–US3)

```text
T053 packages/design-tokens/package.json      T054 scripts/check-contrast.test.mjs
T061 docs/design/system/accessibility-rules.md T062 docs/design/system/rtl-rules.md
```

## Implementation Strategy

### MVP: ready for Phase 2 planning

1. Setup and Foundational (T001–T014): `design-check` is required in CI.
2. US1 → US2 → US3 (T015–T052): research, IA and the tested skeleton.
3. US4 (T053–T066, with the token tooling started early): the design system.
4. US5 gate tooling and Phase 2 package (T067–T080).
5. **Stop and validate**: `check-design.sh --gate phase-02` exits 0 and the approval row is merged. Engineering may now run `/speckit-plan` for 003/004/005/007/008/009. Features 001, 002 and 006 may already be planned in parallel.

### Incremental delivery after the MVP

- One package per engineering phase (T081–T100), always approved before that phase's UI features are planned. D-13 fails CI otherwise.
- US6 starts with feature 009 and runs on every UI PR.
- US7 runs once in Phase 12 and closes the track.

### Solo-mode notes

Every HUMAN approval is a dated self-attestation (`Solo=yes`). Once the outside reviewer is named before Gate 1/B, they re-review each `Solo=yes` row and fill in `Re-reviewed by` and `Re-review date`.
