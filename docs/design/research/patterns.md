# Pattern review

Patterns from comparable products, described in neutral terms. **Patterns only: no screenshots, brand assets or copied designs, and no links.** Each pattern says what problem it solves and how PDFE uses or avoids it. Reviewed products are named in the notes, not here, to keep this file free of brand material.

## Wallet apps

| Pattern | Problem it solves | Use in PDFE | Risk |
|---|---|---|---|
| Balance card with quick actions | Fast access to the common actions | Home: balance per currency with Send, Request, Add money, Scan | Hiding secondary actions |
| Activity grouped by date with status | Finding past transfers | Activity list grouped by date, with StatusChip | Unclear status wording |
| Slide to confirm | Prevents accidental sends | Not used; an explicit Review step is clearer and accessible | Gesture-only controls fail accessibility |
| Contact search with recent recipients | Faster recipient choice | Send: recipient search and contacts | Showing a blocked recipient too late |

## Merchant QR apps

| Pattern | Problem it solves | Use in PDFE | Risk |
|---|---|---|---|
| Large dynamic QR with countdown | Fast, unambiguous payment at a counter | Charge: full-screen QR, countdown and a live Paid confirmation | Expiry surprises |
| Today's payments summary | Daily check by the merchant | Merchant mode: Today's payments | Mixing pending and settled |
| Refund from payment detail | Simple correction flow | Refund as Enter, Review, Result with a reason | Refunding the wrong amount |

## Remittance apps

| Pattern | Problem it solves | Use in PDFE | Risk |
|---|---|---|---|
| Send/receive amount toggle | Users think in either amount | Send abroad: toggle with exact amount received | Rounding confusion |
| Fee and rate breakdown before confirm | Trust and transparency | QuoteCard: rate, fee, expiry, exact amount received, "Illustrative rates" | Looking like a real offer |
| Step tracker | Reduces "where is my money" worry | Remittance tracking timeline | Too many technical steps |

## Exchange user interfaces

| Pattern | Problem it solves | Use in PDFE | Risk |
|---|---|---|---|
| Order ticket with cost estimate | Prevents surprises | Order ticket with fee, available balance and protection band | Information overload on small screens |
| Depth chart and order book | Understanding liquidity | Pair detail (web full layout; mobile simplified) | Charts without text alternatives |
| Halt banner | Explains why trading stopped | Market halt banner | Mistaking a simulation halt for a real one; always labeled SIMULATED |
