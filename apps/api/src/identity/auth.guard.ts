import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppError, getContext } from '@pdfe/platform-core';
import { JwtVerifier } from './jwt.verifier';
import { PrincipalService } from './principal.service';
import { IS_PUBLIC } from './public.decorator';

/** Verifies the bearer token and attaches the principal. Public routes pass without a token. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifier,
    private readonly principals: PrincipalService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]))
      return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    const m = /^Bearer (\S+)$/.exec(req.header('authorization') ?? '');
    if (!m) throw new AppError('UNAUTHENTICATED', 401);
    const claims = await this.verifier.verify(m[1]!);
    req.principal = await this.principals.load(claims, getContext()?.correlationId ?? 'unknown');
    return true;
  }
}
