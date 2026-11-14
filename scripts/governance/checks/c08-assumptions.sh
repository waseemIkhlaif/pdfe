# C-8: regulatory assumptions stay unvalidated unless counsel review is recorded (FR-018). All modes.
check_c08() {
  local f="docs/legal/assumption-log.md" bad=0 id a src vs rev dt
  skip_if_absent C-8 "$f" || return 0
  while IFS="$US" read -r id a src vs rev dt; do
    case "$vs" in
      unvalidated) ;;
      validated|rejected)
        blank "$rev" && { fail C-8 "$id: Counsel reviewer required for status $vs"; bad=1; }
        is_date "$dt" || { fail C-8 "$id: valid Review date required for status $vs"; bad=1; } ;;
      *) fail C-8 "$id: invalid Validation status '$vs'"; bad=1 ;;
    esac
  done < <(table_rows "$f" '| ID | Assumption | Source | Validation status | Counsel reviewer | Review date |')
  [ "$bad" = 0 ] && pass C-8 "assumption log well-formed"
}
