# Risk Register

> Source: docs/source/03_PROJECT_MANAGEMENT_PLAN.md §10 Risk register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Demo accidentally calls live financial service | Medium | Critical | Egress deny, mock-only binaries, CI scanning | Security/Engineering |
| Unbalanced or double-posted ledger | Medium | Critical | ACID, invariant/property tests, accountant review | Finance/Engineering |
| Scope too broad for available capacity | High | High | Vertical slicing, P0 gates, staged integrations | Product/Delivery |
| Stable asset represented as legally approved | Medium | Critical | Legal wording review, explicit simulated labels | Legal/Product |
| Synthetic data inconsistent across domains | Medium | High | Versioned deterministic fixture manifests | QA/Engineering |
| Unclear partner/regulatory requirements | High | High | Decision log, mocks, legal discovery workstream | Sponsor/Legal |
| AI-generated code bypasses controls | Medium | High | Mandatory review, hooks, branch protection | Engineering |
| Demo outage or data corruption | Medium | High | Rehearsal, snapshots, restore runbook | SRE/QA |
| Tenant isolation defect | Medium | Critical | Authorization tests, independent security review | Security |
| Inaccurate financial/impact dashboards | Medium | High | Metric dictionary, reconcile to source data | Product/Finance |

> End source

Severity for `RISK-PM-*` rows is the PM plan's Impact column. "Mitigated in" for those rows comes from plan §J.1. `R-01`…`R-20` come from plan §B.2.

