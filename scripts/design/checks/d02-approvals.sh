# D-2: approval records are valid and package exports match their checksums (FR-003, SC-013). All modes.
check_d02() {
  local f=$DD/approvals.md bad=0 art ver role who date solo exp live rr rd
  skip_if_absent D-2 "$f" || return 0
  hdr_present "$f" "$H_APPROVALS" || { pass D-2 "$f header checked by D-1"; return 0; }
  while IFS="$US" read -r art ver role who date solo exp live rr rd; do
    iso_date_ok "$date" || { fail D-2 "$f: $art v$ver has an invalid or future date '$date'"; bad=1; }
    blank "$role" && { fail D-2 "$f: $art v$ver has no approver role"; bad=1; }
    if [[ "$art" =~ ^phase-[0-9]+$ ]]; then
      if blank "$exp" || [ ! -d "$exp" ]; then
        fail D-2 "$f: $art v$ver export folder missing: $exp"; bad=1
      elif [ ! -f "$exp/SHA256SUMS" ]; then
        fail D-2 "$f: $art v$ver has no $exp/SHA256SUMS"; bad=1
      elif ! (cd "$exp" && sha256sum -c --quiet SHA256SUMS >/dev/null 2>&1); then
        fail D-2 "$f: $art v$ver export does not match its checksums"; bad=1
      fi
    fi
  done < <(table_rows "$f" "$H_APPROVALS")
  [ "$bad" = 0 ] && pass D-2 "approval records valid, exports match checksums"
}
