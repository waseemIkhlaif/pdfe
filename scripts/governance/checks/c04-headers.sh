# C-4: register/table headers match the contract exactly (FR-013, FR-017, FR-018). All modes.
check_c04() {
  local bad=0 file hdr
  while IFS='=' read -r file hdr; do
    [ -f "$file" ] || continue
    if ! tr -d '\r' < "$file" | grep -Fxq -- "$hdr"; then
      fail C-4 "$file: header row does not match contract"; bad=1
    fi
  done <<'HDRS'
docs/governance/approved-scope.md=| ID | Title | Status | Decision ref | Approver | Date |
docs/governance/roles-assignment.md=| Role | Holder | Combined with | Checker | Assigned on |
docs/decisions/decision-register.md=| ID | Question | Options | Decision | Status | Owner | Approver | Date | Rationale | Consequences | Needed by phase | Default if undecided | Review date |
docs/risk/risk-register.md=| ID | Description | Severity | Owner | Mitigation | Mitigated in | Status |
docs/legal/assumption-log.md=| ID | Assumption | Source | Validation status | Counsel reviewer | Review date |
docs/governance/gate-0-review.md=| Criterion | Result | Evidence |
HDRS
  [ "$bad" = 0 ] && pass C-4 "table headers match contract"
}
