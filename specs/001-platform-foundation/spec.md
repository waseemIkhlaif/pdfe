# Feature Specification: Platform Foundation (Phase 2, M1 → part of Gate 1)

**Feature Branch**: `001-platform-foundation`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "read PDFE_IMPLEMENTATION_PLAN.md carefully and create a specification for Phase 2 — Platform Foundation (M1 → part of Gate 1)"

**Source**: `docs/source/PDFE_IMPLEMENTATION_PLAN.md`, mainly Part H Phase 2. Also Parts B.2 (R-05, R-10, R-11, R-12, R-13, R-15), C.3 (ADR-001, 002, 009–015), D, F.1, F.2, G.2, I.4, I.6, I.8–I.11, J.3 and J.11 (features 001–009). PRD `docs/source/01_MASTER_PRD.md` §3, §9 and §12. Constitution Articles I, V, VI, VIII, IX and X. The Phase 1 design packages are in `docs/design/` (Phase 2 package: `docs/design/packages/phase-02/`).

**Scope and numbering note**: The plan splits Phase 2 into nine Spec Kit features, 001 to 009 (§J.11). This spec covers the whole phase in one place: each planned feature becomes one user story, labelled with its plan number. If the team later wants a feature in its own spec, that story moves out under its plan number. The mapping is recorded in `specs/README.md`.

## Overview

PDFE (Palestinian Digital Financial Ecosystem) is a **simulation-only** demonstration platform that uses synthetic data. Phase 2 builds the foundation that every later feature relies on. It contains no money features. It delivers the following, as empty but working building blocks:

- one repository that anyone can start locally with one command;
- checks on every change that block unsafe or broken work;
- the safety boundary that keeps the system away from real banks, payment networks, blockchains and identity services;
- sign-in, roles, multi-factor authentication for privileged roles, tenant isolation, separation of duties and a reusable maker-checker (request and independent approval) capability;
- a tamper-evident audit log;
- configuration with approval and rollback;
- a reproducible scenario engine that resets and seeds synthetic data;
- correlation IDs that link one user action across every component;
- the simulation label on every screen and export;
- navigable shells for all six web apps and the mobile app, built to the approved Phase 2 designs.

Phase 2 contributes to PM **Gate 1** (PRD Gate B). That gate is passed at the end of the Phase 3 design work, which needs the safety, identity, audit and determinism controls built here.

## Clarifications

### Session 2026-11-15

- Q: Should all nine Phase 2 stories go through one plan and one task list, delivered as a series of pull requests, or should each story get its own plan and tasks? → A: One plan and one task list for the whole phase. Delivery is story by story, one pull request per story, in dependency order 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9.
- Q: You work alone, so who does the checks the plan assigns to "a second person": verifying the fresh-clone setup and accepting the nine architecture decision records (ADRs)? → A: Dated self-attestation backed by automated evidence. A CI job performs the fresh-clone run, and the ADRs are accepted by self-attestation and marked for re-review by the outside reviewer before Gate 1/B.
- Q: Which mobile platforms must the Phase 2 mobile app shell be built and tested on, given that you develop on Windows and iOS builds need a Mac? → A: Android is required now: built and checked automatically on an emulator in CI. iOS stays buildable from the same code but is verified later, before Phase 5.
- Q: When a platform-operations user needs to see another tenant's data (for example, to investigate a problem), what must they do first? → A: Explicit elevation. The user states a reason and chooses one tenant. Access is read-only and expires after a configurable time limit (default 30 minutes). The start, every read and the end are audited. No second approver is needed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A developer starts the whole platform with one command, and broken or unsafe changes cannot merge (Priority: P1) — plan feature 001

A developer clones the repository on a prepared workstation and starts the full local stack with one command. The stack is the backend service, background worker, mock partner hub, six web apps (consumer, merchant, business, console, investor, developer portal) and the mobile app. A second command runs every test. Every app opens and shows the simulation banner. On every pull request, automatic checks run style, type, unit tests, secret scanning, forbidden-URL scanning and dependency scanning. A pull request that fails any of them cannot be merged.

**Why this priority**: every other story is built and verified on this foundation. Without one-command start and blocking checks, safety and quality rules depend on memory.

**Independent Test**: On a clean clone, follow `quickstart.md`. Confirm that the stack starts with one command, that every app opens with the banner, and that the test command finishes green. Open deliberately failing pull requests (one per check category) and confirm that each is blocked.

