-- 0004_idempotency_outbox: idempotency keys, transactional outbox, consumer inbox.

CREATE TABLE integration.idempotency_keys (
  tenant_id       uuid NOT NULL REFERENCES platform.tenants (id),
  scope           text NOT NULL,
  key             text NOT NULL,
  request_hash    text NOT NULL,
  status          text NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  response        jsonb,
  response_status integer,
  created_at      timestamptz NOT NULL,
  expires_at      timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, scope, key)
);

CREATE TABLE integration.outbox (
  id             uuid PRIMARY KEY,
  tenant_id      uuid,
  topic          text NOT NULL,
  payload        jsonb NOT NULL,
  correlation_id text NOT NULL,
  created_at     timestamptz NOT NULL,
  published_at   timestamptz,
  attempts       integer NOT NULL DEFAULT 0
);
CREATE INDEX outbox_unpublished_idx ON integration.outbox (created_at, id) WHERE published_at IS NULL;

-- A consumer records (consumer, event_id) in the same transaction as its work, so a repeated event is a no-op.
CREATE TABLE integration.inbox (
  consumer     text NOT NULL,
  event_id     uuid NOT NULL,
  processed_at timestamptz NOT NULL,
  PRIMARY KEY (consumer, event_id)
);
