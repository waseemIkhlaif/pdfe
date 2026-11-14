# C-7: risk register complete (FR-017). Gate mode only.
RISK_HDR='| ID | Description | Severity | Owner | Mitigation | Mitigated in | Status |'
check_c07() {
  local f="docs/risk/risk-register.md" bad=0 id de sv ow mi mt st n pm=0 ids=" "
  gate_only C-7 || return 0
  skip_if_absent C-7 "$f" || return 0
  while IFS="$US" read -r id de sv ow mi mt st; do
    ids="$ids$id "
    case "$id" in RISK-PM-*) pm=$((pm + 1)) ;; esac
    case "$sv" in Critical|High|Medium|Low) ;; *) fail C-7 "$id: invalid Severity '$sv'"; bad=1 ;; esac
    blank "$ow" && { fail C-7 "$id: Owner required"; bad=1; }
    blank "$mt" && { fail C-7 "$id: 'Mitigated in' required"; bad=1; }
  done < <(table_rows "$f" "$RISK_HDR")
  for n in $(seq -w 1 20); do
    case "$ids" in *" R-$n "*) ;; *) fail C-7 "R-$n missing"; bad=1 ;; esac
  done
  [ "$pm" -ge 1 ] || { fail C-7 "no RISK-PM-* rows (PM §10 risks missing)"; bad=1; }
  [ "$bad" = 0 ] && pass C-7 "R-01..R-20 and $pm PM risk(s) present and complete"
}
