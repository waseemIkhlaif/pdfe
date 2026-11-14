# Master Product Requirements Document (PRD)
**Product:** Palestinian Digital Financial Ecosystem (PDFE)  
**Version:** 0.2 | **Date:** 2026-11-14 | **Status:** Draft / pending sponsor and specialist review  
**Target:** Complete integrated simulated platform first; regulated live operation only in a separate future phase.

## 1. Executive summary
PDFE is an integrated Palestinian financial-technology ecosystem intended to connect individuals, merchants, businesses and institutions through a common financial core. Its products include wallets, merchant payments, cross-border transfers, a proposed ILS-linked stable-value instrument, simulated digital-asset trading, business financial tools, financial inclusion services and partner integrations. The company is a private technology venture aspiring to develop licensed operating capabilities and national-scale partnerships; it is **not** a central bank, government agency or licensed operator by assumption.

## 2. Product outcomes and constraints
**Goals:** demonstrate one coherent transaction and accounting architecture; validate end-to-end customer and business workflows; provide an investor/regulator-facing demonstration; enable safe later replacement of mocks with regulated adapters; produce traceable evidence of functional and control behavior.

**Non-goals for the demo:** accepting deposits or real funds, issuing real stablecoins, connecting live payment rails, executing actual crypto trades, moving tokens on mainnets, onboarding real customers, representing mock screening as real AML compliance, making credit decisions or marketing financial services as available.

**Success measures (targets to approve, not current results):** 100% of scripted critical demo journeys complete with auditable event and ledger trails; no unbalanced posted journals; no real-provider connectivity in demo; 100% of regulated workflows clearly labeled simulated; deterministic reset; automated test evidence for every critical acceptance criterion; zero critical security findings at demonstration approval.

## Operating principle and regulatory boundary
The initial release is a **fully functional end-to-end simulation**, not a live financial service. All customers, identity records, banks, counterparties, balances, orders, blockchain events, reserves, sanctions matches, market prices and settlements are synthetic. Live banking, payments, crypto networks, custody, issuance, identity verification and external transfers must remain disabled and technically unreachable in DEMO mode. Any LIVE mode is a future regulated program requiring jurisdiction-specific legal opinions, licenses/permissions, contracts, capital and safeguarding arrangements, independent security assessments and formal go-live approval. No assumed approval is implied by this documentation.

**Terminology:** `PSH` is a placeholder code for a proposed ILS-linked 1:1 stable-value instrument; it is not an approved name, classification, issuer, redemption promise or live asset. The proposed model is hybrid: an appropriately qualified partner would be responsible for issuance and reserves, while the company could provide technology and distribution subject to its own regulatory obligations. FX quotes, fees, limits, yields and performance numbers in demos are illustrative and configurable, never represented as market facts.

## 3. Stakeholders, personas and access
| Persona | Core need | Allowed demo capabilities |
|---|---|---|
| Individual | Store simulated value, transfer, pay, receive | Wallet, transactions, statements, support |
| Freelancer/remittance recipient | See simulated international receipt and conversion | Quote, beneficiary, tracking, receipt |
| Merchant | Accept and reconcile simulated payments | QR, checkout, refunds, payouts, invoices |
| Business finance user | Manage multiple staff and payments | Approvals, reporting, supplier payment |
| Exchange user | Practice paper trading | Market, orders, balances, history |
| Operations analyst | Investigate transaction failures | Queues, retries, exception resolution |
| Compliance analyst | Review synthetic risk cases | Screening, alerts, case decisions |
| Finance/treasury analyst | Reconcile accounts, simulated reserves | Journal, settlement, coverage reports |
| Platform administrator | Manage configuration safely | RBAC, tenant controls, feature flags |
| Investor/regulator demo viewer | Understand controls and impact | Read-only dashboards and guided scenarios |

**Separation of duties:** requesters cannot approve their own high-risk operations; no single role can alter journals, approve issuance and erase audit trails. Admins cannot bypass the demo/live isolation boundary.

