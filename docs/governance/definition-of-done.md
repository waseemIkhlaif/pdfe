# Definition of Done

A story is done only when every item below is true (plan Part I.2, PM plan section 8).

- [ ] Code reviewed by someone other than the author; CODEOWNERS approvals present
- [ ] Unit, property, integration tests green; coverage of changed money logic ≥ 90% lines/branches
- [ ] Auth and tenancy verified (negative tests updated)
- [ ] Logs with correlation ID; audit events for privileged/financial actions
- [ ] No live adapter exposure (CI safety job green)
- [ ] OpenAPI/event contracts updated; generated clients rebuilt; no unapproved breaking change
- [ ] Arabic/English strings added; RTL verified; accessibility checks pass (axe 0 serious/critical)
- [ ] SimulationBanner/labels present on new screens and exports
- [ ] Docs and ADRs updated; `quickstart.md` still works
- [ ] Seeded E2E scenario for the feature passes
- [ ] Acceptance evidence linked in the PR and traceability matrix
- [ ] Product owner and specialist reviewers approved
- [ ] `/speckit.analyze` showed no unresolved CRITICAL/HIGH items
