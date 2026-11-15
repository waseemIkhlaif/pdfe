# D-1: artifact table headers and enumerated cell values (FR-002). All modes.
# Missing files are fine (drafts merge incrementally); a present file must match contracts/artifact-formats.md.
check_d01() {
  local bad=0 f
  d01h() { # <file> <header> : 0 when the file exists and has the exact header
    [ -f "$1" ] || return 1
    hdr_present "$1" "$2" && return 0
    fail D-1 "$1: header row missing or changed: $2"; bad=1; return 1
  }
  d01e() { enum_check D-1 "$@" || bad=1; }
  local S1='(m360|m390|t768|w1280|w1440)'
  local SIZES="—|$S1(,$S1)*" STATES='—|[PELXD](,[PELXD])*' FRAME='—|https:[/][/]www[.]figma[.]com[/][^ ]*'

  f=$DD/approvals.md
  d01h "$f" "$H_APPROVALS" && d01e "$f" "$H_APPROVALS" 6 Solo 'yes|no'

  f=$DD/screen-inventory.md
  if d01h "$f" "$H_INVENTORY"; then
    d01e "$f" "$H_INVENTORY" 7 Sizes "$SIZES"
    d01e "$f" "$H_INVENTORY" 8 Money 'yes|no'
    d01e "$f" "$H_INVENTORY" 9 Skeleton 'yes|no'
    d01e "$f" "$H_INVENTORY" 10 Wireframe 'not-started|done|retired'
    d01e "$f" "$H_INVENTORY" 11 Hi-fi 'not-started|draft|in-review|approved|changed|retired'
    d01e "$f" "$H_INVENTORY" 12 States "$STATES"
    d01e "$f" "$H_INVENTORY" 13 Frame "$FRAME"
  fi

  f=$DD/system/components.md
  if d01h "$f" "$H_COMPONENTS"; then
    d01e "$f" "$H_COMPONENTS" 2 Group 'foundations|feedback|data|navigation|overlays|domain'
    d01e "$f" "$H_COMPONENTS" 8 Status 'draft|approved'
  fi

  for f in "$DD"/copy-decks/*.md; do
    [ -f "$f" ] || continue
    if d01h "$f" "$H_COPY"; then
      d01e "$f" "$H_COPY" 4 Regulated 'yes|no'
      d01e "$f" "$H_COPY" 5 'AR review' 'pending|done'
      d01e "$f" "$H_COPY" 6 'Native check' 'pending|done|n/a'
      d01e "$f" "$H_COPY" 7 Legal 'pending|approved|n/a'
      d01e "$f" "$H_COPY" 8 Status 'draft|approved|retired'
    fi
  done

  for f in "$DD"/flows/J*.md; do [ -f "$f" ] && d01h "$f" "$H_FLOW"; done
  for f in "$DD"/ia/sitemaps/*.md; do [ -f "$f" ] && d01h "$f" "$H_SITEMAP"; done

  f=$DD/ia/permission-matrix.md
  if d01h "$f" "$H_MATRIX"; then
    local c
    for c in 3 4 5 6 7 8 9 10 11 12; do d01e "$f" "$H_MATRIX" "$c" "PER-$((c - 2)) cell" 'full|read|—'; done
  fi

  f=$DD/content/status-vocabulary.md
  if d01h "$f" "$H_STATUS"; then
    d01e "$f" "$H_STATUS" 1 'Status ID' 'ST-(DRAFT|PENDING|HELD|UNDER-REVIEW|COMPLETED|FAILED|REVERSED|EXPIRED)'
  fi

  for f in "$DD"/usability/UR-*.md; do
    [ -f "$f" ] || continue
    d01h "$f" "$H_UR_PEOPLE" >/dev/null
    if d01h "$f" "$H_UR_TASKS"; then d01e "$f" "$H_UR_TASKS" 3 Result 'yes|help|no'; fi
    if d01h "$f" "$H_UR_REAL"; then d01e "$f" "$H_UR_REAL" 2 'Thinks money is real' 'yes|no'; fi
    if d01h "$f" "$H_UR_FIND"; then
      d01e "$f" "$H_UR_FIND" 4 Severity '[0-4]'
      d01e "$f" "$H_UR_FIND" 5 Critical 'yes|no'
      d01e "$f" "$H_UR_FIND" 6 Status 'open|fixed|verified|accepted'
    fi
  done

  for f in "$DD"/heuristics/*.md; do
    [ -f "$f" ] || continue
    if d01h "$f" "$H_HEUR"; then
      d01e "$f" "$H_HEUR" 3 Heuristic 'N([1-9]|10)|P[1-5]'
      d01e "$f" "$H_HEUR" 5 Severity '[0-4]'
      d01e "$f" "$H_HEUR" 6 Status 'open|fixed|verified|accepted'
    fi
  done

  for f in "$DD"/packages/*/manifest.md "$DD"/packages/*/v*/manifest.md; do
    [ -f "$f" ] || continue
    if d01h "$f" "$H_MANIFEST"; then d01e "$f" "$H_MANIFEST" 6 Baseline 'done|—'; fi
  done

  local sev st
  for f in "$DD"/qa/phase-12-*.md; do
    [ -f "$f" ] || continue
    if d01h "$f" "$H_QA"; then
      d01e "$f" "$H_QA" 5 Severity 'minor|moderate|serious|critical'
      d01e "$f" "$H_QA" 6 Status 'open|fixed|accepted'
      while IFS="$US" read -r _ _ _ _ sev st; do
        if [[ "$sev" =~ ^(serious|critical)$ && "$st" = accepted ]]; then
          fail D-1 "$f: a $sev finding cannot be accepted"; bad=1
        fi
      done < <(table_rows "$f" "$H_QA")
    fi
  done

  [ "$bad" = 0 ] && pass D-1 "design artifact formats valid"
}