## 4. Scope and domain map
| ID | Domain | Demo MVP capability | Future live dependency |
|---|---|---|---|
| WAL | Consumer and business wallets | Synthetic accounts, balances, transfers, history | Authorized money holding/payment framework |
| LED | Core ledger and transaction engine | Double entry, holds, postings, reversal, idempotency | Safeguarding, audit and settlement controls |
| PAY | Merchant acceptance | QR, checkout, capture, refund, payout simulation | Acquiring/PSP arrangements |
| REM | Cross-border remittances | Quote, funding, compliance, settlement simulation | Licensed partners, corridors, FX permissions |
| STB | Proposed ILS-linked instrument | Mock mint/burn, reserve coverage, redemption | Issuer classification, qualified issuer, reserve controls |
| EXC | Digital asset exchange | Paper order book and fills, mock deposits/withdrawals | Legal permission, custody, market surveillance |
| BIZ | Business tools | Invoices, approvals, reporting, API sandbox | Partner agreements and applicable licenses |
| INC | Inclusion services | Partner referral and impact analytics | Consents and licensed credit providers |
| CMP | Compliance and risk | Synthetic KYC/KYB, screening, fraud, cases | Approved policy, vendors and legal framework |
| OPS | Operations and finance | Settlement, reconciliation, case and audit consoles | Operational resilience and financial controls |
| INT | Integration platform | Mock bank/payment/chain/KYC adapters, webhooks | Authorized production integrations |

## 5. Functional requirements — financial foundation
| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| FR-LED-001 | P0 | Maintain immutable balanced double-entry journals by currency and legal entity | Every posted journal has debits = credits; mutation prohibited |
| FR-LED-002 | P0 | Distinguish available, pending, held and posted amounts | State changes reconciled in ledger tests |
| FR-LED-003 | P0 | Idempotent transaction commands with unique keys | Duplicate request posts at most once |
| FR-LED-004 | P0 | Support compensation/reversal through new entries, not deletion | Original and reversal both auditable |
| FR-LED-005 | P0 | Prevent negative available balances unless explicitly configured and approved | Concurrent spend tests reject overspend |
| FR-TXN-001 | P0 | Orchestrate typed transaction state machines with retry/timeout/error handling | State transition tests and replay |
| FR-TXN-002 | P0 | Link business transaction, ledger journal, external adapter event and audit correlation ID | End-to-end trace view |
| FR-ACC-001 | P0 | Provision synthetic user/merchant/business accounts and wallets | Seeded account creation and permissions |
| FR-ACC-002 | P0 | Provide downloadable simulated statements with clear watermarks | Statements reconcile to posted activity |
| FR-SEC-001 | P0 | Enforce RBAC, tenant isolation and maker-checker controls | Negative authorization tests |
| FR-AUD-001 | P0 | Produce append-only audit records for privileged actions and financial decisions | Tamper detection and export |

