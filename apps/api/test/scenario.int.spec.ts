import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MockHubControl, type HubSettings } from '../src/demo/mock-hub-control';
import { SCENARIOS_DIR } from '../src/demo/scenario-registry';
import { ScenarioHooks } from '../src/demo/scenario-runner';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

// Scenario runs (US8, T163): reset and seed, the audit epoch, refusals, and the state a failed run leaves behind.
const REAL_SCENARIOS = resolve(__dirname, '../../../db/seeds/scenarios');
const PLATFORM = '22222222-0000-7000-8000-000000000001';
const ADMIN_A = '11111111-0000-7000-8000-000000000001';
const AUDITOR = '11111111-0000-7000-8000-000000000015';
const OPS = '11111111-0000-7000-8000-000000000008';
const DIGEST = /^[0-9a-f]{64}$/;

let t: TestApp;
let dir: string;
let admin: TestUser;
let auditor: TestUser;
let ops: TestUser;
const hubCalls: HubSettings[] = [];
let failAfter: string | null = null;
let n = 0;

const hooks = {
  async afterStep(step: string) {
    if (failAfter === step) throw new Error(`injected failure after ${step}`);
  },
};
const fakeHub = {
  async configure(s: HubSettings) {
    hubCalls.push(s);
    return 'configured' as const;
  },
};

/** The people of the baseline manifest that these tests sign in as. They are re-created identically by every run. */
async function ensureCallers(): Promise<void> {
  await t.admin.query(
    "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ($1,'platform','PDFE Platform (demo)','platform',$2) ON CONFLICT DO NOTHING",
    [PLATFORM, '2026-01-01T00:00:00Z'],
  );
  admin = await upsertUser('Demo Admin A', ADMIN_A, 'platform_admin');
  auditor = await upsertUser('Demo Auditor', AUDITOR, 'auditor');
  ops = await upsertUser('Demo Operations Analyst', OPS, 'ops_analyst');
}
async function upsertUser(name: string, id: string, role: string): Promise<TestUser> {
  const have = await t.admin.query('SELECT 1 FROM iam.users WHERE id = $1', [id]);
  if (have.rowCount) return { id, sub: id, name, tenantId: PLATFORM, roles: [role] };
  return t.createUser(name, PLATFORM, [role], { id, sub: id });
}

const post = async (user: TestUser, path: string, body: object = {}) =>
  request(t.app.getHttpServer())
    .post(path)
    .set('Authorization', `Bearer ${await t.token(user, { otp: true })}`)
    .set('Idempotency-Key', `scenario-key-${(n += 1)}-padding`)
    .send(body);
const get = async (user: TestUser, path: string) =>
  request(t.app.getHttpServer())
    .get(path)
    .set('Authorization', `Bearer ${await t.token(user, { otp: true })}`);
const run = (seed = 42, version = 'v1', user = admin) =>
  post(user, '/v1/demo/scenarios/baseline/runs', { version, seed });
const count = async (table: string): Promise<number> =>
  (await t.admin.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'scenarios-'));
  cpSync(REAL_SCENARIOS, dir, { recursive: true });
  t = await createTestApp({
    overrides: [
      { provide: SCENARIOS_DIR, useValue: dir },
      { provide: ScenarioHooks, useValue: hooks },
      { provide: MockHubControl, useValue: fakeHub },
    ],
  });
  await ensureCallers();
});
afterAll(async () => {
  await t?.close();
});
beforeEach(() => {
  failAfter = null;
  hubCalls.length = 0;
});

describe('catalog', () => {
  it('lists the registered scenarios with the checksum from SHA256SUMS', async () => {
    const res = await get(admin, '/v1/demo/scenarios');
    expect(res.status).toBe(200);
    const sums = readFileSync(join(REAL_SCENARIOS, 'SHA256SUMS'), 'utf8');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ code: 'baseline', version: 'v1' });
    expect(sums).toContain(res.body.items[0].manifest_sha256);
    expect(res.body.items[0].title.ar).toMatch(/[؀-ۿ]/);
  });

  it('is for platform_admin and ops_analyst only', async () => {
    expect((await get(auditor, '/v1/demo/scenarios')).status).toBe(403);
    expect((await get(ops, '/v1/demo/scenarios')).status).toBe(200);
    expect((await run(42, 'v1', auditor)).status).toBe(403);
  });
});

