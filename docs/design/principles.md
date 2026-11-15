# Design principles

Five principles guide every design decision (plan Phase 1, Stage 1). Each says how it is applied and how it is checked.

## Clarity over cleverness

**Statement**: Use plain words, familiar patterns and one clear next action on every screen. Prefer the obvious control to the clever one.
**Applied by**: The status vocabulary (`content/status-vocabulary.md`), the component library, and copy written for the least financially experienced persona.
**Checked by**: Usability task completion without help (target at least 80% per journey task) and the heuristic review (N1-N10).

## Always-visible simulation status

**Statement**: The user can always tell that this is a simulation with no real money. It is never hidden, dismissed or covered.
**Applied by**: SimulationBanner (non-dismissible), SimulatedBadge, the SIMULATED tag on KPI tiles, watermarks on every export.
**Checked by**: D-14 (the exact bilingual label in every copy deck), design review item "SimulationBanner visible", and the usability question "Is this real money?" (at least 90% answer no).

## Arabic-first

**Statement**: Arabic (right-to-left) is designed first and equally with English, not translated at the end.
**Applied by**: The RTL rules (`system/rtl-rules.md`), both languages on every frame, and the Arabic review trail on every string.
**Checked by**: D-7 (all states and sizes), D-12 (Arabic review and native spot-check) and the Phase 12 RTL audit.

## Confirm before money moves

**Statement**: No money moves without a Review step that shows what will happen, followed by a Result with a reference.
**Applied by**: The Enter, Review, Result pattern, ConfirmDialog and QuoteCard.
**Checked by**: D-8 (every money flow has enter, review and result steps) and the usability tasks on each money-moving flow.

## Explain every number

**Statement**: Every figure has a definition, a source and a time, and amounts shown come from the server.
**Applied by**: MoneyText, ChartWrapper and KPITile footers (definition, denominator, timestamp), QuoteCard (rate, fee, exact amount received), and the trace link.
**Checked by**: Design review item "Amounts via MoneyText; never computed client-side" and the Phase 12 heuristic review (N1, N10).
