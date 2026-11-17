import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { createPool, withTx, type Pool } from '@pdfe/platform-core/db';
import { runMigrations, seedReferenceData } from '@pdfe/platform-core/migrate';

const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
const TENANT_A = '00000000-0000-7000-8000-00000000000a';
const TENANT_B = '00000000-0000-7000-8000-00000000000b';
const USER_A = '00000000-0000-7000-8000-0000000000a1';
const USER_B = '00000000-0000-7000-8000-0000000000b1';
const T = '2026-01-15T08:00:00Z';

type Side = 'a' | 'b';
const tenantOf = (s: Side) => (s === 'a' ? TENANT_A : TENANT_B);
const userOf = (s: Side) => (s === 'a' ? USER_A : USER_B);
// Distinct ids per side and per round, so inserts never collide with the fixture rows.
const id = (n: number, s: Side) =>
  `00000000-0000-7000-8000-${n.toString(16).padStart(8, '0')}${s === 'a' ? '00aa' : '00bb'}`;

/**
 * One INSERT per RLS-protected table. `round` 1 builds the fixture, round 2 builds the rows the test inserts.
 * A new tenant-owned table without an entry here fails the suite.
 */
const INSERTS: Record<string, (s: Side, round: number) => [string, unknown[]]> = {
  'platform.legal_entities': (s, r) => [
    'INSERT INTO platform.legal_entities (id, tenant_id, code, name, created_at) VALUES ($1,$2,$3,$4,$5)',
    [id(10 + r, s), tenantOf(s), `le${r}`, 'LE', T],
  ],
  'platform.organizations': (s, r) => [
    'INSERT INTO platform.organizations (id, tenant_id, type, display_name, created_at) VALUES ($1,$2,$3,$4,$5)',
    [id(20 + r, s), tenantOf(s), 'merchant', 'Org', T],
  ],
  'iam.users': (s, r) => [
    'INSERT INTO iam.users (id, tenant_id, external_subject, display_name, created_at) VALUES ($1,$2,$3,$4,$5)',
    [r === 1 ? userOf(s) : id(30 + r, s), tenantOf(s), `sub-${s}-${r}`, 'User', T],
  ],
  'iam.approval_requests': (s, r) => [
    `INSERT INTO iam.approval_requests (id, tenant_id, action_type, target_type, payload, payload_hash, requested_by,
       reason, expires_at, created_at, correlation_id) VALUES ($1,$2,'config.change','config','{}',$3,$4,'because',$5,$6,'c')`,
    [id(40 + r, s), tenantOf(s), 'a'.repeat(64), userOf(s), '2026-02-01T00:00:00Z', T],
  ],
  'integration.idempotency_keys': (s, r) => [
    `INSERT INTO integration.idempotency_keys (tenant_id, scope, key, request_hash, status, created_at, expires_at)
       VALUES ($1,'s',$2,'h','completed',$3,$4)`,
    [tenantOf(s), `k${r}`, T, '2026-02-01T00:00:00Z'],
  ],
};
// Insert order matters: users before approval_requests.
const ORDER = [
  'platform.legal_entities',
  'platform.organizations',
  'iam.users',
  'iam.approval_requests',
  'integration.idempotency_keys',
];

let pgh: PgHandle;
let urls: DbUrls;
let app: Pool;
let tenantTables: string[] = [];

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  await seedReferenceData(urls.admin);

  const admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  try {
    await admin.query(
      `INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES
         ($1,'a','Tenant A','merchant',$3), ($2,'b','Tenant B','merchant',$3)`,
      [TENANT_A, TENANT_B, T],
    );
    // Every table with a NOT NULL tenant_id column must be protected.
    const r = await admin.query<{ t: string }>(
      `SELECT table_schema || '.' || table_name AS t FROM information_schema.columns
        WHERE column_name = 'tenant_id' AND is_nullable = 'NO'
          AND table_schema IN ('platform','iam','audit','config','demo','integration')
        ORDER BY 1`,
    );
    tenantTables = r.rows.map((x) => x.t);
    for (const table of ORDER) {
      for (const s of ['a', 'b'] as Side[]) {
        const [sql, params] = INSERTS[table]!(s, 1);
        await admin.query(sql, params); // superuser bypasses RLS to build the fixture
      }
    }
  } finally {
    await admin.end();
  }
  app = createPool(urls.app, 4);
});
afterAll(async () => {
  await app?.end();
  await pgh?.stop();
});

