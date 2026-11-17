import {
  createParamDecorator,
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { from, lastValueFrom, type Observable } from 'rxjs';
import { AppError, getContext } from '@pdfe/platform-core';
import { withTx, type Pool, type Tx } from '@pdfe/platform-core/db';
import { PG_POOL } from '../core/tokens';
import { ELEVATION_CONTROL, NO_REQUEST_TX } from '../identity/public.decorator';

/** The request transaction, with `app.tenant_id` already set. Handlers use this instead of the pool. */
export const CurrentTx = createParamDecorator((_data: unknown, ctx: ExecutionContext): Tx => {
  const tx = ctx.switchToHttp().getRequest<Request>().tx;
  if (!tx) throw new AppError('INTERNAL', 500);
  return tx;
});

/**
 * Opens the request transaction through withTx. The tenant is the token's tenant, or the elevation's target:
 * then the transaction is READ ONLY and carries `app.elevation_id`. Public routes and elevation-control routes
 * get no request transaction.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly reflector: Reflector,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const p = req.principal;
    if (!p) return next.handle();
    if (
      this.reflector.getAllAndOverride<boolean>(ELEVATION_CONTROL, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ||
      this.reflector.getAllAndOverride<boolean>(NO_REQUEST_TX, [ctx.getHandler(), ctx.getClass()])
    )
      return next.handle();
    return from(
      withTx(
        this.pool,
        {
          tenantId: p.elevation ? p.elevation.targetTenantId : p.tenantId,
          ...(getContext()?.correlationId ? { correlationId: getContext()!.correlationId } : {}),
          ...(p.elevation ? { elevationId: p.elevation.id } : {}),
        },
        async (tx) => {
          req.tx = tx;
          return lastValueFrom(next.handle(), { defaultValue: undefined });
        },
      ),
    );
  }
}

/** The second, code-level tenant check: a record read for a request must belong to the request's tenant. */
export function assertSameTenant(req: Request, recordTenantId: string | null | undefined): void {
  const p = req.principal;
  if (!p) throw new AppError('UNAUTHENTICATED', 401);
  const effective = p.elevation ? p.elevation.targetTenantId : p.tenantId;
  if (recordTenantId !== effective) throw new AppError('NOT_FOUND', 404);
}
