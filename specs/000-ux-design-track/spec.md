# Feature Specification: UX/UI Design Track — From Scratch to Final Product (Phase 1, continuous M0 → M7)

**Feature Branch**: `000-ux-design-track`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "read PDFE_IMPLEMENTATION_PLAN carefully and create a specification for Phase 1 — UX/UI Design Track: From Scratch to Final Product (continuous, M0 → M7)"

**Source**: `docs/source/PDFE_IMPLEMENTATION_PLAN.md` — Part H Phase 1 (Stages 1–6), with Parts B.2 (R-02, R-13, R-19), F.2 (NFR-006), F.3, F.4, G.1, I.1, I.2, I.8, I.9, J.2 (D-04), J.3, J.5, J.6, and the "UI/UX design" section of each of Phases 2–12. Also `docs/source/01_MASTER_PRD.md` §3, §8, §10 and §13, and constitution Articles I, VIII and IX.

**Numbering note**: Phase 1 has no entry in the plan's feature index (§J.11). Numbers 001 onwards are reserved for the engineering features in that index. This spec therefore uses the `000-` prefix, the same prefix as the other pre-engineering work that starts at M0 (Phase 0). The mapping is recorded in `specs/README.md`.

## Overview

PDFE (Palestinian Digital Financial Ecosystem) is a **simulation-only** demonstration platform that uses synthetic data. Phase 1 is the design track. It designs every interface: the consumer mobile app (with merchant-lite mode) and all web portals and consoles. The work runs from research to a production design system and final pixel-level specifications. Everything is in Arabic and English, accessible, and clearly labeled as a simulation.

Phase 1 is not a one-off phase. It starts at M0, alongside Phase 0, and runs until M7. Design stays **one phase ahead of engineering**: the designs for engineering Phase N must be approved before Phase N's planning step starts. The track has six stages:

1. Discovery and research
2. Information architecture and flows
3. Low-fidelity wireframes
4. Visual design and design system
5. High-fidelity design handoff, one package per engineering phase
6. Design QA and final product polish

This spec turns the track into verifiable outcomes: which design artifacts must exist, what each must contain, who approves it, and when engineering may consume it.

## Clarifications

### Session 2026-11-15

- Q: Since you are working alone, who will be the five or more usability test participants needed for each test round? → A: Volunteers from the implementer's own network (friends, family, colleagues). Remote and unmoderated sessions are allowed. Each round still needs at least 5 participants, and all are anonymized.
- Q: Who will review the Arabic wording before a design package can be approved, including the status terms and every Arabic string in the copy decks? → A: The implementer (fluent or native in Arabic) reviews all Arabic strings, with a dated self-attestation. A volunteer native speaker spot-checks the money, status and regulated strings.
- Q: For engineering phases that have no PRD journey, should their screens still get a usability test round before handoff? → A: Yes, a lighter round. At least 3 participants test the key tasks, and a heuristic review against the design principles is recorded. Journeys J1–J7 keep the full rule of at least 5 participants.
- Q: How should approved designs be kept as permanent evidence, given the repository is public and the design tool's files live outside it? → A: Link plus frozen export. The screens of each approved package are exported (PDF or images) and committed under `docs/design/`. The export is the record of truth, and the live design-tool link is kept for convenience only.
- Q (2026-11-15, implementation): Should the design be built in Figma, and should usability tests with people run in the first build? → A: The designs are built as an HTML prototype in the repository (`docs/design/prototype/`), rendered from the design tokens, because the AI agent cannot operate Figma; the frozen export is still PDF plus checksums. Usability testing with people is waived for the first build by the sponsor and replaced by heuristic reviews (`docs/design/usability/WAIVER.md`), so FR-020, FR-030, SC-006 and SC-007 are not met for now.
- Q: Should every screen in the inventory be wireframed up front, before visual design starts, or should wireframes be produced on a rolling basis, one engineering phase ahead? → A: Hybrid. Up front: the key screens of every interface, plus J1 and J2 in full. The remaining screens are wireframed on a rolling basis, one phase ahead, before each phase's handoff package.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Design lead grounds the product in its real users (Priority: P1)

The design lead interviews the stakeholders: sponsor, product owner, finance specialist and compliance. The design lead then runs a proto-persona workshop covering the ten PRD personas and researches the context of use: mobile-first and Arabic-first users, low bandwidth, shared devices, and cash habits in ILS, JOD and USD. The design lead also reviews patterns in comparable products (wallets, merchant QR, remittance, exchange) without copying them, writes a usability test plan, and agrees on five design principles. Every later design decision can then be traced to a persona need, a context finding or a principle.

