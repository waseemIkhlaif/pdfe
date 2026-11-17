import { bigserial, jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Mirrors db/migrations/0005_audit.sql. The table is append-only: rows are inserted through AuditWriter only.
export const audit = pgSchema('audit');

export const auditEvents = audit.table('audit_events', {
  seq: bigserial('seq', { mode: 'number' }).primaryKey(),
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
