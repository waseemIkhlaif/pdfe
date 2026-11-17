import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenants } from './platform';

// Mirrors db/migrations/0002_integration.sql and 0004_idempotency_outbox.sql.
export const integration = pgSchema('integration');

export const partnerAdapters = integration.table('partner_adapters', {
  code: text('code').primaryKey(),
  kind: text('kind', {
    enum: ['bank', 'psp', 'chain', 'kyc', 'sanctions', 'fx', 'price', 'notification'],
  })
    .notNull()
    .unique(),
  adapterType: text('adapter_type').notNull(),
  enabled: boolean('enabled').notNull().default(true),
});

export const idempotencyKeys = integration.table(
  'idempotency_keys',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    scope: text('scope').notNull(),
    key: text('key').notNull(),
    requestHash: text('request_hash').notNull(),
    status: text('status', { enum: ['in_progress', 'completed', 'failed'] }).notNull(),
    response: jsonb('response'),
    responseStatus: integer('response_status'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.scope, t.key] })],
);

export const outbox = integration.table('outbox', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id'),
  topic: text('topic').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  correlationId: text('correlation_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  attempts: integer('attempts').notNull().default(0),
});

export const inbox = integration.table(
  'inbox',
  {
    consumer: text('consumer').notNull(),
    eventId: uuid('event_id').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.consumer, t.eventId] })],
);