describe('a run', () => {
  it('resets and seeds from the manifest, and says what it created', async () => {
    const res = await run(42);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      scenario_code: 'baseline',
      manifest_version: 'v1',
      seed: 42,
      status: 'succeeded',
      error_code: null,
    });
    expect(res.body.result_digest).toMatch(DIGEST);
    expect(res.body.finished_at).not.toBeNull();

    const tables = res.body.report.tables;
    expect(tables['platform.tenants'].count).toBe(3);
    expect(tables['platform.organizations'].count).toBe(1);
    expect(tables['iam.users'].count).toBe(16);
    expect(tables['iam.user_roles'].count).toBe(16);
    expect(tables['config.config_versions'].count).toBe(11);
    expect(tables['iam.users'].ids).toContain(ADMIN_A);
    expect(tables['platform.tenants'].ids).toHaveLength(3);
    expect(res.body.report.mock_hub).toBe('configured');

    // What the report says is what is in the database.
    expect(await count('iam.users')).toBe(16);
    expect(await count('platform.tenants')).toBe(3);
    expect(await count('config.config_versions')).toBe(11);
    expect(
      (
        await t.admin.query(
          "SELECT count(*)::int AS n FROM config.config_versions WHERE status = 'active' AND created_by = 'system:scenario'",
        )
      ).rows[0].n,
    ).toBe(11);
    // The manifest's settings are the active versions.
    const limit = await t.admin.query(
      "SELECT value FROM config.config_versions WHERE key = 'limits.transfer_max_minor'",
    );
    expect(limit.rows[0].value).toBe(500000);
  });

  it('configures the mock hub with the manifest settings and the seed', async () => {
    await run(7);
    expect(hubCalls).toHaveLength(1);
    expect(hubCalls[0]!.seed).toBe(7);
    expect(hubCalls[0]!.entries.map((e) => e.kind)).toEqual(['bank', 'fx']);
  });

  it('can be read back, and is in the history after the next run', async () => {
    const first = await run(1);
    const again = await get(admin, `/v1/demo/runs/${first.body.id}`);
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
    await run(2);
    expect(await count('demo.scenario_runs')).toBeGreaterThanOrEqual(2); // the history is not reset
    expect((await get(admin, '/v1/demo/runs/00000000-0000-7000-8000-000000000000')).status).toBe(
      404,
    );
    expect((await get(admin, '/v1/demo/runs/not-an-id')).status).toBe(404);
  });

  it('refuses a bad request without touching the data', async () => {
    await run(5);
    const before = await count('iam.users');
    expect((await post(admin, '/v1/demo/scenarios/baseline/runs', { version: 'v1' })).status).toBe(
      422,
    );
    expect(
      (await post(admin, '/v1/demo/scenarios/baseline/runs', { version: 'one', seed: 1 })).status,
    ).toBe(422);
    expect(
      (await post(admin, '/v1/demo/scenarios/baseline/runs', { version: 'v1', seed: 1.5 })).status,
    ).toBe(422);
    expect(
      (await post(admin, '/v1/demo/scenarios/nothing/runs', { version: 'v1', seed: 1 })).status,
    ).toBe(404);
    expect(
      (await post(admin, '/v1/demo/scenarios/baseline/runs', { version: 'v9', seed: 1 })).status,
    ).toBe(404);
    expect(await count('iam.users')).toBe(before);
  });
});

describe('audit', () => {
  it('records scenario.run_started and scenario.run_finished with the digest, and an epoch_start anchor', async () => {
    const res = await run(42);
    const rows = (
      await t.admin.query(
        `SELECT action, data, actor_role FROM audit.audit_events
          WHERE action IN ('scenario.run_started','scenario.run_finished') ORDER BY seq DESC LIMIT 2`,
      )
    ).rows;
    const finished = rows.find((r) => r.action === 'scenario.run_finished')!;
    const started = rows.find((r) => r.action === 'scenario.run_started')!;
    expect(started.actor_role).toBe('system:scenario');
    expect(started.data).toMatchObject({ seed: 42 });
    expect(finished.data).toMatchObject({ seed: 42, digest: res.body.result_digest });

    const anchor = await t.admin.query(
      "SELECT id, up_to_seq, epoch_label FROM audit.anchors WHERE kind = 'epoch_start' ORDER BY created_at DESC, up_to_seq DESC LIMIT 1",
    );
    expect(anchor.rows[0].epoch_label).toBe('baseline-v1-seed42');
    expect(anchor.rows[0].id).toBe(res.body.report.epoch_anchor.id);
  });

  it('verifies from the epoch anchor: the run is one intact stretch of the chain', async () => {
    const res = await run(42);
    const from = res.body.report.epoch_anchor.up_to_seq + 1;
    const verify = await post(auditor, '/v1/audit/verify', { from_seq: from });
    expect(verify.status).toBe(200);
    expect(verify.body.result).toBe('ok');
    expect(verify.body.from_seq).toBe(from);
    expect(verify.body.events).toBeGreaterThan(40); // tenants, users, grants, settings
    const all = await post(auditor, '/v1/audit/verify');
    expect(all.body.result).toBe('ok');
  });

  it('writes the same actions for every entity it creates', async () => {
    const res = await run(42);
    const rows = (
      await t.admin.query(
        'SELECT action, count(*)::int AS n FROM audit.audit_events WHERE correlation_id = $1 AND seq > $2 GROUP BY action',
        [await correlationOf(), res.body.report.epoch_anchor.up_to_seq],
      )
    ).rows;
    const by = Object.fromEntries(rows.map((r) => [r.action, r.n]));
    expect(by).toMatchObject({
      'scenario.run_started': 1,
      'scenario.run_finished': 1,
      'tenant.created': 3,
      'organization.created': 1,
      'user.created': 16,
      'iam.role.granted': 16,
      'config.activated': 11,
    });
  });
});
async function correlationOf(): Promise<string> {
  // The run's own correlation ID is in its events; the history row holds the caller's request ID.
  const r = await t.admin.query(
    `SELECT correlation_id FROM audit.audit_events WHERE action = 'scenario.run_finished'
      ORDER BY seq DESC LIMIT 1`,
  );
  return r.rows[0].correlation_id;
}

