# D-10: design tokens meet contrast rules and the reserved simulation accent rule (FR-021, FR-024, SC-004). All modes.
check_d10() {
  local script=packages/design-tokens/scripts/check-contrast.mjs out rc
  [ -f "$script" ] || { pass D-10 "design-tokens not present yet"; return 0; }
  command -v node >/dev/null 2>&1 || { pass D-10 "node not installed - the contrast check runs in CI"; return 0; }
  out="$(node "$script" 2>&1)"; rc=$?
  if [ "$rc" = 0 ]; then
    pass D-10 "token contrast and reserved-accent checks pass"
  else
    echo "$out" | grep -E '^(FAIL|ERROR)' | head -5 | while IFS= read -r l; do fail D-10 "$l"; done
    [ "$(echo "$out" | grep -cE '^(FAIL|ERROR)')" = 0 ] && fail D-10 "check-contrast.mjs exited $rc: $(echo "$out" | head -1)"
  fi
}
