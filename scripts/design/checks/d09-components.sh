# D-9: the component library lists every component from plan Phase 1 Stage 4 (FR-023). All modes.
# scripts/design/components.txt lists "<group>|<Name>" per line. SimulationBanner and SimulatedBadge must be non-dismissible.
check_d09() {
  local f=$DD/system/components.md list=scripts/design/components.txt bad=0 line grp name row
  skip_if_absent D-9 "$f" || return 0
  [ -f "$list" ] || { pass D-9 "$list not present yet"; return 0; }
  hdr_present "$f" "$H_COMPONENTS" || { pass D-9 "$f header checked by D-1"; return 0; }
  local rows; rows="$(table_rows "$f" "$H_COMPONENTS")"
  while IFS= read -r line; do
    grp="${line%%|*}"; name="${line#*|}"
    row="$(echo "$rows" | awk -F"$US" -v n="$name" -v g="$grp" '$1 == n && $2 == g {print; exit}')"
    if [ -z "$row" ]; then fail D-9 "component $name ($grp) is missing"; bad=1; continue; fi
    case "$name" in
      SimulationBanner|SimulatedBadge)
        echo "$row" | grep -qi 'non-dismissible' || { fail D-9 "$name must state non-dismissible"; bad=1; } ;;
    esac
  done < <(list_lines "$list")
  [ "$bad" = 0 ] && pass D-9 "component library complete; simulation components non-dismissible"
}
