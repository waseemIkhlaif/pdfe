#!/usr/bin/env bash
# Create/refresh the PDFE backlog labels (FR-024). Idempotent: uses `gh label create --force`.
# Needs: gh (logged in), scripts/governance/team.env.  Creates 40 labels:
# 3 priority + 17 domain + 13 phase + 6 gate + stop-work.
set -eu
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
# shellcheck disable=SC1091
. scripts/governance/team.env
command -v gh >/dev/null 2>&1 || { echo "gh CLI not found (install it and run 'gh auth login')" >&2; exit 2; }
R="$OWNER/$REPO"
n=0
mk() { gh label create "$1" --repo "$R" --color "$2" --description "$3" --force >/dev/null; n=$((n + 1)); }

mk P0 b60205 "Priority: critical (must pass a gate)"
mk P1 d93f0b "Priority: high"
mk P2 fbca04 "Priority: normal"
for d in led txn acc sec aud wal pay biz rem stb exc inc int cmp ops adm demo; do mk "domain:$d" 1d76db "PRD domain: $d"; done
for p in $(seq 0 12); do mk "phase:$p" 5319e7 "Implementation phase $p"; done
for g in $(seq 0 5); do mk "gate:$g" 0e8a16 "Gate $g"; done
mk stop-work b60205 "Stop-work trigger (plan Part I.6)"
echo "created/updated $n labels in $R"
[ "$n" -eq 40 ]
