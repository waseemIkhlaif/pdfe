## Summary
## PRD IDs / Journey
## Spec link: specs/NNN-.../spec.md
## Changes (backend / database / web / mobile / design)
## Accounting impact (mapping rows, invariants touched)  [ ] none
## Tests added (unit / property / integration / E2E / a11y)
## Evidence (screenshots AR/EN, reports)
## Safety
- [ ] No real URLs, credentials, keys, RPC endpoints or real personal data
- [ ] Only mock:* adapters used
- [ ] Simulation labels on all new screens/exports
- [ ] If this PR changes a signed artifact, the sponsor's approval below is the re-signature
## Design review (UI changes only; plan section J.5). Approved frame or export path: 
- [ ] Matches the approved frame in Arabic and English (frozen export under docs/design/packages)
- [ ] All five states implemented (populated / empty / loading / error / permission-denied)
- [ ] SimulationBanner visible; exports watermarked
- [ ] Amounts shown via MoneyText and never computed client-side
- [ ] Review step before any money movement; result screen with reference and trace ID
- [ ] Keyboard and screen-reader tested; contrast and target sizes OK (docs/design/system/accessibility-rules.md)
- [ ] RTL mirroring correct; numbers and IDs isolated (docs/design/system/rtl-rules.md)
- [ ] Copy uses approved i18n keys; no prohibited claims
- [ ] Responsive at 360 / 768 / 1280 (web) and small / large phones (mobile)
- [ ] Visual comparison report covers both languages (docs/design/qa/visual-comparison-contract.md)
## Reviewers required: product / finance / security / legal (copy) / QA
