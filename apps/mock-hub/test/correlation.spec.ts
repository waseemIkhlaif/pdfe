import 'reflect-metadata';
import { Writable } from 'node:stream';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PinoNestLogger, createLogger } from '@pdfe/platform-core/logger';
import { AppModule } from '../src/app.module';

// The mock hub joins the correlation of the call that reached it (SC-012).
let app: INestApplication;
const lines: Record<string, unknown>[] = [];
const raw: string[] = [];

beforeAll(async () => {
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = mod.createNestApplication();
  const destination = new Writable({
    write(chunk, _e, cb) {
      raw.push(String(chunk));
      lines.push(JSON.parse(String(chunk)));
      cb();
    },
  });
  app.useLogger(
    new PinoNestLogger(createLogger({ service: 'mock-hub', level: 'debug', destination })),
  );
  await app.init();
});
afterAll(async () => {
  await app.close();
});

describe('mock hub correlation', () => {
  it('keeps a well-formed X-Correlation-Id, returns it, and logs its own line with it', async () => {
    const id = 'COR-from-the-caller-0001';
    const res = await request(app.getHttpServer())
      .get('/mock/bank/ping')
      .set('X-Correlation-Id', id)
      .expect(200);
    expect(res.headers['x-correlation-id']).toBe(id);
    const line = lines.find((l) => l.correlation_id === id);
    expect(line, 'a hub log line with the ID').toBeDefined();
    expect(line).toMatchObject({ service: 'mock-hub' });
    expect(String(line!.msg)).toContain('/mock/bank/ping');
  });

  it.each([
    ['too long', 'COR-' + 'y'.repeat(100)],
    ['invalid characters', 'COR-not valid <script>'],
  ])('replaces an ID that is %s, and never logs or echoes the raw value', async (_n, bad) => {
    const before = raw.length;
    const res = await request(app.getHttpServer())
      .get('/mock/psp/ping')
      .set('X-Correlation-Id', bad)
      .expect(200);
    const id = res.headers['x-correlation-id'] as string;
    expect(id).toMatch(/^COR-/);
    expect(id).not.toBe(bad);
    expect(raw.slice(before).join('')).not.toContain(bad);
    expect(raw.slice(before).join('')).not.toContain('<script>');
    expect(lines.some((l) => l.correlation_id === id)).toBe(true);
  });

  it('creates an ID when the caller sent none, and every line has correlation_id and trace_id', async () => {
    const res = await request(app.getHttpServer()).get('/mock/fx/ping').expect(200);
    expect(res.headers['x-correlation-id']).toMatch(/^COR-/);
    for (const l of lines) {
      expect(l).toHaveProperty('correlation_id');
      expect(l).toHaveProperty('trace_id');
    }
  });

  it('answers an unknown kind with 404 and still sets the header', async () => {
    const res = await request(app.getHttpServer()).get('/mock/card/ping').expect(404);
    expect(res.headers['x-correlation-id']).toMatch(/^COR-/);
  });
});
