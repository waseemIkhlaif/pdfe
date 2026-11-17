import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

// A scenario run sets how the mocks behave (T165): latency, seeded failures, scripted outcomes. Internal token only.
const TOKEN = 'scenario-token-for-this-test';
let app: INestApplication;
const hub = () => request(app.getHttpServer());
const control = (body: object, token: string | null = TOKEN) => {
  const r = hub().post('/mock/_control');
  return (token ? r.set('X-Scenario-Token', token) : r).send(body);
};
const outcomes = async (kind: string, n: number): Promise<number[]> => {
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) out.push((await hub().get(`/mock/${kind}/ping`)).status);
  return out;
};

beforeAll(async () => {
  process.env.SCENARIO_TOKEN = TOKEN;
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication();
  await app.init();
});
afterAll(async () => {
  delete process.env.SCENARIO_TOKEN;
  await app.close();
});
beforeEach(async () => {
  await control({ seed: 1, entries: [] }); // every kind back to its defaults
});

describe('who may call the control endpoint', () => {
  it('refuses a call with no token, a wrong token, or a token of another length', async () => {
    for (const token of [null, 'wrong', `${TOKEN}x`, TOKEN.slice(1)]) {
      expect((await control({ seed: 1, entries: [] }, token)).status).toBe(403);
    }
    expect((await hub().get('/mock/_control')).status).toBe(403);
  });

  it('refuses every call when no token is configured, even an empty one', async () => {
    delete process.env.SCENARIO_TOKEN;
    try {
      expect((await control({ seed: 1, entries: [] }, '')).status).toBe(403);
      expect((await control({ seed: 1, entries: [] }, 'undefined')).status).toBe(403);
    } finally {
      process.env.SCENARIO_TOKEN = TOKEN;
    }
  });

  it('rejects a body that is not a valid configuration, and keeps what was set before', async () => {
    await control({ seed: 1, entries: [{ kind: 'bank', latency_ms: 0, failure_rate: 1 }] });
    for (const bad of [
      { seed: 1, entries: [{ kind: 'nope', latency_ms: 0, failure_rate: 0 }] },
      { seed: 1, entries: [{ kind: 'bank', latency_ms: -1, failure_rate: 0 }] },
      { seed: 1, entries: [{ kind: 'bank', latency_ms: 0, failure_rate: 2 }] },
      { entries: [] },
    ]) {
      expect((await control(bad)).status).toBe(422);
    }
    expect((await hub().get('/mock/bank/ping')).status).toBe(503);
  });
});

describe('ping follows the configured behaviour', () => {
  it('answers ok by default', async () => {
    expect(await outcomes('bank', 3)).toEqual([200, 200, 200]);
  });

  it('waits for the latency', async () => {
    const set = await control({
      seed: 1,
      entries: [{ kind: 'fx', latency_ms: 120, failure_rate: 0 }],
    });
    expect(set.body).toEqual({ configured: ['fx'] });
    const t0 = performance.now();
    expect((await hub().get('/mock/fx/ping')).status).toBe(200);
    expect(performance.now() - t0).toBeGreaterThanOrEqual(100);
    const other = performance.now();
    await hub().get('/mock/bank/ping'); // another kind is not slowed
    expect(performance.now() - other).toBeLessThan(100);
  });

  it('fails every call at rate 1 and none at rate 0, with a 503 and the usual body', async () => {
    await control({ seed: 1, entries: [{ kind: 'psp', latency_ms: 0, failure_rate: 1 }] });
    const res = await hub().get('/mock/psp/ping');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ kind: 'psp', status: 'error', type: 'mock:psp' });
    await control({ seed: 1, entries: [{ kind: 'psp', latency_ms: 0, failure_rate: 0 }] });
    expect(await outcomes('psp', 5)).toEqual([200, 200, 200, 200, 200]);
  });

  it('fails the same calls for the same seed, and others for another seed', async () => {
    const run = async (seed: number) => {
      await control({ seed, entries: [{ kind: 'kyc', latency_ms: 0, failure_rate: 0.5 }] });
      return outcomes('kyc', 24);
    };
    const a = await run(42);
    expect(await run(42)).toEqual(a);
    expect(await run(43)).not.toEqual(a);
    expect(new Set(a)).toEqual(new Set([200, 503])); // a rate of one half does both
  });

  it('plays a script first, one outcome per call, then follows the rate', async () => {
    await control({
      seed: 1,
      entries: [{ kind: 'chain', latency_ms: 0, failure_rate: 0, script: ['fail', 'ok', 'fail'] }],
    });
    expect(await outcomes('chain', 5)).toEqual([503, 200, 503, 200, 200]);
  });

  it('is replaced as a whole by the next configuration', async () => {
    await control({ seed: 1, entries: [{ kind: 'bank', latency_ms: 0, failure_rate: 1 }] });
    await control({ seed: 1, entries: [{ kind: 'fx', latency_ms: 0, failure_rate: 1 }] });
    expect((await hub().get('/mock/bank/ping')).status).toBe(200);
    expect((await hub().get('/mock/fx/ping')).status).toBe(503);
  });

  it('can be read back with the token', async () => {
    await control({
      seed: 1,
      entries: [{ kind: 'bank', latency_ms: 7, failure_rate: 0.25, script: ['ok'] }],
    });
    const res = await hub().get('/mock/_control').set('X-Scenario-Token', TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.bank).toEqual({ latency_ms: 7, failure_rate: 0.25, script: ['ok'] });
    expect(res.body.fx).toEqual({ latency_ms: 0, failure_rate: 0, script: [] });
  });
});
