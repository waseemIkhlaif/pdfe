# Waiver: usability testing with people (first build)

**Decision**: the sponsor (the implementer, solo mode) waived usability testing with participants for the first build of the design, on 2026-11-15, when asking for the Phase 1 designs to be completed without test rounds.

## What is waived

- The test rounds required by FR-020 and FR-030 (at least 5 participants per journey J1 to J7, at least 3 per package without a journey).
- The measures that depend on them: SC-006 (journey prototypes tested, zero critical findings from tests) and SC-007 (at least 80% of participants complete the main task, at least 90% identify the product as a simulation).

## What is done instead

- A heuristic review for every package (`docs/design/heuristics/phase-NN.md`) against Nielsen's 10 heuristics and the 5 PDFE principles, backed by the automated prototype checks in `scripts/design/render/verify.mjs` (simulation banner on every frame, correct direction, five states, Enter/Review/Result for money screens, no broken links).
- Package gate D-16 accepts a heuristic review as the testing evidence. D-15 has nothing to check because no `usability/UR-NN.md` files exist.

## Risk accepted

The designs have not been seen by anyone who is not the designer. Problems that only real users find (unclear wording, missed buttons, misunderstanding that the money is not real) are not yet known. The Arabic wording is also an AI draft (see the Arabic review trail in each copy deck).

## End condition

Before Gate 5/E (signed demo checklist), either run the test rounds described in `docs/design/research/test-plan.md` and record them as `usability/UR-NN.md`, or record in the signed checklist that the waiver stands. When a round is run, any critical finding reopens the affected package (see "Changing an approved design" in `docs/design/README.md`).