## 6. Functional requirements — product experiences
| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| FR-WAL-001 | P0 | Transfer synthetic ILS between wallet users with confirmation, status and receipt | Both sides and ledger reconcile |
| FR-WAL-002 | P0 | Display simulated funding and withdrawal flows using mock bank rails | No live rail reachable |
| FR-PAY-001 | P0 | Generate merchant QR/payment intents with expiration and single-use capture | Expired/duplicate intents rejected |
| FR-PAY-002 | P0 | Support partial/full simulated refunds and merchant settlement batches | Original/refund/payout ledger linkage |
| FR-BIZ-001 | P1 | Create invoices and match simulated receipts | Open/paid/overdue states accurate |
| FR-BIZ-002 | P1 | Offer business multi-user approval limits and permissions | Dual control tested |
| FR-REM-001 | P0 | Create remittance quote, sender/beneficiary, mock funding, screening, transfer and payout | End-to-end corridor journey |
| FR-REM-002 | P0 | Display synthetic FX rates, fee assumptions, quote expiry and exact received amount | Transparent quote and expiration tests |
| FR-STB-001 | P0 | Simulate issuance request, issuer approval, reserve allocation and mint accounting | Supply and coverage reconcile |
| FR-STB-002 | P0 | Simulate redemption, burn and reserve release with exceptions | Burn/redemption ledger reconciles |
| FR-STB-003 | P0 | Show simulated circulating supply, reserve composition, shortfall alerts and reconciliation | Dashboard derives from source journals |
| FR-EXC-001 | P0 | Support paper market/limit orders, matching, partial fill, cancellation and trade history | Matching and balances verified |
| FR-EXC-002 | P0 | Simulate deposit/withdrawal of BTC/ETH with fake tx IDs and network state | Never creates real chain transaction |
| FR-EXC-003 | P1 | Provide market surveillance demo alerts for wash-like activity and suspicious patterns | Synthetic case generation |
| FR-INC-001 | P1 | Capture consented simulated referral to a mock licensed finance partner | Consent and no internal lending |
| FR-INT-001 | P0 | Publish versioned APIs and signed mock webhooks with retries | Contract tests and delivery log |
| FR-INT-002 | P0 | Provide explicit disabled-by-default live adapter interfaces | Startup guard fails closed |

## 7. Functional requirements — compliance and control
| ID | Priority | Requirement | Acceptance evidence |
|---|---|---|---|
| FR-CMP-001 | P0 | Simulated KYC/KYB workflow with synthetic identities and document statuses | Review/approve/reject flow |
| FR-CMP-002 | P0 | Mock sanctions/PEP screening using synthetic watchlists only | Explainable alert and disposition |
| FR-CMP-003 | P0 | Configurable transaction monitoring rules and fraud risk scoring | Threshold triggers synthetic cases |
| FR-CMP-004 | P0 | Case management with evidence, assignment, escalation and decision audit | Maker-checker for sensitive dispositions |
| FR-OPS-001 | P0 | Reconcile mock partner statements, ledger balances and settlement batches | Exceptions surfaced and resolvable |
| FR-OPS-002 | P0 | Operational queues for failed, held, reversed and timed-out payments | Reprocessing never double-posts |
| FR-ADM-001 | P0 | Manage configurations with version history and approval | Changes traceable and reversible |
| FR-DEMO-001 | P0 | Seed/reset named synthetic scenarios reproducibly | Identical results for same seed/version |
| FR-DEMO-002 | P0 | Prominent SIMULATION / NOT REAL MONEY labels across all screens and artifacts | UI and export checks |
| FR-DEMO-003 | P0 | Block real URLs, credentials, private keys, mainnet RPCs and production customer data | CI checks and egress tests |

## 8. End-to-end journeys
### J1. Consumer wallet transfer
Synthetic onboarding → KYC state → funding via mock bank → balance → recipient selection → risk evaluation → hold → ledger posting → notification → statement → reconciliation. **Exceptions:** insufficient balance, duplicate submission, blocked recipient, service timeout, reversal.

### J2. Merchant payment and refund
Merchant KYB → payment intent/QR → payer authorization → capture → fee allocation placeholder → merchant payable → simulated batch settlement → reconciliation → partial refund → corrected statement. **Exceptions:** expired intent, duplicate capture, disputed transaction, partial settlement failure.

### J3. Cross-border freelancer receipt
Synthetic foreign sender → simulated quote and FX → mock funding → screening → partner transfer state → beneficiary wallet credit → receipt and reporting. **Exceptions:** quote expiry, partner rejection, FX mismatch, review hold, payout failure.

### J4. Stable-value instrument issuance/redemption
Synthetic qualified issuer role → reserve allocation → dual approval → mint event (mock) → holder allocation → transfer → redemption request → burn event → reserve release → supply/reserve coverage report. **Exceptions:** insufficient reserves, approval conflict, out-of-balance state; issuance must stop.

### J5. Paper trading
Mock asset deposit → quote/market selection → limit order → hold → match/partial fill → trade settlement in internal ledger → cancellation of remainder → simulated withdrawal request. **Exceptions:** price gap, insufficient asset, stale quote, order race, market halt.

