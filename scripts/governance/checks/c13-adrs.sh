# C-13: ADR drafts (FR-025). Format mode: every existing ADR is well-formed. Gate mode: all 15 exist.
check_c13() {
  local bad=0 f n=0 i sec prev ln body
  local secs=("Context" "Decision" "Options considered" "Consequences" "Linked requirements" "Verification")
  for f in docs/adr/ADR-0[0-9][0-9]-*.md; do
    [ -f "$f" ] || continue
    n=$((n + 1))
    head -1 "$f" | tr -d '\r' | grep -Eq '^# ADR-[0-9]{3}: .+' || { fail C-13 "$f: line 1 must be '# ADR-NNN: <Title>'"; bad=1; }
    sed -n 2p "$f" | tr -d '\r' | grep -Eq '^Status: (Proposed|Accepted|Superseded by ADR-[0-9]{3})$' || { fail C-13 "$f: line 2 must be 'Status: Proposed|Accepted|Superseded by ADR-NNN'"; bad=1; }
    prev=0
    for sec in "${secs[@]}"; do
      ln="$(tr -d '\r' < "$f" | grep -nx "## $sec" | head -1 | cut -d: -f1)"
      if [ -z "$ln" ]; then fail C-13 "$f: missing section '## $sec'"; bad=1; continue; fi
      [ "$ln" -gt "$prev" ] || { fail C-13 "$f: section '$sec' out of order"; bad=1; }
      prev="$ln"
      body="$(tr -d '\r' < "$f" | awk -v s="## $sec" '$0==s{f=1;next} /^## /{f=0} f&&NF{print}' | head -1)"
      [ -n "$body" ] || { fail C-13 "$f: section '$sec' is empty"; bad=1; }
    done
  done
  if [ "$GATE_MODE" = "1" ]; then
    for i in $(seq -w 1 15); do
      ls docs/adr/ADR-0"$i"-*.md >/dev/null 2>&1 || { fail C-13 "ADR-0$i missing"; bad=1; }
    done
    [ "$n" = 15 ] || { fail C-13 "expected 15 ADR files, found $n"; bad=1; }
  fi
  [ "$bad" = 0 ] && pass C-13 "$n ADR file(s) well-formed"
}
