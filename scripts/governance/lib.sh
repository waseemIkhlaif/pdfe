#!/usr/bin/env bash
# Shared helpers for check-phase0.sh (contract: specs/000-governance-baseline/contracts/governance-check.md)
# Bash + coreutils/grep/awk/sed only. No network.

GATE_MODE="${GATE_MODE:-0}"
PASSES=0
FAILS=0

pass() { echo "PASS $1 $2"; PASSES=$((PASSES + 1)); }
fail() { echo "FAIL $1 $2"; FAILS=$((FAILS + 1)); }

# skip_if_absent <id> <file>
# Returns 0 when the file exists. When absent: format mode -> PASS "not present yet", return 1;
# gate mode -> FAIL, return 1.
skip_if_absent() {
  local id="$1" file="$2"
  [ -f "$file" ] && return 0
  if [ "$GATE_MODE" = "1" ]; then
    fail "$id" "$file is required in gate mode but is missing"
  else
    pass "$id" "$file not present yet (format mode)"
  fi
  return 1
}

# gate_only <id> : returns 0 when running in gate mode; otherwise prints PASS skipped and returns 1
gate_only() {
  [ "$GATE_MODE" = "1" ] && return 0
  pass "$1" "skipped (gate mode only)"
  return 1
}

# table_rows <file> <exact header line>
# Prints each data row of the Markdown table whose header equals the given line,
# cells trimmed and separated by the unit separator (octal 037), so empty cells survive `read`:
#   while IFS="$US" read -r a b c; do ...; done < <(table_rows file header)
table_rows() {
  local file="$1" header="$2"
  tr -d '\r' < "$file" | awk -v h="$header" '
    function trim(s) { sub(/^[ \t]+/, "", s); sub(/[ \t]+$/, "", s); return s }
    $0 == h { found = 1; getline; intable = 1; next }
    intable && /^\|/ {
      n = split($0, c, "|"); out = ""
      for (i = 2; i < n; i++) out = out (i > 2 ? "\037" : "") trim(c[i])
      print out; next
    }
    intable { exit }
  '
}

is_date() { [[ "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; }

load_team() {
  if [ -f scripts/governance/team.env ]; then
    # shellcheck disable=SC1091
    . scripts/governance/team.env
    SOLO_MODE="${SOLO_MODE:-0}"
    return 0
  fi
  SOLO_MODE=0
  return 1
}

# is_solo : true when team.env sets SOLO_MODE=1 (one person holds every role; see the solo-mode exception record)
is_solo() { load_team 2>/dev/null; [ "${SOLO_MODE:-0}" = "1" ]; }

# tracked_files : files under version control; falls back to find before `git init`.
tracked_files() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git ls-files
  else
    find . -type f -not -path './.git/*' | sed 's#^\./##'
  fi
}

US=$'\037'
# login_of "<Name (@login)>" -> @login  (empty if none)
login_of() { echo "$1" | grep -oE '@[A-Za-z0-9][A-Za-z0-9-]*' | head -1; }
# blank <v> : true when the value is empty or an em dash placeholder
blank() { [ -z "$1" ] || [ "$1" = "—" ]; }
