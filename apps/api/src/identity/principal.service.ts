import { Inject, Injectable } from '@nestjs/common';
import type { JWTPayload } from 'jose';
import { permissionsOf } from '@pdfe/domain-types';
import { AppError, type ClockService } from '@pdfe/platform-core';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import { AuditService } from '../audit/audit.service';
import { CLOCK, PG_POOL } from '../core/tokens';
import type { ActiveElevation, Principal } from './principal';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ElevationRow {
  id: string;
  target_tenant_id: string;
  reason: string;
  started_at: Date;
  expires_at: Date;
}

@Injectable()
export class PrincipalService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(CLOCK) private readonly clock: ClockService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Builds the principal from verified claims. The tenant comes only from the `tenant_id` claim; the user is
   * looked up inside that tenant, so a token cannot name a user of another tenant.
   * An elevation that has expired is closed here, and the request that found it is refused (403): an expired
   * elevation never returns data, even in the middle of a session.
   */
  async load(claims: JWTPayload, correlationId: string): Promise<Principal> {
    const tenantId = claims['tenant_id'];
    if (typeof tenantId !== 'string' || !UUID.test(tenantId) || !claims.sub) {
      throw new AppError('UNAUTHENTICATED', 401);
    }
    const amr = Array.isArray(claims['amr']) ? (claims['amr'] as unknown[]) : [];
    const sessionId = typeof claims['sid'] === 'string' ? claims['sid'] : undefined;
    const now = this.clock.now();

    const found = await withTx(this.pool, { tenantId, correlationId }, async ({ client }) => {
      const u = await client.query<{ id: string; display_name: string; locale: string }>(
        `SELECT id, display_name, locale FROM iam.users
          WHERE external_subject = $1 AND status = 'active'`,
        [claims.sub],
      );
      const user = u.rows[0];
      if (!user) return null;
      const roles = await client.query<{ role_code: string }>(
        'SELECT DISTINCT role_code FROM iam.user_roles WHERE user_id = $1 ORDER BY 1',
        [user.id],
      );
      const e = await client.query<ElevationRow>(
        `SELECT id, target_tenant_id, reason, started_at, expires_at
           FROM iam.tenant_elevations WHERE user_id = $1 AND ended_at IS NULL`,
        [user.id],
      );
      return { user, roles: roles.rows.map((r) => r.role_code), elevation: e.rows[0] };
    });
    if (!found) throw new AppError('UNAUTHENTICATED', 401);

    let elevation: ActiveElevation | undefined;
    if (found.elevation) {
      if (found.elevation.expires_at.getTime() <= now.getTime()) {
        await this.closeExpired(found.user.id, tenantId, found.elevation, correlationId);
        throw new AppError('FORBIDDEN', 403);
      }
      elevation = {
        id: found.elevation.id,
        targetTenantId: found.elevation.target_tenant_id,
        reason: found.elevation.reason,
        startedAt: found.elevation.started_at.toISOString(),
        expiresAt: found.elevation.expires_at.toISOString(),
      };
    }

    const principal: Principal = {
      userId: found.user.id,
      subject: claims.sub,
      displayName: found.user.display_name,
      locale: found.user.locale,
      tenantId,
      roles: found.roles,
      permissions: permissionsOf(found.roles),
      mfa: amr.includes('otp'),
      ...(sessionId ? { sessionId } : {}),
      ...(elevation ? { elevation } : {}),
    };
    if (sessionId) await this.recordFirstSignIn(principal, sessionId, correlationId);
    return principal;
  }

  /** `auth.signin` the first time each session ID is seen. */
  private async recordFirstSignIn(p: Principal, sid: string, correlationId: string): Promise<void> {
    await withTx(this.pool, { tenantId: p.tenantId, correlationId }, async (tx) => {
      await tx.client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`signin:${sid}`]);
      const seen = await tx.client.query(
        "SELECT 1 FROM audit.audit_events WHERE action = 'auth.signin' AND data->>'sid' = $1 LIMIT 1",
        [sid],
      );
      if (seen.rowCount) return;
      await this.audit.record(tx, {
        tenantId: p.tenantId,
        actorId: p.userId,
        actorRole: p.roles[0] ?? null,
        action: 'auth.signin',
        targetType: 'user',
        targetId: p.userId,
        correlationId,
        data: { sid, mfa: p.mfa },
      });
    });
  }

  private async closeExpired(
    userId: string,
    tenantId: string,
    e: ElevationRow,
    correlationId: string,
  ): Promise<void> {
    await withTx(this.pool, { tenantId, correlationId }, async (tx) => {
      const r = await tx.client.query(
        `UPDATE iam.tenant_elevations SET ended_at = $2, end_reason = 'expired'
          WHERE id = $1 AND ended_at IS NULL`,
        [e.id, e.expires_at.toISOString()],
      );
      if (!r.rowCount) return; // someone else closed it first
      await this.audit.record(tx, {
        tenantId,
        actorId: userId,
        actorRole: 'system:expiry',
        action: 'tenant.elevation_ended',
        targetType: 'tenant',
        targetId: e.target_tenant_id,
        elevationId: e.id,
        correlationId,
        data: { end_reason: 'expired' },
      });
    });
  }
}
