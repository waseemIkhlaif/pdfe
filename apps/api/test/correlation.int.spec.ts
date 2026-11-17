import { createServer, type Server } from 'node:http';
import { Writable } from 'node:stream';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runWithContext } from '@pdfe/platform-core';
import { PinoNestLogger, createLogger } from '@pdfe/platform-core/logger';
import { createMockAdapter } from '../src/integration/adapters/mock/mock-adapter';
import { ProbeController } from './support/probe.controller';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

// Where the correlation ID goes (SC-012). The queue, worker and mock-hub legs are tested where that code lives
// (apps/worker/test/jobs.int.spec.ts and apps/mock-hub/test/correlation.spec.ts); this covers the API's own: the
// header, the error envelope, the audit event and the logs.
let t: TestApp;
let user: TestUser;
const lines: Record<string, unknown>[] = [];
const raw: string[] = [];

const api = () => request(t.app.getHttpServer());
const withHeader = async (id: string) =>
  api()
    .post('/v1/probe')
    .set('Authorization', `Bearer ${await t.token(user)}`)
    .set('Idempotency-Key', `corr-key-${Math.random().toString(36).slice(2)}-pad`)
    .set('X-Correlation-Id', id)
    .send({ fail: true }); // a 500: it is logged, and the envelope carries the ID

beforeAll(async () => {
  t = await createTestApp({ controllers: [ProbeController] });
  const destination = new Writable({
    write(chunk, _e, cb) {
      raw.push(String(chunk));
      lines.push(JSON.parse(String(chunk)));
      cb();
    },
  });
  t.app.useLogger(
    new PinoNestLogger(createLogger({ service: 'api', level: 'debug', destination })),
  );
  user = await t.createUser('corr-user', await t.createTenant('a'), ['individual']);
});
afterAll(async () => {
  await t?.close();
});

describe('the correlation header', () => {
  it('keeps a well-formed ID and returns it in the header, the error envelope, and the logs', async () => {
    const id = 'COR-test-well-formed-0001';
    const res = await withHeader(id);
    expect(res.status).toBe(500);
    expect(res.headers['x-correlation-id']).toBe(id);
    expect(res.body.error.correlation_id).toBe(id);
    const logged = lines.filter((l) => l.correlation_id === id);
    expect(logged.length).toBeGreaterThan(0);
    expect(logged.every((l) => l.service === 'api')).toBe(true);
  });

  it.each([
    ['too long', 'COR-' + 'x'.repeat(80)],
    ['invalid characters', 'COR-bad id; drop table'],
    ['control characters', 'COR-abc\tdef-0001'],
    ['too short', 'abc'],
  ])('replaces an ID that is %s, and the raw value never reaches the logs', async (_name, bad) => {
    const before = raw.length;
    // supertest refuses a header with control characters; the others reach the server.
    let res: request.Response | undefined;
    try {
      res = await withHeader(bad);
    } catch {
      return; // refused by the client before sending: nothing to log
    }
    const id = res.headers['x-correlation-id'] as string;
    expect(id).toMatch(/^COR-/);
    expect(id).not.toBe(bad);
    expect(res.body.error.correlation_id).toBe(id);
    expect(raw.slice(before).join('')).not.toContain(bad);
    expect(raw.slice(before).join('')).not.toContain('drop table');
  });

  it('creates an ID when there is no header', async () => {
    const res = await withHeader('COR-placeholder-0000');
    const none = await api().get('/v1/health');
    expect(none.headers['x-correlation-id']).toMatch(/^COR-/);
    expect(res.status).toBe(500);
  });
});

describe('the ID reaches the audit event', () => {
  it('records the ID of the request that caused the event', async () => {
    const id = 'COR-audit-trail-0001';
    const target = await t.createUser('corr-target', user.tenantId, ['individual']);
    const ops = await t.createUser('corr-admin', user.tenantId, ['platform_admin']);
    const res = await api()
      .post(`/v1/iam/users/${target.id}/role-grants`)
      .set('Authorization', `Bearer ${await t.token(ops, { otp: true })}`)
      .set('Idempotency-Key', 'corr-audit-key-0001-pad')
      .set('X-Correlation-Id', id)
      .send({ role_code: 'merchant_owner', reason: 'checking the correlation ID' });
    expect(res.status).toBe(201);
    expect(res.headers['x-correlation-id']).toBe(id);
    const rows = (
      await t.admin.query(
        'SELECT action, correlation_id FROM audit.audit_events WHERE correlation_id = $1',
        [id],
      )
    ).rows;
    expect(rows.map((r) => r.action)).toContain('approval.created');
    // The approval request and the outbox event carry it too, for the worker.
    const approval = await t.admin.query(
      'SELECT correlation_id FROM iam.approval_requests WHERE id = $1',
      [res.body.id],
    );
    expect(approval.rows[0].correlation_id).toBe(id);
    const outbox = await t.admin.query(
      "SELECT correlation_id FROM integration.outbox WHERE payload->>'approval_id' = $1",
      [res.body.id],
    );
    expect(outbox.rows[0].correlation_id).toBe(id);
  });
});

describe('redaction in the API logs', () => {
  it('does not log the Authorization header or a display name', async () => {
    const before = raw.length;
    const token = await t.token(user);
    await withHeader('COR-redaction-0001');
    const out = raw.slice(before).join('');
    expect(out).not.toContain(token);
    expect(out).not.toContain('corr-user');
  });
});

describe('the mock adapter call', () => {
  it('sends the ID of the request as X-Correlation-Id to the partner', async () => {
    const seen: (string | undefined)[] = [];
    const server: Server = createServer((req, res) => {
      seen.push(req.headers['x-correlation-id'] as string | undefined);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ kind: 'bank', status: 'ok', type: 'mock:bank' }));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    try {
      const port = (server.address() as { port: number }).port;
      const adapter = createMockAdapter('bank', `http://127.0.0.1:${port}`);
      await runWithContext({ correlationId: 'COR-adapter-call-0001' }, () => adapter.ping());
      await adapter.ping(); // outside any request: no header, no failure
      expect(seen).toEqual(['COR-adapter-call-0001', undefined]);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
