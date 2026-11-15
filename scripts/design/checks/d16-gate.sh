# D-16: a handoff package is complete (FR-027, FR-030, FR-033). Gate mode only (--gate phase-NN).
check_d16() {
  gate_only D-16 || return 0
  local n="$GATE_PHASE" pdir base man bad=0 status f id lang sz screens ur crit st sev
  pdir=$DD/packages/phase-$n
  local latest; latest="$(ls -d "$pdir"/v[0-9]* 2>/dev/null | sort -V | tail -1)"
  if [ -n "$latest" ] && [ -f "$latest/manifest.md" ]; then base="$latest"
  elif [ -f "$pdir/manifest.md" ]; then base="$pdir"
  else fail D-16 "no manifest at $pdir/manifest.md"; return 0; fi
  man="$base/manifest.md"
  hdr_present "$man" "$H_MANIFEST" || { fail D-16 "$man has the wrong header row"; return 0; }

  status="$(tr -d '\r' < "$man" | sed -n 's/^\*\*Status\*\*: *//p' | head -1 | tr -d ' ')"
  [[ "$status" =~ ^(ready-for-approval|approved)$ ]] || { fail D-16 "$man status is '$status', expected ready-for-approval or approved"; bad=1; }

  # every inventory screen of this phase is in the manifest and approved
  local inv=$DD/screen-inventory.md
  if [ -f "$inv" ] && hdr_present "$inv" "$H_INVENTORY"; then
    screens="$(col_values "$man" "$H_MANIFEST" 1)"
    while IFS="$US" read -r id _ _ ph _ _ _ _ _ _ hifi _; do
      [[ "$ph" =~ ^[0-9]+$ ]] && [ "$((10#$ph))" = "$((10#$n))" ] || continue
      echo "$screens" | grep -Fxq -- "$id" || { fail D-16 "$id (phase $n) is not in the manifest"; bad=1; }
      [ "$hifi" = approved ] || [ "$hifi" = retired ] || { fail D-16 "$id (phase $n) is Hi-fi=$hifi, not approved"; bad=1; }
    done < <(table_rows "$inv" "$H_INVENTORY")
  else
    fail D-16 "$inv is required for a gate"; bad=1
  fi

  # baselines and manifest rows
  while IFS="$US" read -r id langs _ sizes _ base_st; do
    [ "$base_st" = done ] || { fail D-16 "$id has no baselines (Baseline=$base_st)"; bad=1; continue; }
    for lang in ${langs//,/ }; do
      for sz in ${sizes//,/ }; do
        [ -f "$base/baseline/$lang/$id@$sz.png" ] || { fail D-16 "missing baseline $base/baseline/$lang/$id@$sz.png"; bad=1; }
      done
    done
  done < <(table_rows "$man" "$H_MANIFEST")

  # export folder and checksums
  if [ -f "$base/export/SHA256SUMS" ]; then
    (cd "$base/export" && sha256sum -c --quiet SHA256SUMS >/dev/null 2>&1) || { fail D-16 "$base/export does not match SHA256SUMS"; bad=1; }
  else
    fail D-16 "$base/export/SHA256SUMS is missing"; bad=1
  fi

  # copy deck fully approved
  f=$DD/copy-decks/phase-$n.md
  if [ -f "$f" ] && hdr_present "$f" "$H_COPY"; then
    while IFS= read -r st; do
      [[ "$st" =~ ^(approved|retired)$ ]] || { fail D-16 "$f has a row with status '$st'"; bad=1; }
    done < <(col_values "$f" "$H_COPY" 8)
  else
    fail D-16 "$f is missing"; bad=1
  fi

  # testing evidence named by the manifest: no open critical findings
  local testing named=0; testing="$(tr -d '\r' < "$man" | grep -m1 '^\*\*Testing\*\*:')"
  for ur in $(echo "$testing" | grep -oE 'UR-[0-9]+'); do
    named=1; f=$DD/usability/$ur.md
    [ -f "$f" ] || { fail D-16 "$f is named in the manifest but missing"; bad=1; continue; }
    while IFS="$US" read -r _ _ _ _ crit st _; do
      [ "$crit" = yes ] && [ "$st" != verified ] && { fail D-16 "$f has a critical finding that is not verified"; bad=1; }
    done < <(table_rows "$f" "$H_UR_FIND")
  done
  if echo "$testing" | grep -q "heuristics/phase-$n"; then
    named=1; f=$DD/heuristics/phase-$n.md
    if [ -f "$f" ]; then
      while IFS="$US" read -r _ _ _ _ sev st; do
        [ "$sev" = 4 ] && [[ ! "$st" =~ ^(fixed|verified)$ ]] && { fail D-16 "$f has a severity-4 issue that is not fixed"; bad=1; }
      done < <(table_rows "$f" "$H_HEUR")
    else
      fail D-16 "$f is named in the manifest but missing"; bad=1
    fi
  fi
  [ "$named" = 1 ] || { fail D-16 "$man names no usability round or heuristic review"; bad=1; }

  [ "$bad" = 0 ] && pass D-16 "phase-$n package is complete"
}