**Acceptance Scenarios**:

1. **Given** a workstation with the documented prerequisites and a fresh clone, **When** the developer runs the bootstrap and start commands, **Then** every service and app comes up with no other manual steps, and each web app and the mobile app shows the simulation banner.
2. **Given** a pull request that adds a credential, a non-allowlisted URL, a style error, a type error, a failing unit test or a known-vulnerable dependency, **When** checks run, **Then** the matching check fails and the pull request cannot be merged.
3. **Given** a pull request that passes every check, **When** it is reviewed, **Then** it can be merged under the existing branch rules (solo mode: no human approval needed).

---

### User Story 2 - The system cannot reach anything real (Priority: P1) — plan feature 006

Every external dependency is reached only through an adapter, and in DEMO only mock adapters exist. External dependencies here means bank, payment, chain, identity checks (KYC), sanctions, FX, market prices and notifications. The system refuses to start if any configured adapter is not a mock, if it is unknown, or if the mode is anything other than DEMO. Interfaces for live adapters exist but are disabled and fail when called. Application components cannot open outbound connections, except to internal services, and automated tests prove that attempts to reach the internet fail. Repository scans block real URLs, credentials, private keys, mainnet or testnet RPC endpoints and real-looking personal data.

**Why this priority**: the simulation boundary is Article I of the constitution and a stop-work trigger (§I.6). Every later financial feature assumes this boundary is enforced, not just documented.

**Independent Test**: Start the system with an adapter configured as a non-mock type, then as an unknown type, then with a non-DEMO mode. Confirm that each attempt exits with a non-zero status and a clear message. From inside each application component, try to reach a public host and confirm that the attempt fails. Commit a sample private key and a sample RPC URL on a scratch branch, and confirm that the scans block them.

**Acceptance Scenarios**:

1. **Given** a configuration that names any adapter type outside the mock allowlist, **When** the backend starts, **Then** it refuses to start and names the offending adapter.
2. **Given** the mode is set to anything other than DEMO, **When** any component starts, **Then** it refuses to start, because live mode is not supported.
3. **Given** a running stack, **When** the backend, worker or mock hub tries to open a connection to a public internet host, **Then** the connection fails, and an automated test records the failure as evidence.
4. **Given** code calls a live adapter interface, **When** the call runs, **Then** it fails with a "live adapter disabled" error, and nothing leaves the system.
5. **Given** an administrator with full configuration rights, **When** they try to change the DEMO/LIVE setting or the adapter allowlist through configuration, **Then** the change is refused, because these settings are safety-locked.

---

### User Story 3 - Synthetic users sign in with the right roles, and nobody can exceed them (Priority: P1) — plan feature 004

Synthetic demo users sign in with roles taken from the PRD personas and the plan's starter role matrix (§J.3):

- consumer and merchant roles: individual, merchant owner, merchant cashier;
- business roles: business preparer, business approver;
- console roles: operations analyst, compliance analyst, compliance approver, finance analyst, finance approver, issuer operator, stable-value approver, platform administrator, auditor;
- read-only: demo viewer.

Privileged roles must use multi-factor authentication. A user sees only their own tenant's data. Permissions follow least privilege. Separation of duties is enforced in two ways. First, a requester can never approve their own high-risk request. Second, no single user may hold the rights to post or adjust journals, approve issuance and administer audit. A reusable maker-checker capability lets any later feature require an independent approval for an action.

**Why this priority**: tenant isolation, separation of duties and maker-checker are P0 controls (FR-SEC-001, NFR-003, NFR-011). The ledger in Phase 3 cannot be built safely without them.

**Independent Test**: Sign in as each seeded demo role and confirm that the role sees only its own navigation and data. Try to sign in as a privileged role without a second factor and confirm that it is refused. As a tenant A user, request tenant B data and confirm that the result is nothing. Create an approval request and try to approve it as the same user, then as a user without approve permission. Confirm that both attempts are refused. Run the negative authorization suite: every endpoint, every role, expected allow or deny.

**Acceptance Scenarios**:

