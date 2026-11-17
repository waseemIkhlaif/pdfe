import {
  Inject,
  Injectable,
  Logger,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ConfigReader } from '@pdfe/domain-types';
import { AppError, getContext, type ClockService } from '@pdfe/platform-core';
import { CLOCK, CONFIG_READER } from '../core/tokens';
import { RATE_LIMIT_STORE, type RateLimitStore } from './rate-limit.store';

const WINDOW_SECONDS = 60;

@Injectable()
export class RateLimiter {
  private readonly log = new Logger('rate-limit');

  constructor(
    @Inject(RATE_LIMIT_STORE) private readonly store: RateLimitStore,
    @Inject(CONFIG_READER) private readonly config: ConfigReader,
    @Inject(CLOCK) private readonly clock: ClockService,
  ) {}

  /** Counts one request against `subject`; over the limit it logs, sets Retry-After and throws 429 RATE_LIMITED. */
  async check(scope: 'user' | 'ip', subject: string, res: Response, path: string): Promise<void> {
    const limits = await this.config.get('api.rate_limit');
    const limit = scope === 'user' ? limits.per_user_per_minute : limits.per_ip_per_minute;
    const nowSeconds = Math.floor(this.clock.now().getTime() / 1000);
    const window = Math.floor(nowSeconds / WINDOW_SECONDS);
    const count = await this.store.hit(`rl:${scope}:${subject}:${window}`, WINDOW_SECONDS * 2);
    if (count <= limit) return;
    const retryAfter = Math.max(1, (window + 1) * WINDOW_SECONDS - nowSeconds);
    res.setHeader('Retry-After', String(retryAfter));
    this.log.warn(
      JSON.stringify({
        msg: 'rate limited',
        scope,
        subject: scope === 'ip' ? subject : 'user',
        limit,
        count,
        path,
        correlation_id: getContext()?.correlationId,
      }),
    );
    throw new AppError('RATE_LIMITED', 429);
  }
}

/** Unauthenticated requests (no bearer token) are limited per IP. Runs before sign-in is checked. */
@Injectable()
export class IpRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: RateLimiter) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (/^Bearer \S+$/.test(req.header('authorization') ?? '')) return true; // the user limit applies
    await this.limiter.check(
      'ip',
      req.ip ?? 'unknown',
      ctx.switchToHttp().getResponse<Response>(),
      req.path,
    );
    return true;
  }
}

/** Authenticated requests are limited per user, once the principal is known. Authenticated traffic is not counted per IP: web servers share addresses. */
@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: RateLimiter) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (!req.principal) return true;
    await this.limiter.check(
      'user',
      req.principal.userId,
      ctx.switchToHttp().getResponse<Response>(),
      req.path,
    );
    return true;
  }
}
