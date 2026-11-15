# D-6: wireframe skeleton is complete (FR-016a). Gate mode only.
# Each of the 8 interfaces has >= 4 screens with Skeleton=yes and Wireframe=done; every J1/J2 screen is Wireframe=done.
check_d06() {
  gate_only D-6 || return 0
  local inv=$DD/screen-inventory.md bad=0 ifc n id jr wf sk
  [ -f "$inv" ] && hdr_present "$inv" "$H_INVENTORY" || { fail D-6 "$inv is required for a gate"; return 0; }
  declare -A cnt=()
  while IFS="$US" read -r id ifc _ _ jr _ _ _ sk wf _; do
    [ "$sk" = yes ] && [ "$wf" = done ] && cnt[$ifc]=$(( ${cnt[$ifc]:-0} + 1 ))
    if [[ "$jr" =~ (^|[^0-9A-Za-z])J[12]([^0-9]|$) ]] && [ "$wf" != done ]; then
      fail D-6 "$id is part of J1/J2 but is not wireframed"; bad=1
    fi
  done < <(table_rows "$inv" "$H_INVENTORY")
  for ifc in CON MER BIZ OPS CMP FIN INV DEV; do
    n="${cnt[$ifc]:-0}"
    [ "$n" -ge 4 ] || { fail D-6 "$ifc has $n skeleton screens wireframed; at least 4 are required"; bad=1; }
  done
  [ "$bad" = 0 ] && pass D-6 "skeleton complete for all 8 interfaces and J1/J2"
}
