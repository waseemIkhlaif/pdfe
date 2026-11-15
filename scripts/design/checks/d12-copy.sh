# D-12: copy deck review trail (FR-028a, FR-029, SC-009). All modes.
# An approved row needs: Arabic review done; native spot-check done for money./status./sim. keys or regulated rows;
# legal approved for regulated rows.
check_d12() {
  local bad=0 f key en ar reg arrev native legal status
  for f in "$DD"/copy-decks/*.md; do
    [ -f "$f" ] || continue
    hdr_present "$f" "$H_COPY" || continue
    while IFS="$US" read -r key en ar reg arrev native legal status _; do
      [ "$status" = approved ] || continue
      [ "$arrev" = done ] || { fail D-12 "$f: $key is approved without a finished Arabic review"; bad=1; }
      if [[ "$key" =~ ^(money|status|sim)\. ]] || [ "$reg" = yes ]; then
        [ "$native" = done ] || { fail D-12 "$f: $key needs a native-speaker spot-check before approval"; bad=1; }
      fi
      if [ "$reg" = yes ] && [ "$legal" != approved ]; then
        fail D-12 "$f: regulated string $key is approved without legal approval"; bad=1
      fi
    done < <(table_rows "$f" "$H_COPY")
  done
  [ "$bad" = 0 ] && pass D-12 "approved copy has its required reviews"
}