**Why this priority**: Nothing else in the track can be justified without this foundation. Personas drive the sitemaps, permission views and copy. Context findings decide defaults such as the digit system for amounts and low-bandwidth states.

**Independent Test**: Open `docs/design/`. Confirm that all of these exist: the stakeholder notes, ten persona files, the context report, the pattern review, the usability test plan and the principles file. Confirm that each persona file covers goals, pains, devices, language, literacy and accessibility needs, and that none of these files contains real personal data.

**Acceptance Scenarios**:

1. **Given** the PRD lists ten personas, **When** Stage 1 is complete, **Then** there is one persona file per PRD persona and each covers goals, pains, devices, language, literacy and accessibility needs.
2. **Given** the five design principles from the plan (Clarity over cleverness · Always-visible simulation status · Arabic-first · Confirm before money moves · Explain every number), **When** the principles file is reviewed, **Then** it states each principle with a short explanation of how it is applied and checked.
3. **Given** a research note that contains a participant's real name, phone number or other identifying detail, **When** it is prepared for the repository, **Then** that detail is removed or replaced before the note is committed.
4. **Given** the pattern review, **When** it is inspected, **Then** it describes patterns in neutral terms and contains no copied screens, brand assets or trade dress from any existing product.

---

### User Story 2 - Every app has an agreed structure, flows and vocabulary (Priority: P1)

The design lead produces sitemaps for all eight interfaces: consumer (mobile and web), merchant, business, operations, compliance, finance/treasury, investor and developer portal. Next come user flows for journeys J1–J7, including every exception path the PRD lists. The design lead also defines the navigation model for mobile and web, a single transaction-status vocabulary in Arabic and English, and a matrix that shows which persona sees which navigation item. Engineering and design then share one map of the product before any screen is drawn.

**Why this priority**: Flows that miss exception paths are the most expensive design defect to fix later. The status vocabulary and the permission-to-navigation matrix feed straight into Phase 2 (app shells, roles) and Phase 3 (transaction states).

**Independent Test**: For each journey J1–J7, compare the flow with the exception list in PRD §8 and confirm that every listed exception has a path. Confirm that each of the eight interfaces has a sitemap, and that every navigation item in a sitemap appears in the persona/navigation matrix.

**Acceptance Scenarios**:

1. **Given** J1 lists insufficient balance, duplicate submission, blocked recipient, service timeout and reversal as exceptions, **When** the J1 flow is reviewed, **Then** each exception has its own path ending in a defined user-visible outcome. The same check applies to J2–J7.
2. **Given** the mobile navigation model, **When** it is reviewed, **Then** it has a bottom tab bar (Home · Pay/Scan · Send · Markets · Profile) and a persistent simulation indicator in the header.
3. **Given** the web console navigation model, **When** it is reviewed, **Then** it has a side navigation that mirrors in right-to-left layouts, plus a top bar with tenant switcher, role badge and a "DEMO" environment badge.
4. **Given** the status vocabulary (Draft, Pending, Held, Under review, Completed, Failed, Reversed, Expired), **When** it is reviewed, **Then** every status has one agreed Arabic equivalent, a meaning, and a visual treatment that does not rely on color alone.
5. **Given** a persona such as demo viewer, **When** the persona/navigation matrix is checked, **Then** that persona sees only read-only navigation items, consistent with the starter role matrix (plan §J.3).

---

### User Story 3 - Wireframes prove the flows work before visual design (Priority: P1)

The design lead draws greyscale wireframes for every screen in the screen inventory (plan §J.6) at the target mobile, tablet and web sizes. First comes an up-front skeleton: the key screens of every interface, plus J1 and J2 in full. The remaining screens follow on a rolling basis, one engineering phase ahead. Each screen is drawn in five states: populated, empty, loading, error and permission-denied. Every money-moving screen follows the three-step pattern Enter → Review → Result. The wireframes are linked into a clickable prototype and tested with participants, J1 and J2 first, and the findings are recorded.

**Why this priority**: Wireframe testing is the cheapest point to find flow and comprehension problems. The five-state rule and the three-step money pattern are constitutional requirements (Articles IX and III/VIII) that every later screen inherits.

