#!/usr/bin/env bash
# Fixture runner for check-design.sh. Each folder in fixtures/ is named dNN-<pass|fail>-<name>.
# It is copied into a throwaway directory (together with scripts/ and the token checker scripts),
# check-design.sh is run (with --gate <value of file GATE> if present), and the expected
# PASS/FAIL line for check D-NN is asserted.
set -u
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
fx="$root/scripts/design/tests/fixtures"
total=0; bad=0

for d in "$fx"/*/; do
  name="$(basename "$d")"
  id="${name%%-*}"; num=$((10#${id#d}))
  rest="${name#*-}"; kind="${rest%%-*}"
  total=$((total + 1))
  tmp="$(mktemp -d)"
  mkdir -p "$tmp/scripts" "$tmp/packages/design-tokens"
  cp -r "$root/scripts/design" "$tmp/scripts/design"; rm -rf "$tmp/scripts/design/tests"
  cp -r "$root/scripts/governance" "$tmp/scripts/governance"
  cp -r "$root/scripts/safety" "$tmp/scripts/safety"
  [ -d "$root/packages/design-tokens/scripts" ] && cp -r "$root/packages/design-tokens/scripts" "$tmp/packages/design-tokens/scripts"
  cp -r "$d". "$tmp/"
  args=""
  [ -f "$d/GATE" ] && args="--gate $(tr -d '\r\n' < "$d/GATE")"
  # Only D-13 needs commit dates, so a throwaway git repo is created just for fixtures that contain specs/.
  if [ -d "$d/specs" ]; then
    (cd "$tmp" && git init -q && git add -A >/dev/null 2>&1 \
       && git -c user.email=t@example.invalid -c user.name=fixture -c core.autocrlf=false commit -q -m fixture >/dev/null 2>&1)
  fi
  # shellcheck disable=SC2086
  out="$(cd "$tmp" && bash scripts/design/check-design.sh $args 2>/dev/null)"
  ok=0
  if [ "$kind" = "pass" ]; then
    echo "$out" | grep -q "^PASS D-$num " && ! echo "$out" | grep -q "^FAIL D-$num " && ok=1
  else
    echo "$out" | grep -q "^FAIL D-$num " && ok=1
  fi
  if [ "$ok" = 1 ]; then echo "ok     $name"; else echo "not ok $name"; echo "$out" | grep "D-$num " | sed 's/^/       /'; bad=$((bad + 1)); fi
  rm -rf "$tmp"
done

echo "$((total - bad))/$total fixtures behaved as expected" >&2
[ "$bad" -eq 0 ]
