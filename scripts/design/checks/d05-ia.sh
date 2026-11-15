# D-5: sitemap navigation items are in the permission matrix; targets exist; the demo viewer is read-only (FR-012, FR-016). All modes.
check_d05() {
  local mx=$DD/ia/permission-matrix.md inv=$DD/screen-inventory.md bad=0 f nav target any=0 v
  if [ -f "$mx" ] && hdr_present "$mx" "$H_MATRIX"; then
    any=1
    while IFS= read -r v; do
      [ "$v" = full ] && { fail D-5 "$mx: PER-10 (demo viewer) must not have 'full' access"; bad=1; }
    done < <(col_values "$mx" "$H_MATRIX" 12)
  fi
  local navs=""; [ "$any" = 1 ] && navs="$(col_values "$mx" "$H_MATRIX" 2)"
  local ids=""; [ -f "$inv" ] && hdr_present "$inv" "$H_INVENTORY" && ids="$(col_values "$inv" "$H_INVENTORY" 1)"
  for f in "$DD"/ia/sitemaps/*.md; do
    [ -f "$f" ] || continue
    any=1
    hdr_present "$f" "$H_SITEMAP" || continue
    if [ ! -f "$mx" ]; then fail D-5 "$f: $mx is missing"; bad=1; continue; fi
    while IFS="$US" read -r nav _ target _; do
      echo "$navs" | grep -Fxq -- "$nav" || { fail D-5 "$f: nav item $nav is not in the permission matrix"; bad=1; }
      if [ -n "$ids" ] && ! echo "$ids" | grep -Fxq -- "$target"; then fail D-5 "$f: target screen $target is not in the inventory"; bad=1; fi
    done < <(table_rows "$f" "$H_SITEMAP")
  done
  [ "$any" = 0 ] && { pass D-5 "no sitemaps or matrix present yet"; return 0; }
  [ "$bad" = 0 ] && pass D-5 "navigation and permission matrix consistent"
}
