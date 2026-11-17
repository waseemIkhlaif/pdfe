import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockHubControl } from '../src/demo/mock-hub-control';
import { DeterminismViolation, runDeterministic } from '../src/demo/determinism-tripwire';
import { ScenarioHooks } from '../src/demo/scenario-runner';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

// The tripwire (T164): inside a run, project code that reads the wall clock or system randomness directly fails the run.
// Outside a run nothing is different, and libraries that read the clock for their own reasons are not caught.
const PLATFORM = '22222222-0000-7000-8000-000000000001';
const ADMIN_A = '11111111-0000-7000-8000-000000000001';

let t: TestApp;
let admin: TestUser;
let bypass: (() => unknown) | null = null;
let n = 0;

const hooks = {
  async afterStep(step: string) {
    if (step === 'users' && bypass) bypass();
  },
};

const run = async () =>
  request(t.app.getHttpServer())
    .post('/v1/demo/scenarios/baseline/runs')
    .set('Authorization', `Bearer ${await t.token(admin, { otp: true })}`)
    .set('Idempotency-Key', `bypass-key-${(n += 1)}-padding`)
    .send({ version: 'v1', seed: 42 });
const users = async (): Promise<number> =>
  (await t.admin.query('SELECT count(*)::int AS n FROM iam.users')).rows[0].n;

beforeAll(async () => {
  t = await createTestApp({
    overrides: [
      { provide: ScenarioHooks, useValue: hooks },
      { provide: MockHubControl, useValue: { configure: async () => 'configured' as const } },
    ],
  });
  await t.createTenant('platform', PLATFORM);
  admin = await t.createUser('Demo Admin A', PLATFORM, ['platform_admin'], {
    id: ADMIN_A,
    sub: ADMIN_A,
  });
});
afterAll(async () => {
  await t?.close();
});

describe('a clean run', () => {
  it('trips nothing: the code path reads only the injected sources', async () => {
    bypass = null;
    const res = await run();
    expect(res.body.status).toBe('succeeded');
    expect(res.body.error_code).toBeNull();
  });
});

describe.each([
  ['Date.now', () => Date.now()],
  ['Math.random', () => Math.random()],
  ['crypto.randomUUID', () => randomUUID()],
])('a direct call to %s during a run', (name, call) => {
  it('fails the run with DETERMINISM_BYPASS and leaves the tables reset', async () => {
    bypass = call;
    try {
      const res = await run();
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('failed');
      expect(res.body.error_code).toBe('DETERMINISM_BYPASS');
      expect(res.body.result_digest).toBeNull();
      expect(await users()).toBe(0);
    } finally {
      bypass = null;
    }
    expect(name).toBeTruthy();
    // Put the caller back (the reset removed everyone) and show that the next clean run works.
    await t.createTenant('platform', PLATFORM).catch(() => undefined);
    admin = await t.createUser('Demo Admin A', PLATFORM, ['platform_admin'], {
      id: ADMIN_A,
      sub: ADMIN_A,
    });
    expect((await run()).body.status).toBe('succeeded');
    admin = { ...admin };
  });
});

describe('outside a run', () => {
  it('the wrapped functions behave as before', () => {
    expect(Date.now()).toBeGreaterThan(1_700_000_000_000);
    const r = Math.random();
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(1);
    expect(randomUUID()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('inside a run, throws a DeterminismViolation naming the call, for project code only', async () => {
    await expect(runDeterministic(async () => Date.now())).rejects.toBeInstanceOf(
      DeterminismViolation,
    );
    await expect(runDeterministic(async () => Math.random())).rejects.toThrow(/Math\.random/);
    // A library reading the clock (Node itself, here through a timer) is not caught.
    await expect(
      runDeterministic(() => new Promise<string>((ok) => setTimeout(() => ok('fine'), 5))),
    ).resolves.toBe('fine');
    // And the injected sources are what code in a run uses: a date made from a given value is no bypass.
    await expect(
      runDeterministic(async () => new Date('2026-01-15T08:00:00Z').getTime()),
    ).resolves.toBe(Date.parse('2026-01-15T08:00:00Z'));
  });
});
