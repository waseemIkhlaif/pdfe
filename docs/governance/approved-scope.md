# Approved Scope

The approved P0 scope: 34 P0 requirement IDs from the Master PRD and journeys J1–J7.

| ID | Title | Status | Decision ref | Approver | Date |
|---|---|---|---|---|---|
| FR-LED-001 | Maintain immutable balanced double-entry journals by currency and legal entity | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-LED-002 | Distinguish available, pending, held and posted amounts | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-LED-003 | Idempotent transaction commands with unique keys | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-LED-004 | Support compensation/reversal through new entries, not deletion | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-LED-005 | Prevent negative available balances unless explicitly configured and approved | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-TXN-001 | Orchestrate typed transaction state machines with retry/timeout/error handling | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-TXN-002 | Link business transaction, ledger journal, external adapter event and audit correlation ID | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-ACC-001 | Provision synthetic user/merchant/business accounts and wallets | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-ACC-002 | Provide downloadable simulated statements with clear watermarks | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-SEC-001 | Enforce RBAC, tenant isolation and maker-checker controls | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-AUD-001 | Produce append-only audit records for privileged actions and financial decisions | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-WAL-001 | Transfer synthetic ILS between wallet users with confirmation, status and receipt | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-WAL-002 | Display simulated funding and withdrawal flows using mock bank rails | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-PAY-001 | Generate merchant QR/payment intents with expiration and single-use capture | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-PAY-002 | Support partial/full simulated refunds and merchant settlement batches | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-REM-001 | Create remittance quote, sender/beneficiary, mock funding, screening, transfer and payout | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-REM-002 | Display synthetic FX rates, fee assumptions, quote expiry and exact received amount | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-STB-001 | Simulate issuance request, issuer approval, reserve allocation and mint accounting | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-STB-002 | Simulate redemption, burn and reserve release with exceptions | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-STB-003 | Show simulated circulating supply, reserve composition, shortfall alerts and reconciliation | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-EXC-001 | Support paper market/limit orders, matching, partial fill, cancellation and trade history | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-EXC-002 | Simulate deposit/withdrawal of BTC/ETH with fake tx IDs and network state | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-INT-001 | Publish versioned APIs and signed mock webhooks with retries | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-INT-002 | Provide explicit disabled-by-default live adapter interfaces | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-CMP-001 | Simulated KYC/KYB workflow with synthetic identities and document statuses | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-CMP-002 | Mock sanctions/PEP screening using synthetic watchlists only | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-CMP-003 | Configurable transaction monitoring rules and fraud risk scoring | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-CMP-004 | Case management with evidence, assignment, escalation and decision audit | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-OPS-001 | Reconcile mock partner statements, ledger balances and settlement batches | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-OPS-002 | Operational queues for failed, held, reversed and timed-out payments | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-ADM-001 | Manage configurations with version history and approval | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-DEMO-001 | Seed/reset named synthetic scenarios reproducibly | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-DEMO-002 | Prominent SIMULATION / NOT REAL MONEY labels across all screens and artifacts | approved | — | @waseemIkhlaif | 2026-11-14 |
| FR-DEMO-003 | Block real URLs, credentials, private keys, mainnet RPCs and production customer data | approved | — | @waseemIkhlaif | 2026-11-14 |
| J1 | Consumer wallet transfer | approved | — | @waseemIkhlaif | 2026-11-14 |
| J2 | Merchant payment & refund | approved | — | @waseemIkhlaif | 2026-11-14 |
| J3 | Cross-border freelancer receipt | approved | — | @waseemIkhlaif | 2026-11-14 |
| J4 | Stable-value issuance/redemption | approved | — | @waseemIkhlaif | 2026-11-14 |
| J5 | Paper trading | approved | — | @waseemIkhlaif | 2026-11-14 |
| J6 | Compliance incident | approved | — | @waseemIkhlaif | 2026-11-14 |
| J7 | Business invoicing & supplier payment | approved | — | @waseemIkhlaif | 2026-11-14 |

Note: any change to a journey (J1–J7) requires decision D-10 (FR-008).

## Signature
Signed by: waseemikhlaif (@waseemIkhlaif)
Signed on: 2026-11-14
Attestation: solo-mode self-attestation (see docs/governance/solo-mode-exception.md)
Proof: the pull request that last changed this file passed its required checks
