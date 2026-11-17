import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { isPrivileged } from '@pdfe/domain-types';
import { AppError, getContext } from '@pdfe/platform-core';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import { AuditService } from '../audit/audit.service';
import { PG_POOL } from '../core/tokens';

/** A privileged role without a second factor (`otp` in `amr`) is refused on every protected route, and the denial is audited. */
@Injectable()
export class MfaGuard implements CanActivate {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const p = ctx.switchToHttp().getRequest<Request>().principal;
    if (!p) return true; // public route
    if (p.mfa || !p.roles.some(isPrivileged)) return true;
    const correlationId = getContext()?.correlationId ?? 'unknown';
    await withTx(this.pool, { tenantId: p.tenantId, correlationId }, (tx) =>
      this.audit.record(tx, {
        tenantId: p.tenantId,
        actorId: p.userId,
        actorRole: p.roles.find(isPrivileged) ?? null,
        action: 'auth.signin_denied_mfa',
        targetType: 'user',
        targetId: p.userId,
        correlationId,
      }),
    );
    throw new AppError('MFA_REQUIRED', 401);
  }
}
