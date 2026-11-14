# C-6: D-01..D-12 present; D-10 and D-12 settled (FR-013, FR-015). Gate mode only.
check_c06() {
  local f="docs/decisions/decision-register.md" bad=0 n id q o d st rest seen=" "
  gate_only C-6 || return 0
  skip_if_absent C-6 "$f" || return 0
  while IFS="$US" read -r id q o d st rest; do
    seen="$seen$id:$st "
  done < <(table_rows "$f" "$DECISION_HDR")
  for n in 01 02 03 04 05 06 07 08 09 10 11 12; do
    case "$seen" in *" D-$n:"*) ;; *) fail C-6 "D-$n missing from the decision register"; bad=1 ;; esac
  done
  for n in 10 12; do
    case "$seen" in
      *" D-$n:decided "*|*" D-$n:default-accepted "*) ;;
      *) fail C-6 "D-$n must be decided or default-accepted before Gate 0/A"; bad=1 ;;
    esac
  done
  [ "$bad" = 0 ] && pass C-6 "D-01..D-12 present; D-10 and D-12 settled"
}
