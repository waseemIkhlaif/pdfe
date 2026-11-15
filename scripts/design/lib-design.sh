#!/usr/bin/env bash
# Shared helpers for check-design.sh (contract: specs/000-ux-design-track/contracts/design-check.md).
# Bash + coreutils/grep/awk/sed/git only. No network. Builds on scripts/governance/lib.sh.

DD=docs/design

# Exact header rows (contracts/artifact-formats.md). Matched literally.
H_APPROVALS='| Artifact | Version | Approver role | Approver | Date | Solo | Export | Live link | Re-reviewed by | Re-review date |'
H_INVENTORY='| Screen ID | Interface | Name | Phase | Journeys | PRD IDs | Sizes | Money | Skeleton | Wireframe | Hi-fi | States | Frame | Export |'
H_COMPONENTS='| Component | Group | Variants | States | A11y | RTL | Tokens | Status | Frame |'
H_COPY='| Key | English | Arabic | Regulated | AR review | Native check | Legal | Status | Notes |'
H_FLOW='| Exception ID | PRD §8 term | Trigger | Screens | Outcome | Status term |'
H_SITEMAP='| Nav ID | Label key | Target screen | Roles |'
H_MATRIX='| Interface | Nav item | PER-01 | PER-02 | PER-03 | PER-04 | PER-05 | PER-06 | PER-07 | PER-08 | PER-09 | PER-10 |'
H_STATUS='| ID | English | Arabic | Meaning | Icon | Color token | Next statuses |'
H_UR_PEOPLE='| Participant | Profile |'
H_UR_TASKS='| Participant | Task | Result |'
H_UR_REAL='| Participant | Thinks money is real |'
H_UR_FIND='| Finding ID | Screens | Description | Severity | Critical | Status | Fix ref | Verified in |'
H_HEUR='| Issue ID | Screen | Heuristic | Description | Severity | Status |'
H_MANIFEST='| Screen ID | Languages | States | Sizes | Spec frame | Baseline |'
H_QA='| Finding ID | Interface | Screen | Criterion | Severity | Status |'

# hdr_present <file> <exact header line>
hdr_present() { tr -d '\r' < "$1" | grep -Fxq -- "$2"; }

# col_values <file> <header> <1-based column> : one value per data row
col_values() { table_rows "$1" "$2" | awk -F"$US" -v c="$3" '{print $c}'; }

# enum_check <id> <file> <header> <col> <name> <regex> : FAIL per bad value; returns 1 if any
enum_check() {
  local id="$1" file="$2" header="$3" col="$4" name="$5" re="^($6)\$" v rc=0
  while IFS= read -r v; do
    [[ "$v" =~ $re ]] || { fail "$id" "$file: $name '$v' is not allowed"; rc=1; }
  done < <(col_values "$file" "$header" "$col")
  return $rc
}

# iso_date_ok <date> : valid YYYY-MM-DD and not in the future
iso_date_ok() {
  [[ "$1" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || return 1
  date -d "$1" >/dev/null 2>&1 || return 1
  [[ ! "$1" > "$(date +%F)" ]]
}

# first_commit_date <path> : date the path was first committed; today if never committed
first_commit_date() {
  local d
  d="$(git log --diff-filter=A --format=%cs -- "$1" 2>/dev/null | tail -1)"
  if [ -n "$d" ]; then echo "$d"; else date +%F; fi
}

# strip_comments <file> : non-comment, non-blank lines of a list file
list_lines() { tr -d '\r' < "$1" | grep -Ev '^[[:space:]]*(#|$)'; }
