import { boolean, integer, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Mirrors db/migrations/0001_platform.sql. The migrations are the source of truth; a test (schema.int.spec.ts)
// fails if these definitions and the database drift apart.
export const platform = pgSchema('platform');

export const tenants = platform.table('tenants', {
  id: uuid('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  kind: text('kind', {
    enum: ['platform', 'consumer_pool', 'merchant', 'business', 'issuer', 'partner'],
  }).notNull(),
  status: text('status', { enum: ['active', 'disabled'] })
    .notNull()
    .default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  version: integer('version').notNull().default(1),
});

export const legalEntities = platform.table('legal_entities', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const organizations = platform.table('organizations', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  legalEntityId: uuid('legal_entity_id').references(() => legalEntities.id),
  type: text('type', {
    enum: ['merchant', 'business', 'issuer', 'partner_bank', 'platform'],
  }).notNull(),
  displayName: text('display_name').notNull(),
  status: text('status', { enum: ['active', 'disabled'] })
    .notNull()
    .default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  version: integer('version').notNull().default(1),
});
