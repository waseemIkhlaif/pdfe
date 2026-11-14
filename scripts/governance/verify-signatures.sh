#!/usr/bin/env bash
# Verify that each signed artifact is backed by the sponsor's own approval of the PR that last changed it (FR-006a).
# Needs: git, gh (logged in), scripts/governance/team.env.  Contract: specs/000-governance-baseline/contracts/governance-check.md
# Output: "SIGNED <file> PR#<n> <date>" or "UNSIGNED/LAPSED <file> (<reason>)". Exit 1 if any file is not SIGNED.
set -u
cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 2
# shellcheck disable=SC1091
. scripts/governance/team.env 2>/dev/null || { echo "missing scripts/governance/team.env" >&2; exit 2; }
command -v gh >/dev/null 2>&1 || { echo "gh CLI not found (install it and run 'gh auth login')" >&2; exit 2; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "not a git repository" >&2; exit 2; }

rc=0
for f in docs/simulation-charter.md docs/governance/approved-scope.md docs/governance/gate-0-review.md; do
  sha="$(git log -1 --format=%H -- "$f")"
  if [ -z "$sha" ]; then echo "UNSIGNED/LAPSED $f (no commit touches this file)"; rc=1; continue; fi
  pr="$(gh api "repos/$OWNER/$REPO/commits/$sha/pulls" --jq '.[0].number // empty' 2>/dev/null)"
  if [ -z "$pr" ]; then echo "UNSIGNED/LAPSED $f (commit ${sha:0:8} did not come from a pull request)"; rc=1; continue; fi
  if [ "${SOLO_MODE:-0}" = "1" ]; then
    # Solo mode: no second approver exists. The audit trail is the pull request; the attestation line is checked by C-14.
    echo "SELF-ATTESTED $f PR#$pr $(git log -1 --format=%cs "$sha")"
    continue
  fi
  head="$(gh api "repos/$OWNER/$REPO/pulls/$pr" --jq '.head.sha')"
  n="$(gh api --paginate "repos/$OWNER/$REPO/pulls/$pr/reviews" \
        --jq "[.[] | select(.user.login==\"$SPONSOR_LOGIN\" and .state==\"APPROVED\" and .commit_id==\"$head\")] | length" \
        | awk '{s += $1} END {print s + 0}')"
  if [ "$n" -gt 0 ]; then
    echo "SIGNED $f PR#$pr $(git log -1 --format=%cs "$sha")"
  else
    echo "UNSIGNED/LAPSED $f (PR#$pr has no APPROVED review by $SPONSOR_LOGIN on its final commit)"; rc=1
  fi
done
exit "$rc"
