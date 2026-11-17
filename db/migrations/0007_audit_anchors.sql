-- 0007_audit_anchors: anchors of the audit chain, and a gapless event sequence.

-- `seq` was a bigserial. A sequence hands out its numbers outside transactions, so a rolled-back audit write
-- leaves a hole that looks exactly like a deleted event. The writer now assigns `last seq + 1` while it holds the
-- audit advisory lock, so the numbers of committed events are consecutive and verification can treat any gap as tampering.
ALTER TABLE audit.audit_events ALTER COLUMN seq DROP DEFAULT;
DROP SEQUENCE audit.audit_events_seq_seq;

-- An anchor records the head of the chain (`up_to_seq`, `hash`) at a moment. Verification compares it with the event
-- itself, so a chain that was rewritten consistently from some point on still shows up. `epoch_start` anchors mark the
-- start of a demo run (an audit epoch): the run's own events are verified from there.
CREATE TABLE audit.anchors (
  id          uuid PRIMARY KEY,
  up_to_seq   bigint NOT NULL CHECK (up_to_seq >= 0),
  hash        text NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$'),
  kind        text NOT NULL CHECK (kind IN ('periodic', 'epoch_start')),
  epoch_label text,
  created_at  timestamptz NOT NULL,
  CHECK ((kind = 'epoch_start') = (epoch_label IS NOT NULL))
);
CREATE INDEX anchors_up_to_seq_idx ON audit.anchors (up_to_seq);

-- Append-only, like the events.
CREATE TRIGGER trg_anchors_append_only
  BEFORE UPDATE OR DELETE ON audit.anchors
  FOR EACH ROW EXECUTE FUNCTION audit.forbid_mutation();

CREATE TRIGGER trg_anchors_no_truncate
  BEFORE TRUNCATE ON audit.anchors
  FOR EACH STATEMENT EXECUTE FUNCTION audit.forbid_mutation();

GRANT SELECT, INSERT ON audit.anchors TO app_role;
GRANT SELECT ON audit.anchors TO readonly_role;