**Independent Test**: Pick any screen from the inventory and confirm that its wireframe exists at each required size and in all five states. Pick any money-moving screen and confirm that the Review step shows fees, FX, the exact amount received and a "simulated" label, and that the Result step shows a receipt, status and trace ID. Open the J1 and J2 test reports and confirm the participant count and findings.

**Acceptance Scenarios**:

1. **Given** the screen inventory, **When** Stage 3 is complete for a given engineering phase, **Then** every screen for that phase has a wireframe in all five states at its required sizes.
2. **Given** a screen in the error state, **When** it is reviewed, **Then** it offers a retry action and shows a correlation ID the user can copy.
3. **Given** a money-moving flow (send, pay, add money, withdraw, remit, convert, redeem, place order, payout), **When** its wireframes are reviewed, **Then** no money moves before an explicit Review step, and the Result step shows a reference, status and trace ID.
4. **Given** the J1 and J2 clickable prototypes, **When** the usability round is run, **Then** at least five participants complete the round and every finding is recorded with a severity rating.

---

### User Story 4 - A design system makes every screen consistent, accessible and bilingual (Priority: P1)

The design lead builds the design system. Design tokens cover color, typography, spacing, radius, elevation, motion and breakpoints. The color tokens include a simulation accent reserved for simulation labels only, and a data-visualization palette that is safe for colorblind users. The component library spans foundations, feedback, data, navigation, overlays and domain components. Accessibility and right-to-left rules are built into the components rather than left to each screen. The tokens are exported in a form that web and mobile code can consume without manual edits.

**Why this priority**: Phase 2 (feature 009, app shells) cannot be planned without tokens and shell components. The constitution's labeling rule (Article VIII) and inclusion rule (Article IX) are enforced most reliably through shared components: the non-dismissible simulation banner, the SIMULATED badge, money text and status chips.

**Independent Test**: Export the tokens and confirm that they produce web and mobile theme outputs with no hand edits. Run a contrast check over every text and UI token pair in use. Confirm that each component in the library list exists in the design source, with its variants, its states and its right-to-left version.

**Acceptance Scenarios**:

1. **Given** the token set, **When** it is exported, **Then** web and mobile theme outputs are generated with no manual edits, and a change to a token value appears in both outputs.
2. **Given** every text and UI color pair used, **When** contrast is checked, **Then** text pairs reach at least 4.5:1 and UI component pairs at least 3:1.
3. **Given** the simulation accent, **When** the token set is inspected, **Then** the accent is used only by simulation label components and nowhere else.
4. **Given** the simulation banner component, **When** it is placed on a screen, **Then** it cannot be dismissed, hidden or covered by other content, and it carries the bilingual label "SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية".
5. **Given** a status chip, **When** it is viewed without color (greyscale), **Then** the status is still identifiable from its icon and text.
6. **Given** a screen switched from English to Arabic, **When** it is reviewed, **Then** layout and directional icons (arrows, chevrons) mirror, while logos, media controls, numbers, amounts and IDs do not mirror and keep left-to-right order.
7. **Given** any interactive component, **When** it is reviewed, **Then** it has a visible focus indicator, a touch target of at least 44×44, an accessible label (for icon-only controls), and errors linked to their fields.

---

### User Story 5 - Engineering receives an approved, complete handoff package before each phase is planned (Priority: P1)

For each engineering phase (2 through 12), the design lead delivers a handoff package before that phase's planning step. The package contains: high-fidelity screens in Arabic and English, in all five states; an interactive prototype of the phase's journey; redlines and specifications that show the tokens, spacing and component variants used; a bilingual copy deck whose regulated wording has been reviewed by legal/compliance; and a usability test report for each journey in the phase (for a phase with no journey, a lighter key-task test and a heuristic review). The product owner records approval. The engineering team then plans and builds against a fixed, approved design.

**Why this priority**: This is the track's core promise: "design one phase ahead". A late or incomplete package blocks the matching engineering phase or forces engineers to invent designs, which the plan's Definition of Ready forbids (plan §I.1: "designs approved (link to frame)").

**Independent Test**: For any engineering phase, open its handoff package. Confirm that every screen listed in that phase's "UI/UX design" section is present in both languages and all five states. Confirm that the prototype, redlines, copy deck, usability report, legal/compliance copy approval and product owner approval are all present, and that the approval date is earlier than the start of that phase's planning.

