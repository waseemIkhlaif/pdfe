# Start-up guard evidence (quickstart §3, SC-003)

Run on the workstation from `apps/api` against the built api (`dist/main.js --once`), 2026-11-15.

| Command | Exit | Output |
|---|---|---|
| `APP_MODE=LIVE node dist/main.js --once` | 1 | `system.start_refused: LIVE mode is not supported. This platform runs in DEMO mode only.` |
| `APP_MODE=DEMO ADAPTERS_CONFIG=test/fixtures/adapters.http-real.json node dist/main.js --once` | 1 | `system.start_refused: adapter configuration refused. bank: http:real is not a mock adapter (only mock adapters are allowed)` |

Note: without `APP_MODE` the guard also refuses (`APP_MODE must be DEMO (got null).`).

## Not yet captured

`pnpm egress:probe` needs the Docker stack. The Docker daemon did not respond on this workstation during this run, so `docs/evidence/phase-2/egress-report.txt` is still to be produced (T077).
