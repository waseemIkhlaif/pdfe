# Quickstart: Validate the UX/UI Design Track (Phase 1)

This guide proves that the Phase 1 controls work end to end. Run the commands from the repository root in Git Bash (Windows) or any POSIX shell. Formats are defined in [contracts/artifact-formats.md](./contracts/artifact-formats.md), checks in [contracts/design-check.md](./contracts/design-check.md), and the token pipeline in [contracts/token-pipeline.md](./contracts/token-pipeline.md).

## Prerequisites

- Git, bash, and `sha256sum` (all included with Git for Windows).
- Node 22 LTS or newer, and pnpm 9 or newer. CI uses Node 22.
- A Figma account (free plan) with the Tokens Studio plugin, needed only for the design scenarios. Record the plan limits you confirmed in `docs/design/README.md` (research R-1).

## 1. The checkers pass on a clean tree

```bash
bash scripts/governance/check-phase0.sh      # Phase 0 checks still green
bash scripts/design/check-design.sh          # D-1…D-15 in format mode
bash scripts/design/tests/run.sh             # fixture suite: every check has a passing and a failing case
```

**Expected:** all three exit with code `0`. The fixture runner reports `ok` for every expected PASS and every expected FAIL.

## 2. Tokens build for web and mobile without manual edits (SC-005)

```bash
pnpm --dir packages/design-tokens install --frozen-lockfile
pnpm --dir packages/design-tokens build
pnpm --dir packages/design-tokens check
```

**Expected:** these three files exist: `dist/web/tokens.css`, `dist/native/theme.ts` and `dist/tokens.resolved.json`. The check prints no `FAIL` lines.

**One-token change test:** change `color.brand.primary` in `tokens/color.json`, then rebuild. The new value must appear in both `tokens.css` and `theme.ts`, with no other edit. Revert the change afterwards.

**Determinism test:** build twice and compare the outputs with `diff -r`. There must be no differences.

## 3. Contrast and the reserved accent (SC-004)

- Add a pair to `tokens/pairs.json` with `usage: "text"` whose ratio is below 4.5, then run `pnpm --dir packages/design-tokens check`. **Expected:** exit code 1 and a `FAIL <pair-id>` line.
- Add a pair with `group: "general"` whose foreground is a `color.simulation.*` token. **Expected:** the check fails with a "reserved token" message.
- Revert both changes.

## 4. Negative scenarios for the design checker

Make each change on a scratch branch, run `bash scripts/design/check-design.sh`, confirm the expected FAIL, then revert.

| Change | Expected FAIL |
|---|---|
| Delete the `J1-EX-03` (blocked recipient) row from `flows/J1.md` | D-4 |
| Write a phone number such as `+970 59 000 0000` into a research note | D-11 |
| Add any term from `scripts/safety/prohibited-claims.txt` to an English copy string | D-14 |
| Set a regulated copy row to `approved` while `Legal=pending` | D-12 |
| Change a byte in an exported PDF | D-2 |
| Mark a usability finding with `Critical=yes` as `accepted` | D-15 |
| Give a round that includes `J1` only 4 participants | D-15 |
| Set a screen to `Hi-fi=approved` with `States=P,E,L,X` | D-7 |

## 5. Designs come before plans (SC-001, User Story 5 scenario 2)

1. With no `phase-02` approval row, create the placeholder `specs/009-app-shells/plan.md` on a scratch branch and commit it.
2. Run `bash scripts/design/check-design.sh`. **Expected:** `FAIL D-13 009 plan exists without approved phase-02 package`.
3. Delete the scratch branch.
4. Confirm that a placeholder plan for `001` (no UI) does **not** trigger D-13.

## 6. Full handoff gate for the first package (Phase 2)

When the Phase 2 package is ready:

```bash
bash scripts/design/check-design.sh --gate phase-02
```

**Expected:** exit code `0` only when all of the following are true:

- the skeleton is complete (D-6);
- every Phase 2 screen is approved in five states and every required size;
- the copy deck is fully approved, including the `sim.banner` key;
- round(s) or a heuristic review exist with no open critical finding;
- the export checksums verify and the baselines exist.

After that, add the approval row to `approvals.md` (solo: `Solo=yes`) in a pull request whose required checks pass.

## 7. Manual checks (recorded, not scripted)

- Open the Phase 2 export PDFs. In each Arabic PDF, confirm that the layout and directional icons are mirrored, while amounts, IDs and logos are not. Confirm that the SimulationBanner appears on every frame.
- Open the prototype on a phone at 360 px width. Confirm that touch targets are at least 44 px and the focus order is logical in both languages.
- In each usability round file, confirm that at least 90% of participants answered "no" to "Thinks money is real", and that at least 80% completed each main task (`yes`) (SC-007).
