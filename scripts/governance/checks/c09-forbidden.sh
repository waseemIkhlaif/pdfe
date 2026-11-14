# C-9: forbidden patterns and non-allowlisted URLs (FR-028). All modes.
# Scope: tracked files except docs/source/** and scripts/safety/**.
check_c09() {
  local files pats bad=0 line host
  files="$(tracked_files | grep -Ev '^(docs/source/|scripts/safety/|\.git/)' )"
  pats="$(mktemp)"
  grep -Ev '^[[:space:]]*(#|$)' scripts/safety/forbidden-patterns.txt > "$pats"
  if [ -n "$files" ]; then
    while IFS= read -r line; do
      fail C-9 "forbidden pattern: $line"; bad=1
    done < <(echo "$files" | tr '\n' '\0' | xargs -0 grep -nIiE -f "$pats" -- 2>/dev/null | cut -c1-160)
    # URLs: host must be allowlisted. Placeholder hosts (<owner>, {x}, $VAR) are skipped.
    while IFS= read -r line; do
      host="$(echo "$line" | sed -E 's#^.*https?://##; s#[/:?\#].*$##')"
      case "$host" in *'<'*|*'{'*|*'$'*|'') continue ;; esac
      if ! grep -Fxq -- "$host" <(grep -Ev '^[[:space:]]*(#|$)' scripts/safety/allowed-hosts.txt); then
        fail C-9 "URL host not allowlisted: ${line%%:*}: $host"; bad=1
      fi
    done < <(echo "$files" | tr '\n' '\0' | xargs -0 grep -nIoE "https?://[^][ )>\"'\`,;]+" -- 2>/dev/null | sed -E 's/^([^:]+:[0-9]+):/\1:/')
  fi
  rm -f "$pats"
  [ "$bad" = 0 ] && pass C-9 "no forbidden patterns or non-allowlisted URLs"
}
