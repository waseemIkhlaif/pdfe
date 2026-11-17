import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { from, mergeMap, type Observable } from 'rxjs';
import { getContext } from '@pdfe/platform-core';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import { AuditService } from '../audit/audit.service';
import { PG_POOL } from '../core/tokens';

/**
 * Records one `tenant.elevated_read` for each read made under an elevation. The read transaction is READ ONLY,
 * so the event is written in its own transaction after the read; the data is released only once it is recorded.
 * Elevation-control routes (start, current, end) write their own events and are not reads of the target tenant.
 */
@Injectable()
export class ElevatedReadInterceptor implements NestInterceptor {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const e = req.principal?.elevation;
    if (!e || req.method !== 'GET' || req.originalUrl.startsWith('/v1/elevations'))
      return next.handle();
    const p = req.principal!;
    const correlationId = getContext()?.correlationId ?? 'unknown';
    return next.handle().pipe(
      mergeMap((data) =>
        from(
          withTx(this.pool, { tenantId: p.tenantId, correlationId }, (tx) =>
            this.audit.record(tx, {
              tenantId: e.targetTenantId,
              actorId: p.userId,
              actorRole: p.roles[0] ?? null,
              action: 'tenant.elevated_read',
              targetType: 'tenant',
              targetId: e.targetTenantId,
              elevationId: e.id,
              correlationId,
              data: { method: req.method, path: req.originalUrl.split('?')[0] },
            }),
          ).then(() => data),
        ),
      ),
    );
  }
}
