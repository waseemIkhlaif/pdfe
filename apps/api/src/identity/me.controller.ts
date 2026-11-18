import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Tx } from '@pdfe/platform-core/db';
import { CurrentTx } from '../tenancy/tenant-context.interceptor';
import { RequirePermission } from './public.decorator';

@Controller('v1')
export class MeController {
  /** The caller: user, tenant, roles, permissions, second-factor status and the active elevation. */
  @Get('me')
  @RequirePermission('me.read')
  async me(@Req() req: Request, @CurrentTx() tx: Tx) {
    const p = req.principal!;
    // The tenant's name is for the tenant badge on every screen (platform-scoped table: no row security).
    const t = await tx.client.query<{ code: string; name: string }>(
      'SELECT code, name FROM platform.tenants WHERE id = $1',
      [p.tenantId],
    );
    return {
      user: { id: p.userId, display_name: p.displayName, locale: p.locale },
      tenant_id: p.tenantId,
      tenant: { id: p.tenantId, code: t.rows[0]?.code ?? '', name: t.rows[0]?.name ?? '' },
      roles: p.roles,
      permissions: [...p.permissions].sort(),
      mfa: p.mfa,
      elevation: p.elevation
        ? {
            id: p.elevation.id,
            target_tenant_id: p.elevation.targetTenantId,
            reason: p.elevation.reason,
            started_at: p.elevation.startedAt,
            expires_at: p.elevation.expiresAt,
          }
        : null,
    };
  }
}
