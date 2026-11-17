import { Global, Module } from '@nestjs/common';
import { IpRateLimitGuard, RateLimiter, UserRateLimitGuard } from './rate-limit.guard';
import { RATE_LIMIT_STORE, RedisRateLimitStore } from './rate-limit.store';

@Global()
@Module({
  providers: [
    RedisRateLimitStore,
    { provide: RATE_LIMIT_STORE, useExisting: RedisRateLimitStore },
    RateLimiter,
    IpRateLimitGuard,
    UserRateLimitGuard,
  ],
  exports: [RATE_LIMIT_STORE, RateLimiter, IpRateLimitGuard, UserRateLimitGuard],
})
export class RateLimitModule {}
