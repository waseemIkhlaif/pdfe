# C-1: original source documents are present and non-empty (FR-003). All modes.
check_c01() {
  local f ok=1
  for f in docs/source/01_MASTER_PRD.md docs/source/03_PROJECT_MANAGEMENT_PLAN.md; do
    if [ ! -s "$f" ]; then fail C-1 "$f is missing or empty"; ok=0; fi
  done
  [ "$ok" = 1 ] && pass C-1 "source documents present"
}