describe('refusals', () => {
  it('refuses a manifest that no longer matches its checksum (409 MANIFEST_CHECKSUM_MISMATCH)', async () => {
    const file = join(dir, 'baseline/v1.yaml');
    const original = readFileSync(file);
    try {
      writeFileSync(file, Buffer.concat([original, Buffer.from('# edited\n')]));
      const before = await count('iam.users');
      const res = await run(42);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MANIFEST_CHECKSUM_MISMATCH');
      expect(await count('iam.users')).toBe(before); // nothing was reset
    } finally {
      writeFileSync(file, original);
    }
    expect((await run(42)).status).toBe(201);
  });

  it('refuses a second run while one is in progress (409 RUN_IN_PROGRESS)', async () => {
    let release!: () => void;
    let reached!: () => void;
    const reachedP = new Promise<void>((r) => (reached = r));
    const blocker = new Promise<void>((r) => (release = r));
    const savedAfter = hooks.afterStep;
    hooks.afterStep = async (step: string) => {
      if (step === 'started') {
        reached();
        await blocker;
      }
    };
    try {
      const first = run(42);
      await reachedP;
      const second = await run(43);
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('RUN_IN_PROGRESS');
      release();
      expect((await first).status).toBe(201);
    } finally {
      release();
      hooks.afterStep = savedAfter;
    }
    // The database says the same, whatever the application does.
    await expect(
      t.admin.query(
        `INSERT INTO demo.scenario_runs (id, scenario_code, seed, manifest_version, started_at, status, requested_by, correlation_id)
         VALUES ('00000000-0000-7000-8000-0000000000f1','baseline',1,'v1',now(),'running','x','COR-x'),
                ('00000000-0000-7000-8000-0000000000f2','baseline',2,'v1',now(),'running','x','COR-y')`,
      ),
    ).rejects.toThrow(/scenario_runs_one_running_idx/);
  });

  it('refuses to run outside DEMO mode', async () => {
    const mode = process.env.APP_MODE;
    process.env.APP_MODE = 'LIVE';
    try {
      const before = await count('iam.users');
      const res = await run(42);
      expect(res.status).toBe(403);
      expect(await count('iam.users')).toBe(before);
    } finally {
      if (mode === undefined) delete process.env.APP_MODE;
      else process.env.APP_MODE = mode;
    }
  });
});

describe('a run that fails', () => {
  it('after the users were created leaves the tables in the reset state, and the run failed with a code', async () => {
    await run(42); // something to reset
    hubCalls.length = 0;
    failAfter = 'users';
    const res = await run(42);
    expect(res.status).toBe(201); // the run itself is the answer: failed, with its code
    expect(res.body).toMatchObject({
      status: 'failed',
      error_code: 'RUN_FAILED',
      result_digest: null,
    });
    expect(res.body.report).toBeNull();

    // Reset, and none of the seeding survived.
    for (const table of [
      'iam.users',
      'iam.user_roles',
      'platform.tenants',
      'platform.organizations',
      'config.config_versions',
      'integration.outbox',
    ]) {
      expect(await count(table), table).toBe(0);
    }
    // The failed transaction's audit events and anchor were rolled back with it, and the mock hub was not touched.
    expect(hubCalls).toHaveLength(0);
    const rows = await t.admin.query(
      'SELECT run.status, run.error_code FROM demo.scenario_runs run WHERE run.id = $1',
      [res.body.id],
    );
    expect(rows.rows[0]).toEqual({ status: 'failed', error_code: 'RUN_FAILED' });
  });

  it('does not stop the next run from working', async () => {
    await ensureCallers();
    const res = await run(42);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('succeeded');
    expect(await count('iam.users')).toBe(16);
    await ensureCallers();
  });
});