**Acceptance Scenarios**:

1. **Given** engineering Phase 2 is next, **When** its package is delivered, **Then** it covers sign-in with MFA OTP, the demo role picker, web and mobile app shells, the language switcher, the global error page with correlation ID, the permission-denied page, admin users/roles, config list/diff/approve, the scenario controller and audit search.
2. **Given** a phase's package is not yet approved, **When** someone tries to start that phase's planning step, **Then** planning is blocked until approval is recorded.
3. **Given** a copy deck string that describes regulated activity (for example deposits, redemption, licensing or yields), **When** legal/compliance reviews it, **Then** it is approved, reworded or removed, and no prohibited claim (any term in `scripts/safety/prohibited-claims.txt`) remains.
4. **Given** a usability round finds a critical issue in a journey, **When** the package is prepared for handoff, **Then** the issue is fixed and re-checked before approval, or the package is not approved.
5. **Given** an approved design changes after handoff, **When** the change is proposed, **Then** it goes through change control: it is re-approved, its version is recorded, and engineering is notified before the change is built.

---

### User Story 6 - Built screens are checked against the approved designs throughout delivery (Priority: P2)

Every pull request that touches the user interface is checked against the design review checklist (plan §J.5). The built screens are also compared automatically with the approved designs in Arabic and English, on web and on mobile. Differences from the approved design are found during delivery rather than at the end.

**Why this priority**: Design QA protects the quality of everything built in Phases 2–11. It depends on the first handoff packages and the first built screens, so it starts after Stories 4 and 5.

**Independent Test**: Open any merged pull request that touches the interface and confirm that the design review checklist is completed. Open the latest visual comparison report and confirm that it covers both languages for the screens changed in that pull request.

**Acceptance Scenarios**:

1. **Given** a pull request that changes a screen, **When** it is reviewed, **Then** all nine items of the design review checklist are answered with evidence.
2. **Given** a built screen that differs from its approved design in Arabic or English, **When** the visual comparison runs, **Then** the difference is reported and must be fixed or accepted as an approved design change before merge.

---

### User Story 7 - The final product passes a full design audit before sign-off (Priority: P3)

In Phase 12 the design lead runs a full heuristic review, a WCAG 2.2 AA accessibility audit, a right-to-left audit and a copy audit for prohibited claims, across every interface. The findings feed the Gate 5/E signed demo checklist. The integrated demonstration then ships with a design quality record that the sponsor can rely on.

**Why this priority**: The audit is the last quality step before the final gate, but it needs the whole product to exist first.

**Independent Test**: Open the Phase 12 design audit reports and confirm that they cover all eight interfaces and all four audit types, that every finding has a resolution status, and that no critical or serious finding is left open.

**Acceptance Scenarios**:

1. **Given** the integrated product, **When** the accessibility audit is run, **Then** it reports zero unresolved serious or critical WCAG 2.2 AA failures, including a manual screen-reader pass on mobile and web.
2. **Given** all interface copy and exports, **When** the copy audit is run, **Then** no prohibited claim remains, and every screen and export carries the simulation label.

---

### Edge Cases

- **Brand still undecided (D-04)**: design proceeds with the default "PDFE Demo" name and the PSH placeholder. The brand primary color stays one replaceable token, so a later sponsor decision changes one token and no screens.
- **Engineering ready before design**: if an engineering phase is ready to plan but its package is not approved, planning waits. The delay is recorded as a schedule risk, not worked around by building undesigned screens.
- **Parallel phases**: after Phase 5, Phases 7, 9 and 10 may run in parallel. Their handoff packages may then be produced in parallel, but each is approved separately.
- **Arabic text expansion and truncation**: Arabic strings are often longer or shorter than English. Layouts are checked with expanded text so that labels, amounts and buttons do not truncate or overlap.
- **Mixed-direction content**: amounts, currency codes, IDs, IBAN-like codes and trace IDs inside Arabic sentences keep their left-to-right order and are not reordered by the surrounding text.
- **Digit system**: Western (0–9) and Arabic-Indic digits are both supported as a user setting. Western is the default for money clarity unless research shows otherwise; the outcome is recorded in the context report.
- **Screens that exist on web only**: business, operations, compliance, finance, investor and developer interfaces are web-only (plan §F.4). They need web sizes only. The investor dashboard must still be usable at the smallest web size.
- **A screen appears that is not in the inventory**: it is added to the screen inventory first, then designed in all five states, then approved, and only then built.
- **A usability participant shares real personal data during a session**: the data is not written into notes. If it is captured by accident, it is removed before any file is committed.
- **The simulation accent fails contrast on a background**: the token is adjusted or a dedicated pairing is defined. The simulation label is never dropped or weakened to pass a check.
- **Exports and shared images** (statements, receipts shared as images, PDFs, CSV previews): each export mock-up carries the simulation watermark, and is designed in both languages with correct Arabic shaping.
- **A late design change after a screen is built**: handled by the change control in User Story 5. The built screen is updated through a normal pull request, re-checked against the new design.
- **PSH and crypto screens**: PSH carries a persistent disclaimer that it is a placeholder for a proposed instrument and not redeemable. Crypto deposit screens carry "SIMULATED — do not send real crypto", and their QR codes are deliberately invalid.

