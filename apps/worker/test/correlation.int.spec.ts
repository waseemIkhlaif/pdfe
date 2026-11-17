import { resolve } from 'node:path';
import { Writable } from 'node:stream';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ScenarioClock, getContext, runWithContext } from '@pdfe/platform-core';
import { createPool, type Pool } from '@pdfe/platform-core/db';
import { createLogger } from '@pdfe/platform-core/logger';
import { runMigrations } from '@pdfe/platform-core/migrate';
import { BaseConsumer, withCorrelation, type OutboxMessage } from '@pdfe/platform-core/queue';
import {
  createDbRoles,
  startPostgres,
  startRedis,
  type DbUrls,
  type PgHandle,
  type RedisHandle,
} from '@pdfe/test-kit';
import { ApprovalNotificationConsumer } from '../src/notifications/approval-notification.consumer';
import { BullPublisher } from '../src/outbox-relay/bull.publisher';
import { OutboxRelay } from '../src/outbox-relay/outbox-relay.job';

// An action's correlation ID travels with its event: outbox row -> relay -> BullMQ job data -> consumer -> the worker's log
// lines (SC-012). The API and mock-hub legs are tested in their own packages.
const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
const T0 = '2026-01-15T08:00:00Z';
const TENANT = '00000000-0000-7000-8000-00000000000a';

let pgh: PgHandle;
let redisHandle: RedisHandle;
let urls: DbUrls;
let pool: Pool;
let admin: pg.Client;
let redis: Redis;
let clock: ScenarioClock;
const lines: Record<string, unknown>[] = [];
const raw: string[] = [];
const logger = () =>
  createLogger({
    service: 'worker',
    level: 'debug',
    destination: new Writable({
      write(chunk, _e, cb) {
        raw.push(String(chunk));
        lines.push(JSON.parse(String(chunk)));
        cb();
      },
    }),
  });

beforeAll(async () => {
  pgh = await startPostgres();
  redisHandle = await startRedis();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  await admin.query(
    "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ($1,'a','A','merchant',$2)",
    [TENANT, T0],
  );
  pool = createPool(urls.app, 4);
  redis = new Redis(redisHandle.url, { maxRetriesPerRequest: null });
  clock = new ScenarioClock(T0, 1000);
});
afterAll(async () => {
  redis?.disconnect();
  await pool?.end();
  await admin?.end();
  await pgh?.stop();
  await redisHandle?.stop();
});

describe('withCorrelation', () => {
  it('puts the ID of the current context on job data, an explicit ID wins, and none is "none"', () => {
    expect(withCorrelation({ a: 1 })).toEqual({ a: 1, correlation_id: 'none' });
    runWithContext({ correlationId: 'COR-ctx-0001' }, () => {
      expect(withCorrelation({ a: 1 }).correlation_id).toBe('COR-ctx-0001');
      expect(withCorrelation({ a: 1 }, 'COR-explicit-0001').correlation_id).toBe(
        'COR-explicit-0001',
      );
    });
  });
});

describe('BaseConsumer', () => {
  it('runs the work in the correlation context of the event', async () => {
    let seen: string | undefined;
    class Probe extends BaseConsumer {
      protected async handle(): Promise<void> {
        seen = getContext()?.correlationId;
      }
    }
    const message: OutboxMessage = {
      id: '00000000-0000-7000-8000-0000000000c1',
      topic: 'x.y',
      tenantId: TENANT,
      correlationId: 'COR-consumer-ctx-0001',
      payload: {},
    };
    await new Probe(pool, clock, 'probe').consume(message);
    expect(seen).toBe('COR-consumer-ctx-0001');
  });
});

describe('the whole way through the worker', () => {
  it('an outbox event becomes a BullMQ job carrying the ID, and the consumer logs it', async () => {
    const id = 'COR-worker-flow-0001';
    const eventId = '00000000-0000-7000-8000-0000000000d1';
    await admin.query(
      `INSERT INTO integration.outbox (id, tenant_id, topic, payload, correlation_id, created_at)
       VALUES ($1,$2,'approval.requested',$3,$4,$5)`,
      [
        eventId,
        TENANT,
        JSON.stringify({ approval_id: 'approval-9', action_type: 'iam.role.grant' }),
        id,
        T0,
      ],
    );

    // 1. The relay publishes it to the queue.
    const publisher = new BullPublisher(redis);
    const result = await new OutboxRelay(pool, clock, publisher).runOnce();
    expect(result.published).toBeGreaterThanOrEqual(1);
    const queue = new Queue('pdfe-approval', { connection: redis });
    const job = await queue.getJob(eventId);
    expect(job, 'the job was created with the outbox ID as its ID').toBeDefined();
    expect(job!.data.correlation_id).toBe(id);
    expect(job!.data.correlationId).toBe(id);

    // 2. A worker processes it with the notification consumer; what it logs carries the ID.
    const log = logger();
    const consumer = new ApprovalNotificationConsumer(pool, clock, (line) => log.info(line));
    const done = new Promise<void>((resolveDone, reject) => {
      const worker = new Worker(
        'pdfe-approval',
        async (j) => {
          await consumer.consume(j.data);
        },
        { connection: redis },
      );
      worker.on('completed', () => void worker.close().then(resolveDone));
      worker.on('failed', (_j, err) => void worker.close().then(() => reject(err)));
    });
    await done;

    const line = lines.find((l) => l.correlation_id === id);
    expect(line, 'a worker log line with the ID').toBeDefined();
    expect(line).toMatchObject({ service: 'worker', level: 'info' });
    expect(String(line!.msg)).toContain('notification (log only)');
    expect(String(line!.msg)).toContain('SIMULATION'); // labelled like every message
    await publisher.close();
    await queue.close();
  });

  it('does not log credentials or personal data that a payload happens to hold', async () => {
    const log = logger();
    const before = raw.length;
    const consumer = new ApprovalNotificationConsumer(pool, clock, (line) => log.info(line));
    await consumer.consume({
      id: '00000000-0000-7000-8000-0000000000d2',
      topic: 'approval.requested',
      tenantId: TENANT,
      correlationId: 'COR-redact-0002',
      payload: {
        approval_id: '123456789012',
        action_type: 'iam.role.grant',
        password: 'hunter2',
        display_name: 'Someone',
      },
    });
    const out = raw.slice(before).join('');
    expect(out).not.toContain('123456789012'); // a document-number-like value
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('Someone');
  });
});
