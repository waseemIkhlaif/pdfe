import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app';
import { HEALTH_CHECKS, type HealthCheck } from '../src/health/health.checks';

const up: HealthCheck = { name: 'database', check: async () => true };
const down: HealthCheck = { name: 'redis', check: async () => false };

async function boot(checks: HealthCheck[]): Promise<INestApplication> {
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(HEALTH_CHECKS)
    .useValue(checks)
    .compile();
  const app = mod.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

describe('GET /v1/health', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await boot([up]);
  });
  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with mode DEMO and the dependency status', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(res.body.mode).toBe('DEMO');
    expect(res.body.status).toBe('ok');
    expect(res.body.checks).toEqual({ database: 'up' });
    expect(res.body.adapters).toEqual([]);
  });

  it('puts X-PDFE-Mode: DEMO on every response, including errors', async () => {
    const ok = await request(app.getHttpServer()).get('/v1/health');
    expect(ok.headers['x-pdfe-mode']).toBe('DEMO');
    const nf = await request(app.getHttpServer()).get('/v1/nope');
    expect(nf.headers['x-pdfe-mode']).toBe('DEMO');
  });

  it('echoes a valid correlation ID and replaces an invalid one', async () => {
    const good = await request(app.getHttpServer())
      .get('/v1/health')
      .set('X-Correlation-Id', 'my-corr-id-12345');
    expect(good.headers['x-correlation-id']).toBe('my-corr-id-12345');
    const bad = await request(app.getHttpServer())
      .get('/v1/health')
      .set('X-Correlation-Id', 'bad id with spaces');
    expect(bad.headers['x-correlation-id']).toMatch(/^COR-[0-9a-f-]{36}$/);
    expect(bad.headers['x-correlation-id']).not.toContain('bad id');
  });

  it('answers an unknown route with 404 in the error envelope', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message_key).toBe('errors.not_found');
    expect(res.body.error.correlation_id).toBe(res.headers['x-correlation-id']);
  });

  it('GET /v1/meta returns the version', async () => {
    const res = await request(app.getHttpServer()).get('/v1/meta').expect(200);
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(res.body.api).toBe('v1');
  });
});

describe('GET /v1/health with a failing dependency', () => {
  it('returns 503 and names the failing check', async () => {
    const app = await boot([up, down]);
    const res = await request(app.getHttpServer()).get('/v1/health').expect(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks).toEqual({ database: 'up', redis: 'down' });
    await app.close();
  });
});
