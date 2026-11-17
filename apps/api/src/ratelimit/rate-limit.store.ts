import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from '../core/tokens';

/** Counts hits per key and window. */
export interface RateLimitStore {
  /** Adds one hit and returns the count so far in this window. The key expires after `ttlSeconds`. */
  hit(key: string, ttlSeconds: number): Promise<number>;
}

export const RATE_LIMIT_STORE = Symbol('RATE_LIMIT_STORE');

/** Production store. If Redis is unreachable the limiter fails open and says so once, rather than taking the API down. */
@Injectable()
export class RedisRateLimitStore implements RateLimitStore {
  private readonly log = new Logger('rate-limit');
  private warned = false;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async hit(key: string, ttlSeconds: number): Promise<number> {
    try {
      const results = await this.redis.multi().incr(key).expire(key, ttlSeconds).exec();
      const n = Number(results?.[0]?.[1]);
      if (!Number.isFinite(n)) throw new Error('unexpected reply');
      this.warned = false;
      return n;
    } catch (err) {
      if (!this.warned) {
        this.warned = true;
        this.log.warn(`rate limit store unavailable, allowing requests: ${(err as Error).message}`);
      }
      return 0;
    }
  }
}

/** For tests that do not need Redis. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly counts = new Map<string, number>();

  async hit(key: string): Promise<number> {
    const n = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, n);
    return n;
  }
}
