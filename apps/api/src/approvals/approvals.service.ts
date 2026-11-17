import { Inject, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { approvePermissionFor, type ConfigReader } from '@pdfe/domain-types';
import {
  AppError,
  IdGenerator,
  canonicalJson,
  getContext,
  sha256Hex,
  type ClockService,
} from '@pdfe/platform-core';
import { AuditService } from '../audit/audit.service';
import { parseInput } from '../common/validate';
import { CLOCK, CONFIG_READER } from '../core/tokens';
import type { Principal } from '../identity/principal';
import { OutboxWriter } from '../integration/outbox.writer';
import { ApprovalHandlerRegistry, type ApprovedRequest } from './approval-handler.registry';

type Tx = { client: PoolClient };

export const decisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: z.string().trim().min(1).max(500),
});
export const cancelSchema = z.object({ reason: z.string().trim().min(1).max(500) });

export interface CreateApprovalInput {
  actionType: string;
  targetType: string;
  targetId?: string | null;
  payload: Record<string, unknown>;
  reason: string;
  requiredApprovals?: number;
}

interface RequestRow {
  id: string;
  tenant_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  payload: Record<string, unknown>;
  payload_hash: string;
  requested_by: string;
  reason: string;
  required_approvals: number;
  status: string;
  expires_at: Date;
  created_at: Date;
  correlation_id: string;
  version: number;
}

export interface ApprovalView {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  payload: Record<string, unknown>;
  payload_hash: string;
  requested_by: string;
  reason: string;
  required_approvals: number;
  status: string;
  expires_at: string;
  created_at: string;
  correlation_id: string;
  decisions?: { decided_by: string; decision: string; reason: string; decided_at: string }[];
}

const COLUMNS = `id, tenant_id, action_type, target_type, target_id, payload, payload_hash, requested_by, reason,
  required_approvals, status, expires_at, created_at, correlation_id, version`;

const toView = (r: RequestRow): ApprovalView => ({
  id: r.id,
  action_type: r.action_type,
  target_type: r.target_type,
  target_id: r.target_id,
  payload: r.payload,
  payload_hash: r.payload_hash,
  requested_by: r.requested_by,
  reason: r.reason,
  required_approvals: r.required_approvals,
  status: r.status,
  expires_at: r.expires_at.toISOString(),
  created_at: r.created_at.toISOString(),
  correlation_id: r.correlation_id,
});

/**
 * Maker-checker (FR-016): a request, one or more independent decisions, and a single execution of the action.
 * Every method works inside the caller's request transaction (tenant already set), so a refused or failed step
 * leaves nothing behind. Each step writes exactly one audit event.
 */
@Injectable()
export class ApprovalsService {
  constructor(
    @Inject(CLOCK) private readonly clock: ClockService,
    @Inject(CONFIG_READER) private readonly config: ConfigReader,
    private readonly ids: IdGenerator,
    private readonly audit: AuditService,
    private readonly outbox: OutboxWriter,
    private readonly handlers: ApprovalHandlerRegistry,
  ) {}

  async create(tx: Tx, p: Principal, input: CreateApprovalInput): Promise<ApprovalView> {
    if (!(input.actionType in approvePermissionFor)) {
      throw new AppError('VALIDATION_FAILED', 422, [
        { path: 'action_type', message_key: 'validation.unknown_action_type' },
      ]);
    }
    const correlationId = getContext()?.correlationId ?? 'unknown';
    const now = this.clock.now();
    const hours = await this.config.get('approvals.default_expiry_hours');
    const id = this.ids.next();
    const r = await tx.client.query<RequestRow>(
      `INSERT INTO iam.approval_requests
         (id, tenant_id, action_type, target_type, target_id, payload, payload_hash, requested_by, reason,
          required_approvals, status, expires_at, created_at, correlation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,$12,$13)
       RETURNING ${COLUMNS}`,
      [
        id,
        p.tenantId,
        input.actionType,
        input.targetType,
        input.targetId ?? null,
        JSON.stringify(input.payload),
        sha256Hex(canonicalJson(input.payload)),
        p.userId,
        input.reason,
        input.requiredApprovals ?? 1,
        new Date(now.getTime() + hours * 3_600_000).toISOString(),
        now.toISOString(),
        correlationId,
      ],
    );
    const row = r.rows[0]!;
    await this.audit.record(tx, {
      tenantId: p.tenantId,
      actorId: p.userId,
      actorRole: p.roles[0] ?? null,
      action: 'approval.created',
      targetType: 'approval_request',
      targetId: id,
      reason: input.reason,
      approvalRequestId: id,
      correlationId,
      data: {
        action_type: input.actionType,
        target_type: input.targetType,
        target_id: input.targetId ?? null,
      },
    });
    await this.outbox.write(tx, {
      topic: 'approval.requested',
      tenantId: p.tenantId,
      correlationId,
      payload: {
        approval_id: id,
        action_type: input.actionType,
        target_type: input.targetType,
        target_id: input.targetId ?? null,
      },
    });
    return toView(row);
  }

