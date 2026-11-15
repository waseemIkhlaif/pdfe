# Heuristic review: phase 11

- **Reviewer role**: Design lead (AI-assisted self review; no participants)
- **Date**: 2026-11-15
- **Method**: every screen of the phase (19) was rendered in Arabic and English in all five states and checked against Nielsen's heuristics (N1 to N10) and the PDFE principles (P1 to P5) by `scripts/design/render/verify.mjs` (banner present, direction correct, five states, Enter/Review/Result for money screens, no broken links or values) and by reading the screens.
- **Scope note**: this replaces participant testing, which the sponsor waived for the first build. It does not measure task completion or the "Is this real money?" answer (SC-006, SC-007).

| Issue ID | Screen | Heuristic | Description | Severity | Status |
|---|---|---|---|---|---|
| H-1 | all | P3 | Arabic strings are an AI draft with no implementer review or native-speaker check yet | 3 | open |
| H-2 | all | N9 | Errors show a general message and a reference; field-level error wording is specified in the component rules but not drawn for every field | 2 | open |
| H-3 | all | N1 | Example data is static: live updates (for example a QR payment turning Paid, countdowns) are described, not animated, in the prototype | 1 | open |
| H-4 | all | P1 | Journeys J6 have not been tested with people: the sponsor waived usability testing for the first build (usability/WAIVER.md) | 3 | open |
