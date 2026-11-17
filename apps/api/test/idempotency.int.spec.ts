import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ProbeController } from './support/probe.controller';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

let t: TestApp;
let user: TestUser;
let other: TestUser;

const post = async (u: TestUser, key: string | undefined, body: object) => {
  const r = request(t.app.getHttpServer())
    .post('/v1/probe')
    .set('Authorization', `Bearer ${await t.token(u)}`);
  if (key !== undefined) r.set('Idempotency-Key', key);
  return r.send(body);
};

beforeAll(async () => {
  t = await createTestApp({ controllers: [ProbeController] });
  const a = await t.createTenant('a');
  const b = await t.createTenant('b');
  user = await t.createUser('user', a, ['individual']);
  other = await t.createUser('other', b, ['individual']);
});
afterAll(async () => {
  await t?.close();
});

describe('idempotency', () => {
  it('a POST without Idempotency-Key gets 400 IDEMPOTENCY_KEY_REQUIRED', async () => {
    const res = await post(user, undefined, {});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    expect((await post(user, 'short', {})).status).toBe(400);
  });

  it('the same key and body replay the original status and body without running again', async () => {
    const first = await post(user, 'replay-key-0001', { a: 1 });
    expect(first.status).toBe(201);
    const calls = ProbeController.calls;
    const second = await post(user, 'replay-key-0001', { a: 1 });
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(ProbeController.calls).toBe(calls);
  });

  it('key order in the body does not matter', async () => {
    const first = await post(user, 'order-key-00001', { a: 1, b: 2 });
    const second = await post(user, 'order-key-00001', { b: 2, a: 1 });
    expect(second.body).toEqual(first.body);
  });

  it('the same key with a different body gets 422 IDEMPOTENCY_KEY_REUSED', async () => {
    await post(user, 'reuse-key-00001', { a: 1 });
    const res = await post(user, 'reuse-key-00001', { a: 2 });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('a concurrent duplicate gets 409 IDEMPOTENCY_IN_PROGRESS', async () => {
    const slow = post(user, 'concurrent-key-01', { delay_ms: 600 });
    await new Promise((r) => setTimeout(r, 200));
    const dup = await post(user, 'concurrent-key-01', { delay_ms: 600 });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('IDEMPOTENCY_IN_PROGRESS');
    expect((await slow).status).toBe(201);
  });

  it('a failed run releases the key, so the client can retry', async () => {
    const failed = await post(user, 'retry-key-000001', { fail: true });
    expect(failed.status).toBe(500);
    const calls = ProbeController.calls;
    const retry = await post(user, 'retry-key-000001', { fail: true });
    expect(retry.status).toBe(500);
    expect(ProbeController.calls).toBe(calls + 1);
  });

  it('keys are per tenant', async () => {
    const a = await post(user, 'tenant-key-00001', { a: 1 });
    const b = await post(other, 'tenant-key-00001', { a: 1 });
    expect(b.status).toBe(201);
    expect(b.body.n).not.toBe(a.body.n);
  });

  it('after the TTL, the key can be reused', async () => {
    const first = await post(user, 'ttl-key-0000001', { a: 1 });
    t.clock.advance(25 * 3_600_000); // default TTL is 24 hours
    const second = await post(user, 'ttl-key-0000001', { a: 2 });
    expect(second.status).toBe(201);
    expect(second.body.n).toBe(first.body.n + 1);
  });

  it('GET requests need no key', async () => {
    const res = await request(t.app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', `Bearer ${await t.token(user)}`);
    expect(res.status).toBe(200);
  });
});
