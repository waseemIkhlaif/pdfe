import type { Redis } from 'ioredis';
import type { Pool } from '@pdfe/platform-core/db';

export const HEALTH_CHECKS = Symbol('HEALTH_CHECKS');

export interface HealthCheck {
  name: string;
  check(): Promise<boolean>;
}

const within = async (ms: number, fn: () => Promise<unknown>): Promise<boolean> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), ms);
      }),
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const databaseCheck = (pool: Pool): HealthCheck => ({
  name: 'database',
  check: () => within(2000, () => pool.query('SELECT 1')),
});

export const redisCheck = (redis: Redis): HealthCheck => ({
  name: 'redis',
  check: () =>
    within(2000, async () => {
      if (redis.status === 'wait') await redis.connect();
      await redis.ping();
    }),
});
