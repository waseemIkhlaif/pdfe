# D-11: no personal data in research or usability files; participants are codes P1, P2, ... (FR-005, SC-012). All modes.
check_d11() {
  local bad=0 f line h v
  local EMAIL='[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  local PHONE='(\+97[02]|00 ?97[02])[ -]?[0-9][0-9 -]{6,}|\b05[0-9][ -]?[0-9]{3}[ -]?[0-9]{4}\b|\+[1-9][0-9]{7,14}\b'
  local NATID='(ID|هوية)[^0-9]{0,10}[0-9]{9}\b|\b[0-9]{9}[^0-9]{0,10}(ID|هوية)'
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    while IFS= read -r line; do
      fail D-11 "$f: possible personal data: ${line:0:80}"; bad=1
    done < <(tr -d '\r' < "$f" | grep -nE -e "$EMAIL" -e "$PHONE" -e "$NATID" | cut -c1-120)
  done < <(find "$DD/research" "$DD/usability" -type f -name '*.md' 2>/dev/null | sort)
  for f in "$DD"/usability/UR-*.md; do
    [ -f "$f" ] || continue
    for h in "$H_UR_PEOPLE" "$H_UR_TASKS" "$H_UR_REAL"; do
      while IFS= read -r v; do
        [[ "$v" =~ ^P[0-9]+$ ]] || { fail D-11 "$f: participant '$v' must be a code like P1"; bad=1; }
      done < <(col_values "$f" "$h" 1)
    done
  done
  [ "$bad" = 0 ] && pass D-11 "no personal data; participants are anonymous codes"
}
