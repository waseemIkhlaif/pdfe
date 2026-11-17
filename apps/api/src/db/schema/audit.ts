import { bigint, check, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Mirrors db/migrations/0005_audit.sql. The table is append-only: rows are inserted through AuditService only.
export const audit = pgSchema('audit');

export const auditEvents = audit.table('audit_events', {
  // Assigned by the writer as last + 1 under the audit lock (migration 0007), so it has no default.
  seq: bigint('seq', { mode: 'number' }).primaryKey(),
  id: uuid('id').notNull().unique(),
  tenantId: uuid('tenant_id'),
  actorId: uuid('actor_id'),
  actorRole: text('actor_role'),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  reason: text('reason'),
  approvalRequestId: uuid('approval_request_id'),
  elevationId: uuid('elevation_id'),
  correlationId: text('correlation_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
  prevHash: text('prev_hash').notNull(),
  hash: text('hash').notNull(),
});

// Mirrors db/migrations/0007_audit_anchors.sql. Append-only like the events.
export const anchors = audit.table(
  'anchors',
  {
    id: uuid('id').primaryKey(),
    upToSeq: bigint('up_to_seq', { mode: 'number' }).notNull(),
    hash: text('hash').notNull(),
    kind: text('kind', { enum: ['periodic', 'epoch_start'] }).notNull(),
    epochLabel: text('epoch_label'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    check('anchors_epoch_label', sql`(${t.kind} = 'epoch_start') = (${t.epochLabel} IS NOT NULL)`),
  ],
);