## Requirements *(mandatory)*

### Functional Requirements

**Track governance and timing**

- **FR-001**: The track MUST start at M0, in parallel with Phase 0, and continue until M7. Design artifacts for engineering Phase N MUST be approved before Phase N's planning step starts.
- **FR-002**: Every design artifact MUST be stored under `docs/design/` (or linked from there when it lives in the design source) and MUST be version-controlled, so that it can be found from the specs, the traceability matrix and pull requests. When a design package is approved, its screens MUST be exported (PDF or images) and committed under `docs/design/`. This frozen export is the record of truth for what was approved. The live design-tool link is kept for convenience only.
- **FR-003**: Approvals MUST be recorded in `docs/design/approvals.md`. Each entry gives the artifact, its version, the approver role, the date, the path of the frozen export, and a link to the live frames. In solo mode the approval is a dated self-attestation under the existing solo-mode exception (`docs/governance/solo-mode-exception.md`). Each such approval is marked for re-review by the outside reviewer once one is named.
- **FR-004**: A change to an approved design MUST follow change control: it is proposed, re-approved and versioned, and engineering is notified before it is built.
- **FR-005**: All research, prototypes, test scenarios, sample data and screens MUST use synthetic data only. Participant notes MUST be anonymized before they are committed. Because the repository is public, nothing committed may identify a real participant.

**Stage 1 — Discovery and research**

- **FR-006**: The track MUST produce stakeholder interview notes covering the sponsor, product owner, finance/ledger specialist and legal/compliance roles (`research/stakeholder-notes.md`).
- **FR-007**: The track MUST produce one persona file for each of the ten PRD §3 personas (`personas/*.md`). Each covers goals, pains, devices, language, literacy and accessibility needs, and links to the persona's allowed demo capabilities.
- **FR-008**: The track MUST produce a context report covering mobile-first usage, Arabic-first users, low-bandwidth conditions, shared devices and ILS/JOD/USD cash habits. It MUST include a recommendation on the default digit system for amounts (`research/context.md`).
- **FR-009**: The track MUST produce a pattern review of wallet, merchant QR, remittance and exchange interfaces that records patterns only, with no copied screens or brand assets (`research/patterns.md`).
- **FR-010**: The track MUST produce a usability test plan: 5–8 participants per round, recruited as volunteers from the implementer's own network; how each session is run (moderated, remote, or unmoderated with written tasks and recorded answers); scenarios built on synthetic data, tasks per journey, a severity scale for findings, and the criteria for a "critical" issue (`research/test-plan.md`).
- **FR-011**: The track MUST record the five design principles from the plan, each with how it is applied and how compliance is checked (`principles.md`).

**Stage 2 — Information architecture and flows**

- **FR-012**: The track MUST produce a sitemap for each of the eight PRD §10 interfaces: consumer (mobile and web), merchant, business, operations, compliance, finance/treasury, investor and developer portal.
- **FR-013**: The track MUST produce user flows for J1–J7 covering the main path and every exception listed in PRD §8. Each exception ends in a defined user-visible outcome.
- **FR-014**: The track MUST define the navigation model: on mobile, a bottom tab bar (Home · Pay/Scan · Send · Markets · Profile) and a persistent simulation indicator; on web consoles, a side navigation that mirrors in RTL and a top bar with tenant switcher, role badge and a "DEMO" environment badge.
- **FR-015**: The track MUST define the transaction-status vocabulary (Draft, Pending, Held, Under review, Completed, Failed, Reversed, Expired). Each status gets an agreed Arabic equivalent, a plain-language meaning and a visual treatment that does not depend on color alone. The Arabic equivalents are approved by the implementer (self-attested) and spot-checked by a volunteer native Arabic speaker.
- **FR-016**: The track MUST produce a persona-to-navigation permission matrix, consistent with the starter role matrix in plan §J.3, showing which persona sees which navigation item.

