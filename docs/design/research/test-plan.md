# Usability test plan

Method for every usability round (plan Phase 1, Stage 1; spec clarifications Q1 and Q3; research R-9). Rounds are recorded in `docs/design/usability/UR-NN.md`.

## Participants

- Volunteers from the implementer's own network. They take part voluntarily and are not paid.
- Recorded by code only (P1, P2, ...) with an optional profile tag: `ar-first`, `en-first`, `mobile-first`, `low-tech`.
- At least 5 participants for a round that includes a journey (J1 to J7); at least 3 for a package without a journey, which also needs a heuristic review (`docs/design/heuristics/phase-NN.md`).
- Aim for a mix of profiles. People from your own network may be more forgiving than real users, so include at least one `low-tech` and one `ar-first` participant per round where possible, and record the mix.

## Session formats

- **Moderated** (remote or in person): the implementer watches, asks participants to think aloud and does not help except to record "needed help".
- **Unmoderated**: the participant gets a prototype link and a task sheet (`docs/design/usability/task-sheet-template.md`) and replies in plain text without signing in. The implementer transcribes the replies into anonymized notes and deletes the raw replies.
- Prototypes and scenarios use synthetic data only. Participants are told the product is a simulation.

## Tasks by journey

Tasks are written from PRD section 8. A first set (to refine before each round):

| Journey | Tasks |
|---|---|
| J1 Consumer wallet transfer | Add money; send money to a contact; find the transfer afterwards; find what to do when the balance is too low |
| J2 Merchant payment and refund | Merchant: create a payment QR, see it paid, refund part of it. Payer: scan and pay |
| J3 Cross-border receipt | Read a quote, say how much will arrive, track the transfer |
| J4 Stable-value instrument | Convert and redeem in the simulation; explain what PSH is |
| J5 Paper trading | Place a limit order, find it, cancel it |
| J6 Compliance incident | Find the alert, say why it fired, propose and approve a decision |
| J7 Business invoicing | Create an invoice, approve a supplier payout, find the unmatched statement line |

## Measures

- **Task completion**: `yes`, `help` (needed help) or `no`, per task per participant.
- **Simulation understanding**: after the first screen, "Is this real money?" (`yes` or `no`). Target: at least 90% answer no.
- **Ease rating**: 1 to 5 per task.
- Main-task completion target: at least 80% complete without help.

## Severity scale

Nielsen severity 0 to 4: 0 not a problem; 1 cosmetic; 2 minor; 3 major; 4 catastrophic.

## Critical issue definition

A finding is **critical** when its severity is 4, or its severity is 3 or higher on any task that involves a money amount, a review step or understanding that the product is a simulation, or when any participant believes the money is real. A critical finding must be fixed, re-checked and set to `verified` before a package is approved; it can never be `accepted`.

## Privacy

- No names, contact details, voices or faces in the repository. No recordings are committed.
- Raw replies are deleted after transcription. Notes refer to participants as P1, P2, and so on.
- The repository is public; check D-11 blocks personal-data patterns in research and usability files.
