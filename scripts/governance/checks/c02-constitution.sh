# C-2: constitution ratified (FR-004, FR-005).
# Format mode tolerates the *pristine* Spec Kit template (it still has [PROJECT_NAME]) so the bootstrap commit can go green
# before ratification; gate mode and any partially-filled file are checked strictly.
check_c02() {
  local f=".specify/memory/constitution.md" bad=0 i n ver rat
  skip_if_absent C-2 "$f" || return 0
  if [ "$GATE_MODE" != "1" ] && grep -q '\[PROJECT_NAME\]' "$f"; then
    pass C-2 "constitution is still the unratified template (format mode)"; return 0
  fi
  if grep -nE '\[[A-Z][A-Z0-9_]+\]' "$f" >/dev/null; then fail C-2 "$f: template placeholder(s) remain"; bad=1; fi
  local titles=(
    "I. Simulation Boundary First" "II. Ledger Is the Source of Truth" "III. Money Safety"
    "IV. Idempotency and Explicit State" "V. Security, Tenancy and Separation of Duties"
    "VI. Auditability and Traceability" "VII. Test-First for P0" "VIII. Honest Representation"
    "IX. Inclusive by Default" "X. Reproducibility" "XI. Simplicity"
  )
  n=0
  for i in "${titles[@]}"; do
    if grep -Fq -- "### $i" "$f"; then n=$((n + 1)); else fail C-2 "$f: missing article heading '### $i'"; bad=1; fi
  done
  grep -q '^## Governance' "$f" || { fail C-2 "$f: missing '## Governance' section"; bad=1; }
  ver="$(grep -oE '\*\*Version\*\*: *[0-9]+\.[0-9]+\.[0-9]+' "$f" | head -1)"
  rat="$(grep -oE '\*\*Ratified\*\*: *[0-9]{4}-[0-9]{2}-[0-9]{2}' "$f" | head -1)"
  [ -n "$ver" ] || { fail C-2 "$f: missing/invalid **Version**"; bad=1; }
  [ -n "$rat" ] || { fail C-2 "$f: missing/invalid **Ratified** date"; bad=1; }
  [ "$bad" = 0 ] && pass C-2 "constitution has $n/11 articles, governance clause, version and ratification date"
}
