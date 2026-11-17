import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IdGenerator, ScenarioClock, SystemRandom } from '@pdfe/platform-core';
import { AuditRecorder } from '@pdfe/platform-core/audit';
import { createPool, type Pool } from '@pdfe/platform-core/db';
import { runMigrations, seedReferenceData } from '@pdfe/platform-core/migrate';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { ConfigActivationJob } from '../src/config-activation/activation.job';

// The scheduled half of safe, reversible configuration (US7): an approved version with a later effective time becomes
// active when the injected clock reaches it, and nothing happens before that.
const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
const T0 = '2026-01-15T08:00:00Z';
const TENANT = '00000000-0000-7000-8000-00000000000a';
const HOUR = 3_600_000;

let pgh: PgHandle;
let urls: DbUrls;
let pool: Pool;
let admin: pg.Client;
let clock: ScenarioClock;
let job: ConfigActivationJob;
let n = 0;

const uuid = () =>
  `00000000-0000-7000-8000-${(0x200000 + (n += 1)).toString(16).padStart(12, '0')}`;
const at = (hours: number) => new Date(new Date(T0).getTime() + hours * HOUR).toISOString();

async function addVersion(
  key: string,
  version: number,
  value: unknown,
  status: string,
  effective: string,
  rollbackOf: number | null = null,
): Promise<string> {
  const id = uuid();
  await admin.query(
    `INSERT INTO config.config_versions
       (id, key, version, value, effective_from, status, rollback_of_version, reason, tenant_id, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'test',$8,'tester',$9)`,
    [id, key, version, JSON.stringify(value), effective, status, rollbackOf, TENANT, T0],
  );
  return id;
}
const statusOf = async (key: string): Promise<Record<number, string>> =>
  Object.fromEntries(
    (
      await admin.query<{ version: number; status: string }>(
        'SELECT version, status FROM config.config_versions WHERE key = $1',
        [key],
      )
    ).rows.map((r) => [r.version, r.status]),
  );

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  await seedReferenceData(urls.admin);
  admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  await admin.query(
    "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ($1,'a','A','merchant',$2)",
    [TENANT, T0],
  );
  pool = createPool(urls.app, 4);
  clock = new ScenarioClock(T0, 1000);
  const ids = new IdGenerator(clock, new SystemRandom());
  job = new ConfigActivationJob(pool, clock, ids, new AuditRecorder(clock, ids));
});
afterAll(async () => {
  await pool?.end();
  await admin?.end();
  await pgh?.stop();
});

describe('the defaults the migrations leave behind', () => {
  it('gives every setting an active version 1 by system:bootstrap', async () => {
    const r = await admin.query(
      "SELECT count(*)::int AS n, count(*) FILTER (WHERE created_by = 'system:bootstrap' AND version = 1 AND status = 'active')::int AS ok FROM config.config_versions",
    );
    expect(r.rows[0].n).toBeGreaterThanOrEqual(10);
    expect(r.rows[0].ok).toBe(r.rows[0].n);
  });

  it('is repeatable: seeding again adds nothing and keeps later versions', async () => {
    const before = (await admin.query('SELECT count(*)::int AS n FROM config.config_versions'))
      .rows[0].n;
    const res = await seedReferenceData(urls.admin);
    expect(res.configBootstrapped).toBe(0);
    expect(
      (await admin.query('SELECT count(*)::int AS n FROM config.config_versions')).rows[0].n,
    ).toBe(before);
  });
});

describe('scheduled activation', () => {
  it('does nothing before the effective time', async () => {
    await addVersion('fees.default_minor', 2, 25, 'scheduled', at(2));
    expect(await job.runOnce()).toBe(0);
    expect(await statusOf('fees.default_minor')).toEqual({ 1: 'active', 2: 'scheduled' });
  });

  it('activates a due version: the previous one is superseded, and it is audited and announced', async () => {
    clock.advance(3 * HOUR);
    expect(await job.runOnce()).toBe(1);
    expect(await statusOf('fees.default_minor')).toEqual({ 1: 'superseded', 2: 'active' });
    const audit = await admin.query(
      "SELECT actor_role, target_id, data FROM audit.audit_events WHERE action = 'config.activated' AND target_id = 'fees.default_minor'",
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0].actor_role).toBe('system:worker');
    expect(audit.rows[0].data).toMatchObject({
      key: 'fees.default_minor',
      version: 2,
      previous_version: 1,
    });
    const out = await admin.query(
      "SELECT payload FROM integration.outbox WHERE topic = 'config.activated' AND payload->>'key' = 'fees.default_minor'",
    );
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].payload).toMatchObject({ key: 'fees.default_minor', version: 2 });
  });

  it('is idempotent: running again activates nothing more', async () => {
    expect(await job.runOnce()).toBe(0);
    const n = await admin.query(
      "SELECT count(*)::int AS n FROM audit.audit_events WHERE action = 'config.activated'",
    );
    expect(n.rows[0].n).toBe(1);
  });

  it('activates several due versions of one setting in order, and marks waiting proposals stale', async () => {
    const key = 'fx.spread_bps';
    await addVersion(key, 2, 5, 'scheduled', at(4));
    await addVersion(key, 3, 8, 'scheduled', at(5));
    await addVersion(key, 4, 9, 'pending_approval', at(5));
    clock.advance(3 * HOUR); // now T0 + 6h
    expect(await job.runOnce()).toBe(2);
    expect(await statusOf(key)).toEqual({
      1: 'superseded',
      2: 'superseded',
      3: 'active',
      4: 'stale',
    });
  });

  it('records a rollback as config.rolled_back', async () => {
    const key = 'idempotency.ttl_hours';
    await addVersion(key, 2, 24, 'scheduled', at(6), 1);
    expect(await job.runOnce()).toBe(1);
    const r = await admin.query(
      "SELECT data FROM audit.audit_events WHERE action = 'config.rolled_back' AND target_id = $1",
      [key],
    );
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].data).toMatchObject({ rollback_of_version: 1 });
  });
});

describe('the database keeps one active version per setting', () => {
  it('refuses a second active version, and a repeated version number', async () => {
    await expect(
      admin.query(
        `INSERT INTO config.config_versions (id, key, version, value, effective_from, status, created_by, created_at)
         VALUES ($1,'api.rate_limit',2,'{"per_user_per_minute":10,"per_ip_per_minute":10}',$2,'active','t',$2)`,
        [uuid(), T0],
      ),
    ).rejects.toThrow(/config_versions_one_active_idx/);
    await expect(
      admin.query(
        `INSERT INTO config.config_versions (id, key, version, value, effective_from, status, created_by, created_at)
         VALUES ($1,'api.rate_limit',1,'{}',$2,'superseded','t',$2)`,
        [uuid(), T0],
      ),
    ).rejects.toThrow(/config_versions_key_version_key/);
  });
});