  async decide(tx: Tx, p: Principal, id: string, body: unknown): Promise<ApprovalView> {
    const input = parseInput(decisionSchema, body);
    const correlationId = getContext()?.correlationId ?? 'unknown';
    const now = this.clock.now();

    // Serializes concurrent decisions on this request: the second one waits, then sees the new status.
    const req = await this.lock(tx, id);
    const needed = approvePermissionFor[req.action_type];
    if (!needed || !p.permissions.has(needed)) throw new AppError('FORBIDDEN', 403);
    if (req.status !== 'pending') throw new AppError('NOT_PENDING', 409);
    if (req.expires_at.getTime() <= now.getTime()) throw new AppError('EXPIRED', 409);
    if (sha256Hex(canonicalJson(req.payload)) !== req.payload_hash) {
      throw new AppError('PAYLOAD_CHANGED', 409);
    }
    if (req.requested_by === p.userId) throw new AppError('SELF_APPROVAL', 409);

    const dup = await tx.client.query(
      'SELECT 1 FROM iam.approval_decisions WHERE approval_request_id = $1 AND decided_by = $2',
      [id, p.userId],
    );
    if (dup.rowCount) throw new AppError('NOT_PENDING', 409);

    await tx.client.query(
      `INSERT INTO iam.approval_decisions (id, approval_request_id, decided_by, decision, reason, decided_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [this.ids.next(), id, p.userId, input.decision, input.reason, now.toISOString()],
    );

    let status = 'pending';
    if (input.decision === 'reject') {
      status = 'rejected';
    } else {
      const n = await tx.client.query<{ n: string }>(
        "SELECT count(*) n FROM iam.approval_decisions WHERE approval_request_id = $1 AND decision = 'approve'",
        [id],
      );
      if (Number(n.rows[0]!.n) >= req.required_approvals) status = 'approved';
    }
    if (status !== 'pending') {
      await tx.client.query(
        'UPDATE iam.approval_requests SET status = $2, version = version + 1 WHERE id = $1',
        [id, status],
      );
    }

    // Last chance to refuse before anything is audited or applied.
    if (status === 'approved')
      await this.handlers.get(req.action_type)?.validate?.(tx, this.asApproved(req, p));

    await this.audit.record(tx, {
      tenantId: req.tenant_id,
      actorId: p.userId,
      actorRole: p.roles[0] ?? null,
      action: 'approval.decided',
      targetType: 'approval_request',
      targetId: id,
      reason: input.reason,
      approvalRequestId: id,
      correlationId,
      data: { decision: input.decision, status, action_type: req.action_type },
    });

    if (status === 'approved' || status === 'rejected') {
      await this.outbox.write(tx, {
        topic: status === 'approved' ? 'approval.approved' : 'approval.rejected',
        tenantId: req.tenant_id,
        correlationId,
        payload: {
          approval_id: id,
          action_type: req.action_type,
          ...(status === 'approved'
            ? {
                target_type: req.target_type,
                target_id: req.target_id,
                payload_hash: req.payload_hash,
              }
            : {}),
        },
      });
    }
    if (status === 'approved') await this.execute(tx, req, p);

    return this.load(tx, id);
  }

  async cancel(tx: Tx, p: Principal, id: string, body: unknown): Promise<ApprovalView> {
    const input = parseInput(cancelSchema, body);
    const correlationId = getContext()?.correlationId ?? 'unknown';
    const req = await this.lock(tx, id);
    if (req.requested_by !== p.userId) throw new AppError('FORBIDDEN', 403);
    if (req.status !== 'pending') throw new AppError('NOT_PENDING', 409);
    await tx.client.query(
      "UPDATE iam.approval_requests SET status = 'cancelled', version = version + 1 WHERE id = $1",
      [id],
    );
    await this.audit.record(tx, {
      tenantId: req.tenant_id,
      actorId: p.userId,
      actorRole: p.roles[0] ?? null,
      action: 'approval.cancelled',
      targetType: 'approval_request',
      targetId: id,
      reason: input.reason,
      approvalRequestId: id,
      correlationId,
      data: { action_type: req.action_type },
    });
    await this.outbox.write(tx, {
      topic: 'approval.cancelled',
      tenantId: req.tenant_id,
      correlationId,
      payload: { approval_id: id, action_type: req.action_type },
    });
    return this.load(tx, id);
  }

  async get(tx: Tx, p: Principal, id: string): Promise<ApprovalView> {
    const view = await this.load(tx, id);
    if (!this.visibleTo(p, view)) throw new AppError('NOT_FOUND', 404);
    return view;
  }

  /** The requests the caller made or can decide, newest first. */
  async list(
    tx: Tx,
    p: Principal,
    q: { status?: string; action_type?: string; cursor?: string; limit?: string },
  ): Promise<{ items: ApprovalView[]; next_cursor: string | null }> {
    const limit = Math.min(Math.max(Number(q.limit ?? 50) || 50, 1), 100);
    const decidable = Object.entries(approvePermissionFor)
      .filter(([, perm]) => p.permissions.has(perm))
      .map(([action]) => action);
    const r = await tx.client.query<RequestRow>(
      `SELECT ${COLUMNS} FROM iam.approval_requests
        WHERE (requested_by = $1 OR action_type = ANY($2))
          AND ($3::text IS NULL OR status = $3)
          AND ($4::text IS NULL OR action_type = $4)
          AND ($5::uuid IS NULL OR id < $5)
        ORDER BY id DESC LIMIT $6`,
      [p.userId, decidable, q.status ?? null, q.action_type ?? null, q.cursor ?? null, limit + 1],
    );
    const rows = r.rows.slice(0, limit);
    return {
      items: rows.map(toView),
      next_cursor: r.rows.length > limit ? rows[rows.length - 1]!.id : null,
    };
  }

  private visibleTo(p: Principal, v: ApprovalView): boolean {
    const perm = approvePermissionFor[v.action_type];
    return v.requested_by === p.userId || (!!perm && p.permissions.has(perm));
  }

  private async lock(tx: Tx, id: string): Promise<RequestRow> {
    const r = await tx.client.query<RequestRow>(
      `SELECT ${COLUMNS} FROM iam.approval_requests WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!r.rows[0]) throw new AppError('NOT_FOUND', 404);
    return r.rows[0];
  }

