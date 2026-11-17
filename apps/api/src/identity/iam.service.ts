import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { rolePermissions, roles, sodConflicts, sodViolations } from '@pdfe/domain-types';
import { AppError, getContext } from '@pdfe/platform-core';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import {
  ApprovalHandlerRegistry,
  type ApprovedRequest,
} from '../approvals/approval-handler.registry';
import { ApprovalsService, type ApprovalView } from '../approvals/approvals.service';
import { AuditService } from '../audit/audit.service';
import { parseInput } from '../common/validate';
import { CLOCK, PG_POOL } from '../core/tokens';
import type { ClockService } from '@pdfe/platform-core';
import type { Principal } from './principal';

type Tx = { client: PoolClient };

export const roleChangeSchema = z.object({
  role_code: z.string().min(1).max(64),
  organization_id: z.uuid().nullish(),
  reason: z.string().trim().min(1).max(500),
});

const GRANT = 'iam.role.grant';
const REVOKE = 'iam.role.revoke';

/** Roles and role changes. A change is never applied directly: it becomes an approval request (maker-checker). */
@Injectable()
export class IamService implements OnModuleInit {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(CLOCK) private readonly clock: ClockService,
    private readonly audit: AuditService,
    private readonly approvals: ApprovalsService,
    private readonly registry: ApprovalHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(GRANT, {
      validate: (tx, r) => this.validateGrant(tx, r),
      apply: (tx, r) => this.applyGrant(tx, r),
    });
    this.registry.register(REVOKE, { apply: (tx, r) => this.applyRevoke(tx, r) });
  }

  /** The caller's tenant, or every tenant for platform_admin (non-PII directory columns only). */
  async listUsers(tx: Tx, p: Principal) {
    const all = p.roles.includes('platform_admin') && !p.elevation;
    const r = all
      ? await tx.client.query(
          'SELECT id, tenant_id, display_name, locale, status, created_at FROM iam.list_users_all()',
        )
      : await tx.client.query(
          'SELECT id, tenant_id, display_name, locale, status, created_at FROM iam.users ORDER BY display_name, id',
        );
    const rolesByUser = await tx.client.query<{ user_id: string; role_code: string }>(
      'SELECT user_id, role_code FROM iam.user_roles ORDER BY role_code',
    );
    const byUser = new Map<string, string[]>();
    for (const x of rolesByUser.rows)
      byUser.set(x.user_id, [...(byUser.get(x.user_id) ?? []), x.role_code]);
    return {
      items: r.rows.map((u) => ({
        id: u.id,
        tenant_id: u.tenant_id,
        display_name: u.display_name,
        locale: u.locale,
        status: u.status,
        created_at: new Date(u.created_at).toISOString(),
        roles: byUser.get(u.id) ?? [],
      })),
    };
  }

  /** Roles with their permissions and conflicts, from the matrix. */
  listRoles() {
    return {
      items: roles.map((r) => ({
        code: r.name,
        privileged: r.privileged,
        permissions: [...rolePermissions[r.name]].sort(),
        conflicts: sodConflicts
          .filter(([a]) => a === r.name)
          .map(([, b]) => b)
          .sort(),
      })),
    };
  }

  async requestGrant(tx: Tx, p: Principal, userId: string, body: unknown): Promise<ApprovalView> {
    const input = parseInput(roleChangeSchema, body);
    this.assertKnownRole(input.role_code);
    const held = await this.heldRoles(tx, userId);
    if (held === null) throw new AppError('NOT_FOUND', 404);
    if (held.includes(input.role_code)) {
      throw new AppError('VALIDATION_FAILED', 422, [
        { path: 'role_code', message_key: 'validation.role_already_held' },
      ]);
    }
    await this.checkSod(p, userId, held, input.role_code);
    return this.approvals.create(tx, p, {
      actionType: GRANT,
      targetType: 'user',
      targetId: userId,
      payload: {
        user_id: userId,
        role_code: input.role_code,
        organization_id: input.organization_id ?? null,
      },
      reason: input.reason,
    });
  }

  async requestRevoke(tx: Tx, p: Principal, userId: string, body: unknown): Promise<ApprovalView> {
    const input = parseInput(roleChangeSchema, body);
    this.assertKnownRole(input.role_code);
    const held = await this.heldRoles(tx, userId);
    if (held === null) throw new AppError('NOT_FOUND', 404);
    if (!held.includes(input.role_code)) {
      throw new AppError('VALIDATION_FAILED', 422, [
        { path: 'role_code', message_key: 'validation.role_not_held' },
      ]);
    }
    return this.approvals.create(tx, p, {
      actionType: REVOKE,
      targetType: 'user',
      targetId: userId,
      payload: {
        user_id: userId,
        role_code: input.role_code,
        organization_id: input.organization_id ?? null,
      },
      reason: input.reason,
    });
  }

  // --- approved actions -------------------------------------------------------------------------------

  /** Re-checks separation of duties at execution time: the user's roles may have changed since the request. */
  private async validateGrant(tx: Tx, r: ApprovedRequest): Promise<void> {
    const { user_id, role_code } = r.payload as { user_id: string; role_code: string };
    const held = (await this.heldRoles(tx, user_id)) ?? [];
    const v = sodViolations(held, role_code);
    if (v.conflicts.length || v.triple) {
      await this.refuseSod(
        r.tenantId,
        r.approvedBy,
        r.approverRole,
        user_id,
        role_code,
        v.conflicts,
        v.triple,
        r.correlationId,
        r.id,
      );
    }
  }

  private async applyGrant(tx: Tx, r: ApprovedRequest): Promise<void> {
    const { user_id, role_code, organization_id } = r.payload as {
      user_id: string;
      role_code: string;
      organization_id: string | null;
    };
    try {
      await tx.client.query(
        `INSERT INTO iam.user_roles (user_id, role_code, organization_id, granted_by, granted_at, approval_request_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [user_id, role_code, organization_id, r.approvedBy, this.clock.now().toISOString(), r.id],
      );
    } catch (err) {
      // The database trigger is the backstop for a race the validate step could not see.
      if (/^SOD_CONFLICT/.test((err as Error).message)) throw new AppError('SOD_CONFLICT', 409);
      throw err;
    }
    await this.audit.record(tx, {
      tenantId: r.tenantId,
      actorId: r.approvedBy,
      actorRole: r.approverRole,
      action: 'iam.role.granted',
      targetType: 'user',
      targetId: user_id,
      reason: r.reason,
      approvalRequestId: r.id,
      correlationId: r.correlationId,
      data: {
        role_code,
        organization_id,
        requested_by: r.requestedBy,
        request_correlation_id: r.requestCorrelationId,
      },
    });
  }

  private async applyRevoke(tx: Tx, r: ApprovedRequest): Promise<void> {
    const { user_id, role_code, organization_id } = r.payload as {
      user_id: string;
      role_code: string;
      organization_id: string | null;
    };
    const del = await tx.client.query(
      `DELETE FROM iam.user_roles
        WHERE user_id = $1 AND role_code = $2 AND organization_id IS NOT DISTINCT FROM $3`,
      [user_id, role_code, organization_id],
    );
    if (!del.rowCount) {
      throw new AppError('VALIDATION_FAILED', 422, [
        { path: 'role_code', message_key: 'validation.role_not_held' },
      ]);
    }
    await this.audit.record(tx, {
      tenantId: r.tenantId,
      actorId: r.approvedBy,
      actorRole: r.approverRole,
      action: 'iam.role.revoked',
      targetType: 'user',
      targetId: user_id,
      reason: r.reason,
      approvalRequestId: r.id,
      correlationId: r.correlationId,
      data: {
        role_code,
        organization_id,
        requested_by: r.requestedBy,
        request_correlation_id: r.requestCorrelationId,
      },
    });
  }

  // --- helpers ----------------------------------------------------------------------------------------

  private assertKnownRole(code: string): void {
    if (!roles.some((r) => r.name === code)) {
      throw new AppError('VALIDATION_FAILED', 422, [
        { path: 'role_code', message_key: 'validation.unknown_role' },
      ]);
    }
  }

  /** Roles the user holds, or null if the user is not visible in this tenant. */
  private async heldRoles(tx: Tx, userId: string): Promise<string[] | null> {
    const u = await tx.client.query('SELECT 1 FROM iam.users WHERE id = $1', [userId]);
    if (!u.rowCount) return null;
    const r = await tx.client.query<{ role_code: string }>(
      'SELECT DISTINCT role_code FROM iam.user_roles WHERE user_id = $1 ORDER BY 1',
      [userId],
    );
    return r.rows.map((x) => x.role_code);
  }

  /** Pre-check at request time: refused with 409 SOD_CONFLICT naming both roles, and audited. */
  private async checkSod(
    p: Principal,
    userId: string,
    held: string[],
    role: string,
  ): Promise<void> {
    const v = sodViolations(held, role);
    if (!v.conflicts.length && !v.triple) return;
    await this.refuseSod(
      p.tenantId,
      p.userId,
      p.roles[0] ?? null,
      userId,
      role,
      v.conflicts,
      v.triple,
      getContext()?.correlationId ?? 'unknown',
    );
  }

  /**
   * Audits the refusal in its own transaction, so the event survives the failing request, then throws.
   * 409 SOD_CONFLICT lists the requested role and the roles it conflicts with.
   */
  private async refuseSod(
    tenantId: string,
    actorId: string,
    actorRole: string | null,
    userId: string,
    role: string,
    conflicts: string[],
    triple: boolean,
    correlationId: string,
    approvalRequestId?: string,
  ): Promise<never> {
    await withTx(this.pool, { tenantId, correlationId }, (tx) =>
      this.audit.record(tx, {
        tenantId,
        actorId,
        actorRole,
        action: 'iam.role.grant_refused_sod',
        targetType: 'user',
        targetId: userId,
        ...(approvalRequestId ? { approvalRequestId } : {}),
        correlationId,
        data: { role_code: role, conflicts, triple_rule: triple },
      }),
    );
    throw new AppError('SOD_CONFLICT', 409, [
      { path: 'role_code', message_key: `roles.${role}` },
      ...conflicts.map((c) => ({ path: 'held_role', message_key: `roles.${c}` })),
      ...(triple ? [{ path: 'rule', message_key: 'rules.triple' }] : []),
    ]);
  }
}
