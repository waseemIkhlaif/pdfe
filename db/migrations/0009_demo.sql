-- 0009_demo: the scenarios the platform knows and the history of their runs (FR-035, contracts/scenario-manifest.md).
-- Neither table is reset by a run: the history is what survives it.

CREATE TABLE demo.scenarios (
  code             text NOT NULL,
  manifest_version text NOT NULL,
  title            jsonb NOT NULL,
  manifest_sha256  text NOT NULL CHECK (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  PRIMARY KEY (code, manifest_version)
);

CREATE TABLE demo.scenario_runs (
  id               uuid PRIMARY KEY,
  scenario_code    text NOT NULL,
  seed             bigint NOT NULL,
  manifest_version text NOT NULL,
  started_at       timestamptz NOT NULL,
  finished_at      timestamptz,
  status           text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  result_digest    text CHECK (result_digest ~ '^[0-9a-f]{64}$'),
  report           jsonb,
  error_code       text,
  requested_by     text NOT NULL,
  correlation_id   text NOT NULL,
  FOREIGN KEY (scenario_code, manifest_version) REFERENCES demo.scenarios (code, manifest_version),
  CHECK ((status = 'succeeded') = (result_digest IS NOT NULL)),
  CHECK ((status = 'failed') = (error_code IS NOT NULL))
);

-- Only one run at a time: a second `running` row is refused by the database, whatever the application does.
CREATE UNIQUE INDEX scenario_runs_one_running_idx ON demo.scenario_runs ((true)) WHERE status = 'running';
CREATE INDEX scenario_runs_started_idx ON demo.scenario_runs (started_at DESC);

GRANT SELECT, INSERT, UPDATE ON demo.scenarios TO app_role;
GRANT SELECT, INSERT, UPDATE ON demo.scenario_runs TO app_role;
GRANT SELECT ON demo.scenarios, demo.scenario_runs TO readonly_role;

-- A reset also forgets which events the consumers have processed: the next run produces the same event IDs again, and they
-- must be processed again.
GRANT TRUNCATE ON integration.inbox TO demo_reset_role;
