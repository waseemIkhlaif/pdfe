import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations, seedReferenceData } from '@pdfe/platform-core/migrate';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';

// In the stack the migrations run as `migrator_role`, which owns the database but is not a superuser
// (infra/postgres/init/01-roles.sh). Every other test migrates as the superuser, so a statement that needs
// more than ownership (for example granting a role) would pass there and fail in the stack.
const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
let pgh: PgHandle;
let urls: DbUrls;

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  const admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  await admin.query('ALTER DATABASE pdfe OWNER TO migrator_role'); // as the init script creates it
  await admin.end();
});
afterAll(async () => {
  await pgh?.stop();
});

describe('migrations as the real migrator role', () => {
  it('apply from zero, and the reference data seeds, without superuser rights', async () => {
    const r = await runMigrations({ url: urls.migrator, dir: MIGRATIONS });
    expect(r.applied.length).toBeGreaterThanOrEqual(6);
    const seeded = await seedReferenceData(urls.migrator);
    expect(seeded.roles).toBe(15);
  });

  it('leave app_role able to use the tables and demo_reset_role able to truncate the demo ones', async () => {
    const app = new pg.Client({ connectionString: urls.app });
    await app.connect();
    try {
      const r = await app.query(
        "SELECT pg_has_role('app_role', 'demo_reset_role', 'MEMBER') AS member",
      );
      expect(r.rows[0].member).toBe(true);
      await app.query('BEGIN');
      await app.query('SET LOCAL ROLE demo_reset_role');
      await app.query('TRUNCATE integration.outbox');
      await app.query('ROLLBACK');
    } finally {
      await app.end();
    }
  });
});
