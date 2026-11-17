import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockHubControl } from '../src/demo/mock-hub-control';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

// The same scenario, version and seed give the same digest, on any machine (US8, SC-010, FR-035). The committed digest was
// produced once and is compared here, in CI, and by `pnpm scenario` against the running stack.
const DIGEST_FILE = resolve(__dirname, '../../../db/seeds/scenarios/baseline/v1.digest-seed42.txt');
const PLATFORM = '22222222-0000-7000-8000-000000000001';
const ADMIN_A = '11111111-0000-7000-8000-000000000001';

let t: TestApp;
let admin: TestUser;
let n = 0;

const run = async (seed: number) => {
  const res = await request(t.app.getHttpServer())
    .post('/v1/demo/scenarios/baseline/runs')
    .set('Authorization', `Bearer ${await t.token(admin, { otp: true })}`)
    .set('Idempotency-Key', `determinism-key-${(n += 1)}-padding`)
    .send({ version: 'v1', seed });
  expect(res.status).toBe(201);
  expect(res.body.status).toBe('succeeded');
  return res.body as {
    result_digest: string;
    report: { tables: Record<string, { ids: string[] }> };
  };
};

beforeAll(async () => {
  t = await createTestApp({
    overrides: [
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

describe('baseline v1', () => {
  it('seed 42, run twice with a reset in between, gives the same digest', async () => {
    const first = await run(42);
    const second = await run(42);
    expect(first.result_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(second.result_digest).toBe(first.result_digest);
    // The same IDs too, not only the same hash of them.
    expect(second.report.tables).toEqual(first.report.tables);
  });

  it('equals the digest committed in the repository', async () => {
    expect(existsSync(DIGEST_FILE), `${DIGEST_FILE} is missing`).toBe(true);
    const committed = readFileSync(DIGEST_FILE, 'utf8').trim();
    expect(committed).toMatch(/^[0-9a-f]{64}$/);
    expect((await run(42)).result_digest).toBe(committed);
  });

  it('another seed gives another digest, and another seed again is stable', async () => {
    const a = await run(42);
    const b = await run(43);
    expect(b.result_digest).not.toBe(a.result_digest);
    expect((await run(43)).result_digest).toBe(b.result_digest);
    // Fixed identities do not move with the seed; generated ones do.
    expect(b.report.tables['iam.users']!.ids).toEqual(a.report.tables['iam.users']!.ids);
    expect(b.report.tables['platform.organizations']!.ids).not.toEqual(
      a.report.tables['platform.organizations']!.ids,
    );
  });

  it('does not depend on what the audit trail already held', async () => {
    // By now the trail has many runs in it; a run after more history gives the same digest as the first one did.
    const committed = readFileSync(DIGEST_FILE, 'utf8').trim();
    expect((await run(42)).result_digest).toBe(committed);
  });
});
