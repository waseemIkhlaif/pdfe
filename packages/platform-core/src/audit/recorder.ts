import type { PoolClient } from 'pg';
import type { ClockService } from '../clock';
import type { IdGenerator } from '../ids';
import { GENESIS_HASH, chainHash, type AuditHashRow } from './chain';

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
 * Appends to the audit hash chain in the caller's transaction, so a failed audit write rolls back the action it
 * describes. One transaction-scoped advisory lock keeps the chain linear. Shared by the API and the worker.
 */
export class AuditRecorder {
  constructor(
    protected readonly clock: ClockService,
    protected readonly ids: IdGenerator,
  ) {}

  async record(tx: { client: PoolClient }, e: AuditEventInput): Promise<AuditRecord> {
    if (!e.action?.trim()) throw new Error('audit: action is required');
    if (!e.correlationId?.trim()) throw new Error('audit: correlationId is required');

    await tx.client.query("SELECT pg_advisory_xact_lock(hashtext('audit'))");
    const last = await tx.client.query<{ seq: string; hash: string }>(
      'SELECT seq, hash FROM audit.audit_events ORDER BY seq DESC LIMIT 1',
    );
    const prevHash = last.rows[0]?.hash ?? GENESIS_HASH;
    // Consecutive numbers, assigned under the lock: a rolled-back write leaves no hole (migration 0007).
    const seq = Number(last.rows[0]?.seq ?? 0) + 1;

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
         (seq, id, tenant_id, actor_id, actor_role, action, target_type, target_id, reason, approval_request_id,
          elevation_id, correlation_id, occurred_at, data, prev_hash, hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING seq`,
      [
        seq,
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
