# Quickstart run on a clean clone

Date: 2026-11-15. Clone of https://github.com/waseemIkhlaif/pdfe.git at commit 5586e13, in a separate folder. Solo mode, so the sponsor-approval variants of the steps are replaced by their solo-mode forms. Steps 1 and 3 are covered by the saved evidence files (specify-check.txt, push-rejected.txt, merge-blocked.txt), which were created earlier and not repeated.

```
## 2 format
17 passed, 0 failed (mode: format)
## 2 gate
PASS C-15 gate record consistent (17 criteria, Verdict: passed)
17 passed, 0 failed (mode: gate)
## 4 signatures
SELF-ATTESTED docs/simulation-charter.md PR#3 2026-11-14
SELF-ATTESTED docs/governance/approved-scope.md PR#4 2026-11-14
SELF-ATTESTED docs/governance/gate-0-review.md PR#18 2026-11-15
## 3 ruleset
active bypass=null
## 5 roles/solo
8
docs/governance/solo-mode-exception.md
1
## 6 labels
39
PDFE Delivery
@waseemIkhlaif's untitled project
## 7 secrets
10:18PM INF no leaks found
## 8 gate
17
Verdict: passed
```

Results: all expected outcomes hold. The ruleset list endpoint does not return bypass actors (shown as null above); the full export in ruleset.json shows an empty list.
