import { Inject, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { IdGenerator, type ClockService } from '@pdfe/platform-core';
import { CLOCK } from '../core/tokens';
import { GENESIS_HASH, chainHash, type AuditHashRow } from './audit.chain';

export interface AuditEventInput {
  tenantId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  /** e.g. `iam.role.granted`. Required. */
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  approvalRequestId?: string | null;
  elevationId?: string | null;
  /** Required: every event can be followed across components. */
  correlationId: string;
  data?: Record<string, unknown>;
}

export interface AuditRecord {
  id: string;
  seq: number;
  hash: string;
}

/**
 * The minimal append-only writer. It inserts in the caller's transaction, so a failed audit write rolls
 * back the action it describes. One transaction-scoped advisory lock keeps the chain linear.
 * US4 replaces this with the full AuditService (verification, anchors, export) on the same chain.
 */
@Injectable()
export class AuditWriter {
  constructor(
    @Inject(CLOCK) private readonly clock: ClockService,
    private readonly ids: IdGenerator,
  ) {}

  async record(tx: { client: PoolClient }, e: AuditEventInput): Promise<AuditRecord> {
    if (!e.action?.trim()) throw new Error('audit: action is required');
    if (!e.correlationId?.trim()) throw new Error('audit: correlationId is required');

    await tx.client.query("SELECT pg_advisory_xact_lock(hashtext('audit'))");
    const last = await tx.client.query<{ hash: string }>(
      'SELECT hash FROM audit.audit_events ORDER BY seq DESC LIMIT 1',
    );
    const prevHash = last.rows[0]?.hash ?? GENESIS_HASH;

    const row: AuditHashRow = {
      id: this.ids.next(),
      tenant_id: e.tenantId ?? null,
      actor_id: e.actorId ?? null,
      actor_role: e.actorRole ?? null,
      action: e.action,
      target_type: e.targetType ?? null,
      target_id: e.targetId ?? null,
      reason: e.reason ?? null,
      approval_request_id: e.approvalRequestId ?? null,
      elevation_id: e.elevationId ?? null,
      correlation_id: e.correlationId,
      occurred_at: this.clock.now().toISOString(),
      data: e.data ?? {},
      prev_hash: prevHash,
    };
    const hash = chainHash(prevHash, row);
    const r = await tx.client.query<{ seq: string }>(
      `INSERT INTO audit.audit_events
         (id, tenant_id, actor_id, actor_role, action, target_type, target_id, reason, approval_request_id,
          elevation_id, correlation_id, occurred_at, data, prev_hash, hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING seq`,
      [
        row.id,
        row.tenant_id,
        row.actor_id,
        row.actor_role,
        row.action,
        row.target_type,
        row.target_id,
        row.reason,
        row.approval_request_id,
        row.elevation_id,
        row.correlation_id,
        row.occurred_at,
        JSON.stringify(row.data),
        row.prev_hash,
        hash,
      ],
    );
    return { id: row.id, seq: Number(r.rows[0]!.seq), hash };
  }
}
