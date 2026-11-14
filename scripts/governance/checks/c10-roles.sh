# C-10: role assignment (FR-010, FR-011).
# Two-person mode: 2 distinct holders, Checker is a different person. Solo mode (SOLO_MODE=1): 1 holder, Checker is the literal 'solo'.
ROLE_HDR='| Role | Holder | Combined with | Checker | Assigned on |'
check_c10() {
  local f="docs/governance/roles-assignment.md" bad=0 role holder comb chk dt hl cl nrows=0 sponsor_login="" holders=" " r roles="|" solo=0
  skip_if_absent C-10 "$f" || return 0
  is_solo && solo=1
  while IFS="$US" read -r role holder comb chk dt; do
    nrows=$((nrows + 1)); roles="$roles$role|"
    hl="$(login_of "$holder")"
    if [ -z "$hl" ]; then fail C-10 "$role: Holder must include an @login"; bad=1; continue; fi
    if [ "$solo" = 1 ]; then
      [ "$chk" = "solo" ] || { fail C-10 "$role: Checker must be 'solo' in solo mode"; bad=1; }
      if [ -n "${IMPLEMENTER_LOGIN:-}" ] && [ "$hl" != "@$IMPLEMENTER_LOGIN" ]; then
        fail C-10 "$role: in solo mode every role is held by @$IMPLEMENTER_LOGIN"; bad=1
      fi
    else
      cl="$(login_of "$chk")"
      if [ -z "$cl" ]; then fail C-10 "$role: Checker must include an @login"; bad=1; continue; fi
      [ "$hl" != "$cl" ] || { fail C-10 "$role: Checker must differ from Holder"; bad=1; }
    fi
    case "$holders" in *" $hl "*) ;; *) holders="$holders$hl " ;; esac
    [ "$role" = Sponsor ] && sponsor_login="$hl"
    if [ -n "$dt" ] && ! is_date "$dt"; then fail C-10 "$role: invalid Assigned on date"; bad=1; fi
  done < <(table_rows "$f" "$ROLE_HDR")
  if [ -n "${SPONSOR_LOGIN:-}" ] && [ -n "$sponsor_login" ] && [ "$sponsor_login" != "@$SPONSOR_LOGIN" ]; then
    fail C-10 "Sponsor holder $sponsor_login does not match SPONSOR_LOGIN in team.env"; bad=1
  fi
  if [ "$solo" = 0 ] && [ -n "${IMPLEMENTER_LOGIN:-}" ] && [ "$sponsor_login" = "@$IMPLEMENTER_LOGIN" ]; then
    fail C-10 "the Sponsor must not be the implementer in two-person mode"; bad=1
  fi
  if [ "$solo" = 1 ] && [ -n "${SPONSOR_LOGIN:-}" ] && [ "${SPONSOR_LOGIN:-}" != "${IMPLEMENTER_LOGIN:-}" ]; then
    fail C-10 "solo mode: SPONSOR_LOGIN and IMPLEMENTER_LOGIN in team.env must be the same login"; bad=1
  fi
  if [ "$GATE_MODE" = "1" ]; then
    [ "$nrows" = 8 ] || { fail C-10 "expected 8 role rows, found $nrows"; bad=1; }
    for r in "Sponsor" "Product owner" "Engineering lead" "Security lead" "Finance/ledger specialist" "Legal/compliance" "QA lead" "Design lead"; do
      case "$roles" in *"|$r|"*) ;; *) fail C-10 "role '$r' missing"; bad=1 ;; esac
    done
    local want=2; [ "$solo" = 1 ] && want=1
    [ "$(echo $holders | wc -w)" = "$want" ] || { fail C-10 "expected exactly $want distinct holder(s), found:$holders"; bad=1; }
  fi
  [ "$bad" = 0 ] && pass C-10 "role assignment valid ($nrows rows, $([ "$solo" = 1 ] && echo solo || echo two-person) mode)"
}
