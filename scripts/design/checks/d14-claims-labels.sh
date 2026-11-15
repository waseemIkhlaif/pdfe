# D-14: no prohibited claims in design text; every copy deck carries the simulation banner string (FR-029, FR-031, SC-008). All modes.
check_d14() {
  local bad=0 f term text key en ar
  local EN='SIMULATION — NOT REAL MONEY' AR='محاكاة — ليست أموالاً حقيقية'
  local claims=scripts/safety/prohibited-claims.txt
  if [ -f "$claims" ]; then
    while IFS= read -r f; do
      [ -f "$f" ] || continue
      text="$(tr -d '\r' < "$f")"
      while IFS= read -r term; do
        if echo "$text" | grep -iwF -- "$term" >/dev/null; then fail D-14 "$f: prohibited claim \"$term\""; bad=1; fi
      done < <(list_lines "$claims")
    done < <({ find "$DD/copy-decks" "$DD/flows" "$DD/ia" -type f -name '*.md' 2>/dev/null; echo "$DD/system/components.md"; } | sort)
  fi
  for f in "$DD"/copy-decks/*.md; do
    [ -f "$f" ] || continue
    hdr_present "$f" "$H_COPY" || continue
    local found=0
    while IFS="$US" read -r key en ar _; do
      [ "$key" = sim.banner ] || continue
      found=1
      [ "$en" = "$EN" ] && [ "$ar" = "$AR" ] || { fail D-14 "$f: sim.banner text must be exactly \"$EN\" / \"$AR\""; bad=1; }
    done < <(table_rows "$f" "$H_COPY")
    [ "$found" = 1 ] || { fail D-14 "$f: missing the sim.banner key"; bad=1; }
  done
  [ "$bad" = 0 ] && pass D-14 "no prohibited claims; simulation banner string present"
}
