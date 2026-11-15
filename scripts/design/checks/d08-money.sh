# D-8: money-moving screens come as Enter / Review / Result sets (FR-019). All modes.
# A screen name is "<flow> – <step>" (en dash; the last en dash separates the step). A flow with any Money=yes screen needs a review step,
# a result step and at least one earlier step (enter or a flow-specific first step).
check_d08() {
  local inv=$DD/screen-inventory.md bad=0 name money stem step
  skip_if_absent D-8 "$inv" || return 0
  hdr_present "$inv" "$H_INVENTORY" || { pass D-8 "$inv header checked by D-1"; return 0; }
  declare -A isflow=() rev=() res=() first=()
  while IFS="$US" read -r _ _ name _ _ _ _ money _ _ _ _ _ _; do
    if [[ "$name" == *" – "* ]]; then
      stem="${name% – *}"; step="${name##* – }"
      case "${step,,}" in
        review*) rev[$stem]=1 ;;
        result*) res[$stem]=1 ;;
        *) first[$stem]=1 ;;
      esac
      [ "$money" = yes ] && isflow[$stem]=1
    elif [ "$money" = yes ]; then
      fail D-8 "money screen \"$name\" is not part of an enter/review/result set"; bad=1
    fi
  done < <(table_rows "$inv" "$H_INVENTORY")
  for stem in "${!isflow[@]}"; do
    [ -n "${rev[$stem]:-}" ] || { fail D-8 "money flow \"$stem\" has no review step"; bad=1; }
    [ -n "${res[$stem]:-}" ] || { fail D-8 "money flow \"$stem\" has no result step"; bad=1; }
    [ -n "${first[$stem]:-}" ] || { fail D-8 "money flow \"$stem\" has no enter step"; bad=1; }
  done
  [ "$bad" = 0 ] && pass D-8 "money flows have enter, review and result steps"
}
