import type { ClockService, IdGenerator } from '@pdfe/platform-core';
import type { AuditRecorder } from '@pdfe/platform-core/audit';
import { withTx, type Pool } from '@pdfe/platform-core/db';

/**
 * Ends tenant elevations whose time limit has passed (`end_reason = expired`) and audits `tenant.elevation_ended`.
 * The API already treats an expired elevation as ended on the next request; this job closes the record even
 * when the user never returns. `ended_at` is the expiry time itself, the same value the API uses.
 */
export class ElevationExpiryJob {
  constructor(
    private readonly pool: Pool,
    private readonly clock: ClockService,
    private readonly ids: IdGenerator,
    private readonly audit: AuditRecorder,
  ) {}

  async runOnce(): Promise<number> {
    const now = this.clock.now();
    const correlationId = `COR-${this.ids.next()}`;
    // tenant_elevations is platform-scoped (not row-level-secured), so no tenant is needed.
    return withTx(this.pool, { correlationId }, async (tx) => {
      const due = await tx.client.query<{
        id: string;
        user_id: string;
        home_tenant_id: string;
        target_tenant_id: string;
        expires_at: Date;
      }>(
        `SELECT id, user_id, home_tenant_id, target_tenant_id, expires_at FROM iam.tenant_elevations
          WHERE ended_at IS NULL AND expires_at <= $1
          ORDER BY id FOR UPDATE SKIP LOCKED`,
        [now.toISOString()],
      );
      for (const e of due.rows) {
        await tx.client.query(
          "UPDATE iam.tenant_elevations SET ended_at = $2, end_reason = 'expired' WHERE id = $1",
          [e.id, e.expires_at.toISOString()],
        );
        await this.audit.record(tx, {
          tenantId: e.target_tenant_id,
          actorId: e.user_id,
          actorRole: 'system:worker',
          action: 'tenant.elevation_ended',
          targetType: 'tenant',
          targetId: e.target_tenant_id,
          elevationId: e.id,
          correlationId,
          data: { end_reason: 'expired', home_tenant_id: e.home_tenant_id },
        });
      }
      return due.rows.length;
    });
  }
}
