# C-5: decision rows are well-formed (FR-013, FR-014). All modes.
DECISION_HDR='| ID | Question | Options | Decision | Status | Owner | Approver | Date | Rationale | Consequences | Needed by phase | Default if undecided | Review date |'
check_c05() {
  local f="docs/decisions/decision-register.md" bad=0 id q o d st ow ap dt ra co nb df rv
  skip_if_absent C-5 "$f" || return 0
  while IFS="$US" read -r id q o d st ow ap dt ra co nb df rv; do
    [[ "$id" =~ ^D-[0-9]{2}$ ]] || { fail C-5 "$f: bad ID '$id'"; bad=1; continue; }
    blank "$ow" && { fail C-5 "$id: Owner is required"; bad=1; }
    case "$st" in open|proposed|decided|default-accepted|superseded) ;; *) fail C-5 "$id: invalid Status '$st'"; bad=1 ;; esac
    if [ "$st" = decided ] || [ "$st" = default-accepted ]; then
      blank "$ap" && { fail C-5 "$id: Approver required for status $st"; bad=1; }
      if [ -n "$ap" ] && [ "$ap" = "$ow" ] && ! is_solo; then fail C-5 "$id: Approver must differ from Owner (two-person mode)"; bad=1; fi
      is_date "$dt" || { fail C-5 "$id: valid Date required for status $st"; bad=1; }
    fi
  done < <(table_rows "$f" "$DECISION_HDR")
  [ "$bad" = 0 ] && pass C-5 "decision rows well-formed"
}
