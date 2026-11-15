# Right-to-left (RTL) rules

Arabic (RTL) and English (LTR) are equal (FR-025, constitution Article IX, plan section I.8). Every screen is designed in both directions.

## Layout

- Use logical properties only (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`); never left or right. Spacing tokens are direction-free.
- Layout mirrors: navigation, reading order, progress steps, tab order, side navigation (it sits on the right in RTL).
- Text alignment follows the language, not the side of the screen.

## What mirrors and what does not

| Mirrors in RTL | Does not mirror |
|---|---|
| Directional icons: arrows, chevrons, back and forward, send and reply, list indents | Logos and brand marks |
| Progress and stepper direction | Media controls (play, pause, scrub) |
| Swipe-to-act direction | Numbers, amounts, currency codes, dates in numeric form |
| Table column order | Charts' time axis (time runs left to right in both languages) |
| Slider and toggle direction | QR codes, phone-style keypads (1-2-3 keeps its layout) |
| | Clocks and countdown rings |

## Mixed-direction content

- Amounts, currency codes, IDs, trace IDs, correlation IDs and IBAN-like codes are isolated left-to-right runs inside Arabic text (`<bdi>` / `unicode-bidi: isolate` on web, an isolate on mobile), so that they are never reordered by the surrounding sentence.
- Show the currency code next to the amount ("120.50 ILS"). Never rely on a symbol alone.
- Copy uses placeholders (`{amount}`, `{traceId}`) so strings can be reordered for each language.

## Digits

- Both Western (0-9) and Arabic-Indic digits are supported as a **user setting**. The default is **Western for money amounts** unless the context research (`research/context.md`) changes it. Any change is recorded there and approved.
- The setting applies to amounts, dates, counts and codes consistently on one screen.

## Dates and time

- Gregorian calendar by default; the display time zone defaults to Asia/Jerusalem and is user-configurable. Stored times are UTC.

## Text expansion

- Arabic strings can be longer or shorter than English. Every layout is checked with expanded text (a pseudo-localised build adds about 30% length) so that labels, amounts and buttons neither truncate nor overlap.
- Arabic uses the line height token `font.lineHeight.arabic` and fonts that shape correctly (IBM Plex Sans Arabic for UI, Noto Naskh Arabic for long text and exports).

## Exports

- Statements, receipts and PDFs use right-to-left templates with the Arabic font embedded, carry the simulation watermark, and are checked by text extraction.

## Review use

The design review checklist (plan section J.5) points here. The Phase 12 RTL audit repeats these rules across every interface.