**Stage 3 — Wireframes**

- **FR-016a**: Wireframing MUST follow a hybrid schedule. The up-front skeleton covers the key screens of every interface: entry or home, primary navigation, and one representative list and detail screen per interface. It also covers every screen of J1 and J2. The skeleton is completed and tested before visual design starts. Every other screen is wireframed on a rolling basis, before work starts on its phase's handoff package.
- **FR-017**: Every screen in the screen inventory (plan §J.6) MUST be wireframed, at the time FR-016a sets for it, in five states: populated, empty, loading (skeleton), error (with retry and a copyable correlation ID) and permission-denied.
- **FR-018**: Wireframes MUST cover the required sizes: mobile 360×800 and 390×844; web 1280 and 1440; tablet 768. Web-only interfaces need only the web and tablet sizes.
- **FR-019**: Every money-moving screen MUST follow the three-step pattern. Enter, then Review (showing fees, FX rate, the exact amount received and a "simulated" label), then Result (showing a receipt, status, reference and trace ID).
- **FR-020**: Wireframes MUST be testable as a clickable prototype. J1 and J2 MUST be tested first, with at least five participants, and the findings recorded.

**Stage 4 — Visual design and design system**

- **FR-021**: The design system MUST define these token groups: color, typography, spacing, radius/elevation/motion, and breakpoints.
  - Color: a brand primary that can be replaced (D-04), neutrals 0–950, the semantic colors success, warning, danger and info, a simulation accent reserved for simulation labels, and a data-visualization palette safe for colorblind users.
  - Typography: Arabic and Latin families, tabular figures for numbers, and the scale 12/14/16/18/20/24/30/36.
  - Spacing: a 4-point base (0, 4, 8, 12, 16, 24, 32, 48, 64).
  - Radius: 4/8/12/full. Elevation: three levels. Motion: 150 and 250 ms, each with a reduced-motion variant.
  - Breakpoints: 360, 768, 1024, 1280, 1536.
- **FR-022**: Tokens MUST be exported from a single source into outputs that the web and mobile apps can consume, with no manual edits between the export and its use.
- **FR-023**: The component library MUST include every component listed in plan Phase 1 Stage 4, in six groups:
  - Foundations: including a money input that never loses precision and supports locale digits.
  - Feedback: including a non-dismissible SimulationBanner, a SimulatedBadge, and an ErrorState with a copyable correlation ID.
  - Data: including MoneyText, StatusChip, Timeline, AuditTrail, TraceLink, chart wrappers with a definition/denominator/timestamp footer, and a KPI tile with a "SIMULATED" tag.
  - Navigation: app shell, side navigation, top bar and bottom tab bar.
  - Overlays: including a confirmation dialog for money movement and a MakerCheckerPanel that shows requester, approver, reason and a separation-of-duties warning.
  - Domain: QR display and scanner frame, ReceiptCard, QuoteCard, order book, order ticket, depth chart, reserve coverage gauge, case card and evidence list.
- **FR-024**: Every component MUST meet these accessibility rules:
  - Contrast of at least 4.5:1 for text and 3:1 for UI elements.
  - A visible focus indicator.
  - Touch targets of at least 44×44.
  - A label on every icon-only control.
  - Form errors linked to their fields.
  - No information conveyed by color alone.
  - Asynchronous status changes announced to assistive technology.
  - Support for reduced motion and dynamic text size.
- **FR-025**: Every component MUST meet these right-to-left rules: layout mirrors in RTL; directional icons mirror; logos, media controls and numbers do not mirror; amounts, currency codes and IDs are kept in isolated left-to-right runs; both Western and Arabic-Indic digits are supported as a user setting.
- **FR-026**: Every dashboard, chart and KPI component MUST show simulation status, data timestamp, metric definition and denominator. Modeled impact MUST NOT be presented as observed impact.

**Stage 5 — High-fidelity handoff per engineering phase**

