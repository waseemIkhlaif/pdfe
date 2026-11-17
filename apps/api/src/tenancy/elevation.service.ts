import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { ConfigReader } from '@pdfe/domain-types';
import { AppError, IdGenerator, getContext, type ClockService } from '@pdfe/platform-core';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import { AuditService } from '../audit/audit.service';
import { parseInput } from '../common/validate';
import { CLOCK, CONFIG_READER, PG_POOL } from '../core/tokens';
import type { Principal } from '../identity/principal';

export const startElevationSchema = z.object({
  target_tenant_id: z.uuid(),
  reason: z.string().trim().min(10).max(500),
});

export interface ElevationView {
  id: string;
  target_tenant_id: string;
  reason: string;
  started_at: string;
  expires_at: string;
}

interface Row {
  id: string;
  user_id: string;
  target_tenant_id: string;
  reason: string;
  started_at: Date;
  expires_at: Date;
}

const view = (r: Row): ElevationView => ({
  id: r.id,
  target_tenant_id: r.target_tenant_id,
  reason: r.reason,
  started_at: r.started_at.toISOString(),
  expires_at: r.expires_at.toISOString(),
});

/**
 * Read-only, audited, time-limited access to one other tenant (FR-013a). These methods use their own short
 * transactions in the caller's home tenant, because the request transaction is read-only during an elevation.
 */
@Injectable()
export class ElevationService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(CLOCK) private readonly clock: ClockService,
    @Inject(CONFIG_READER) private readonly config: ConfigReader,
    private readonly ids: IdGenerator,
    private readonly audit: AuditService,
  ) {}

  async start(p: Principal, input: unknown): Promise<ElevationView> {
    const body = parseInput(startElevationSchema, input);
    if (p.elevation) throw new AppError('ELEVATION_ACTIVE', 409);
    if (body.target_tenant_id === p.tenantId) {
      throw new AppError('VALIDATION_FAILED', 422, [
        { path: 'target_tenant_id', message_key: 'validation.same_tenant' },
      ]);
    }
    const ttlMinutes = await this.config.get('security.elevation.ttl_minutes');
    const correlationId = getContext()?.correlationId ?? 'unknown';
    const now = this.clock.now();
    const expires = new Date(now.getTime() + ttlMinutes * 60_000);
    const id = this.ids.next();

    return withTx(this.pool, { tenantId: p.tenantId, correlationId }, async (tx) => {
      const t = await tx.client.query('SELECT 1 FROM platform.tenants WHERE id = $1', [
        body.target_tenant_id,
      ]);
      if (!t.rowCount) {
        throw new AppError('VALIDATION_FAILED', 422, [
          { path: 'target_tenant_id', message_key: 'validation.unknown_tenant' },
        ]);
      }
      const ins = await tx.client.query<Row>(
        `INSERT INTO iam.tenant_elevations
           (id, user_id, home_tenant_id, target_tenant_id, reason, started_at, expires_at, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (user_id) WHERE ended_at IS NULL DO NOTHING
         RETURNING id, user_id, target_tenant_id, reason, started_at, expires_at`,
        [
          id,
          p.userId,
          p.tenantId,
          body.target_tenant_id,
          body.reason,
          now.toISOString(),
          expires.toISOString(),
          correlationId,
        ],
      );
      const row = ins.rows[0];
      if (!row) throw new AppError('ELEVATION_ACTIVE', 409);
      await this.audit.record(tx, {
        tenantId: body.target_tenant_id,
        actorId: p.userId,
        actorRole: p.roles[0] ?? null,
        action: 'tenant.elevation_started',
        targetType: 'tenant',
        targetId: body.target_tenant_id,
        reason: body.reason,
        elevationId: id,
        correlationId,
        data: { home_tenant_id: p.tenantId, expires_at: expires.toISOString() },
      });
      return view(row);
    });
  }

  /** The caller's active elevation, or null. */
  async current(p: Principal): Promise<ElevationView | null> {
    if (!p.elevation) return null;
    return {
      id: p.elevation.id,
      target_tenant_id: p.elevation.targetTenantId,
      reason: p.elevation.reason,
      started_at: p.elevation.startedAt,
      expires_at: p.elevation.expiresAt,
    };
  }

  /** Only the owner may end it. */
  async end(p: Principal, id: string): Promise<void> {
    const correlationId = getContext()?.correlationId ?? 'unknown';
    const now = this.clock.now();
    await withTx(this.pool, { tenantId: p.tenantId, correlationId }, async (tx) => {
      const r = await tx.client.query<Row>(
        `SELECT id, user_id, target_tenant_id, reason, started_at, expires_at
           FROM iam.tenant_elevations WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [id, p.userId],
      );
      const row = r.rows[0];
      if (!row) throw new AppError('NOT_FOUND', 404);
      const upd = await tx.client.query(
        `UPDATE iam.tenant_elevations SET ended_at = $2, end_reason = 'user'
          WHERE id = $1 AND ended_at IS NULL`,
        [id, now.toISOString()],
      );
      if (!upd.rowCount) throw new AppError('NOT_PENDING', 409);
      await this.audit.record(tx, {
        tenantId: row.target_tenant_id,
        actorId: p.userId,
        actorRole: p.roles[0] ?? null,
        action: 'tenant.elevation_ended',
        targetType: 'tenant',
        targetId: row.target_tenant_id,
        elevationId: id,
        correlationId,
        data: { end_reason: 'user' },
      });
    });
  }
}
