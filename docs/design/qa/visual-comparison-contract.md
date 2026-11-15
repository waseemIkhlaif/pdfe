# Visual comparison contract (hand-off to engineering features 001 and 009)

Built screens are compared automatically with the approved designs, in Arabic and English, on web and on mobile (FR-033, research R-11). Phase 1 defines the file contract. The comparison runners are built by the engineering features that own the apps.

## Baselines

- Location: `docs/design/packages/phase-NN/<latest vN, or the phase folder when there is no vN>/baseline/{ar,en}/<screen-id>@<size>.png`.
- Sizes: baselines exist for two key sizes per interface: consumer app `m390` (390x844) and `w1280`; every other interface `t768` and `w1280` (research R-16). The prototype renders all five design sizes (`m360`, `m390`, `t768`, `w1280`, `w1440`); the manifest `Sizes` column lists the sizes that have baselines, and a runner may add more.
- Baselines are exported from the approved frames, in the approved state (populated unless the screen entry says otherwise), with the SimulationBanner visible.
- Baseline files are never edited by hand; a change goes through the change process in `docs/design/README.md` (new package version, new approval row).

## Runners (owned by engineering)

| Target | Tool (plan section C.2) | Built by | Screenshot sizes |
|---|---|---|---|
| Web | Playwright screenshots | features 001 and 009 | t768, w1280, w1440 |
| Mobile | Maestro screenshots | feature 009 | m360, m390 |

Runners run each screen in both languages (`dir=rtl` for Arabic), using the seeded demo data so that output is deterministic.

## Result rules

- A difference above the agreed threshold in either language fails the check. The threshold is set in the feature that builds the runner and is recorded in that feature's plan.
- A difference is resolved by fixing the build, or by approving it as a design change (new package version plus an approval row) **before** merge.
- The report lists, per screen and per language, `match`, `difference` or `no baseline`. A UI pull request with a `no baseline` screen is not merged until the baseline exists (the screen must have an approved package).

## What Phase 1 checks

Only that baselines exist for every manifest screen of an approved package (check D-16). Phase 1 does not run any comparison.
