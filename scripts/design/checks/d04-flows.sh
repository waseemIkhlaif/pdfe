# D-4: every PRD section 8 exception has a flow row ending in an outcome and a known status term (FR-013, SC-003).
# scripts/design/prd8-exceptions.txt lists "J<n>|<term>" per line. All modes.
check_d04() {
  local list=scripts/design/prd8-exceptions.txt voc=$DD/content/status-vocabulary.md bad=0 f j term seen=0
  local ids="" id outcome st
  [ -f "$list" ] || { pass D-4 "$list not present yet"; return 0; }
  [ -f "$voc" ] && ids="$(col_values "$voc" "$H_STATUS" 1)"
  for f in "$DD"/flows/J*.md; do
    [ -f "$f" ] || continue
    seen=1
    hdr_present "$f" "$H_FLOW" || continue
    j="$(basename "$f" .md)"
    local terms; terms="$(col_values "$f" "$H_FLOW" 2 | tr 'A-Z' 'a-z')"
    while IFS= read -r term; do
      echo "$terms" | grep -Fxq -- "$(echo "$term" | tr 'A-Z' 'a-z')" || { fail D-4 "$f: no exception row for \"$term\""; bad=1; }
    done < <(list_lines "$list" | awk -F'|' -v j="$j" '$1 == j {print $2}')
    while IFS="$US" read -r _ _ _ _ outcome st; do
      blank "$outcome" && { fail D-4 "$f: an exception row has no outcome"; bad=1; }
      if ! echo "$ids" | grep -Fxq -- "$st"; then fail D-4 "$f: status term '$st' is not in the status vocabulary"; bad=1; fi
    done < <(table_rows "$f" "$H_FLOW")
  done
  [ "$seen" = 0 ] && { pass D-4 "no flows present yet"; return 0; }
  [ "$bad" = 0 ] && pass D-4 "all PRD exceptions covered; outcomes and status terms valid"
}
