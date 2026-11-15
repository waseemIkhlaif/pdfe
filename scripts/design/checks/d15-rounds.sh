# D-15: usability rounds have enough participants and no accepted critical finding (FR-020, FR-030, SC-006). All modes.
# >= 5 participants when the scope includes a journey (J1-J7), otherwise >= 3.
check_d15() {
  local bad=0 f scope min n crit st
  for f in "$DD"/usability/UR-*.md; do
    [ -f "$f" ] || continue
    scope="$(tr -d '\r' < "$f" | grep -m1 '^\*\*Scope\*\*:')"
    min=3; [[ "$scope" =~ J[1-7]([^0-9]|$) ]] && min=5
    n="$(col_values "$f" "$H_UR_PEOPLE" 1 | sort -u | grep -c .)"
    [ "$n" -ge "$min" ] || { fail D-15 "$f: $n participants; at least $min are required"; bad=1; }
    while IFS="$US" read -r _ _ _ _ crit st _; do
      [ "$crit" = yes ] && [ "$st" = accepted ] && { fail D-15 "$f: a critical finding cannot be accepted"; bad=1; }
    done < <(table_rows "$f" "$H_UR_FIND")
  done
  [ "$bad" = 0 ] && pass D-15 "usability rounds meet participant minimums; no accepted critical finding"
}
