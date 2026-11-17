import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UserRateLimitGuard } from '../src/ratelimit/rate-limit.guard';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

// A real Redis container, with small limits: 12 per user and 10 per IP per minute.
let t: TestApp;
let alice: TestUser;
let bob: TestUser;
// The limiter's log lines, captured by swapping the logger on the instance the guard uses.
const logged: string[] = [];

const me = async (u: TestUser) =>
  request(t.app.getHttpServer())
    .get('/v1/me')
    .set('Authorization', `Bearer ${await t.token(u)}`);
const health = () => request(t.app.getHttpServer()).get('/v1/health');

beforeAll(async () => {
  t = await createTestApp({ redis: true, limits: { perUser: 12, perIp: 10 } });
  const limiter = (t.app.get(UserRateLimitGuard) as unknown as { limiter: { log: unknown } })
    .limiter;
  limiter.log = { warn: (m: string) => logged.push(m) };
  const tenant = await t.createTenant('a');
  alice = await t.createUser('alice', tenant, ['individual']);
  bob = await t.createUser('bob', tenant, ['individual']);
});
afterAll(async () => {
  await t?.close();
});

describe('rate limiting', () => {
  it('lets a user make the allowed number of requests, then returns 429 RATE_LIMITED with Retry-After', async () => {
    for (let i = 0; i < 12; i++) expect((await me(alice)).status).toBe(200);
    const res = await me(alice);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.correlation_id).toBe(res.headers['x-correlation-id']);
    const retry = Number(res.headers['retry-after']);
    expect(retry).toBeGreaterThanOrEqual(1);
    expect(retry).toBeLessThanOrEqual(60);
  });

  it('logs the event', () => {
    expect(logged).toHaveLength(1);
    expect(JSON.parse(logged[0]!)).toMatchObject({
      msg: 'rate limited',
      scope: 'user',
      limit: 12,
      path: '/v1/me',
    });
  });

  it('limits per user: another user is unaffected', async () => {
    expect((await me(bob)).status).toBe(200);
  });

  it('applies the per-IP limit to unauthenticated routes', async () => {
    for (let i = 0; i < 10; i++) expect((await health()).status).toBe(200);
    const res = await health();
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('counts a request with no or an invalid token against the IP, not against a user', async () => {
    const res = await request(t.app.getHttpServer()).get('/v1/me');
    expect(res.status).toBe(429); // the IP is already over its limit
  });

  it('does not count authenticated requests against the IP limit', async () => {
    // The IP is over its limit, yet a signed-in user within their own limit still gets through.
    expect((await me(bob)).status).toBe(200);
  });

  it('starts a new window a minute later', async () => {
    t.clock.advance(61_000);
    expect((await me(alice)).status).toBe(200);
    expect((await health()).status).toBe(200);
  });
});
