# Accessibility rules (WCAG 2.2 AA)

Baked into every component (FR-024, constitution Article IX, plan section I.9). Each rule says how it is checked in design review and in code.

| # | Rule | Verified in design | Verified in code |
|---|---|---|---|
| A-1 | Text contrast at least 4.5:1; large text and UI parts (borders, icons, focus rings, chart series) at least 3:1 | Every pair used is declared in `packages/design-tokens/tokens/pairs.json` | `pnpm --dir packages/design-tokens check` and D-10 in CI |
| A-2 | A visible focus indicator on every interactive element (`color.brand.focus`, 2 px, not clipped) | Focus state exists on each component frame | axe scan; keyboard walk-through |
| A-3 | Touch and click targets at least 44 x 44 px (invisible padding counts) | Redlines show the hit area | Mobile accessibility audit; Maestro tap tests |
| A-4 | Every icon-only control has an accessible label (message key) | Component spec lists the label key | axe `button-name`; mobile `accessibilityLabel` lint |
| A-5 | Form errors are linked to their field (`aria-describedby` on web, an announced error on mobile) and name the fix | Error state frames show the text | axe; screen-reader pass |
| A-6 | No information by color alone: StatusChip, SimulatedBadge, charts and form states also use an icon, text or pattern | Greyscale preview of each frame | Greyscale screenshot review |
| A-7 | Asynchronous status changes (payment paid, quote expiring, submission result) are announced (live region on web, announcement API on mobile) | Spec names the live-region component | Screen-reader pass per journey |
| A-8 | Motion respects reduced-motion (`motion.reduced.*` tokens: no movement, fade or instant only) | Prototype notes list reduced variants | `prefers-reduced-motion` test |
| A-9 | Mobile text scales with the system text size up to 200% without clipping; web supports 200% zoom and 320 px reflow | Frames checked at the large text size | Mobile and browser zoom tests |
| A-10 | Focus order follows visual order in both LTR and RTL; modals trap focus and return it on close | Focus-order annotation on overlays | Keyboard walk-through in both languages |
| A-11 | Countdowns (quote expiry, QR expiry) never rely on timing alone: remaining time is text, and expiry is announced | QuoteCard and QRDisplay specs | Screen-reader pass |
| A-12 | The SimulationBanner is a status landmark that is always present and cannot be dismissed or covered | SimulationBanner spec | Visual comparison; DOM test per shell |

## Review use

The design review checklist (plan section J.5) points here. A component or screen with an open A-n failure is not approved (D-7 and the package gate), and Phase 12 repeats the whole list on the integrated product with a manual screen-reader pass (iOS VoiceOver, Android TalkBack, one desktop screen reader).