1. **Given** a privileged role (any console role), **When** the user signs in without completing the second factor, **Then** access is refused.
2. **Given** users in tenant A and tenant B, **When** a tenant A user requests any tenant B record, **Then** nothing is returned. Cross-tenant access exists only for named platform-operations roles, through an explicit read-only elevation to one tenant with a reason and a time limit, and every step is audited.
3. **Given** a pending approval request, **When** its requester tries to approve it, **Then** the decision is refused. This is enforced in two independent places: the service and the data store.
4. **Given** an approval request whose content changed after it was created, has expired or was cancelled, **When** someone tries to approve it, **Then** the approval is refused.
5. **Given** an administrator granting roles, **When** a grant would let one user both request and approve the same high-risk operation, or would combine journal posting, issuance approval and audit administration, **Then** the grant is refused with the conflict named.
6. **Given** the role/permission matrix, **When** the negative authorization suite runs, **Then** every endpoint returns the expected allow or deny for every role, with no exceptions.

---

### User Story 4 - Every privileged action leaves a tamper-evident trail (Priority: P1) — plan feature 005

Every privileged action and every financial decision records an audit event. The event holds the actor, role, tenant, action, target, reason, time, correlation ID and approval reference. Audit events can only be added, never changed or deleted. Each event is chained to the previous one, so any change to history is detectable. Auditors can search events, verify the chain (which reports the first broken point) and export events.

**Why this priority**: FR-AUD-001 is P0. Approvals, configuration changes and scenario runs in this phase must already be audited.

**Independent Test**: Perform a privileged action, such as a role grant, and confirm that an audit event exists with every required field. Try to change or delete an audit event through the application and directly in the data store, and confirm that both are refused. In a test copy, alter one stored event, run verification, and confirm that it reports the exact event where the chain breaks. Export a filtered range.

**Acceptance Scenarios**:

1. **Given** any privileged action (role grant, approval decision, configuration change, scenario run, cross-tenant access), **When** it completes, **Then** exactly one audit event exists for it with all required fields. If the audit event cannot be written, the action does not take effect.
2. **Given** an existing audit event, **When** anyone tries to update or delete it, **Then** the attempt is refused, including by the application's own data-store role.
3. **Given** a test data store where one past event was altered outside the application, **When** verification runs, **Then** it reports the first broken event. **Given** an untouched store, verification reports that the chain is intact.
4. **Given** an auditor, **When** they search by actor, action, tenant, time range or correlation ID and export the results, **Then** the export contains exactly the matching events and carries the simulation label.

---

### User Story 5 - Every screen and every file says "SIMULATION — NOT REAL MONEY" (Priority: P1) — plan feature 003

Every screen of every web app and the mobile app shows a prominent, non-dismissible label: "SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية". The same applies to every downloadable file (PDF, CSV) and every email or notification. Automated checks fail the build if any page, tab or export lacks the label.

**Why this priority**: FR-DEMO-002 is P0 and constitution Article VIII. It must exist before any screen or export is built in later phases, so that nothing ships without it.

**Independent Test**: Run the automated label checks across every web route and every mobile tab, in Arabic and English, and across a sample PDF and CSV export. Remove the label from one page on a scratch branch and confirm that the build fails.

**Acceptance Scenarios**:

1. **Given** any route in any web app or any mobile tab, in either language, **When** it is displayed, **Then** the bilingual label is visible, cannot be dismissed, hidden or covered, and matches the approved text exactly.
2. **Given** any downloadable file or notification produced by the platform, **When** it is generated, **Then** it carries the label (a watermark for documents).
3. **Given** a change that removes or alters the label on any page or export, **When** checks run, **Then** the build fails and names the page or export.

---

### User Story 6 - An operator follows one user action across every component (Priority: P2) — plan feature 002

Every request, background job and adapter call carries a correlation ID. The ID appears in logs, traces, metrics, audit events and in error messages shown to users. An operator who receives an error reference from a user can search a local dashboard by that ID and see everything that happened for that action.

**Why this priority**: NFR-005 and groundwork for FR-TXN-002 (transaction trace). It is needed before Phase 3, but nothing else in Phase 2 is blocked without it, so it is P2.

**Independent Test**: Trigger an error from a web app and note the correlation ID shown on screen. Search for that ID in the local dashboard and confirm that the request, any background job and adapter call it caused, its log lines and its audit event all appear.

**Acceptance Scenarios**:

1. **Given** a user action that fails, **When** the error is shown, **Then** it shows a correlation ID the user can copy, and the same ID finds the matching log, trace and audit entries.
2. **Given** a request that arrives without a correlation ID, or with one that is malformed, **When** it is handled, **Then** the platform assigns a new valid ID and passes it to every downstream job and adapter call.
3. **Given** logs for any action, **When** they are inspected, **Then** they contain no full names, document numbers or secrets.

