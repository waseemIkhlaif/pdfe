import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';

const KINDS = ['bank', 'psp', 'chain', 'kyc', 'sanctions', 'fx', 'price', 'notification'];

describe('mock hub ping', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it.each(KINDS)('GET /mock/%s/ping returns 200', async (kind) => {
    const res = await request(app.getHttpServer()).get(`/mock/${kind}/ping`).expect(200);
    expect(res.body).toEqual({ kind, status: 'ok', type: `mock:${kind}` });
  });

  it.each(['card', 'swift', 'bank2', '..'])(
    'GET /mock/%s/ping returns 404 for an unknown kind',
    async (kind) => {
      await request(app.getHttpServer()).get(`/mock/${kind}/ping`).expect(404);
    },
  );
});
