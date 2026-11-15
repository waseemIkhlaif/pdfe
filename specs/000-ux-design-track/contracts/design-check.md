# Contract: `scripts/design/check-design.sh`

This script is a new required status check, `design-check`. It runs as an extra job in `.github/workflows/governance.yml` and is added to the `main` ruleset's required checks.

**Interface**

```
bash scripts/design/check-design.sh [--gate phase-NN]
```

- **Without `--gate`** (format mode, which runs on every pull request): the script checks the format and rules of whatever design artifacts exist, so drafts can be merged incrementally. Its output style and exit codes match `check-phase0.sh`.
- **With `--gate phase-NN`**: the script also requires the package for that phase to be complete and approved. Run it before recording a package approval and before running `/speckit-plan` for a UI feature of that phase.
- **Output**: one line per check, `PASS <id> <message>` or `FAIL <id> <message>`. A summary goes to stderr.
- **Exit codes**: `0` all pass · `1` at least one FAIL · `2` script error.
- **Dependencies**: `bash`, `grep`, `awk`, `sed`, `git` and `sha256sum` only. It needs no network. It reuses `scripts/governance/lib.sh`.
- **Structure**: `scripts/design/checks/dNN-*.sh`, one function `check_dNN` per file, discovered in the same way as the Phase 0 checks.

## Checks

| ID | Check | Mode | Spec ref |
|---|---|---|---|
| D-1 | Every Phase 1 table listed in [artifact-formats.md](./artifact-formats.md) uses its exact header row, and enumerated cells hold allowed values | Always | FR-002 |
| D-2 | Every `approvals.md` row has a valid date that is not in the future and an approver role. Every package row's `Export` folder exists, and `sha256sum -c SHA256SUMS` passes there | Always | FR-003, SC-013 |
| D-3 | `screen-inventory.md` has a row for every screen named in `scripts/design/j6-screens.txt`, which is a frozen list extracted from plan §J.6. Screen IDs are unique | Always | FR-017, SC-002 |
| D-4 | Each existing `flows/J<n>.md` has an exception row for every term in `scripts/design/prd8-exceptions.txt` for that journey. Every row has an outcome and an `ST-*` ID that exists | Always | FR-013, SC-003 |
| D-5 | Every sitemap `Nav ID` appears in `permission-matrix.md`, and every `Target screen` value exists in the inventory. The PER-10 (demo viewer) column holds no `full` | Always | FR-012, FR-016 |
| D-6 | Skeleton completeness. For each interface, the inventory has at least 4 rows with `Skeleton=yes` and `Wireframe=done`, and every J1/J2 screen is `done`. Checked once the `principles.md` approval exists, since visual design starts after it | Gate (any phase; satisfied once, first needed for phase-02) | FR-016a |
| D-7 | Every screen with `Hi-fi=approved` has `States=P,E,L,X,D` and every size its interface requires | Always | FR-017, FR-018 |
| D-8 | Money-moving screens come in Enter/Review/Result sets: for each `Money=yes` name stem there are screens named `… – enter` (or a flow-specific first step), `… – review` and `… – result` | Always | FR-019 |
| D-9 | `system/components.md` lists every component in `scripts/design/components.txt` (from plan Stage 4). `SimulationBanner` and `SimulatedBadge` rows state `non-dismissible` in A11y or Variants | Always | FR-023 |
| D-10 | Runs `node packages/design-tokens/scripts/check-contrast.mjs`, which covers contrast plus the reserved simulation accent | Always (skipped with a PASS note if Node is not installed locally; always runs in CI) | FR-021, FR-024, SC-004 |
| D-11 | Personal-data guard over `docs/design/research/**` and `docs/design/usability/**` (patterns in research R-12). Participant references match `P[0-9]+` | Always | FR-005, SC-012 |
| D-12 | Copy deck review rules. An `approved` row has `AR review=done`. The native check is `done` where it is required. Legal is `approved` where `Regulated=yes` | Always | FR-028a, FR-029, SC-009 |
| D-13 | Designs before plans. For each feature in `scripts/design/ui-features.txt` (`NNN phase-NN`) that has `specs/NNN-*/plan.md`, `approvals.md` holds an approved row for `phase-NN` dated on or before the plan file's first commit date | Always | FR-001, SC-001 |
| D-14 | No prohibited claim (`scripts/safety/prohibited-claims.txt`, whole word, case-insensitive) in copy decks, flows, sitemaps or component specs. Every copy deck has a `sim.banner` key whose English text is `SIMULATION — NOT REAL MONEY` and whose Arabic text is `محاكاة — ليست أموالاً حقيقية` | Always | FR-029, FR-031, SC-008 |
| D-15 | Usability rounds: at least 5 participants if the scope includes `J[1-7]`, otherwise at least 3. No `Critical=yes` finding has the status `accepted` | Always | FR-020, FR-030, SC-006 |
| D-16 | Gate for `phase-NN`: the manifest's `Status` is `approved`. Every inventory screen with `Phase=NN` is in the manifest and has `Hi-fi=approved`. Every row in `copy-decks/phase-NN.md` is `approved` or `retired`. Every UR or heuristics file the manifest names exists and has no critical finding that is not `verified`. Every manifest screen has `Baseline=done` | Gate | FR-027, FR-030, FR-033 |

## Fixtures

`scripts/design/tests/` holds one passing and at least one failing fixture tree per check. `bash scripts/design/tests/run.sh` runs the checker against each fixture and asserts the expected PASS or FAIL. This follows the test-first rule in Article VII and is written before each check is implemented.

## Not checked by the script

- Whether a frozen export visually matches the live design file. The checksum proves only that the export has not changed since approval.
- Whether the Arabic text is good Arabic. That is a human review, recorded in `AR review` and `Native check`.
- Whether built apps match the baselines. That comparison runs in the engineering features (research R-11).