---

### User Story 7 - Administrators change configuration safely and can undo it (Priority: P2) — plan feature 007

Administrators manage configuration: fees, limits, FX spreads, rule thresholds, feature flags and scenario parameters. Every change gets a new version and has an effective date. Changes need maker-checker approval and show a diff against the active version. Rolling back to a previous version takes one action and creates a new version. Every change is audited. Safety-boundary settings (mode, adapter allowlist, outbound network rules) cannot be edited through configuration at all.

**Why this priority**: FR-ADM-001 is P0. Later phases need configurable placeholders, for example fees that default to 0 (decision D-07). It ranks after the controls it depends on (Stories 3 and 4).

**Independent Test**: Propose a change to a placeholder limit, view the diff, and confirm that it stays inactive until a different user approves it. Approve it, confirm the new value is active from its effective date, then roll back and confirm that the previous value returns as a new version. Confirm that all three steps appear in the audit log. Try to edit a safety-locked setting and confirm that the edit is refused.

**Acceptance Scenarios**:

1. **Given** a proposed change, **When** it has not been approved by a different user, **Then** the active value is unchanged.
2. **Given** an approved change with a future effective date, **When** that date is reached, **Then** the new value becomes active and the previous version is marked superseded.
3. **Given** an active version, **When** an administrator rolls back to an earlier version, **Then** a new version with the earlier value is created, approved through the same maker-checker rule, and audited. History is never rewritten.
4. **Given** a value that does not match the setting's allowed shape or range, **When** it is proposed, **Then** it is rejected with the reason.

---

### User Story 8 - Operators reset and seed the same scenario and get identical results (Priority: P2) — plan feature 008

An operator resets the environment and seeds a named synthetic scenario with a recorded version and seed. Running the same scenario with the same seed and version produces identical IDs, balances, timestamps and outputs, on any machine. Scenario definitions are versioned files. Each run produces a report that lists what was created and a digest that summarises the result. The first scenario is `baseline-v1`.

**Why this priority**: FR-DEMO-001 and NFR-007 are P0, and every later demonstration depends on this. It is P2 here only because Phase 2 has no financial data to seed yet beyond tenants, organizations and users.

**Independent Test**: Run `baseline-v1` with seed 42, record the digest, reset, and run it again. Confirm that the digests match. Run it on a second machine (the CI runner counts) and confirm the same digest. Change the seed and confirm that the digest changes.

**Acceptance Scenarios**:

1. **Given** scenario `baseline-v1`, version 1 and seed 42, **When** it is run twice, with a reset in between, on two different machines, **Then** both runs report the same result digest.
2. **Given** a scenario run, **When** it finishes, **Then** a report lists every entity created, along with the scenario, version, seed, time and digest, and the run is audited.
3. **Given** a request to reset or seed, **When** it comes from anyone other than a platform administrator or operations operator, **Then** it is refused.
4. **Given** a scenario file whose content differs from its recorded checksum, **When** a run is requested, **Then** it is refused.

---

### User Story 9 - Every app has a navigable shell built to the approved designs (Priority: P2) — plan feature 009

Every web app and the mobile app has a working shell that follows the approved Phase 2 design package. The shell includes:

- sign-in, with the second factor for privileged roles, and a role picker for demo users;
- role-based navigation;
- tenant, role and DEMO environment badges;
- a language switch that lays out Arabic right-to-left and English left-to-right;
- the five state components: populated, empty, loading, error with correlation ID, and permission-denied;
- the simulation banner.

The console also gets the admin screens for users, roles, configuration (list, history, diff, request, approve), the scenario controller and audit search, verify and export. There are no business features yet.

**Why this priority**: the shells make Stories 3–8 usable and testable end to end. They depend on the approved designs and on Stories 3 and 5.

**Independent Test**: Sign in to each app as a matching role, switch language, and confirm that the layout mirrors correctly and that every route shows the banner and handles all five states. Compare each shell screen with its approved design baseline in both languages. Run the accessibility scan on every shell route.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they open the app, **Then** they see only the navigation their role allows, plus badges showing tenant, role and DEMO.
2. **Given** a user switches between Arabic and English, **When** the screen redraws, **Then** direction, mirroring and number isolation follow the approved right-to-left rules. On mobile, the user is told that a restart is needed.
3. **Given** any shell route, **When** it is compared with the approved Phase 2 design baseline in both languages, **Then** it matches, or the difference is approved as a design change.
4. **Given** any shell route, **When** the accessibility scan runs, **Then** it reports zero serious or critical issues.

