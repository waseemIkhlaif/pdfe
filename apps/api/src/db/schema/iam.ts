import {
  boolean,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { organizations, tenants } from './platform';

// Mirrors db/migrations/0003_iam.sql.
export const iam = pgSchema('iam');

export const users = iam.table('users', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  externalSubject: text('external_subject').notNull().unique(),
  displayName: text('display_name').notNull(),
  locale: text('locale', { enum: ['ar', 'en'] })
    .notNull()
    .default('ar'),
  status: text('status', { enum: ['active', 'disabled'] })
    .notNull()
    .default('active'),
  isSynthetic: boolean('is_synthetic').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  version: integer('version').notNull().default(1),
});

export const roles = iam.table('roles', {
  code: text('code').primaryKey(),
  description: text('description').notNull().default(''),
  privileged: boolean('privileged').notNull().default(false),
});

export const permissions = iam.table('permissions', {
  code: text('code').primaryKey(),
  description: text('description').notNull().default(''),
  highRisk: boolean('high_risk').notNull().default(false),
});

export const rolePermissions = iam.table(
  'role_permissions',
  {
    roleCode: text('role_code')
      .notNull()
      .references(() => roles.code),
    permissionCode: text('permission_code')
      .notNull()
      .references(() => permissions.code),
  },
  (t) => [primaryKey({ columns: [t.roleCode, t.permissionCode] })],
);

export const sodConflicts = iam.table(
  'sod_conflicts',
  {
    roleA: text('role_a')
      .notNull()
      .references(() => roles.code),
    roleB: text('role_b')
      .notNull()
      .references(() => roles.code),
    reason: text('reason').notNull().default(''),
  },
  (t) => [primaryKey({ columns: [t.roleA, t.roleB] })],
);

export const approvalRequests = iam.table('approval_requests', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  actionType: text('action_type').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  payloadHash: text('payload_hash').notNull(),
  requestedBy: uuid('requested_by')
    .notNull()
    .references(() => users.id),
  reason: text('reason').notNull(),
  requiredApprovals: integer('required_approvals').notNull().default(1),
  status: text('status', { enum: ['pending', 'approved', 'rejected', 'cancelled', 'expired'] })
    .notNull()
    .default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  correlationId: text('correlation_id').notNull(),
  version: integer('version').notNull().default(1),
});

export const approvalDecisions = iam.table(
  'approval_decisions',
  {
    id: uuid('id').primaryKey(),
    approvalRequestId: uuid('approval_request_id')
      .notNull()
      .references(() => approvalRequests.id),
    decidedBy: uuid('decided_by')
      .notNull()
      .references(() => users.id),
    decision: text('decision', { enum: ['approve', 'reject'] }).notNull(),
    reason: text('reason').notNull().default(''),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull(),
  },
  (t) => [unique().on(t.approvalRequestId, t.decidedBy)],
);

export const userRoles = iam.table(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    roleCode: text('role_code')
      .notNull()
      .references(() => roles.code),
    organizationId: uuid('organization_id').references(() => organizations.id),
    grantedBy: uuid('granted_by').references(() => users.id),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull(),
    approvalRequestId: uuid('approval_request_id').references(() => approvalRequests.id),
  },
  (t) => [unique().on(t.userId, t.roleCode, t.organizationId).nullsNotDistinct()],
);

export const tenantElevations = iam.table('tenant_elevations', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  homeTenantId: uuid('home_tenant_id')
    .notNull()
    .references(() => tenants.id),
  targetTenantId: uuid('target_tenant_id')
    .notNull()
    .references(() => tenants.id),
  reason: text('reason').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  endReason: text('end_reason', { enum: ['user', 'expired', 'revoked'] }),
  correlationId: text('correlation_id').notNull(),
});
