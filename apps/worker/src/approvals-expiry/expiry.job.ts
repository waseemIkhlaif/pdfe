import type { ClockService, IdGenerator } from '@pdfe/platform-core';
import type { AuditRecorder } from '@pdfe/platform-core/audit';
import { withTx, type Pool } from '@pdfe/platform-core/db';

/**
 * Marks pending approval requests whose `expires_at` has passed as expired, with an `approval.expired` audit event
 * and outbox event. The API already refuses a decision on an expired request, so this job only makes the state
 * visible. The table is row-level-secured, so the job visits each tenant in turn.
 */
export class ApprovalsExpiryJob {
  constructor(
    private readonly pool: Pool,
    private readonly clock: ClockService,
    private readonly ids: IdGenerator,
    private readonly audit: AuditRecorder,
  ) {}

  async runOnce(): Promise<number> {
    const now = this.clock.now();
    const tenants = await this.pool.query<{ id: string }>(
      'SELECT id FROM platform.tenants ORDER BY code',
    );
    let expired = 0;
    for (const t of tenants.rows) {
      const correlationId = `COR-${this.ids.next()}`;
      expired += await withTx(this.pool, { tenantId: t.id, correlationId }, async (tx) => {
        const due = await tx.client.query<{
          id: string;
          action_type: string;
          requested_by: string;
        }>(
          `SELECT id, action_type, requested_by FROM iam.approval_requests
            WHERE status = 'pending' AND expires_at <= $1
            ORDER BY id FOR UPDATE SKIP LOCKED`,
          [now.toISOString()],
        );
        for (const r of due.rows) {
          await tx.client.query(
            "UPDATE iam.approval_requests SET status = 'expired', version = version + 1 WHERE id = $1",
            [r.id],
          );
          await this.audit.record(tx, {
            tenantId: t.id,
            actorRole: 'system:worker',
            action: 'approval.expired',
            targetType: 'approval_request',
            targetId: r.id,
            approvalRequestId: r.id,
            correlationId,
            data: { action_type: r.action_type },
          });
          await tx.client.query(
            `INSERT INTO integration.outbox (id, tenant_id, topic, payload, correlation_id, created_at)
             VALUES ($1,$2,'approval.expired',$3,$4,$5)`,
            [
              this.ids.next(),
              t.id,
              JSON.stringify({ approval_id: r.id, action_type: r.action_type }),
              correlationId,
              now.toISOString(),
            ],
          );
        }
        return due.rows.length;
      });
    }
    return expired;
  }
}
