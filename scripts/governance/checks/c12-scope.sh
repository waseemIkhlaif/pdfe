# C-12: approved scope covers all 34 P0 IDs and J1..J7 (FR-007, FR-008). Source: plan Part F.1.
P0_IDS="FR-LED-001 FR-LED-002 FR-LED-003 FR-LED-004 FR-LED-005 FR-TXN-001 FR-TXN-002 FR-ACC-001 FR-ACC-002 FR-SEC-001 FR-AUD-001 FR-WAL-001 FR-WAL-002 FR-PAY-001 FR-PAY-002 FR-REM-001 FR-REM-002 FR-STB-001 FR-STB-002 FR-STB-003 FR-EXC-001 FR-EXC-002 FR-INT-001 FR-INT-002 FR-CMP-001 FR-CMP-002 FR-CMP-003 FR-CMP-004 FR-OPS-001 FR-OPS-002 FR-ADM-001 FR-DEMO-001 FR-DEMO-002 FR-DEMO-003"
check_c12() {
  local f="docs/governance/approved-scope.md" bad=0 id t st dr ap dt ids=" " x known
  skip_if_absent C-12 "$f" || return 0
  known=" $P0_IDS J1 J2 J3 J4 J5 J6 J7 "
  while IFS="$US" read -r id t st dr ap dt; do
    case "$ids" in *" $id "*) fail C-12 "$id listed more than once"; bad=1 ;; esac
    ids="$ids$id "
    case "$st" in approved|deferred|removed) ;; *) fail C-12 "$id: invalid Status '$st'"; bad=1 ;; esac
    if [ "$st" != approved ] && blank "$dr"; then fail C-12 "$id: Decision ref required when Status is $st"; bad=1; fi
    case "$known" in
      *" $id "*) ;;
      *) if blank "$dr"; then fail C-12 "$id: not in the approved P0/journey list; Decision ref required"; bad=1; fi ;;
    esac
  done < <(table_rows "$f" '| ID | Title | Status | Decision ref | Approver | Date |')
  if [ "$GATE_MODE" = "1" ]; then
    for x in $P0_IDS J1 J2 J3 J4 J5 J6 J7; do
      case "$ids" in *" $x "*) ;; *) fail C-12 "$x missing from approved scope"; bad=1 ;; esac
    done
  fi
  [ "$bad" = 0 ] && pass C-12 "approved scope well-formed"
}
