import 'reflect-metadata';
import { resolve } from 'node:path';
import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { JWTVerifyGetKey } from 'jose';
import pg from 'pg';
import { ScenarioClock } from '@pdfe/platform-core';
import { createPool, type Pool } from '@pdfe/platform-core/db';
import { runMigrations, seedReferenceData } from '@pdfe/platform-core/migrate';
import {
  LocalIssuer,
  createDbRoles,
  startPostgres,
  startRedis,
  type DbUrls,
  type PgHandle,
} from '@pdfe/test-kit';
import { configureApp } from '../../src/app';
import { AppModule } from '../../src/app.module';
import { Redis } from 'ioredis';
import { DefaultsConfigReader, type ConfigKey } from '@pdfe/domain-types';
import { CLOCK, CONFIG_READER, OIDC_OPTIONS, PG_POOL, REDIS } from '../../src/core/tokens';
import { MemoryRateLimitStore, RATE_LIMIT_STORE } from '../../src/ratelimit/rate-limit.store';
import { HEALTH_CHECKS } from '../../src/health/health.checks';

const MIGRATIONS = resolve(__dirname, '../../../../db/migrations');
export const BASE_TIME = '2026-01-15T08:00:00Z';

export interface TestUser {
  id: string;
  sub: string;
  name: string;
  tenantId: string;
  roles: string[];
}

export interface TestApp {
  app: INestApplication;
  urls: DbUrls;
  clock: ScenarioClock;
  issuer: LocalIssuer;
  /** Pool connected as app_role, the same one the API uses. */
  pool: Pool;
  /** Superuser connection for fixtures and for checks that must see everything. */
  admin: pg.Client;
  createTenant(code: string, id?: string): Promise<string>;
  /** Inserts a user and grants the roles through the database (the SoD trigger still applies). */
  createUser(
    name: string,
    tenantId: string,
    roles?: string[],
    ids?: { id?: string; sub?: string },
  ): Promise<TestUser>;
  token(user: TestUser, opts?: { otp?: boolean; sessionId?: string }): Promise<string>;
  close(): Promise<void>;
}

let counter = 0;
const uuid = (kind: number): string => {
  counter += 1;
  return `00000000-0000-7000-8${kind}00-${counter.toString(16).padStart(12, '0')}`;
};

/** Boots the whole API against a disposable Postgres with migrations and reference data, and a local token issuer. */
export async function createTestApp(
  opts: {
    controllers?: Type<unknown>[];
    /** Use a real Redis container for the rate limiter instead of the in-memory store. */
    redis?: boolean;
    /** Rate limits per minute; the defaults (600 and 1200) are out of reach of ordinary tests. */
    limits?: { perUser: number; perIp: number };
    /** Replace providers (for example the scenario hooks, the mock hub client or the manifest folder). */
    overrides?: { provide: unknown; useValue: unknown }[];
    /** Verify tokens from a real identity provider instead of the local issuer. */
    oidc?: { issuers: string[]; keys: JWTVerifyGetKey };
  } = {},
): Promise<TestApp> {
  const pgh: PgHandle = await startPostgres();
  const urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  await seedReferenceData(urls.admin);

  const admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  const pool = createPool(urls.app, 10);
  const issuer = await LocalIssuer.create();
  const clock = new ScenarioClock(BASE_TIME, 1000);

  const redisHandle = opts.redis ? await startRedis() : undefined;
  const redis = redisHandle ? new Redis(redisHandle.url) : undefined;
  const defaults = new DefaultsConfigReader();
  const configReader = {
    get: async (key: ConfigKey) =>
      key === 'api.rate_limit' && opts.limits
        ? { per_user_per_minute: opts.limits.perUser, per_ip_per_minute: opts.limits.perIp }
        : defaults.get(key),
  };

  let builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: opts.controllers ?? [],
  })
    .overrideProvider(PG_POOL)
    .useValue(pool)
    .overrideProvider(CLOCK)
    .useValue(clock)
    .overrideProvider(OIDC_OPTIONS)
    .useValue(opts.oidc ?? { issuers: [issuer.issuer], keys: issuer.keys })
    .overrideProvider(CONFIG_READER)
    .useValue(configReader)
    .overrideProvider(HEALTH_CHECKS)
    .useValue([]);
  for (const o of opts.overrides ?? [])
    builder = builder.overrideProvider(o.provide).useValue(o.useValue);
  if (redis) builder = builder.overrideProvider(REDIS).useValue(redis);
  else builder = builder.overrideProvider(RATE_LIMIT_STORE).useValue(new MemoryRateLimitStore());
  const mod = await builder.compile();
  const app = mod.createNestApplication();
  configureApp(app);
  await app.init();

  return {
    app,
    urls,
    clock,
    issuer,
    pool,
    admin,
    async createTenant(code, fixedId) {
      const id = fixedId ?? uuid(1);
      await admin.query(
        "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ($1,$2,$2,'merchant',$3)",
        [id, code, BASE_TIME],
      );
      return id;
    },
    async createUser(name, tenantId, roles = [], ids = {}) {
      const id = ids.id ?? uuid(2);
      const sub = ids.sub ?? `sub-${name}`;
      await admin.query(
        'INSERT INTO iam.users (id, tenant_id, external_subject, display_name, created_at) VALUES ($1,$2,$3,$4,$5)',
        [id, tenantId, sub, name, BASE_TIME],
      );
      for (const r of roles) {
        await admin.query(
          'INSERT INTO iam.user_roles (user_id, role_code, granted_at) VALUES ($1,$2,$3)',
          [id, r, BASE_TIME],
        );
      }
      return { id, sub, name, tenantId, roles };
    },
    token(user, opts = {}) {
      return issuer.token({
        sub: user.sub,
        tenantId: user.tenantId,
        ...(opts.otp ? { otp: true } : {}),
        ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
      });
    },
    async close() {
      await app.close();
      redis?.disconnect();
      await redisHandle?.stop();
      await admin.end();
      await pgh.stop();
    },
  };
}
