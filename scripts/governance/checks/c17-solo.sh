# C-17: solo-mode exception record and accepted risk exist (FR-011a). Applies only when SOLO_MODE=1; gate mode only.
check_c17() {
  local f="docs/governance/solo-mode-exception.md" bad=0 h
  if ! is_solo; then pass C-17 "not applicable (two-person mode)"; return 0; fi
  gate_only C-17 || return 0
  skip_if_absent C-17 "$f" || return 0
  for h in "Rules relaxed" "Compensating controls" "Accepted risk" "End condition"; do
    tr -d '\r' < "$f" | grep -qx "## $h" || { fail C-17 "$f: missing section '## $h'"; bad=1; }
  done
  grep -q 'RISK-P0-02' docs/risk/risk-register.md 2>/dev/null || { fail C-17 "RISK-P0-02 is missing from docs/risk/risk-register.md"; bad=1; }
  [ "$bad" = 0 ] && pass C-17 "solo-mode exception record and RISK-P0-02 present"
}
