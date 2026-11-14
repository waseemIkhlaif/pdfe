# C-15: the gate verdict is 'passed' only if every criterion passed (FR-026, FR-027).
# Gate mode requires the file; format mode checks it only if it exists.
check_c15() {
  local f="docs/governance/gate-0-review.md" bad=0 crit res ev nfail=0 nrows=0 verdict
  skip_if_absent C-15 "$f" || return 0
  while IFS="$US" read -r crit res ev; do
    nrows=$((nrows + 1))
    case "$res" in pass) ;; fail) nfail=$((nfail + 1)) ;; *) fail C-15 "'$crit': Result must be pass or fail"; bad=1 ;; esac
    blank "$ev" && { fail C-15 "'$crit': Evidence link required"; bad=1; }
  done < <(table_rows "$f" '| Criterion | Result | Evidence |')
  verdict="$(tr -d '\r' < "$f" | grep -E '^Verdict: (passed|not passed)$' | head -1)"
  [ -n "$verdict" ] || { fail C-15 "$f: 'Verdict: passed' or 'Verdict: not passed' line required"; bad=1; }
  [ "$nrows" -gt 0 ] || { fail C-15 "$f: criteria table is empty"; bad=1; }
  if [ "$verdict" = "Verdict: passed" ] && [ "$nfail" -gt 0 ]; then
    fail C-15 "verdict is 'passed' but $nfail criterion/criteria failed"; bad=1
  fi
  [ "$bad" = 0 ] && pass C-15 "gate record consistent ($nrows criteria, $verdict)"
}
