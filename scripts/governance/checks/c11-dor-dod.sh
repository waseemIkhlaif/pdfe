# C-11: Definition of Ready / Done present with the plan's item counts (FR-012). Gate mode only.
check_c11() {
  local bad=0 n spec f min
  gate_only C-11 || return 0
  for spec in "docs/governance/definition-of-ready.md:10" "docs/governance/definition-of-done.md:13"; do
    f="${spec%%:*}"; min="${spec##*:}"
    skip_if_absent C-11 "$f" || { bad=1; continue; }
    n="$(grep -cE '^- \[[ xX]\] ' "$f")"
    [ "$n" -ge "$min" ] || { fail C-11 "$f: $n checklist items, need at least $min"; bad=1; }
  done
  [ "$bad" = 0 ] && pass C-11 "DoR/DoD item counts satisfied"
}
