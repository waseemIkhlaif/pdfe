# Bootstrap record

## Commits pushed to `main` without a pull request

| SHA | Subject |
|---|---|
| 5704835e2a85dc04237a081b4b03c589d649d9d9 | chore: bootstrap governance baseline (unprotected bootstrap commit) |

Date: 2026-11-14. CI on this commit: `governance-check` and `secret-scan` both succeeded (see `bootstrap-ci.txt`).

These are the only commits pushed to `main` without a pull request; protection enabled at 2026-11-14 23:21 (+02:00), ruleset `main-protection-solo` (id 27279868, enforcement `active`, no bypass actors).

## Rule from now on

Never push to `main`. Work on branch `000-governance-baseline`, then short-lived branches named `000-<topic>`, and merge each by pull request once the required checks pass. A direct push to `main` is a stop-work event (plan §I.6).
