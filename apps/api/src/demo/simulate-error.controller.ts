import { Controller, Inject, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AppError, getContext } from '@pdfe/platform-core';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import { AuditService } from '../audit/audit.service';
import { PG_POOL } from '../core/tokens';
import { RequirePermission } from '../identity/public.decorator';

/**
 * Lets a signed-in demo user see what a failure looks like: the audit event is recorded, then the call fails with the
 * ordinary 500 envelope, whose `correlation_id` is the same ID as the response header, the log lines, the trace and
 * the audit event (SC-012). The error page of the web apps calls it with `?simulate=500`. DEMO mode only.
 */
@Controller('v1/demo')
export class SimulateErrorController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  @Post('simulate-error')
  @RequirePermission('me.read')
  async simulate(@Req() req: Request): Promise<never> {
    if ((process.env.APP_MODE ?? 'DEMO') !== 'DEMO') throw new AppError('NOT_FOUND', 404);
    const p = req.principal!;
    const correlationId = getContext()?.correlationId ?? 'unknown';
    // Its own transaction: the request ends in an error, so the request transaction rolls back.
    await withTx(this.pool, { tenantId: p.tenantId, correlationId }, (tx) =>
      this.audit.record(tx, {
        tenantId: p.tenantId,
        actorId: p.userId,
        actorRole: p.roles[0] ?? null,
        action: 'demo.error_simulated',
        targetType: 'demo',
        targetId: 'simulate-error',
        correlationId,
      }),
    );
    throw new AppError('INTERNAL', 500);
  }
}
