# D-7: an approved hi-fi screen covers all five states and every size its interface needs (FR-017, FR-018). All modes.
check_d07() {
  local inv=$DD/screen-inventory.md bad=0 id ifc sizes hifi states need s st
  skip_if_absent D-7 "$inv" || return 0
  hdr_present "$inv" "$H_INVENTORY" || { pass D-7 "$inv header checked by D-1"; return 0; }
  while IFS="$US" read -r id ifc _ _ _ _ sizes _ _ _ hifi states _; do
    [ "$hifi" = approved ] || continue
    for st in P E L X D; do
      [[ ",$states," == *",$st,"* ]] || { fail D-7 "$id is approved but lacks state $st"; bad=1; }
    done
    need="t768 w1280 w1440"; [ "$ifc" = CON ] && need="m360 m390 t768 w1280 w1440"
    for s in $need; do
      [[ ",$sizes," == *",$s,"* ]] || { fail D-7 "$id is approved but lacks size $s"; bad=1; }
    done
  done < <(table_rows "$inv" "$H_INVENTORY")
  [ "$bad" = 0 ] && pass D-7 "approved screens have all states and sizes"
}
