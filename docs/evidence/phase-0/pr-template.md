# PR template evidence

The template is present on the default branch (verified through the GitHub contents API):

$ gh api repos/waseemIkhlaif/pdfe/contents/.github/pull_request_template.md --jq .path
.github/pull_request_template.md

GitHub pre-fills the body of every new PR from this file in the web UI; the CLI's non-interactive mode does not, so PRs opened by script supply their own body.

## Template body

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
## Reviewers required: product / finance / security / legal (copy) / QA
