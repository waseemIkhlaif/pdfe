#!/usr/bin/env bash
# PDFE Phase 0 governance checker (required status check: governance-check).
# Usage: bash scripts/governance/check-phase0.sh [--gate]
# Exit: 0 all pass | 1 one or more FAIL | 2 script error
set -u

GATE_MODE=0
for arg in "$@"; do
  case "$arg" in
    --gate) GATE_MODE=1 ;;
    *) echo "usage: bash scripts/governance/check-phase0.sh [--gate]" >&2; exit 2 ;;
  esac
done
export GATE_MODE

cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 2
[ -f scripts/governance/lib.sh ] || { echo "missing scripts/governance/lib.sh" >&2; exit 2; }
for t in awk grep sed; do
  command -v "$t" >/dev/null 2>&1 || { echo "required tool not found: $t" >&2; exit 2; }
done

# shellcheck disable=SC1091
. scripts/governance/lib.sh
for f in scripts/governance/checks/c*.sh; do
  [ -f "$f" ] && . "$f"
done

for fn in $(declare -F | awk '{print $3}' | grep -E '^check_c[0-9]+$' | sort -V); do
  "$fn"
done

echo "$PASSES passed, $FAILS failed (mode: $([ "$GATE_MODE" = 1 ] && echo gate || echo format))" >&2
[ "$FAILS" -eq 0 ]