### J6. Compliance incident
Transaction rule match → hold → alert → case triage → evidence → independent approval → release/reject → audit report. No real screening or regulatory filing occurs.

### J7. Business invoicing and supplier payment
Business user creates invoice → customer pays in simulation → matching → manager approves supplier payout → mock settlement → bank statement reconciliation → export.

## 9. Business rules and invariants
1. Posted journal entries are immutable; corrections use explicit compensating entries.
2. Each currency has separately balanced journal legs; FX conversion requires explicit bridging and gain/loss/fee treatment.
3. No value creation outside documented synthetic funding or authorized simulated issuance.
4. Simulated stablecoin supply must equal the token-liability subledger; reserves and liabilities must be separately tracked.
5. Insufficient reserve coverage blocks further simulated issuance and triggers an alert.
6. A transaction's status cannot skip unapproved state transitions; all retries preserve idempotency.
7. Wallet available balance cannot be inferred from frontend state.
8. Orders reserve funds before execution; fills and cancellations release correct residual amounts.
9. Every privileged financial action includes actor, reason, timestamp, correlation ID and approval record.
10. All external dependencies are mock adapters in demo; fail closed if adapter type is unknown.

## 10. Information architecture and interface inventory
**Consumer app:** onboarding, dashboard, wallets, send/receive, pay QR, remittances, asset portfolio, paper trading, history, profile/support.  
**Merchant portal:** KYB, checkout/QR, transactions, refunds, payouts, invoices, analytics, staff.  
**Business portal:** multi-user access, payables, receivables, approval inbox, reporting, API keys.  
**Operations console:** transaction explorer, settlement batches, exceptions, partner simulator, scenario controller.  
**Compliance console:** onboarding reviews, synthetic alerts, case queue, rule configurations, audit.  
**Finance/treasury console:** general ledger, trial balance, reconciliations, simulated reserves, issuance/burn approvals.  
**Investor demo dashboard:** scripted scenarios, aggregate synthetic KPIs, inclusion metrics, system health, explanatory diagrams.  
**Developer sandbox:** API reference, credentials scoped to demo, sample payloads, webhook event explorer.

Each view requires empty/loading/error/permission-denied states; Arabic RTL and English LTR; keyboard accessibility; responsive layouts; time zone and currency formatting; no implication that simulated balances are redeemable.

## 11. Conceptual data model
`Tenant`, `User`, `Role`, `Permission`, `Organization`, `IdentityProfile`, `KycCase`, `Wallet`, `LedgerAccount`, `Journal`, `JournalLine`, `BalanceHold`, `Transaction`, `TransactionStateEvent`, `PaymentIntent`, `Merchant`, `Invoice`, `SettlementBatch`, `ReconciliationRun`, `ReconciliationException`, `Remittance`, `FxQuote`, `Beneficiary`, `StableAssetProgram`, `IssuanceRequest`, `ReserveAccount`, `ReserveSnapshot`, `BurnRequest`, `Asset`, `TradingPair`, `Order`, `Fill`, `PriceTick`, `RiskAlert`, `ComplianceCase`, `AuditEvent`, `PartnerAdapter`, `WebhookDelivery`, `Scenario`, `ScenarioRun`.

Every business entity includes immutable ID, tenant ownership where applicable, timestamps, status/version and trace correlation. PII is synthetic; separate transaction records from personal profiles. Ledger is the balance source of truth; dashboards are derived projections.

