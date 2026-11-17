import { z } from 'zod';
import { cancelSchema, decisionSchema } from '../approvals/approvals.service';
import { verifySchema } from '../audit/audit.service';
import { roleChangeSchema } from '../identity/iam.service';
import { startElevationSchema } from '../tenancy/elevation.service';

/**
 * Every schema of the HTTP contract, as Zod. Request bodies are the very schemas the services validate with;
 * response schemas describe what the routes return. The OpenAPI document is generated from these, and
 * `openapi.int.spec.ts` checks that real responses parse against them, so document and behaviour cannot drift.
 */
const uuid = z.string().uuid();
const iso = z.string().datetime();

export const ErrorDetail = z.object({ path: z.string(), message_key: z.string() });
export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message_key: z.string(),
    correlation_id: z.string(),
    details: z.array(ErrorDetail).optional(),
  }),
});

export const Health = z.object({
  status: z.enum(['ok', 'degraded']),
  mode: z.literal('DEMO'),
  checks: z.record(z.string(), z.enum(['up', 'down'])),
  adapters: z.array(z.string()),
});
export const Meta = z.object({ api: z.literal('v1'), version: z.string(), build: z.string() });

export const Elevation = z.object({
  id: uuid,
  target_tenant_id: uuid,
  reason: z.string(),
  started_at: iso,
  expires_at: iso,
});

export const Me = z.object({
  user: z.object({ id: uuid, display_name: z.string(), locale: z.enum(['ar', 'en']) }),
  tenant_id: uuid,
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  mfa: z.boolean(),
  elevation: Elevation.nullable(),
});

export const ApprovalDecision = z.object({
  decided_by: uuid,
  decision: z.enum(['approve', 'reject']),
  reason: z.string(),
  decided_at: iso,
});
export const Approval = z.object({
  id: uuid,
  action_type: z.string(),
  target_type: z.string(),
  target_id: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  payload_hash: z.string(),
  requested_by: uuid,
  reason: z.string(),
  required_approvals: z.number().int().min(1),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled', 'expired']),
  expires_at: iso,
  created_at: iso,
  correlation_id: z.string(),
  decisions: z.array(ApprovalDecision).optional(),
});
export const ApprovalList = z.object({
  items: z.array(Approval),
  next_cursor: z.string().nullable(),
});

export const IamUser = z.object({
  id: uuid,
  tenant_id: uuid,
  display_name: z.string(),
  locale: z.enum(['ar', 'en']),
  status: z.enum(['active', 'disabled']),
  created_at: iso,
  roles: z.array(z.string()),
});
export const IamUserList = z.object({ items: z.array(IamUser) });
export const IamRole = z.object({
  code: z.string(),
  privileged: z.boolean(),
  permissions: z.array(z.string()),
  conflicts: z.array(z.string()),
});
export const IamRoleList = z.object({ items: z.array(IamRole) });

export const AuditEvent = z.object({
  seq: z.number().int().min(1),
  id: uuid,
  tenant_id: uuid.nullable(),
  actor_id: uuid.nullable(),
  actor_role: z.string().nullable(),
  action: z.string(),
  target_type: z.string().nullable(),
  target_id: z.string().nullable(),
  reason: z.string().nullable(),
  approval_request_id: uuid.nullable(),
  elevation_id: uuid.nullable(),
  correlation_id: z.string(),
  occurred_at: iso,
  data: z.record(z.string(), z.unknown()),
  prev_hash: z.string().regex(/^[0-9a-f]{64}$/),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
});
export const AuditEventList = z.object({
  items: z.array(AuditEvent),
  next_cursor: z.number().int().nullable(),
});
export const VerifyResult = z.union([
  z.object({
    result: z.literal('ok'),
    from_seq: z.number().int(),
    to_seq: z.number().int(),
    events: z.number().int(),
    anchors_checked: z.number().int(),
  }),
  z.object({
    result: z.literal('broken'),
    seq: z.number().int(),
    reason: z.enum(['hash_mismatch', 'prev_link_mismatch', 'seq_gap', 'anchor_mismatch']),
    anchor_id: uuid.optional(),
  }),
]);

export const StartElevationRequest = startElevationSchema;
export const ApprovalDecisionRequest = decisionSchema;
export const ApprovalCancelRequest = cancelSchema;
export const RoleChangeRequest = roleChangeSchema;
export const VerifyRequest = verifySchema;

/** Named schemas that become `components.schemas`. */
export const NAMED = {
  ErrorDetail,
  ErrorEnvelope,
  Health,
  Meta,
  Elevation,
  Me,
  ApprovalDecision,
  Approval,
  ApprovalList,
  IamUser,
  IamUserList,
  IamRole,
  IamRoleList,
  StartElevationRequest,
  ApprovalDecisionRequest,
  ApprovalCancelRequest,
  RoleChangeRequest,
  AuditEvent,
  AuditEventList,
  VerifyResult,
  VerifyRequest,
} as const;
export type SchemaName = keyof typeof NAMED;
