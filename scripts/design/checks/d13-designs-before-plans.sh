# D-13: designs before plans (FR-001, SC-001). All modes.
# scripts/design/ui-features.txt lists "NNN phase-NN". When specs/NNN-*/plan.md exists, approvals.md must hold a row
# for that phase package dated on or before the plan's first commit date.
check_d13() {
  local list=scripts/design/ui-features.txt appr=$DD/approvals.md bad=0 line num phase plan pd art date
  [ -f "$list" ] || { pass D-13 "$list not present yet"; return 0; }
  while IFS= read -r line; do
    num="${line%% *}"; phase="${line##* }"
    plan="$(ls specs/"$num"-*/plan.md 2>/dev/null | head -1)"
    [ -n "$plan" ] || continue
    pd="$(first_commit_date "$plan")"
    local ok=0
    if [ -f "$appr" ] && hdr_present "$appr" "$H_APPROVALS"; then
      while IFS="$US" read -r art _ _ _ date _; do
        [ "$art" = "$phase" ] && iso_date_ok "$date" && [[ ! "$date" > "$pd" ]] && ok=1
      done < <(table_rows "$appr" "$H_APPROVALS")
    fi
    [ "$ok" = 1 ] || { fail D-13 "$num plan exists without an approved $phase package dated on or before $pd"; bad=1; }
  done < <(list_lines "$list")
  [ "$bad" = 0 ] && pass D-13 "no UI feature is planned ahead of its approved design package"
}
