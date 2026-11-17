import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configRegistry } from '@pdfe/domain-types';
import { runMigrations, seedReferenceData } from '@pdfe/platform-core/migrate';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';

// The api does not start when the deployment differs from the safety-locked settings in the database (US2 acceptance 5,
// FR-010), and it records system.start_refused. The environment-only checks are in startup-guard.spec.ts.
const API_DIR = resolve(__dirname, '..');
const MAIN = resolve(API_DIR, 'dist/main.js');
const DEMO_CONFIG = resolve(API_DIR, '../../infra/adapters.demo.json');
const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
const HOSTS = configRegistry['egress.internal_hosts'].default.join(',');

let pgh: PgHandle;
let urls: DbUrls;
let admin: pg.Client;

function start(env: Record<string, string | undefined>) {
  const r = spawnSync(process.execPath, [MAIN, '--once'], {
    cwd: API_DIR,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      APP_MODE: 'DEMO',
      ADAPTERS_CONFIG: DEMO_CONFIG,
      DATABASE_URL: urls.app,
      ...env,
    } as NodeJS.ProcessEnv,
    encoding: 'utf8',
    timeout: 60_000,
  });
  return { status: r.status, stderr: r.stderr };
}

/** Changes the value of the active version of a setting, behind the API's back (what the guard is there to catch). */
async function setActive(key: string, value: unknown): Promise<void> {
  await admin.query(
    "UPDATE config.config_versions SET value = $2 WHERE key = $1 AND status = 'active'",
    [key, JSON.stringify(value)],
  );
}
const refusals = async () =>
  (
    await admin.query(
      "SELECT data FROM audit.audit_events WHERE action = 'system.start_refused' ORDER BY seq",
    )
  ).rows;

beforeAll(async () => {
  if (!existsSync(MAIN)) {
    throw new Error(
      'Build the api first (pnpm --filter @pdfe/api build): dist/main.js is missing.',
    );
  }
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  await seedReferenceData(urls.admin);
  admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
});
afterAll(async () => {
  await admin?.end();
  await pgh?.stop();
});

describe('start with the database reachable', () => {
  it('starts when the environment matches the safety-locked rows', () => {
    const r = start({ INTERNAL_HOSTS: HOSTS });
    expect(r.stderr).not.toContain('system.start_refused');
    expect(r.status).toBe(0);
  });

  it('starts when there is no database to compare with (the environment-only checks stand)', () => {
    const r = start({ DATABASE_URL: 'postgres://nobody@127.0.0.1:1/none' });
    expect(r.status).toBe(0);
  });

  it('refuses when APP_MODE differs from the app.mode row, and records system.start_refused', async () => {
    await setActive('app.mode', 'LIVE');
    try {
      const r = start({});
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('system.start_refused');
      expect(r.stderr).toContain('app.mode');
      const events = await refusals();
      expect(events).toHaveLength(1);
      expect(events[0].data.problems[0]).toContain('APP_MODE');
    } finally {
      await setActive('app.mode', 'DEMO');
    }
  });

  it('refuses when INTERNAL_HOSTS differs from the egress.internal_hosts row', async () => {
    await setActive('egress.internal_hosts', [...HOSTS.split(','), 'example.com']);
    try {
      const r = start({ INTERNAL_HOSTS: HOSTS });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('INTERNAL_HOSTS differs');
      expect(r.stderr).toContain('missing: example.com');
    } finally {
      await setActive('egress.internal_hosts', configRegistry['egress.internal_hosts'].default);
    }
  });

  it('refuses when an adapter type is outside the adapters.allowlist row', async () => {
    await setActive('adapters.allowlist', ['mock:bank']);
    try {
      const r = start({ INTERNAL_HOSTS: HOSTS });
      expect(r.status).toBe(1);
      expect(r.stderr).toContain('is not allowed by the safety-locked adapters.allowlist');
    } finally {
      await setActive('adapters.allowlist', configRegistry['adapters.allowlist'].default);
    }
  });

  it('has recorded one event per refusal, each naming what differed, and starts again once the rows are right', async () => {
    const events = await refusals();
    expect(events).toHaveLength(3);
    for (const e of events) expect(e.data.problems.length).toBeGreaterThan(0);
    expect(start({ INTERNAL_HOSTS: HOSTS }).status).toBe(0);
    const chain = await admin.query('SELECT count(*)::int AS n FROM audit.audit_events');
    expect(chain.rows[0].n).toBe(3);
  });
});
