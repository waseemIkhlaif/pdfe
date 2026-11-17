import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IdGenerator, ScenarioClock, SystemRandom } from '@pdfe/platform-core';
import { createPool, type Pool } from '@pdfe/platform-core/db';
import { runMigrations, seedReferenceData } from '@pdfe/platform-core/migrate';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { runDevSeed, type SeedInput } from '../src/demo/dev-seed';

const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
const REALM = resolve(__dirname, '../../../infra/keycloak/generate-realm.mjs');

let pgh: PgHandle;
let urls: DbUrls;
let pool: Pool;
let admin: pg.Client;
let input: SeedInput;

const seed = () => {
  const clock = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
  return runDevSeed(pool, clock, new IdGenerator(clock, new SystemRandom()), input);
};
const count = async (sql: string) => Number((await admin.query(sql)).rows[0].n);

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  await seedReferenceData(urls.admin);
  admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  pool = createPool(urls.app, 4);
  const gen = (await import(pathToFileURL(REALM).href)) as {
    TENANTS: Record<string, string>;
    USERS: SeedInput['users'];
  };
  input = { tenants: gen.TENANTS, users: gen.USERS };
});
afterAll(async () => {
  await pool?.end();
  await admin?.end();
  await pgh?.stop();
});

describe('development seed', () => {
  it('creates the 3 tenants, the demo organization, and a user with a role for each realm user', async () => {
    const r = await seed();
    expect(r).toEqual({ tenants: 3, organizations: 1, users: 16, roleGrants: 16 });
    expect(await count('SELECT count(*) n FROM platform.tenants')).toBe(3);
    expect(await count('SELECT count(*) n FROM platform.organizations')).toBe(1);
    expect(await count('SELECT count(*) n FROM iam.users')).toBe(16);
    expect(await count('SELECT count(*) n FROM iam.user_roles')).toBe(16);
  });

  it('uses the realm subjects and tenants, so a realm user and a seeded user are the same person', async () => {
    const admin1 = (
      await admin.query(
        `SELECT u.external_subject, u.tenant_id, r.role_code FROM iam.users u
           JOIN iam.user_roles r ON r.user_id = u.id WHERE u.display_name = 'demo.admin.a'`,
      )
    ).rows[0];
    expect(admin1).toEqual({
      external_subject: '11111111-0000-7000-8000-000000000001',
      tenant_id: input.tenants.platform,
      role_code: 'platform_admin',
    });
  });

  it('audits every creation as system:seed', async () => {
    const by = (
      await admin.query(
        `SELECT action, count(*)::int n FROM audit.audit_events WHERE actor_role = 'system:seed' GROUP BY 1 ORDER BY 1`,
      )
    ).rows;
    expect(Object.fromEntries(by.map((x) => [x.action, x.n]))).toEqual({
      'tenant.created': 3,
      'organization.created': 1,
      'user.created': 16,
      'iam.role.granted': 16,
    });
  });

  it('is idempotent: a second run changes nothing', async () => {
    const before = await count('SELECT count(*) n FROM audit.audit_events');
    const r = await seed();
    expect(r).toEqual({ tenants: 0, organizations: 0, users: 0, roleGrants: 0 });
    expect(await count('SELECT count(*) n FROM audit.audit_events')).toBe(before);
  });

  it('refuses a seed that would break separation of duties, and leaves that user without the role', async () => {
    const bad: SeedInput = {
      tenants: input.tenants,
      users: [
        ...input.users,
        {
          ...input.users[0]!,
          subject: '11111111-0000-7000-8000-0000000000aa',
          username: 'demo.clash',
          role: 'platform_admin',
        },
        {
          ...input.users[0]!,
          subject: '11111111-0000-7000-8000-0000000000aa',
          username: 'demo.clash',
          role: 'finance_approver',
        },
      ],
    };
    const clock = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
    await expect(
      runDevSeed(pool, clock, new IdGenerator(clock, new SystemRandom()), bad),
    ).rejects.toThrow(/seed refused: demo.clash cannot hold finance_approver/);
    const roles = (
      await admin.query(
        "SELECT role_code FROM iam.user_roles WHERE user_id = '11111111-0000-7000-8000-0000000000aa'",
      )
    ).rows;
    expect(roles.map((x) => x.role_code)).toEqual(['platform_admin']);
  });
});
