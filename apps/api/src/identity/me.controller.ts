import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from './public.decorator';

@Controller('v1')
export class MeController {
  /** The caller: user, tenant, roles, permissions, second-factor status and the active elevation. */
  @Get('me')
  @RequirePermission('me.read')
  me(@Req() req: Request) {
    const p = req.principal!;
    return {
      user: { id: p.userId, display_name: p.displayName, locale: p.locale },
      tenant_id: p.tenantId,
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