---

### Edge Cases

- **Approval rules**: an approval request expires before a decision; the approver loses the approve permission while a request is pending; two approvers decide at the same moment; the requester cancels after one approval. In every case, at most one outcome applies, and every step is audited.
- **Separation of duties on existing grants**: a role grant creates a conflict with a role the user already holds. The grant is refused. Existing conflicting data found at seed time fails the seed.
- **Platform-operations access**: cross-tenant reads by platform-operations roles are allowed only through an explicit, audited, read-only elevation to one tenant. They never happen silently. A write attempted during an elevation is refused. An expired elevation stops returning data immediately, even in the middle of a session.
- **Second factor**: a privileged user has not enrolled a second factor. They are guided to enrol (demo realm only) and cannot use privileged screens until they do.
- **Audit write failure**: the action is rolled back. The user sees an error with a correlation ID, and nothing is partly applied.
- **Concurrent audit writes**: the chain must stay a single, unbroken order even under concurrent actions.
- **Corrupted audit anchor**: verification reports the anchor mismatch separately from event tampering.
- **Configuration timing**: two proposals for the same setting are pending at once. Approving one makes the other stale, and it must be re-proposed. A rollback target version that no longer matches the current shape of the setting is rejected.
- **Scenario failure**: a scenario run fails part-way. The environment is left in the reset state, not half-seeded, and the run is recorded as failed.
- **Determinism**: anything that depends on wall-clock time, random numbers or generated IDs during a scenario uses the scenario's seeded sources. A run that touches a non-seeded source fails its determinism check.
- **Correlation IDs**: an ID from the client that is too long or has invalid characters is replaced, never echoed into logs as is.
- **Mutating requests**: a request repeated with the same idempotency key and the same content returns the original response. The same key with different content is rejected (baseline for FR-LED-003; ledger evidence comes in Phase 3).
- **Rate limits**: a user or address that exceeds the configurable rate limit receives a clear "try again later" response, and the event is logged.
- **Mobile**: switching to Arabic needs an app reload, so the user is prompted. With no connection, an offline banner shows. The app's network layer only ever talks to the configured internal service address, and any other address fails the build in the DEMO profile.
- **Banner obstruction**: a page component or modal tries to cover or hide the banner. The label check fails.
- **Solo mode**: there is no second person, so the fresh-clone check is done by a CI job and the ADRs are accepted by self-attestation. A failing CI fresh-clone job blocks the attestation.

## Requirements *(mandatory)*

### Functional Requirements

**Developer foundation and checks (Story 1)**

- **FR-001**: The repository MUST contain the backend service, background worker, mock partner hub, six web apps (consumer, merchant, business, console, investor, developer portal), the mobile app and shared packages. All of them MUST start locally with one documented command after one bootstrap command.
- **FR-002**: One command MUST run every automated test.
- **FR-003**: Every pull request MUST run style, type, unit-test, secret, forbidden-URL and dependency checks, and MUST NOT merge when any of them fails. The existing required checks (`governance-check`, `secret-scan`, `design-check`) stay in place.
- **FR-004**: `quickstart.md` MUST document the prerequisites and the fresh-clone run. A CI job MUST perform the fresh-clone run (clean checkout, bootstrap, start, smoke test of every app) on every pull request that changes the setup and nightly. Its passing result plus the implementer's dated self-attestation is the verification evidence (solo mode; re-reviewed by the outside reviewer).

**Safety boundary (Story 2)**

- **FR-005**: Every external dependency (bank, payment, chain, identity checks, sanctions, FX, market price, notification) MUST be reached only through a registered adapter.
- **FR-006**: The platform MUST refuse to start when any configured adapter type is outside the mock allowlist or unknown, and when the mode is not DEMO.
- **FR-007**: Live adapter interfaces MUST exist, be disabled by default, and fail without contacting anything when called.
- **FR-008**: Application components MUST NOT be able to reach hosts outside the internal services. Automated tests from inside each component MUST prove this.
- **FR-009**: Repository scans MUST block real URLs outside the allowlist, credentials, private keys, mainnet and testnet RPC endpoints, and real-looking national ID or bank account numbers.
- **FR-010**: Mode, adapter allowlist and outbound-network settings MUST be safety-locked: nobody can change them through configuration, including administrators.

**Identity, tenancy, separation of duties and maker-checker (Story 3)**

