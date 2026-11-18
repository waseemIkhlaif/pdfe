import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWorld, type World } from './support/world';

// The directory the console shows (ADM-008) and the tenant name on /v1/me (the tenant badge, T193).
let w: World;

beforeAll(async () => {
  w = await createWorld();
  await w.t.createTenant('second', '00000000-0000-7000-8200-0000000000aa');
});
afterAll(async () => {
  await w?.t.close();
});

describe('GET /v1/tenants', () => {
  it('lists every tenant, with no personal data, for someone who may read the directory', async () => {
    const res = await w.as(w.admin1).get('/v1/tenants');
    expect(res.status).toBe(200);
    expect(res.body.items.map((t: { code: string }) => t.code)).toEqual(['a', 'second']);
    expect(Object.keys(res.body.items[0]).sort()).toEqual([
      'code',
      'created_at',
      'id',
      'kind',
      'name',
      'status',
    ]);
  });

  it('is refused to a role that cannot read the directory', async () => {
    expect((await w.as(w.alice).get('/v1/tenants')).status).toBe(403);
  });
});

describe('GET /v1/me', () => {
  it('names the tenant of the caller, for the tenant badge', async () => {
    const res = await w.as(w.admin1).get('/v1/me');
    expect(res.status).toBe(200);
    expect(res.body.tenant).toEqual({ id: w.tenant, code: 'a', name: 'a' });
    expect(res.body.tenant_id).toBe(w.tenant);
  });
});
