import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError } from '@pdfe/platform-core';
import { AUTHENTICATED_ONLY, IS_PUBLIC, REQUIRE_PERMISSION } from './public.decorator';

/**
 * Deny by default: a route must be public, authenticated-only (the service decides), or name a permission.
 * A route with none of these is refused, so a forgotten decorator can never open an endpoint.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    const p = ctx.switchToHttp().getRequest<Request>().principal;
    if (!p) throw new AppError('UNAUTHENTICATED', 401);
    if (this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_ONLY, targets)) return true;
    const needed = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_PERMISSION,
      targets,
    );
    if (!needed || !p.permissions.has(needed)) throw new AppError('FORBIDDEN', 403);
    return true;
  }
}
