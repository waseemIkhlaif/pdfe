import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { createPool, withTx, type Pool } from '../src/db';
import { runMigrations } from '../src/migrate/runner';

const MIGRATIONS = resolve(__dirname, '../../../db/migrations');

let pgh: PgHandle;
let urls: DbUrls;
let pool: Pool;

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  pool = createPool(urls.app, 4);
});
afterAll(async () => {
  await pool?.end();
  await pgh?.stop();
});

describe('migrations from zero', () => {
  it('creates the six schemas and the platform tables', async () => {
    const s = await pool.query(
      'SELECT schema_name FROM information_schema.schemata WHERE schema_name = ANY($1) ORDER BY 1',
      [['platform', 'iam', 'audit', 'config', 'demo', 'integration']],
    );
    expect(s.rows.map((r) => r.schema_name)).toEqual([
      'audit',
      'config',
      'demo',
      'iam',
      'integration',
      'platform',
    ]);
    const t = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'platform' ORDER BY 1",
    );
    expect(t.rows.map((r) => r.table_name)).toEqual([
      'legal_entities',
      'organizations',
      'schema_migrations',
      'tenants',
    ]);
  });

  it('refuses a non-synthetic legal entity', async () => {
    await pool.query(
      "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ('00000000-0000-7000-8000-000000000001','t1','T1','merchant','2026-01-15T08:00:00Z')",
    );
    await expect(
      pool.query(
        "INSERT INTO platform.legal_entities (id, tenant_id, code, name, is_synthetic, created_at) VALUES ('00000000-0000-7000-8000-000000000002','00000000-0000-7000-8000-000000000001','le','LE',false,'2026-01-15T08:00:00Z')",
      ),
    ).rejects.toThrow();
  });

  it('app_role does not bypass row level security', async () => {
    const r = await pool.query("SELECT rolbypassrls FROM pg_roles WHERE rolname = 'app_role'");
    expect(r.rows[0]).toEqual({ rolbypassrls: false });
  });
});

describe('withTx', () => {
  it('sets the transaction-local settings', async () => {
    const got = await withTx(
      pool,
      { tenantId: 'T-1', correlationId: 'COR-1' },
      async ({ client }) => {
        const r = await client.query(
          "SELECT current_setting('app.tenant_id') t, current_setting('app.correlation_id') c",
        );
        return r.rows[0];
      },
    );
    expect(got).toEqual({ t: 'T-1', c: 'COR-1' });
    // The settings do not leak to the next transaction on the same pool.
    const after = await pool.query("SELECT current_setting('app.tenant_id', true) t");
    expect(after.rows[0].t === '' || after.rows[0].t === null).toBe(true);
  });

  it('rolls back on error', async () => {
    await expect(
      withTx(pool, {}, async ({ client }) => {
        await client.query(
          "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ('00000000-0000-7000-8000-0000000000aa','rb','RB','merchant','2026-01-15T08:00:00Z')",
        );
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const r = await pool.query("SELECT 1 FROM platform.tenants WHERE code = 'rb'");
    expect(r.rowCount).toBe(0);
  });

  it('an elevation makes the transaction read-only at the database level', async () => {
    await expect(
      withTx(pool, { tenantId: 'T-1', elevationId: 'EL-1' }, async ({ client }) => {
        await client.query(
          "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ('00000000-0000-7000-8000-0000000000bb','ro','RO','merchant','2026-01-15T08:00:00Z')",
        );
      }),
    ).rejects.toThrow(/read-only/i);
  });
});
