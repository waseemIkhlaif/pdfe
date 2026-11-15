import { Module } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { Pool } from '@pdfe/platform-core/db';
import { PG_POOL, REDIS } from '../core/tokens';
import { HEALTH_CHECKS, databaseCheck, redisCheck } from './health.checks';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [
    {
      provide: HEALTH_CHECKS,
      useFactory: (pool: Pool, redis: Redis) => [databaseCheck(pool), redisCheck(redis)],
      inject: [PG_POOL, REDIS],
    },
  ],
})
export class HealthModule {}
