-- 0008_config: configuration settings and their versions (FR-029, research R-10).
-- Configuration is global in Phase 2, so these tables are platform-scoped (no row level security): access is by
-- permission (config.read, config.request) and by the approval that activates a version.

CREATE TABLE config.config_items (
  key           text PRIMARY KEY,
  schema        jsonb NOT NULL,           -- JSON Schema exported from the Zod schema in config-registry.ts
  safety_locked boolean NOT NULL DEFAULT false,
  description   text NOT NULL DEFAULT ''
);

CREATE TABLE config.config_versions (
  id                  uuid PRIMARY KEY,
  key                 text NOT NULL REFERENCES config.config_items (key),
  version             integer NOT NULL CHECK (version >= 1),
  value               jsonb NOT NULL,
  effective_from      timestamptz NOT NULL,
  status              text NOT NULL
                        CHECK (status IN ('draft', 'pending_approval', 'scheduled', 'active', 'superseded', 'rejected', 'stale')),
  approval_request_id uuid REFERENCES iam.approval_requests (id),
  -- The version this one restores, when it was created by a rollback.
  rollback_of_version integer,
  reason              text,
  -- The tenant of the person who proposed it: the tenant its audit events are recorded in. Null for the defaults.
  tenant_id           uuid REFERENCES platform.tenants (id),
  -- A user ID, or `system:bootstrap` for the defaults written when the migrations run.
  created_by          text NOT NULL,
  created_at          timestamptz NOT NULL,
  UNIQUE (key, version)
);

-- At most one active version per key.
CREATE UNIQUE INDEX config_versions_one_active_idx ON config.config_versions (key) WHERE status = 'active';
CREATE INDEX config_versions_scheduled_idx ON config.config_versions (effective_from) WHERE status = 'scheduled';
CREATE INDEX config_versions_approval_idx ON config.config_versions (approval_request_id) WHERE approval_request_id IS NOT NULL;

GRANT SELECT ON config.config_items TO app_role, readonly_role;
GRANT SELECT, INSERT, UPDATE ON config.config_versions TO app_role;
GRANT SELECT ON config.config_versions TO readonly_role;

-- A demo run re-creates the seeded defaults, so the versions are resettable; the items never are.
GRANT USAGE ON SCHEMA config TO demo_reset_role;
GRANT TRUNCATE ON config.config_versions TO demo_reset_role;