- **FR-011**: The platform MUST provide sign-in for synthetic demo users with the roles of the starter role matrix (§J.3). Demo users MUST be seeded by the scenario engine.
- **FR-012**: Privileged roles (every console role: operations, compliance, finance, issuer, stable-value approver, platform administrator, auditor) MUST complete a second factor before any access.
- **FR-013**: Every tenant-owned record MUST be visible only within its tenant.
- **FR-013a**: Cross-tenant access MUST be limited to named platform-operations roles through an explicit elevation with these properties:
  - the user states a reason and selects exactly one tenant;
  - access is read-only: any write attempted during an elevation is refused;
  - the elevation ends automatically after a configurable time limit (default 30 minutes) or when the user ends it;
  - the start, every read and the end are audited with the reason and correlation ID;
  - no second approver is required.
- **FR-014**: Permissions MUST be least-privilege and checked on every request, against the role/permission matrix.
- **FR-015**: Role grants that create a separation-of-duties conflict (the conflicts in §J.3, and the rule that one user cannot hold journal posting, issuance approval and audit administration together) MUST be refused, with the conflict named.
- **FR-016**: The platform MUST provide a reusable maker-checker capability. An approval request records:
  - the action, target, content fingerprint, requester, reason, required number of approvals, expiry and correlation ID.
  
  A decision is accepted only when all of these hold:
  - the approver is not the requester;
  - the approver holds the approve permission;
  - the content is unchanged;
  - the request is still pending and not expired.
  
  The "approver is not the requester" rule MUST be enforced in the service and, independently, in the data store.
- **FR-017**: An approved request MUST notify the owning feature reliably, so the approved action is executed exactly once, after the approval is recorded.

**Audit (Story 4)**

- **FR-018**: Every privileged action and financial decision MUST record an audit event in the same unit of work as the action. If the audit event fails, the action MUST NOT take effect. The event holds: actor, role, tenant, action, target, reason, time, correlation ID and approval reference.
- **FR-019**: Audit events MUST be append-only. Update and delete MUST be refused, including for the application's own data-store role.
- **FR-020**: Each audit event MUST be chained to its predecessor so that any alteration is detectable. Periodic anchors MUST record the chain state.
- **FR-021**: Auditors MUST be able to search events (actor, action, tenant, time range, correlation ID), run verification that reports the first broken event or "intact", and export results as CSV or JSON carrying the simulation label.

**Simulation labelling (Story 5)**

- **FR-022**: Every screen of every web app and of the mobile app MUST show the label "SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية" in the shared, non-dismissible banner component. Individual pages MUST NOT be able to remove it.
- **FR-023**: Every generated document, file export, email and notification MUST carry the label (a watermark for documents).
- **FR-024**: Automated checks MUST visit every web route and every mobile tab, in both languages, plus sample exports, and MUST fail the build when the label is missing or altered.

**Correlation and observability (Story 6)**

- **FR-025**: Every request, background job and adapter call MUST carry a correlation ID, created at the edge when it is missing or invalid, and passed downstream.
- **FR-026**: The correlation ID MUST appear in logs, traces, metrics, audit events and user-facing error messages, which also give the user a stable message key.
- **FR-027**: A local dashboard MUST let an operator search by correlation ID and see the related logs, traces and audit events.
- **FR-028**: Logs MUST NOT contain full names, document numbers or secrets. Redaction is applied centrally.

**Configuration (Story 7)**

- **FR-029**: Each configuration setting MUST have a declared shape and allowed range. Proposed values outside them MUST be rejected.
- **FR-030**: Every configuration change MUST create a new version with an effective date, show a diff against the active version, and need maker-checker approval before it takes effect.
- **FR-031**: Rollback MUST create a new version that copies an earlier value, approved through the same rule. Version history MUST never be rewritten.
- **FR-032**: Every configuration proposal, decision, activation and rollback MUST be audited.

**Scenario engine (Story 8)**

- **FR-033**: Scenarios MUST be versioned definition files with a recorded checksum. A run MUST be refused when the file does not match its checksum.
- **FR-034**: A run of a named scenario with a given version and seed MUST reset the demo data in a safe order and then seed it through the platform's own services, never by writing ledger data directly.
- **FR-035**: Clock, ID generation and randomness MUST come from injected sources, which are seeded during scenario runs. The same scenario, version and seed MUST produce an identical result digest on any machine.
- **FR-036**: Each run MUST produce a report of everything it created, with the scenario, version, seed and digest. The run MUST be audited.
- **FR-037**: Only platform administrators and operations operators MAY reset or seed.
- **FR-038**: The mock partner hub MUST let scenarios control its behaviour: latency, failure rate and scripted outcomes for bank, payment, chain, identity, sanctions, FX and price simulations.

