# Screen inventory

One row per screen (plan section J.6, decomposed into flow steps). Header and allowed values: `specs/000-ux-design-track/contracts/artifact-formats.md` section 9.
Checks: D-1 (format), D-3 (covers the plan list), D-6 (skeleton), D-7 (approved screens have 5 states and all sizes), D-8 (money flows).

- `Interface`: CON consumer (mobile and web), MER merchant, BIZ business, OPS operations, CMP compliance, FIN finance/treasury, ADM admin (inside the console shells), INV investor, DEV developer portal.
- `Skeleton=yes`: part of the up-front skeleton (research R-14): the app shell, the key screens of each interface, and every J1/J2 screen.
- Screen IDs are never reused; a retired screen keeps its ID with `Wireframe=retired`.

| Screen ID | Interface | Name | Phase | Journeys | PRD IDs | Sizes | Money | Skeleton | Wireframe | Hi-fi | States | Frame | Export |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| CON-001 | CON | Splash and simulation notice | 2 | — | FR-DEMO-002 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CON-002 | CON | Sign-in | 2 | — | FR-SEC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CON-003 | CON | MFA (privileged only) | 2 | — | FR-SEC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CON-004 | CON | Demo role picker | 2 | — | FR-SEC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CON-005 | CON | Language switcher | 2 | — | FR-DEMO-002 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CON-006 | CON | App lock | 2 | — | FR-SEC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CON-007 | CON | Error, offline and permission screens | 2 | — | FR-DEMO-002 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CON-008 | CON | App shell | 2 | — | FR-DEMO-002 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CON-009 | CON | Onboarding – welcome | 4 | J1 | FR-CMP-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CON-010 | CON | Onboarding – personal info | 4 | J1 | FR-CMP-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CON-011 | CON | Onboarding – synthetic document | 4 | J1 | FR-CMP-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CON-012 | CON | Onboarding – simulated selfie | 4 | J1 | FR-CMP-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CON-013 | CON | Onboarding – review | 4 | J1 | FR-CMP-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CON-014 | CON | Onboarding – status | 4 | J1 | FR-CMP-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CON-015 | CON | Home | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-016 | CON | Wallet detail | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-017 | CON | Add money – enter | 5 | J1 | FR-WAL-002 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-018 | CON | Add money – review | 5 | J1 | FR-WAL-002 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-019 | CON | Add money – result | 5 | J1 | FR-WAL-002 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-020 | CON | Withdraw – enter | 5 | — | FR-WAL-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-021 | CON | Withdraw – review | 5 | — | FR-WAL-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-022 | CON | Withdraw – result | 5 | — | FR-WAL-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-023 | CON | Send – recipient | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-024 | CON | Send – amount | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-025 | CON | Send – review | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-026 | CON | Send – result | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-027 | CON | Request money | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-028 | CON | Activity list | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-029 | CON | Transaction detail | 5 | J1 | FR-TXN-002 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-030 | CON | Statements | 5 | J1 | FR-ACC-002 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-031 | CON | Notifications | 5 | J1 | FR-WAL-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-032 | CON | Profile | 5 | — | FR-SEC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-033 | CON | Support | 5 | — | FR-DEMO-002 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-05/export |
| CON-034 | CON | Scan QR | 6 | J2 | FR-PAY-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-035 | CON | Pay – review (pay sheet) | 6 | J2 | FR-PAY-001 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-036 | CON | Pay – enter (scan QR) | 6 | J2 | FR-PAY-001 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-037 | CON | Pay – result | 6 | J2 | FR-PAY-001 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-038 | CON | Merchant mode – Charge | 6 | J2 | FR-PAY-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-039 | CON | Merchant mode – QR display | 6 | J2 | FR-PAY-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-040 | CON | Merchant mode – Today's payments | 6 | J2 | FR-PAY-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-041 | CON | Merchant mode – Payment detail | 6 | J2 | FR-PAY-001 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-042 | CON | Merchant mode – Refund – enter | 6 | J2 | FR-PAY-002 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-043 | CON | Merchant mode – Refund – review | 6 | J2 | FR-PAY-002 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-044 | CON | Merchant mode – Refund – result | 6 | J2 | FR-PAY-002 | m360,m390,t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-045 | CON | Merchant mode – Payouts | 6 | J2 | FR-PAY-002 | m360,m390,t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| CON-046 | CON | Remittance – receive info | 7 | J3 | FR-REM-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| CON-047 | CON | Remittance – tracking | 7 | J3 | FR-REM-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| CON-048 | CON | Send abroad – enter | 7 | J3 | FR-REM-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| CON-049 | CON | Send abroad – beneficiary | 7 | J3 | FR-REM-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| CON-050 | CON | Send abroad – quote | 7 | J3 | FR-REM-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| CON-051 | CON | Send abroad – review | 7 | J3 | FR-REM-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| CON-052 | CON | Send abroad – result | 7 | J3 | FR-REM-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| CON-053 | CON | Business approvals inbox | 8 | — | FR-BIZ-002 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| CON-054 | CON | PSH – overview | 9 | J4 | FR-STB-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| CON-055 | CON | PSH convert – enter | 9 | J4 | FR-STB-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| CON-056 | CON | PSH convert – review | 9 | J4 | FR-STB-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| CON-057 | CON | PSH convert – result | 9 | J4 | FR-STB-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| CON-058 | CON | PSH redeem – enter | 9 | J4 | FR-STB-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| CON-059 | CON | PSH redeem – review | 9 | J4 | FR-STB-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| CON-060 | CON | PSH redeem – result | 9 | J4 | FR-STB-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| CON-061 | CON | PSH – history | 9 | J4 | FR-STB-002 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| CON-062 | CON | Markets | 10 | J5 | FR-EXC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-063 | CON | Pair detail | 10 | J5 | FR-EXC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-064 | CON | Order – enter (order ticket) | 10 | J5 | FR-EXC-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-065 | CON | Order – review | 10 | J5 | FR-EXC-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-066 | CON | Order – result | 10 | J5 | FR-EXC-001 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-067 | CON | Open orders | 10 | J5 | FR-EXC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-068 | CON | Trades | 10 | J5 | FR-EXC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-069 | CON | Portfolio | 10 | J5 | FR-EXC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-070 | CON | Crypto deposit (sim) | 10 | J5 | FR-EXC-002 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-071 | CON | Crypto withdraw – enter (sim) | 10 | J5 | FR-EXC-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-072 | CON | Crypto withdraw – review (sim) | 10 | J5 | FR-EXC-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-073 | CON | Crypto withdraw – result (sim) | 10 | J5 | FR-EXC-002 | m360,m390,t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| CON-074 | CON | Explore partners | 11 | — | FR-INC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| CON-075 | CON | Consent | 11 | — | FR-INC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| CON-076 | CON | Referrals | 11 | — | FR-INC-001 | m360,m390,t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| MER-001 | MER | App shell | 2 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| MER-002 | MER | KYB | 4 | — | FR-CMP-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| MER-003 | MER | Dashboard | 6 | J2 | FR-PAY-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-004 | MER | Create payment and QR | 6 | J2 | FR-PAY-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-005 | MER | Static QR | 6 | J2 | FR-PAY-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-006 | MER | Payments | 6 | J2 | FR-PAY-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-007 | MER | Payment detail | 6 | J2 | FR-PAY-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-008 | MER | Refund – enter | 6 | J2 | FR-PAY-002 | t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-009 | MER | Refund – review | 6 | J2 | FR-PAY-002 | t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-010 | MER | Refund – result | 6 | J2 | FR-PAY-002 | t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-011 | MER | Refunds | 6 | J2 | FR-PAY-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-012 | MER | Settlements | 6 | J2 | FR-PAY-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-013 | MER | Settlement detail | 6 | J2 | FR-PAY-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-014 | MER | Payout account | 6 | J2 | FR-PAY-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-015 | MER | Staff | 6 | — | FR-SEC-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-016 | MER | Statements | 6 | J2 | FR-ACC-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-06/export |
| MER-017 | MER | Invoices | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-001 | BIZ | App shell | 2 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| BIZ-002 | BIZ | Dashboard | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-003 | BIZ | Invoices list | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-004 | BIZ | Invoice editor | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-005 | BIZ | Invoice detail | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-006 | BIZ | Customers | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-007 | BIZ | Suppliers | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-008 | BIZ | Payout request – enter | 8 | J7 | FR-BIZ-002 | t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-009 | BIZ | Payout request – review | 8 | J7 | FR-BIZ-002 | t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-010 | BIZ | Payout request – result | 8 | J7 | FR-BIZ-002 | t768,w1280,w1440 | yes | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-011 | BIZ | Payouts | 8 | J7 | FR-BIZ-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-012 | BIZ | Approval inbox | 8 | J7 | FR-BIZ-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-013 | BIZ | Bank reconciliation | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-014 | BIZ | Reports and exports | 8 | J7 | FR-BIZ-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-015 | BIZ | Team and limits | 8 | — | FR-SEC-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| BIZ-016 | BIZ | API keys | 8 | — | FR-INT-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| OPS-001 | OPS | App shell | 2 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| OPS-002 | OPS | Scenario controller | 2 | — | FR-DEMO-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| OPS-003 | OPS | Home | 11 | — | FR-OPS-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| OPS-004 | OPS | Transaction explorer | 11 | — | FR-OPS-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| OPS-005 | OPS | Queues | 11 | — | FR-OPS-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| OPS-006 | OPS | Transaction detail and trace | 3 | — | FR-TXN-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| OPS-007 | OPS | Settlements overview | 11 | — | FR-OPS-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| OPS-008 | OPS | Partner simulator | 7 | J3 | FR-REM-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| OPS-009 | OPS | Reconciliation runs | 11 | — | FR-OPS-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| OPS-010 | OPS | Reconciliation exceptions | 11 | — | FR-OPS-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| OPS-011 | OPS | Market controls | 10 | J5 | FR-EXC-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| OPS-012 | OPS | Price feed controls | 10 | J5 | FR-EXC-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-10/export |
| OPS-013 | OPS | Remittance simulator | 7 | J3 | FR-REM-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| OPS-014 | OPS | Corridors | 7 | J3 | FR-REM-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-07/export |
| CMP-001 | CMP | App shell | 2 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CMP-002 | CMP | Onboarding queue | 4 | J6 | FR-CMP-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CMP-003 | CMP | Onboarding detail | 4 | J6 | FR-CMP-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CMP-004 | CMP | Alerts list | 4 | J6 | FR-CMP-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CMP-005 | CMP | Alert detail | 4 | J6 | FR-CMP-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CMP-006 | CMP | Cases list | 4 | J6 | FR-CMP-004 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CMP-007 | CMP | Case detail | 4 | J6 | FR-CMP-004 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CMP-008 | CMP | Rules list | 4 | J6 | FR-CMP-003 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CMP-009 | CMP | Rule editor | 4 | J6 | FR-CMP-003 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-04/export |
| CMP-010 | CMP | Reports center | 11 | J6 | FR-CMP-004 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| CMP-011 | CMP | Audit search | 2 | — | FR-AUD-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CMP-012 | CMP | Audit verify | 2 | — | FR-AUD-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| CMP-013 | CMP | Audit export | 2 | — | FR-AUD-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| FIN-001 | FIN | App shell | 2 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| FIN-002 | FIN | Accounts | 3 | — | FR-LED-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-003 | FIN | Account detail | 3 | — | FR-LED-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-004 | FIN | Journals | 3 | — | FR-LED-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-005 | FIN | Journal detail | 3 | — | FR-LED-004 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-006 | FIN | Trial balance | 3 | — | FR-LED-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-007 | FIN | General ledger browser | 11 | — | FR-LED-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| FIN-008 | FIN | Funding request – enter | 3 | — | FR-LED-001 | t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-009 | FIN | Funding request – review | 3 | — | FR-LED-001 | t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-010 | FIN | Funding request – result | 3 | — | FR-LED-001 | t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-011 | FIN | Approvals inbox | 3 | — | FR-LED-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-03/export |
| FIN-012 | FIN | FX position | 11 | — | FR-REM-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| FIN-013 | FIN | Close dashboard | 11 | — | FR-OPS-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| FIN-014 | FIN | PSH program | 9 | J4 | FR-STB-003 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| FIN-015 | FIN | PSH reserves | 9 | J4 | FR-STB-003 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| FIN-016 | FIN | PSH issuance – enter | 9 | J4 | FR-STB-001 | t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| FIN-017 | FIN | PSH issuance – review | 9 | J4 | FR-STB-001 | t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| FIN-018 | FIN | PSH issuance – result | 9 | J4 | FR-STB-001 | t768,w1280,w1440 | yes | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| FIN-019 | FIN | PSH redemptions | 9 | J4 | FR-STB-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| FIN-020 | FIN | PSH events | 9 | J4 | FR-STB-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| FIN-021 | FIN | PSH reconciliation | 9 | J4 | FR-STB-003 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-09/export |
| ADM-001 | ADM | Users | 2 | — | FR-SEC-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| ADM-002 | ADM | Roles | 2 | — | FR-SEC-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| ADM-003 | ADM | Config list | 2 | — | FR-ADM-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| ADM-004 | ADM | Config history | 2 | — | FR-ADM-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| ADM-005 | ADM | Config diff and approve | 2 | — | FR-ADM-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| ADM-006 | ADM | Config rollback | 2 | — | FR-ADM-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| ADM-007 | ADM | Feature flags | 2 | — | FR-ADM-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| ADM-008 | ADM | Tenants | 2 | — | FR-SEC-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| INV-001 | INV | App shell | 2 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| INV-002 | INV | Landing | 11 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| INV-003 | INV | Guided scenarios | 11 | — | FR-DEMO-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| INV-004 | INV | KPIs | 11 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| INV-005 | INV | Controls and architecture | 11 | — | FR-DEMO-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| INV-006 | INV | System health | 11 | — | FR-DEMO-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| INV-007 | INV | About the simulation | 11 | — | FR-DEMO-002 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-11/export |
| DEV-001 | DEV | App shell | 2 | — | FR-DEMO-002 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-02/export |
| DEV-002 | DEV | Getting started | 8 | — | FR-INT-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| DEV-003 | DEV | Auth | 8 | — | FR-INT-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| DEV-004 | DEV | API reference | 8 | — | FR-INT-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| DEV-005 | DEV | Webhook catalog | 8 | — | FR-INT-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| DEV-006 | DEV | Delivery explorer | 8 | — | FR-INT-001 | t768,w1280,w1440 | no | no | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
| DEV-007 | DEV | Sandbox | 8 | — | FR-INT-001 | t768,w1280,w1440 | no | yes | done | in-review | P,E,L,X,D | — | docs/design/packages/phase-08/export |