| ID | Description | Severity | Owner | Mitigation | Mitigated in | Status |
|---|---|---|---|---|---|---|
| RISK-PM-01 | Demo accidentally calls live financial service | Critical | @waseemIkhlaif | Egress deny, mock-only binaries, CI scanning | Phase 2 (006), CI safety stage, Phase 12 egress | open |
| RISK-PM-02 | Unbalanced or double-posted ledger | Critical | @waseemIkhlaif | ACID, invariant/property tests, accountant review | Phase 3, property tests in every financial phase | open |
| RISK-PM-03 | Scope too broad for available capacity | High | @waseemIkhlaif | Vertical slicing, P0 gates, staged integrations | Phase map with gates, vertical slices per journey | open |
| RISK-PM-04 | Stable asset represented as legally approved | Critical | @waseemIkhlaif | Legal wording review, explicit simulated labels | Phase 9 copy rules, legal approval, copy lint | open |
| RISK-PM-05 | Synthetic data inconsistent across domains | High | @waseemIkhlaif | Versioned deterministic fixture manifests | I.11 versioned manifests, scenario engine | open |
| RISK-PM-06 | Unclear partner/regulatory requirements | High | @waseemIkhlaif | Decision log, mocks, legal discovery workstream | Decision register, mock adapters, assumption log | open |
| RISK-PM-07 | AI-generated code bypasses controls | High | @waseemIkhlaif | Mandatory review, hooks, branch protection | Constitution, CODEOWNERS, `/speckit.analyze`, branch protection | open |
| RISK-PM-08 | Demo outage or data corruption | High | @waseemIkhlaif | Rehearsal, snapshots, restore runbook | Phase 12 recovery, rehearsal, snapshots | open |
| RISK-PM-09 | Tenant isolation defect | Critical | @waseemIkhlaif | Authorization tests, independent security review | RLS + guards (Phase 2), independent test (Phase 12) | open |
| RISK-PM-10 | Inaccurate financial/impact dashboards | High | @waseemIkhlaif | Metric dictionary, reconcile to source data | Metric dictionary, recomputation tests (Phase 11) | open |
| R-01 | Mobile app not specified. PRD lists a "Consumer app" but doesn't say web vs mobile. | High | @waseemIkhlaif | Added a React Native (Expo) mobile app for consumers and a "merchant lite" mode (Phase 2 onwards). Web remains for portals/consoles. | Phase 2 (mobile app, from Phase 2 onwards) | open |
| R-02 | UI/UX process missing. Design lead in RACI, but no research → design system → handoff process. | High | @waseemIkhlaif | Phase 1 is a dedicated UX track from discovery to design system; each later phase has its own design work. | Phase 1 (design track) | open |
| R-03 | Two gate schemes (PM Gates 0–5, PRD Gates A–F) not mapped. | Medium | @waseemIkhlaif | Unified mapping in Part G.2. | Plan Part G.2 | open |
| R-04 | No technology stack or ADRs. | High | @waseemIkhlaif | Part C proposes one stack with ADR-001…ADR-015, all to be ratified at Gate 1/B. | Gate 1/B (ADR-001…015) | open |
| R-05 | Amount representation unspecified (float risk). | Critical | @waseemIkhlaif | Integer minor units only (`NUMERIC(38,0)`), per-asset scale table, no floating point anywhere in money paths. | Phase 3 (010), ADR-003 | open |
| R-06 | Ledger concurrency strategy unspecified (FR-LED-005, NFR-002). | Critical | @waseemIkhlaif | Row-level locking on balance rows in a fixed lock order + optimistic version + SERIALIZABLE for reserve operations; property and race tests. | Phase 3 (010), ADR-005 | open |
| R-07 | Immutability enforcement only stated as a rule. | High | @waseemIkhlaif | DB-level triggers block UPDATE/DELETE on posted journals; app role has no UPDATE/DELETE grant; hash-chained audit. | Phase 3, ADR-004 and ADR-012 | open |
| R-08 | FX bridging (Rule 2) has no accounting model. | High | @waseemIkhlaif | FX position/bridge accounts per currency pair, each currency leg balanced separately; spread/fee to revenue accounts (Phase 7). | Phase 7 | open |
| R-09 | Fee allocation "placeholder" in J2 is ambiguous. | Medium | @waseemIkhlaif | Configurable fee schedule (versioned, maker-checker), default 0; posts to a fee revenue account. | Phases 5–8 | open |
| R-10 | Scenario determinism (FR-DEMO-001) conflicts with real clocks, UUIDs and random. | High | @waseemIkhlaif | Injected `Clock`, `IdGenerator` and `Random` with seed in DEMO; UUIDv7 derived from seed in scenario runs. | Phase 2 (006), ADR-013 | open |
| R-11 | "Fail closed if adapter type unknown" has no mechanism. | High | @waseemIkhlaif | Adapter registry with an allowlist of `mock:*` types; boot fails if any other type is configured in DEMO; network egress deny at container + CI scan. | Phase 2 (006), ADR-009 | open |
| R-12 | MFA for privileged roles (NFR-003) but no identity provider chosen. | Medium | @waseemIkhlaif | Keycloak (self-hosted) with TOTP for privileged roles; demo users seeded. | Phase 2 (004), ADR-010 | open |
| R-13 | Arabic RTL across web + mobile + PDFs not detailed. | Medium | @waseemIkhlaif | Logical CSS properties, `dir` handling, bidi-safe number formatting, Arabic-capable PDF fonts, pseudo-localization testing. | Phase 1 and every UI phase | open |
| R-14 | Statements (FR-ACC-002) need watermark + reconcile to ledger. | Medium | @waseemIkhlaif | Server-generated PDFs with SIMULATION watermark and a checksum footer tied to a ledger snapshot. | Phase 3 / ACC statements | open |
| R-15 | Separation of duties needs concrete role matrix. | High | @waseemIkhlaif | Role/permission matrix in Phase 2 with SoD conflict rules enforced in code and tested. | Phase 2 (004), ADR-011 | open |
| R-16 | Performance and RPO/RTO are TBD (D-09). | Low | @waseemIkhlaif | Phase 12 measures baselines; no invented SLOs. | Phase 12 | open |
| R-17 | Decision register items block design (D-03, D-07, D-11). | Medium | @waseemIkhlaif | Each phase lists which decisions it needs; defaults are placeholders, clearly labeled, configurable. | Each phase per plan J.2 | open |
| R-18 | AI-generated code risk (risk register). | High | @waseemIkhlaif | Constitution forbids bypassing tests/controls; branch protection; CODEOWNERS for ledger, auth and adapters; `/speckit.analyze` required. | Phase 0 and every phase (constitution, CODEOWNERS) | open |
| R-19 | Investor dashboard risks presenting modeled impact as real. | Medium | @waseemIkhlaif | Every metric carries definition, denominator, timestamp and "SIMULATED" badge (enforced by a shared component). | Phase 11 | open |
| R-20 | INC (inclusion) domain has a single P1 requirement. | Low | @waseemIkhlaif | Phase 11 delivers referral + consent + analytics only; no lending logic. | Phase 11 | open |
| RISK-P0-01 | Bootstrap commit(s) pushed to main without review | Low | @waseemIkhlaif | Disclosed in docs/evidence/phase-0/bootstrap.md; all later changes go through pull requests | docs/evidence/phase-0/bootstrap.md | accepted |
| RISK-P0-02 | No independent review (solo mode): author approves own work | High | @waseemIkhlaif | Automated controls; exception record; outside reviewer before Gate 1/B | Gate 1/B entry criterion | accepted |
