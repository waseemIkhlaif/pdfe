#!/usr/bin/env bash
# PDFE design-track checker (required status check: design-check).
# Usage: bash scripts/design/check-design.sh [--gate phase-NN]
# Exit: 0 all pass | 1 one or more FAIL | 2 script error
# Contract: specs/000-ux-design-track/contracts/design-check.md
set -u

usage() { echo "usage: bash scripts/design/check-design.sh [--gate phase-NN]" >&2; exit 2; }

GATE_MODE=0
GATE_PHASE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --gate)
      [ $# -ge 2 ] || usage
      [[ "$2" =~ ^phase-([0-9]{1,2})$ ]] || usage
      GATE_MODE=1
      GATE_PHASE="$(printf '%02d' "$((10#${BASH_REMATCH[1]}))")"
      shift 2 ;;
    *) usage ;;
  esac
done
export GATE_MODE GATE_PHASE

cd "$(dirname "${BASH_SOURCE[0]}")/../.." || exit 2
for f in scripts/governance/lib.sh scripts/design/lib-design.sh; do
  [ -f "$f" ] || { echo "missing $f" >&2; exit 2; }
done
for t in awk grep sed git sha256sum; do
  command -v "$t" >/dev/null 2>&1 || { echo "required tool not found: $t" >&2; exit 2; }
done

# shellcheck disable=SC1091
. scripts/governance/lib.sh
# shellcheck disable=SC1091
. scripts/design/lib-design.sh
for f in scripts/design/checks/d*.sh; do
  [ -f "$f" ] && . "$f"
done

for fn in $(declare -F | awk '{print $3}' | grep -E '^check_d[0-9]+$' | sort -V); do
  "$fn"
done

echo "$PASSES passed, $FAILS failed (mode: $([ "$GATE_MODE" = 1 ] && echo "gate phase-$GATE_PHASE" || echo format))" >&2
[ "$FAILS" -eq 0 ]
