# Transaction status vocabulary

One vocabulary for every screen and export (FR-015). Each status has an icon and text, never color alone. The Arabic labels are drafts until the implementer review and the native-speaker spot-check are recorded below the table (task T034).

| ID | English | Arabic | Meaning | Icon | Color token | Next statuses |
|---|---|---|---|---|---|---|
| ST-DRAFT | Draft | مسودة (draft) | Started by the user, not yet submitted. Nothing has moved. | pencil | color.neutral.600 | ST-PENDING, ST-EXPIRED |
| ST-PENDING | Pending | قيد الانتظار (draft) | Submitted and being processed. The result is not final yet. | clock | color.semantic.info.fg | ST-HELD, ST-UNDER-REVIEW, ST-COMPLETED, ST-FAILED, ST-EXPIRED |
| ST-HELD | Held | معلّقة (draft) | Funds are reserved or the step is paused by a rule or a halt. | pause-circle | color.semantic.warning.fg | ST-PENDING, ST-UNDER-REVIEW, ST-COMPLETED, ST-FAILED |
| ST-UNDER-REVIEW | Under review | قيد المراجعة (draft) | A person (compliance or operations) must decide before it continues. | search-check | color.semantic.warning.fg | ST-COMPLETED, ST-FAILED |
| ST-COMPLETED | Completed | مكتملة (draft) | Finished and posted to the ledger. | check-circle | color.semantic.success.fg | ST-REVERSED |
| ST-FAILED | Failed | فشلت (draft) | Stopped without moving money, with a reason the user can read. | x-circle | color.semantic.danger.fg | — |
| ST-REVERSED | Reversed | تم عكسها (draft) | Completed earlier and then undone by a linked reversal entry. | undo | color.semantic.info.fg | — |
| ST-EXPIRED | Expired | منتهية الصلاحية (draft) | The time to act ran out (a quote or a QR code). Nothing was charged. | timer-off | color.neutral.600 | — |

Review record: Arabic reviewed _not yet_; native spot-check _not yet_.