- **FR-027**: For each engineering phase 2–12, the track MUST deliver a handoff package before that phase's planning step. The package MUST contain:
  - high-fidelity screens in Arabic and English, in all five states, for every screen in that phase's "UI/UX design" section;
  - an interactive prototype of the phase's journey;
  - redlines and specifications showing the tokens, spacing and component variants used;
  - a bilingual copy deck keyed for the shared message catalog;
  - a usability test report for each journey in the phase, or, for a phase with no journey, a key-task test report and a heuristic review (see FR-030).
- **FR-028**: The light theme is required. A dark theme is optional and out of scope unless it is added later through change control.
- **FR-028a**: Every Arabic string in a copy deck MUST have a recorded Arabic review by the implementer. Every money, status and regulated string MUST also have a recorded spot-check by a volunteer native Arabic speaker before the package is approved.
- **FR-029**: Every copy deck string that describes regulated activity MUST be approved by the legal/compliance role before handoff. The copy deck MUST NOT contain any prohibited claim listed in `scripts/safety/prohibited-claims.txt`, the project's single list of banned claims.
- **FR-030**: Each journey (J1–J7) in a phase MUST be usability-tested with at least five participants. A phase package with no PRD journey (for example Phase 2 shells and admin, Phase 3 finance console v1, or console-only additions) MUST be tested on its key tasks with at least three participants, and MUST have a recorded heuristic review against the design principles. In both cases, critical issues MUST be fixed and re-checked before the package is approved.
- **FR-031**: Every screen and every export mock-up (statements, receipts, PDFs, shared images) MUST carry the simulation banner or watermark. PSH screens MUST carry the persistent placeholder disclaimer. Simulated crypto deposit screens MUST carry the "do not send real crypto" warning and a deliberately invalid QR code.

**Stage 6 — Design QA and final polish**

- **FR-032**: Every pull request that touches the user interface MUST complete the design review checklist (plan §J.5).
- **FR-033**: Built screens MUST be compared automatically with the approved designs (as recorded in the frozen export), in Arabic and English, on web and mobile. Differences MUST be fixed or approved as design changes before merge.
- **FR-034**: In Phase 12 the track MUST deliver a full heuristic review, a WCAG 2.2 AA accessibility audit (including a manual screen-reader pass), an RTL audit and a prohibited-claims copy audit across all interfaces. Each finding gets a resolution status. The results feed the Gate 5/E signed demo checklist.

### Key Entities

- **Persona**: one of the ten PRD user types. It has goals, pains, devices, language, literacy, accessibility needs and allowed demo capabilities, and it is linked to the roles that may use each interface.
- **Research artifact**: stakeholder notes, context report, pattern review or test plan. Synthetic and anonymized.
- **Design principle**: a named rule with how it is applied and how it is checked.
- **Sitemap**: the structure of one interface. Its navigation items map to personas in the permission matrix.
- **User flow**: the main path and exception paths for one journey (J1–J7). Each path ends in a user-visible outcome.
- **Status term**: one entry of the transaction-status vocabulary, with English and Arabic labels, a meaning and a visual treatment.
- **Screen**: one entry in the screen inventory. It belongs to an interface and an engineering phase, has required sizes, and exists as a wireframe and as a high-fidelity design.
- **Screen state**: one of the five required states of a screen (populated, empty, loading, error, permission-denied).
- **Design token**: a named design value (color, type, spacing, radius, elevation, motion, breakpoint), exported to web and mobile outputs.
- **Component**: a reusable interface element with variants, states, accessibility behavior and RTL behavior.
- **Copy deck entry**: a message key with English and Arabic text, a regulated-wording flag, an Arabic review status (implementer review, native-speaker spot-check where required) and an approval status.
- **Prototype**: a clickable flow for a journey, used in usability testing and handoff.
- **Usability round**: a test session series for one or more journeys, with participants (anonymized), tasks, findings with severity, and fixes.
- **Handoff package**: the full set of design deliverables for one engineering phase, with its approval record.
- **Approval record**: artifact, version, approver role, date, solo-mode flag, path to the frozen export (the record of truth) and a link to the live frames.
- **Design QA report**: visual comparison results, completed design review checklists, and the Phase 12 audit findings with resolution status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of engineering phases 2–12 have an approved handoff package dated before that phase's planning starts. No engineering phase is planned against an unapproved design.
- **SC-002**: 100% of screens in the screen inventory exist in Arabic and English, at every required size, in all five states, by the time their engineering phase is planned.
- **SC-003**: 100% of the exception paths listed in PRD §8 for J1–J7 are covered by a designed flow.
- **SC-004**: 100% of text and UI color pairs in use meet contrast requirements (4.5:1 text, 3:1 UI).
- **SC-005**: Token changes reach web and mobile outputs with zero manual edits. A one-token change appears in both outputs in a single export.
- **SC-006**: Every journey prototype (J1–J7) is tested with at least five participants. Every package without a journey is tested with at least three participants and has a recorded heuristic review. Zero critical usability issues remain open at handoff.
- **SC-007**: In usability rounds, at least 80% of participants complete each journey's main task without help, and at least 90% correctly identify that the product is a simulation after their first screen.
- **SC-008**: 100% of screens and export mock-ups carry the simulation label, and the copy audit finds zero prohibited claims at handoff and at Phase 12.
- **SC-009**: 100% of regulated copy strings have a recorded legal/compliance approval before handoff.
- **SC-010**: 100% of merged pull requests that touch the interface have a completed design review checklist and a visual comparison result for both languages.
- **SC-011**: The Phase 12 accessibility audit reports zero unresolved serious or critical WCAG 2.2 AA failures across all eight interfaces.
- **SC-012**: Zero committed design artifacts contain real personal data or copied third-party brand assets.
- **SC-013**: 100% of approval records point to a committed frozen export that matches the approved version.