**Cross-cutting platform behaviour**

- **FR-039**: Every mutating request MUST carry an idempotency key. The same key with the same content MUST return the original response. The same key with different content MUST be rejected with a clear error.
- **FR-040**: Events meant for other components MUST be published reliably after their unit of work commits, at least once. Consumers MUST tolerate duplicates.
- **FR-041**: The public interface MUST be versioned and rate-limited per user and per address, with configurable baseline limits (NFR-009 baseline).
- **FR-042**: Errors returned to clients MUST use a single format: an error code, a translatable message key and a correlation ID.

**App shells (Story 9)**

- **FR-043**: Each web app and the mobile app MUST provide the following, matching the approved Phase 2 design package:
  - sign-in, a second-factor step for privileged roles, and a role picker for demo users;
  - role-based navigation;
  - tenant, role and DEMO badges;
  - an Arabic/English language switch;
  - the five state components;
  - the simulation banner.
- **FR-044**: The console MUST provide admin screens for users, roles, configuration (list, history, diff, request, approve), the scenario controller, and audit search, verify and export, each backed by the capabilities above.
- **FR-045**: Layouts MUST follow the approved right-to-left rules: mirrored layout and directional icons, isolated numbers and IDs, Western digits by default, Gregorian dates and the Asia/Jerusalem display time zone. Every shell route MUST pass the accessibility scan with zero serious or critical issues.
- **FR-046a**: The mobile app MUST build and pass its automated checks (label on every tab in both languages, right-to-left layout, accessibility labels) on an Android emulator in CI. The code MUST stay cross-platform. iOS build and checks are deferred to before Phase 5 and tracked as an open item, not a Phase 2 exit criterion.
- **FR-046**: The mobile app MUST keep its tokens in secure device storage. Its app lock MUST be a simulated local unlock only, never identity verification. The app MUST talk only to the configured internal service address.

**Governance outputs**

- **FR-047**: ADR-001, 002, 009, 010, 011, 012, 013, 014 and 015 MUST be updated to match what was built and set to `Status: Accepted`. Each ADR MUST carry a dated self-attestation line and a "Re-review pending: outside reviewer before Gate 1/B" line. The tests named in each ADR's Verification section MUST pass before it is accepted.
- **FR-048**: A local setup runbook MUST exist (`docs/runbooks/local-setup.md`).

### Key Entities

