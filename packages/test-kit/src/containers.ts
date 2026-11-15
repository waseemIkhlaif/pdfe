import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

export interface PgHandle {
  /** Superuser connection string (for migrations and tamper tests). */
  url: string;
  host: string;
  port: number;
  stop: () => Promise<void>;
}
export interface RedisHandle {
  url: string;
  stop: () => Promise<void>;
}

/** PostgreSQL 16 in a disposable container. The superuser is `postgres`. */
export async function startPostgres(): Promise<PgHandle> {
  const c = await new PostgreSqlContainer('postgres:16')
    .withDatabase('pdfe')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();
  return {
    url: c.getConnectionUri(),
    host: c.getHost(),
    port: c.getPort(),
    stop: async () => {
      await c.stop();
    },
  };
}

/** Redis 7 in a disposable container. */
export async function startRedis(): Promise<RedisHandle> {
  const c = await new RedisContainer('redis:7').start();
  return {
    url: c.getConnectionUrl(),
    stop: async () => {
      await c.stop();
    },
  };
}