## Assumptions

- **Scope of this spec**: this spec covers the whole track. Stages 1, 2 and 4 are delivered once, as the foundation, and updated through change control. Stage 3 is a hybrid: an up-front skeleton, then rolling wireframes (FR-016a). Stage 5 is a repeatable handoff standard applied once per engineering phase (2–12). The screen list for each package comes from that phase's "UI/UX design" section and from the screen inventory. Stage 6 runs continuously from the first built screen and ends with the Phase 12 audit.
- **First package priority**: the Phase 2 package (shells, sign-in, admin, scenario controller, audit search) and the design system are needed first, because feature 009 (app shells) depends on them. Stages 1, 2 and 4 and the Stage 3 skeleton are timed so that both are ready before Phase 2 planning.
- **Solo mode**: one person holds every role, including design lead, product owner and legal/compliance. Approvals are dated self-attestations under the existing solo-mode exception, and each is re-reviewed once an outside reviewer is named before Gate 1/B.
- **Brand (D-04)**: still open. The default is "PDFE Demo", with PSH as a placeholder symbol. The brand primary color is one replaceable token.
- **Design tool**: one design source of truth with prototyping, developer inspection (redlines) and token export. The plan's recommendation is Figma with a tokens plugin. The tool choice belongs to planning, not to this spec.
- **Themes**: light theme only. Dark theme is out of scope unless added later through change control.
- **Digit default**: Western digits are the default for amounts, and Arabic-Indic digits are a user setting. Research may change the default; any change is recorded in the context report and approved.
- **Calendars and time**: dates use the Gregorian calendar, and the display time zone defaults to Asia/Jerusalem (user-configurable), per plan §I.8.
- **Fonts**: Arabic and Latin typefaces with open licenses and tabular figures (for example IBM Plex Sans Arabic / Noto, and IBM Plex Sans / Inter), so that they can be used in apps and PDF exports without licensing cost.
- **Usability participants**: volunteers from the implementer's own network (friends, family, colleagues). They take part voluntarily, and remote or unmoderated sessions are allowed. Each round needs at least 5 participants. Sessions use synthetic scenarios only, and notes identify participants only by a code (for example P1–P8), with no identifying details. Because people from your own network may be more lenient than real users, the test plan aims for a mix of Arabic-first, mobile-first and less tech-savvy volunteers where possible.
- **Arabic localization review**: the implementer, who is fluent in Arabic, reviews every Arabic string and self-attests the review. A volunteer native Arabic speaker spot-checks every money, status and regulated string. Copy that has not had both reviews is marked unreviewed and may not be part of an approved package.
- **Dependencies**: the Phase 0 governance baseline (accepted at Gate 0/A), the PRD and plan source documents in `docs/source/`, the decision register (D-04), and the starter role matrix (plan §J.3). The track feeds the Definition of Ready of every UI story (plan §I.1) and the Gate 5/E signed demo checklist.
- **Out of scope**: building application code, choosing implementation technologies, live brand launch materials, marketing sites, dark theme, and any design that implies a live financial service.
