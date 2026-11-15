# Context research

This file records what we know and what we still need to learn about where and how PDFE is used. **Findings below are working hypotheses, not facts.** No statistics are cited. The implementer confirms or corrects each section from research (task T022).

## Mobile-first usage

Working hypothesis: most individuals and merchants use PDFE on a phone, often one-handed, so the consumer and merchant-lite flows are designed for phones first and scale up. _To confirm._

## Arabic-first users

Working hypothesis: Arabic is the first language for most users, with English used by operations, finance and developer roles. Arabic is designed first. _To confirm._

## Low-bandwidth conditions

Working hypothesis: connections are sometimes slow or interrupted, so every screen needs loading, error-with-retry and "we will update you" states, and long operations show a pending status instead of blocking. _To confirm._

## Shared devices

Working hypothesis: some users share a phone, so the app lock, clear sign-out and no sensitive information in notifications matter. _To confirm._

## Cash habits (ILS, JOD, USD)

Working hypothesis: users think in several currencies and are used to cash, so the currency code is always shown next to an amount and conversions explain the rate and fee. _To confirm._

## Digit system recommendation

Recommendation (to confirm): show **Western digits (0-9) by default for money amounts**, because the same figure then reads the same in every screen and export, and offer Arabic-Indic digits as a user setting. Any change after research is recorded here and approved. Decision: _pending._

## Design implications

- Both directions are designed from the start (`docs/design/system/rtl-rules.md`).
- Amounts, currency codes and IDs are always isolated left-to-right runs.
- Plain-language status vocabulary with Arabic labels reviewed by a fluent speaker.
- No sensitive detail in notifications or on locked screens.
