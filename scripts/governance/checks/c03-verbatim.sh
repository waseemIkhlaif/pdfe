# C-3: every verbatim block is an exact substring of its named source file (FR-003, FR-006, FR-009). All modes.
check_c03() {
  local f tmp n=0 bad=0 src_path src blk
  tmp="$(mktemp -d)"
  while IFS= read -r f; do
    case "$f" in docs/source/*|.claude/*|.specify/*) continue ;; esac
    grep -q '^> Source: ' "$f" 2>/dev/null || continue
    rm -f "$tmp"/blk.*
    tr -d '\r' < "$f" | awk -v d="$tmp" '
      /^```/ { fence = !fence; next }
      fence { next }
      /^> Source: / { inb = 1; k++; out = d "/blk." k; print $0 > out; next }
      /^> End source/ { if (inb) close(out); inb = 0; next }
      inb { print $0 >> out }
    '
    for b in "$tmp"/blk.*; do
      [ -f "$b" ] || continue
      n=$((n + 1))
      src_path="$(head -1 "$b" | sed -E 's/^> Source: (docs\/source\/[^ ]+\.md).*/\1/')"
      if [ ! -f "$src_path" ]; then
        fail C-3 "$f: source file '$src_path' not found"; bad=$((bad + 1)); continue
      fi
      src="$(tr -d '\r' < "$src_path")"
      blk="$(tail -n +2 "$b" | sed -e :a -e '/^\n*$/{$d;N;ba' -e '}')"
      blk="$(printf '%s' "$blk" | sed -e '/./,$!d')"
      if [ -z "$blk" ]; then
        fail C-3 "$f: empty verbatim block for $src_path"; bad=$((bad + 1))
      elif [[ "$src" != *"$blk"* ]]; then
        fail C-3 "$f: block is not an exact substring of $src_path"; bad=$((bad + 1))
      fi
    done
  done < <(tracked_files | grep -E '\.md$')
  rm -rf "$tmp"
  [ "$bad" = 0 ] && pass C-3 "$n verbatim block(s) verified"
}
