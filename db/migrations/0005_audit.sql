-- 0005_audit: append-only audit events. US4 adds anchors, verification and export on top.

CREATE TABLE audit.audit_events (
  seq                 bigserial PRIMARY KEY,
  id                  uuid NOT NULL UNIQUE,
  tenant_id           uuid,
  actor_id            uuid,
  actor_role          text,
  action              text NOT NULL,
  target_type         text,
  target_id           text,
  reason              text,
  approval_request_id uuid,
  elevation_id        uuid,
  correlation_id      text NOT NULL,
  occurred_at         timestamptz NOT NULL,
  data                jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash           text NOT NULL CHECK (prev_hash ~ '^[0-9a-f]{64}$'),
  hash                text NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$')
);
CREATE INDEX audit_events_tenant_time_idx ON audit.audit_events (tenant_id, occurred_at);
CREATE INDEX audit_events_correlation_idx ON audit.audit_events (correlation_id);
CREATE INDEX audit_events_actor_idx ON audit.audit_events (actor_id);
CREATE INDEX audit_events_action_idx ON audit.audit_events (action);

CREATE FUNCTION audit.forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit is append-only' USING ERRCODE = 'P0001';
END $$;

CREATE TRIGGER trg_audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit.audit_events
  FOR EACH ROW EXECUTE FUNCTION audit.forbid_mutation();

CREATE TRIGGER trg_audit_events_no_truncate
  BEFORE TRUNCATE ON audit.audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit.forbid_mutation();

GRANT SELECT, INSERT ON audit.audit_events TO app_role;
GRANT USAGE ON SEQUENCE audit.audit_events_seq_seq TO app_role;
GRANT SELECT ON audit.audit_events TO readonly_role;
