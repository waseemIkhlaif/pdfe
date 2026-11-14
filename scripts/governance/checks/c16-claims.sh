# C-16: prohibited claims (Article VIII, FR-029). All modes.
# Skips verbatim source blocks, docs/source/**, scripts/safety/** and the contract that lists the terms.
check_c16() {
  local f term bad=0 text
  while IFS= read -r f; do
    case "$f" in
      docs/source/*|scripts/safety/*|specs/000-governance-baseline/contracts/governance-check.md|.claude/*|.specify/templates/*) continue ;;
    esac
    text="$(tr -d '\r' < "$f" | awk '/^> Source: /{s=1;next} /^> End source/{s=0;next} !s{print NR": "$0}')"
    while IFS= read -r term; do
      if echo "$text" | grep -iwF -- "$term" >/dev/null; then
        fail C-16 "$f: prohibited claim \"$term\""; bad=1
      fi
    done < <(grep -Ev '^[[:space:]]*(#|$)' scripts/safety/prohibited-claims.txt)
  done < <(tracked_files | grep -E '\.md$')
  [ "$bad" = 0 ] && pass C-16 "no prohibited claims"
}
