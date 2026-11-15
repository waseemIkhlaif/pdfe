# D-3: the screen inventory covers every screen in plan section J.6 (FR-017, SC-002). All modes.
# scripts/design/j6-screens.txt lists "<IF>|<screen name>" per line.
check_d03() {
  local inv=$DD/screen-inventory.md list=scripts/design/j6-screens.txt bad=0 line ifc name id
  skip_if_absent D-3 "$inv" || return 0
  [ -f "$list" ] || { pass D-3 "$list not present yet"; return 0; }
  hdr_present "$inv" "$H_INVENTORY" || { pass D-3 "$inv header checked by D-1"; return 0; }
  local rows; rows="$(table_rows "$inv" "$H_INVENTORY" | awk -F"$US" '{print $2 "|" $3}')"
  while IFS= read -r line; do
    ifc="${line%%|*}"; name="${line#*|}"
    echo "$rows" | grep -Fxq -- "$ifc|$name" || { fail D-3 "inventory is missing screen: $ifc|$name"; bad=1; }
  done < <(list_lines "$list")
  local dup; dup="$(col_values "$inv" "$H_INVENTORY" 1 | sort | uniq -d)"
  if [ -n "$dup" ]; then for id in $dup; do fail D-3 "duplicate screen ID $id"; done; bad=1; fi
  [ "$bad" = 0 ] && pass D-3 "inventory covers every screen in the list; IDs are unique"
}
