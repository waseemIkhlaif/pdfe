import { resolve } from 'node:path';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool, type Pool } from '@pdfe/platform-core/db';
import { runMigrations } from '@pdfe/platform-core/migrate';
import { createDbRoles, startPostgres, type PgHandle } from '@pdfe/test-kit';
import * as schema from '../src/db/schema';

// The Drizzle definitions must describe exactly the tables the migrations create.
const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
let pgh: PgHandle;
let pool: Pool;

beforeAll(async () => {
  pgh = await startPostgres();
  const urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  pool = createPool(urls.admin, 2);
});
afterAll(async () => {
  await pool?.end();
  await pgh?.stop();
});

const tables = (Object.values(schema) as unknown[]).filter(
  (v) => typeof v === 'object' && v !== null && Symbol.for('drizzle:IsDrizzleTable') in v,
) as PgTable[];

describe('drizzle schema matches the migrations', () => {
  it('covers every table of the foundation schemas except schema_migrations', async () => {
    const r = await pool.query(
      `SELECT table_schema || '.' || table_name AS t FROM information_schema.tables
        WHERE table_schema IN ('platform','iam','audit','integration') AND table_type = 'BASE TABLE'
          AND table_name <> 'schema_migrations'`,
    );
    const inDb = r.rows.map((x) => x.t).sort();
    const inCode = tables
      .map((t) => `${getTableConfig(t).schema}.${getTableConfig(t).name}`)
      .sort();
    expect(inCode).toEqual(inDb);
  });

  it.each(tables.map((t) => [`${getTableConfig(t).schema}.${getTableConfig(t).name}`, t] as const))(
    '%s has the same columns and nullability',
    async (_name, table) => {
      const cfg = getTableConfig(table);
      const r = await pool.query(
        `SELECT column_name, is_nullable FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2 ORDER BY column_name`,
        [cfg.schema, cfg.name],
      );
      const inDb = Object.fromEntries(r.rows.map((c) => [c.column_name, c.is_nullable === 'YES']));
      const inCode = Object.fromEntries(cfg.columns.map((c) => [c.name, !c.notNull]));
      expect(inCode).toEqual(inDb);
    },
  );
});