- **Tenant**: an isolated customer space (platform, consumer pool, merchant, business, issuer, partner). Every tenant-owned record belongs to exactly one tenant.
- **Legal entity**: a synthetic legal entity inside a tenant. It is always marked synthetic.
- **Organization**: a merchant, business, issuer, partner bank or the platform itself, inside a tenant.
- **User**: a synthetic person with a locale and status, linked to a tenant and to a sign-in identity. Always marked synthetic.
- **Role / permission / role grant**: named roles, each holding permissions. Some permissions are high-risk, and some roles are privileged. A grant may be scoped to an organization, and records who granted it and when.
- **Separation-of-duties conflict**: a pair of roles that one user may not hold together, with the reason.
- **Approval request / approval decision**: the maker-checker record (action, target, content fingerprint, requester, reason, required approvals, status, expiry, correlation ID) and each approver's decision. There is one decision per approver, and the approver is never the requester.
- **Audit event / audit anchor**: an append-only event with all required fields and a chain link to its predecessor, plus periodic anchors of the chain state.
- **Configuration setting / configuration version**: a setting with a declared shape and a safety-lock flag, and its numbered versions (value, effective date, status, approval reference, author).
- **Scenario / scenario run**: a versioned definition with a checksum, and a run with seed, version, times, status, result digest and report.
- **Adapter registration**: the kind of external dependency and its adapter type. In DEMO, only mock types are allowed.
- **Tenant elevation**: a time-limited, read-only grant for one platform-operations user to view one other tenant, with reason, start time, expiry, end time and correlation ID.
- **Idempotency record**: tenant, scope, key, content fingerprint, status, stored response and expiry.
- **Outbox event**: an event waiting to be published after commit, with topic, content, correlation ID and attempts.
- **Correlation ID**: the identifier that links one user action across requests, jobs, adapter calls, logs, traces, metrics and audit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a clean clone, including the CI fresh-clone job, the full stack starts with 1 bootstrap command and 1 start command, with 0 undocumented manual steps. All 6 web apps and the mobile app open showing the banner.
- **SC-002**: 100% of the deliberately failing pull requests (one per check category: style, type, unit test, secret, forbidden URL, dependency) are blocked from merging.
- **SC-003**: In 100% of the startup tests with a non-mock adapter, an unknown adapter or a non-DEMO mode, the platform refuses to start.
- **SC-004**: 0 successful outbound connections to public hosts from the backend, worker and mock hub, in automated egress tests.
- **SC-005**: The negative authorization suite covers 100% of Phase 2 endpoints for 100% of roles, with 0 unexpected allows. Cross-tenant reads return 0 records without an active elevation, and 100% of writes attempted during an elevation are refused.
- **SC-006**: 100% of privileged-role sign-ins without a second factor are refused.
- **SC-007**: 100% of self-approval attempts are refused, by both the service and the data store.
- **SC-008**: Audit verification detects 100% of injected tampering cases (an altered field, a deleted event, a reordered event) and names the first broken event. 100% of privileged actions in this phase produce exactly one audit event.
- **SC-009**: 100% of configuration changes need an approval from a different user. Rollback restores the earlier value in 1 action. All of these are audited.
- **SC-010**: The same scenario, version and seed give identical result digests across 2 runs and 2 machines.
- **SC-011**: 100% of web routes and mobile tabs (on Android) show the exact bilingual label in Arabic and English. The build fails in 100% of label-removal tests.
- **SC-012**: For 100% of user-visible errors, the shown correlation ID leads an operator to the matching log, trace and audit entries in a single search.
- **SC-013**: 0 serious or critical accessibility issues on shell routes. 100% of shell screens match their approved design baselines in both languages, or have an approved design change.

## Assumptions

- **Delivery**: one plan and one task list cover all nine stories. Each story is delivered as its own pull request, in the order 1 (foundation), 2 (safety boundary), 3 (identity), 4 (audit), 5 (labels), 6 (correlation), 7 (configuration), 8 (scenarios), 9 (shells). Each pull request must leave `main` passing every required check. Where a story needs a capability from a later story (for example, audit events for role grants in Story 3), the earlier pull request adds the smallest working version, and the later story completes it.
- **Entry condition**: Gate 0/A has passed. The Phase 2 design package (`docs/design/packages/phase-02/`) must be **approved** before `/speckit-plan` runs for this feature, because check D-13 blocks a UI feature's plan until its phase package is approved. Today the package is ready for approval, but its Arabic review and approval have not been recorded.
- **Stack**: the plan's technology choices (Part C.2) and the proposed ADRs are the starting point for planning. This spec names no technology, and the choices are confirmed at the planning step.
- **Environment**: local workstation and CI only, following decision D-08's default (local containers; cloud later in Phase 12). Nothing is deployed publicly.
- **Roles**: the starter role matrix in §J.3 is the source of roles and conflicts. "Privileged" means every console role. The freelancer and exchange-user personas use the individual role.
- **Solo mode**: one person holds every governance role. The two-person checks in the plan become self-attestations backed by automated evidence (FR-004, FR-047), under `docs/governance/solo-mode-exception.md`. They are re-reviewed when the outside reviewer is named before Gate 1/B. The product's own maker-checker always needs two different synthetic users. This is not affected by solo mode.
- **Second machine for determinism**: the CI runner counts as the second machine.
- **Idempotency and outbox**: built here as shared platform behaviour. The ledger-specific proof (FR-LED-003) belongs to Phase 3.
- **Rate limits and performance**: baseline limits are configurable placeholders. No performance targets are invented (NFR-010 is measured in Phase 12).
- **Existing pieces reused**: the design tokens (`packages/design-tokens`), the copy decks, the screen inventory and the visual comparison baselines come from Phase 1. The safety scan lists and CI jobs come from Phase 0.
- **Mobile platforms**: Android is the Phase 2 verification platform (this workstation and free Linux CI). iOS verification needs macOS and is scheduled before Phase 5.
- **Out of scope**: iOS verification (deferred to before Phase 5); ledger, balances, money movement, KYC flows, and any business feature (Phase 3 onward); public deployment; real email or push delivery (notifications are local or mocked).
