import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockHubControl } from '../src/demo/mock-hub-control';
import { StartupSeeder } from '../src/demo/startup-seeder';
import { createTestApp, type TestApp } from './support/test-app';

// A fresh database is seeded when the api starts, so a clone is usable once the stack is healthy (US8, quickstart §1).
const COMMITTED = readFileSync(
  resolve(__dirname, '../../../db/seeds/scenarios/baseline/v1.digest-seed42.txt'),
  'utf8',
).trim();

let t: TestApp;
const hub = { configure: async () => 'configured' as const };

beforeAll(async () => {
  process.env.SEED_ON_EMPTY = 'baseline:v1:42';
  t = await createTestApp({ overrides: [{ provide: MockHubControl, useValue: hub }] });
});
afterAll(async () => {
  delete process.env.SEED_ON_EMPTY;
  await t?.close();
});

describe('seeding at start', () => {
  it('seeds an empty database from the named scenario, attributed to system:startup', async () => {
    const users = await t.admin.query('SELECT count(*)::int AS n FROM iam.users');
    expect(users.rows[0].n).toBe(16);
    const runs = await t.admin.query(
      'SELECT status, requested_by, result_digest, seed::int AS seed FROM demo.scenario_runs',
    );
    expect(runs.rows).toEqual([
      { status: 'succeeded', requested_by: 'system:startup', result_digest: COMMITTED, seed: 42 },
    ]);
  });

  it('never resets a database that already has data (a restart keeps it)', async () => {
    await t.admin.query("UPDATE platform.tenants SET name = 'Renamed' WHERE code = 'platform'");
    await t.app.get(StartupSeeder).onApplicationBootstrap();
    expect(
      (await t.admin.query('SELECT count(*)::int AS n FROM demo.scenario_runs')).rows[0].n,
    ).toBe(1);
    expect(
      (await t.admin.query("SELECT name FROM platform.tenants WHERE code = 'platform'")).rows[0]
        .name,
    ).toBe('Renamed');
  });

  it('does nothing when the variable is not set, is malformed, or the mode is not DEMO', async () => {
    const before = (await t.admin.query('SELECT count(*)::int AS n FROM demo.scenario_runs'))
      .rows[0].n;
    const seeder = t.app.get(StartupSeeder);
    delete process.env.SEED_ON_EMPTY;
    await seeder.onApplicationBootstrap();
    process.env.SEED_ON_EMPTY = 'not a spec';
    await seeder.onApplicationBootstrap();
    process.env.SEED_ON_EMPTY = 'baseline:v1:42';
    const mode = process.env.APP_MODE;
    process.env.APP_MODE = 'LIVE';
    try {
      await seeder.onApplicationBootstrap();
    } finally {
      if (mode === undefined) delete process.env.APP_MODE;
      else process.env.APP_MODE = mode;
    }
    expect(
      (await t.admin.query('SELECT count(*)::int AS n FROM demo.scenario_runs')).rows[0].n,
    ).toBe(before);
  });
});
