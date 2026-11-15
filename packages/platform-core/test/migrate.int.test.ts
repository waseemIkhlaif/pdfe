import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startPostgres, type PgHandle } from '@pdfe/test-kit';
import { runMigrations } from '../src/migrate/runner';

let db: PgHandle;
let dir: string;

const put = (name: string, sql: string) => writeFileSync(join(dir, name), sql);
const q = async <T extends pg.QueryResultRow>(sql: string) => {
  const c = new pg.Client({ connectionString: db.url });
  await c.connect();
  try {
    return (await c.query<T>(sql)).rows;
  } finally {
    await c.end();
  }
};

beforeAll(async () => {
  db = await startPostgres();
  dir = mkdtempSync(join(tmpdir(), 'pdfe-mig-'));
});
afterAll(async () => {
  await db.stop();
  rmSync(dir, { recursive: true, force: true });
});

describe('migration runner', () => {
  it('applies files in name order and records filename and sha256', async () => {
    put('0002_b.sql', 'CREATE TABLE t_b (id int);');
    put('0001_a.sql', 'CREATE TABLE t_a (id int);');
    const r = await runMigrations({ url: db.url, dir });
    expect(r.applied).toEqual(['0001_a.sql', '0002_b.sql']);
    const rows = await q<{ filename: string; sha256: string }>(
      'SELECT filename, sha256 FROM platform.schema_migrations ORDER BY filename',
    );
    expect(rows.map((x) => x.filename)).toEqual(['0001_a.sql', '0002_b.sql']);
    expect(rows[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a second run applies nothing', async () => {
    const r = await runMigrations({ url: db.url, dir });
    expect(r.applied).toEqual([]);
    expect(r.skipped).toEqual(['0001_a.sql', '0002_b.sql']);
  });

  it('refuses to run when an applied file changed, and names the file', async () => {
    put('0001_a.sql', 'CREATE TABLE t_a (id int, extra int);');
    await expect(runMigrations({ url: db.url, dir })).rejects.toThrow(/0001_a\.sql/);
    put('0001_a.sql', 'CREATE TABLE t_a (id int);'); // restore
  });

  it('--check verifies without applying anything', async () => {
    put('0003_c.sql', 'CREATE TABLE t_c (id int);');
    const r = await runMigrations({ url: db.url, dir, checkOnly: true });
    expect(r.applied).toEqual([]);
    expect(r.pending).toEqual(['0003_c.sql']);
    const t = await q("SELECT to_regclass('public.t_c') AS r");
    expect(t[0]).toEqual({ r: null });
  });

  it('a failing file rolls back only itself', async () => {
    put('0004_bad.sql', 'CREATE TABLE t_d (id int); SELECT 1/0;');
    await expect(runMigrations({ url: db.url, dir })).rejects.toThrow(/0004_bad\.sql/);
    const names = (
      await q<{ filename: string }>(
        'SELECT filename FROM platform.schema_migrations ORDER BY filename',
      )
    ).map((x) => x.filename);
    expect(names).toEqual(['0001_a.sql', '0002_b.sql', '0003_c.sql']);
    const t = await q("SELECT to_regclass('public.t_d') AS r");
    expect(t[0]).toEqual({ r: null });
  });
});
