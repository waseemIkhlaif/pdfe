# C-14: signed artifacts carry a Signature block naming the sponsor (FR-006a).
# Existing files are checked in format mode; all three are required in gate mode.
check_c14() {
  local bad=0 f sec sb so login sponsor="" rf="docs/governance/roles-assignment.md" h c k d e
  load_team 2>/dev/null
  if [ -f "$rf" ]; then
    while IFS="$US" read -r h c k d e; do
      [ "$h" = Sponsor ] && sponsor="$(login_of "$c")"
    done < <(table_rows "$rf" '| Role | Holder | Combined with | Checker | Assigned on |')
  fi
  if [ -z "$sponsor" ] && [ -n "${SPONSOR_LOGIN:-}" ]; then sponsor="@$SPONSOR_LOGIN"; fi
  for f in docs/simulation-charter.md docs/governance/approved-scope.md docs/governance/gate-0-review.md; do
    skip_if_absent C-14 "$f" || { [ "$GATE_MODE" = "1" ] && bad=1; continue; }
    sec="$(tr -d '\r' < "$f" | awk '/^## Signature/{f=1;next} /^## /{f=0} f')"
    sb="$(echo "$sec" | grep -E '^Signed by: .+\(@[A-Za-z0-9-]+\)' | head -1)"
    so="$(echo "$sec" | grep -E '^Signed on: [0-9]{4}-[0-9]{2}-[0-9]{2}$' | head -1)"
    [ -n "$sb" ] || { fail C-14 "$f: Signature block needs 'Signed by: Name (@login)'"; bad=1; continue; }
    [ -n "$so" ] || { fail C-14 "$f: Signature block needs 'Signed on: YYYY-MM-DD'"; bad=1; }
    login="$(login_of "$sb")"
    if is_solo && ! echo "$sec" | grep -Fq 'Attestation: solo-mode self-attestation (see docs/governance/solo-mode-exception.md)'; then
      fail C-14 "$f: solo mode requires the 'Attestation: solo-mode self-attestation (see docs/governance/solo-mode-exception.md)' line"; bad=1
    fi
    if [ -z "$sponsor" ]; then
      fail C-14 "$f: cannot determine the sponsor login (no role assignment or team.env)"; bad=1
    elif [ "$login" != "$sponsor" ]; then
      fail C-14 "$f: signed by $login but the sponsor is $sponsor"; bad=1
    fi
  done
  [ "$bad" = 0 ] && pass C-14 "signature blocks valid"
}
