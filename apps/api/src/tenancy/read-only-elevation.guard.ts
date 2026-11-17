import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '@pdfe/platform-core';
import { ELEVATION_CONTROL } from '../identity/public.decorator';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

/** While an elevation is active, any request that could change data is refused (FR-013a). */
@Injectable()
export class ReadOnlyElevationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.principal?.elevation || SAFE.has(req.method)) return true;
    if (
      this.reflector.getAllAndOverride<boolean>(ELEVATION_CONTROL, [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    )
      return true;
    throw new AppError('ELEVATION_READ_ONLY', 409);
  }
}
