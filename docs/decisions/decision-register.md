# Decision Register

Questions come from PRD §16. "Options" holds the PRD's proposed default and owner. Needed-by phase and defaults come from plan §J.2. Nothing is `decided` without an approver and a date (FR-014). In solo mode the approver may equal the owner.

| ID | Question | Options | Decision | Status | Owner | Approver | Date | Rationale | Consequences | Needed by phase | Default if undecided | Review date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D-01 | Legal entity structure and operator/issuer relationships? | Legal + sponsor; undecided | — | open | @waseemIkhlaif | — | — | — | — | 9 | Synthetic issuer role | Before phase 9 starts |
| D-02 | Actual licensing path by product and jurisdiction? | Local counsel + regulators; undecided | — | open | @waseemIkhlaif | — | — | — | — | Future | Out of scope (Gate F) | Before phase Future starts |
| D-03 | Stable-value instrument legal classification, issuer and redemption rights? | Counsel + qualified partner; undecided | — | open | @waseemIkhlaif | — | — | — | — | 9 | 1:1 placeholder, min coverage 100% | Before phase 9 starts |
| D-04 | Approved brand and stable-value token symbol? | Sponsor; PSH placeholder | — | open | @waseemIkhlaif | — | — | — | — | 1 | PDFE Demo, PSH placeholder | Before phase 1 starts |
| D-05 | Initial corridors, partners and settlement currencies? | BD + compliance; simulated only | — | open | @waseemIkhlaif | — | — | — | — | 7 | Simulated corridors USD/EUR/JOD → ILS | Before phase 7 starts |
| D-06 | Initial asset listing and custody model? | Legal + risk; BTC/ETH paper examples | — | open | @waseemIkhlaif | — | — | — | — | 10 | BTC/ETH paper only | Before phase 10 starts |
| D-07 | Real-world fees, limits, reserve policy and liquidity model? | Finance + legal; placeholders only | — | open | @waseemIkhlaif | — | — | — | — | 5–9 | Configurable placeholders, default fee 0 | Before phase 5–9 starts |
| D-08 | Deployment cloud, residency and retention rules? | Architecture + counsel; evaluate | — | open | @waseemIkhlaif | — | — | — | — | 2 | Local Docker; cloud later | Before phase 2 starts |
| D-09 | Required transaction volume, uptime, RPO/RTO and capacity? | Product + engineering; benchmark first | — | open | @waseemIkhlaif | — | — | — | — | 12 | Measure first, then decide | Before phase 12 starts |
| D-10 | MVP demo scenario shortlist and stakeholder priorities? | Sponsor + product; seven baseline journeys | Seven baseline journeys (J1–J7) are the MVP demo scenarios | default-accepted | @waseemIkhlaif | @waseemIkhlaif | 2026-11-14 | Default from PRD §16 and plan J.2; solo mode, so approver equals owner (allowed, see solo-mode exception). | Approved scope lists J1–J7; any journey change needs a new decision. | 0 | Seven journeys | At Gate 0/A |
| D-11 | Financial statement accounting policy and legal entity boundaries? | Qualified accountant; undecided | — | open | @waseemIkhlaif | — | — | — | — | 3 | Synthetic chart of accounts, accountant review | Before phase 3 starts |
| D-12 | Independent validation and demo sign-off authority? | Sponsor + risk; assign | The sponsor holds demo and gate sign-off authority until assigned otherwise | default-accepted | @waseemIkhlaif | @waseemIkhlaif | 2026-11-14 | Default from plan J.2. Solo mode: the sole role holder signs each gate by self-attestation. | Each gate (0–5) is signed off by the sponsor; an outside reviewer is named before Gate 1/B (solo-mode end condition). | 0 | Sponsor assigns sign-off authority | At Gate 1/B |