describe('row level security', () => {
  it('covers exactly the tables with a NOT NULL tenant_id', () => {
    expect(tenantTables.sort()).toEqual([...ORDER].sort());
  });

  it('app_role does not bypass row level security', async () => {
    const r = await app.query(
      "SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = 'app_role'",
    );
    expect(r.rows[0]).toEqual({ rolbypassrls: false, rolsuper: false });
  });

  it.each(ORDER)('%s: RLS is enabled and forced', async (table) => {
    const r = await app.query(
      `SELECT c.relrowsecurity, c.relforcerowsecurity FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname || '.' || c.relname = $1`,
      [table],
    );
    expect(r.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });
  });

  describe.each(ORDER)('%s', (table) => {
    it('tenant A reads 0 rows of tenant B, and its own row', async () => {
      const rows = await withTx(
        app,
        { tenantId: TENANT_A },
        async ({ client }) => (await client.query(`SELECT tenant_id FROM ${table}`)).rows,
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((x) => x.tenant_id === TENANT_A)).toBe(true);
      expect(rows.some((x) => x.tenant_id === TENANT_B)).toBe(false);
    });

    it('an insert for tenant B under tenant A fails the WITH CHECK', async () => {
      const [sql, params] = INSERTS[table]!('b', 2);
      await expect(
        withTx(app, { tenantId: TENANT_A }, async ({ client }) => client.query(sql, params)),
      ).rejects.toThrow(/row-level security/);
    });

    it('an insert for its own tenant works', async () => {
      const [sql, params] = INSERTS[table]!('a', 2);
      await withTx(app, { tenantId: TENANT_A }, async ({ client }) => {
        await client.query(sql, params);
        // leave no trace for the other tests
        throw new Error('rollback');
      }).catch((e: Error) => expect(e.message).toBe('rollback'));
    });

    it('a missing app.tenant_id reads 0 rows', async () => {
      const rows = await withTx(
        app,
        {},
        async ({ client }) => (await client.query(`SELECT 1 FROM ${table}`)).rows,
      );
      expect(rows).toHaveLength(0);
    });

    it('an app.tenant_id left over as an empty string reads 0 rows and does not raise', async () => {
      const c = await app.connect();
      try {
        await c.query("SELECT set_config('app.tenant_id', '', false)");
        expect((await c.query(`SELECT 1 FROM ${table}`)).rows).toHaveLength(0);
      } finally {
        c.release();
      }
    });
  });

  it('iam.list_users_all() lists every tenant and restores the caller setting', async () => {
    const out = await withTx(app, { tenantId: TENANT_A }, async ({ client }) => {
      const all = await client.query('SELECT tenant_id FROM iam.list_users_all()');
      const after = await client.query(
        "SELECT current_setting('app.tenant_id') AS t, (SELECT count(*) FROM iam.users) AS n",
      );
      return { tenants: new Set(all.rows.map((x) => x.tenant_id)), after: after.rows[0] };
    });
    expect(out.tenants).toEqual(new Set([TENANT_A, TENANT_B]));
    expect(out.after.t).toBe(TENANT_A);
    expect(Number(out.after.n)).toBe(1);
  });

  it('only app_role may run iam.list_users_all()', async () => {
    const ro = createPool(urls.readonly, 1);
    try {
      await expect(ro.query('SELECT * FROM iam.list_users_all()')).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await ro.end();
    }
  });
});