  private async load(tx: Tx, id: string): Promise<ApprovalView> {
    const r = await tx.client.query<RequestRow>(
      `SELECT ${COLUMNS} FROM iam.approval_requests WHERE id = $1`,
      [id],
    );
    if (!r.rows[0]) throw new AppError('NOT_FOUND', 404);
    const d = await tx.client.query<{
      decided_by: string;
      decision: string;
      reason: string;
      decided_at: Date;
    }>(
      `SELECT decided_by, decision, reason, decided_at FROM iam.approval_decisions
        WHERE approval_request_id = $1 ORDER BY decided_at, id`,
      [id],
    );
    return {
      ...toView(r.rows[0]),
      decisions: d.rows.map((x) => ({ ...x, decided_at: x.decided_at.toISOString() })),
    };
  }

  private asApproved(req: RequestRow, approver: Principal): ApprovedRequest {
    return {
      id: req.id,
      tenantId: req.tenant_id,
      actionType: req.action_type,
      targetType: req.target_type,
      targetId: req.target_id,
      payload: req.payload,
      requestedBy: req.requested_by,
      approvedBy: approver.userId,
      approverRole: approver.roles[0] ?? null,
      reason: req.reason,
      correlationId: getContext()?.correlationId ?? req.correlation_id,
      requestCorrelationId: req.correlation_id,
    };
  }

  /** Runs the registered handler once per approval ID: the inbox row is the once-only key. */
  private async execute(tx: Tx, req: RequestRow, approver: Principal): Promise<void> {
    const handler = this.handlers.get(req.action_type);
    if (!handler) return;
    const first = await tx.client.query(
      `INSERT INTO integration.inbox (consumer, event_id, processed_at) VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [`approval-handler:${req.action_type}`, req.id, this.clock.now().toISOString()],
    );
    if (!first.rowCount) return;
    await handler.apply(tx, this.asApproved(req, approver));
  }
}
