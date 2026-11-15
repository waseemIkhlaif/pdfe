# Copy deck: phase NN (template)

Copy this file to `phase-NN.md` for each engineering phase. Format: `specs/000-ux-design-track/contracts/artifact-formats.md` section 11.

- Text uses ICU MessageFormat. Amounts and IDs are placeholders (`{amount}`, `{traceId}`), never literal numbers.
- `Regulated=yes` for any string about money movement, the simulation boundary, redemption, limits, fees, screening or roles.
- Required before `Status=approved`: `AR review=done` (implementer), `Native check=done` for `money.`, `status.` and `sim.` keys and every regulated row, and `Legal=approved` for regulated rows (check D-12).
- Never use a claim listed in `scripts/safety/prohibited-claims.txt` (check D-14).
- Every copy deck keeps the `sim.banner` row below unchanged.

| Key | English | Arabic | Regulated | AR review | Native check | Legal | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| sim.banner | SIMULATION — NOT REAL MONEY | محاكاة — ليست أموالاً حقيقية | yes | pending | pending | pending | draft | Constitution Article VIII; must match exactly |
