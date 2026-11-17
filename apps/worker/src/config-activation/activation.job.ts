import type { ClockService, IdGenerator } from '@pdfe/platform-core';
import type { AuditRecorder } from '@pdfe/platform-core/audit';
import { activateVersion } from '@pdfe/platform-core/config';
import { withTx, type Pool } from '@pdfe/platform-core/db';

interface DueVersion {
  id: string;
  key: string;
  version: number;
  effective_from: Date;
  approval_request_id: string | null;
  rollback_of_version: number | null;
  tenant_id: string;
  created_by: string;
  reason: string | null;
}

/**
 * Activates approved configuration versions whose effective time has come (`scheduled` becomes `active`; the previous
 * active version becomes `superseded`; other pending proposals for the key become `stale`), with an audit event and the
 * `config.activated` outbox event. The time comes from the injected clock, so a scenario clock decides what is due.
 * Each version is activated in its own transaction, in order of effective time, so one failure holds back nothing else.
 */
export class ConfigActivationJob {
  constructor(
    private readonly pool: Pool,
    private readonly clock: ClockService,
    private readonly ids: IdGenerator,
    private readonly audit: AuditRecorder,
  ) {}

  /** Returns how many versions it activated. */
  async runOnce(): Promise<number> {
    const now = this.clock.now();
    const due = await this.pool.query<DueVersion>(
      `SELECT id, key, version, effective_from, approval_request_id, rollback_of_version, tenant_id, created_by, reason
         FROM config.config_versions
        WHERE status = 'scheduled' AND effective_from <= $1
        ORDER BY effective_from, key, version`,
      [now.toISOString()],
    );
    let activated = 0;
    for (const v of due.rows) {
      const correlationId = `COR-${this.ids.next()}`;
      const done = await withTx(this.pool, { tenantId: v.tenant_id, correlationId }, async (tx) => {
        // Another worker may have got there first, or the version may have changed: look again, under the lock.
        const cur = await tx.client.query<{ status: string }>(
          'SELECT status FROM config.config_versions WHERE id = $1 FOR UPDATE SKIP LOCKED',
          [v.id],
        );
        if (cur.rows[0]?.status !== 'scheduled') return false;
        const res = await activateVersion(tx.client, v.id);
        await this.audit.record(tx, {
          tenantId: v.tenant_id,
          actorRole: 'system:worker',
          action: v.rollback_of_version === null ? 'config.activated' : 'config.rolled_back',
          targetType: 'config_item',
          targetId: v.key,
          reason: v.reason ?? undefined,
          approvalRequestId: v.approval_request_id ?? undefined,
          correlationId,
          data: {
            key: v.key,
            version: v.version,
            previous_version: res.previousVersion,
            rollback_of_version: v.rollback_of_version,
            effective_from: v.effective_from.toISOString(),
            requested_by: v.created_by,
            marked_stale: res.staled,
            activated_by: 'scheduled activation',
          },
        });
        await tx.client.query(
          `INSERT INTO integration.outbox (id, tenant_id, topic, payload, correlation_id, created_at)
           VALUES ($1,$2,'config.activated',$3,$4,$5)`,
          [
            this.ids.next(),
            v.tenant_id,
            JSON.stringify({
              key: v.key,
              version: v.version,
              effective_from: v.effective_from.toISOString(),
            }),
            correlationId,
            now.toISOString(),
          ],
        );
        return true;
      });
      if (done) activated += 1;
    }
    return activated;
  }
}
