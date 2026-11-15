import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { createPool, type Pool } from '@pdfe/platform-core/db';
import { PG_POOL, REDIS } from '../core/tokens';

/** Connection pool and Redis client. Both connect lazily, so the app can boot (and be tested) without them. */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => createPool(process.env.DATABASE_URL ?? 'postgres://localhost/unconfigured'),
    },
    {
      provide: REDIS,
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        }),
    },
  ],
  exports: [PG_POOL, REDIS],
})
export class DbModule implements OnApplicationShutdown {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end().catch(() => undefined);
    this.redis.disconnect();
  }
}
