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

export interface DbUrls {
  /** Superuser (tests that must tamper with data or disable triggers). */
  admin: string;
  /** migrator_role: runs the migrations. */
  migrator: string;
  /** app_role: what the API uses. No BYPASSRLS. */
  app: string;
  readonly: string;
}

const withUser = (base: string, user: string, password: string): string => {
  const u = new URL(base);
  u.username = user;
  u.password = password;
  return u.toString();
};

/**
 * Creates the same four roles as infra/postgres/init/01-roles.sh, with fixed throw-away test passwords.
 * Call once per container, before running the migrations.
 */
export async function createDbRoles(adminUrl: string): Promise<DbUrls> {
  const { default: pg } = await import('pg');
  const c = new pg.Client({ connectionString: adminUrl });
  await c.connect();
  try {
    await c.query("CREATE ROLE migrator_role LOGIN PASSWORD 'test-migrator'");
    await c.query("CREATE ROLE app_role LOGIN NOBYPASSRLS PASSWORD 'test-app'");
    await c.query("CREATE ROLE readonly_role LOGIN NOBYPASSRLS PASSWORD 'test-readonly'");
    await c.query('CREATE ROLE demo_reset_role NOLOGIN NOBYPASSRLS');
    await c.query('GRANT demo_reset_role TO app_role');
  } finally {
    await c.end();
  }
  return {
    admin: adminUrl,
    migrator: withUser(adminUrl, 'migrator_role', 'test-migrator'),
    app: withUser(adminUrl, 'app_role', 'test-app'),
    readonly: withUser(adminUrl, 'readonly_role', 'test-readonly'),
  };
}