## 12. Nonfunctional requirements
| ID | Requirement | Verification |
|---|---|---|
| NFR-001 | No live integrations in DEMO; outbound network allowlist and explicit environment gate | Egress tests and config review |
| NFR-002 | Financial correctness under concurrency and retries | Property-based and load tests |
| NFR-003 | Strong auth, MFA for privileged roles, least privilege | Auth and access test suite |
| NFR-004 | Encryption in transit/at rest, secrets manager, key rotation | Security review |
| NFR-005 | Traceability with structured logs, metrics, traces and audit records | End-to-end correlation check |
| NFR-006 | Arabic RTL and English LTR, WCAG 2.2 AA target | Accessibility review |
| NFR-007 | Reproducible deploy, seed and reset, versioned fixtures | Fresh environment smoke test |
| NFR-008 | Backups and restoration drills, with measured RPO/RTO to be approved | Recovery exercise |
| NFR-009 | Versioned APIs, contract compatibility, rate limiting | API contract and abuse tests |
| NFR-010 | Performance SLOs and capacity targets established by baseline testing, not invented | Approved performance report |
| NFR-011 | Strict tenant isolation and sensitive-field minimization | Penetration and isolation tests |
| NFR-012 | Reconciliation and accounting exception visibility | Daily simulated close evidence |

## 13. Analytics and reporting
Synthetic KPIs: registered users, active wallets, payment count/value, merchant conversion, remittance corridor funnel, simulated FX spread and fee components, order fills, supply/reserve coverage, settlement aging, failed transaction rate, fraud alerts, case aging, reconciliation differences, referral conversion and inclusion indicators. Every dashboard must show simulation status, data timestamp, metric definition and denominator; do not present modeled impact as observed economic impact.

## 14. Acceptance and release gates
**Gate A — requirements:** sponsor approves P0 stories, journeys, open decisions and simulation boundary.  
**Gate B — architecture:** finance/ledger and security reviewers approve invariants, data ownership, integration gating and threat model.  
**Gate C — core:** ledger property tests pass, idempotency and concurrency proven, audit/tenant controls demonstrated.  
**Gate D — cross-domain:** all seven journeys execute on seeded synthetic data, including failure paths and reconciliation.  
**Gate E — demo readiness:** security review, recovery test, scenario reset, bilingual UI, labels, no live network access and signed demo checklist.  
**Gate F — any future live release:** entirely separate legal, regulatory, partner, operational and risk approval; not part of demo acceptance.

## 15. Dependencies and risks
Critical dependencies: specialized accounting and legal review, mock partner specifications, decisions on asset representation, identity/authorization design, threat model, test fixtures, frontend design system, deployment environment. Main risks: premature live connection, inaccurate accounting, unclear asset classification, mistaken regulatory claims, fragile demo data, over-broad simultaneous delivery, leakage of real information, synthetic risk controls mistaken for actual compliance.

## 16. Decision register (unresolved)
| ID | Question | Proposed default / owner |
|---|---|---|
| D-01 | Legal entity structure and operator/issuer relationships? | Legal + sponsor; undecided |
| D-02 | Actual licensing path by product and jurisdiction? | Local counsel + regulators; undecided |
| D-03 | Stable-value instrument legal classification, issuer and redemption rights? | Counsel + qualified partner; undecided |
| D-04 | Approved brand and stable-value token symbol? | Sponsor; PSH placeholder |
| D-05 | Initial corridors, partners and settlement currencies? | BD + compliance; simulated only |
| D-06 | Initial asset listing and custody model? | Legal + risk; BTC/ETH paper examples |
| D-07 | Real-world fees, limits, reserve policy and liquidity model? | Finance + legal; placeholders only |
| D-08 | Deployment cloud, residency and retention rules? | Architecture + counsel; evaluate |
| D-09 | Required transaction volume, uptime, RPO/RTO and capacity? | Product + engineering; benchmark first |
| D-10 | MVP demo scenario shortlist and stakeholder priorities? | Sponsor + product; seven baseline journeys |
| D-11 | Financial statement accounting policy and legal entity boundaries? | Qualified accountant; undecided |
| D-12 | Independent validation and demo sign-off authority? | Sponsor + risk; assign |

## 17. Traceability convention
Every feature must map `PRD ID → feature specification → architecture decision → implementation tasks → tests → demo evidence`. P0 work cannot be declared complete without a positive and negative acceptance test and an observable audit/reconciliation trail.
