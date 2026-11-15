#!/usr/bin/env bash
# Fixture suite for the forbidden-pattern scan (D-11 style). Every fixtures/fail-* directory must be flagged by
# scripts/safety/forbidden-patterns.txt, and every fixtures/pass-* directory must not be.
# It uses the same grep flags as check C-9 (scripts/governance/checks/c09-forbidden.sh).
set -u
cd "$(dirname "$0")/../../.." || exit 2
pats="$(mktemp)"
grep -Ev '^[[:space:]]*(#|$)' scripts/safety/forbidden-patterns.txt > "$pats"
bad=0
total=0
for dir in scripts/safety/tests/fixtures/*/; do
  name="$(basename "$dir")"
  total=$((total + 1))
  if grep -rIiqE -f "$pats" "$dir" 2>/dev/null; then hit=1; else hit=0; fi
  case "$name" in
    fail-*) if [ "$hit" = 1 ]; then echo "PASS $name is flagged"; else echo "FAIL $name was NOT flagged"; bad=$((bad + 1)); fi ;;
    pass-*) if [ "$hit" = 0 ]; then echo "PASS $name is clean"; else echo "FAIL $name was flagged"; bad=$((bad + 1)); fi ;;
    *) echo "FAIL $name: fixture directories must start with fail- or pass-"; bad=$((bad + 1)) ;;
  esac
done
rm -f "$pats"
echo "$((total - bad)) passed, $bad failed (safety scan fixtures)"
[ "$bad" = 0 ]
