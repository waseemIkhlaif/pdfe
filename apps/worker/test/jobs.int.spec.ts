import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IdGenerator, ScenarioClock, SystemRandom } from '@pdfe/platform-core';
import { AuditRecorder } from '@pdfe/platform-core/audit';
import { createPool, type Pool } from '@pdfe/platform-core/db';
import { runMigrations } from '@pdfe/platform-core/migrate';
import { BaseConsumer, type OutboxMessage } from '@pdfe/platform-core/queue';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { ApprovalsExpiryJob } from '../src/approvals-expiry/expiry.job';
import { ElevationExpiryJob } from '../src/elevation-expiry/expiry.job';
import { OutboxRelay, type EventPublisher } from '../src/outbox-relay/outbox-relay.job';

const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
const T0 = '2026-01-15T08:00:00Z';
const TENANT_A = '00000000-0000-7000-8000-00000000000a';
const TENANT_B = '00000000-0000-7000-8000-00000000000b';
const USER_A = '00000000-0000-7000-8000-0000000000a1';

let pgh: PgHandle;
let urls: DbUrls;
let pool: Pool;
let admin: pg.Client;
let clock: ScenarioClock;
let ids: IdGenerator;
let audit: AuditRecorder;
let n = 0;

const uuid = () =>
  `00000000-0000-7000-8000-${(0x100000 + (n += 1)).toString(16).padStart(12, '0')}`;

async function addEvent(topic = 'approval.requested'): Promise<string> {
  const id = uuid();
  await admin.query(
    `INSERT INTO integration.outbox (id, tenant_id, topic, payload, correlation_id, created_at)
     VALUES ($1,$2,$3,'{}','COR-test0001',$4)`,
    [id, TENANT_A, topic, clock.now().toISOString()],
  );
  return id;
}

class Recorder implements EventPublisher {
  readonly seen: string[] = [];
  constructor(private readonly delayMs = 0) {}
  async publish(m: OutboxMessage): Promise<void> {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    this.seen.push(m.id);
  }
}

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  await admin.query(
    `INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES
       ($1,'a','A','merchant',$3), ($2,'b','B','merchant',$3)`,
    [TENANT_A, TENANT_B, T0],
  );
  await admin.query(
    "INSERT INTO iam.users (id, tenant_id, external_subject, display_name, created_at) VALUES ($1,$2,'s1','U1',$3)",
    [USER_A, TENANT_A, T0],
  );
  pool = createPool(urls.app, 10);
  clock = new ScenarioClock(T0, 1000);
  ids = new IdGenerator(clock, new SystemRandom());
  audit = new AuditRecorder(clock, ids);
});
afterAll(async () => {
  await pool?.end();
  await admin?.end();
  await pgh?.stop();
});

describe('outbox relay', () => {
  it('publishes an event and marks it published', async () => {
    const id = await addEvent();
    const pub = new Recorder();
    const r = await new OutboxRelay(pool, clock, pub).runOnce();
    expect(r).toEqual({ published: 1, failed: 0 });
    expect(pub.seen).toEqual([id]);
    const row = (
      await admin.query('SELECT published_at, attempts FROM integration.outbox WHERE id = $1', [id])
    ).rows[0];
    expect(row.published_at).toBeInstanceOf(Date);
    expect(row.attempts).toBe(1);
    // Nothing is left to publish.
    expect(await new OutboxRelay(pool, clock, pub).runOnce()).toEqual({ published: 0, failed: 0 });
  });

  it('two concurrent relays publish each event once (SKIP LOCKED)', async () => {
    const want = new Set<string>();
    for (let i = 0; i < 40; i++) want.add(await addEvent());
    const pub = new Recorder(5); // slow, so the relays overlap
    const relays = [new OutboxRelay(pool, clock, pub), new OutboxRelay(pool, clock, pub)];
    for (let round = 0; round < 6; round++) {
      await Promise.all(relays.map((rl) => rl.runOnce(10)));
    }
    expect(pub.seen).toHaveLength(40);
    expect(new Set(pub.seen)).toEqual(want);
  });

  it('a failure counts an attempt, keeps the event, and backs off', async () => {
    const id = await addEvent();
    const failing: EventPublisher = {
      publish: async () => {
        throw new Error('queue down');
      },
    };
    const relay = new OutboxRelay(pool, clock, failing, () => undefined);
    expect(await relay.runOnce()).toEqual({ published: 0, failed: 1 });
    const row = () =>
      admin.query('SELECT published_at, attempts FROM integration.outbox WHERE id = $1', [id]);
    expect((await row()).rows[0]).toMatchObject({ published_at: null, attempts: 1 });
    // Too soon: with one failed try the row waits until it is older than 2 seconds.
    expect(await relay.runOnce()).toEqual({ published: 0, failed: 0 });
    clock.advance(3000);
    expect(await relay.runOnce()).toEqual({ published: 0, failed: 1 });
    expect((await row()).rows[0].attempts).toBe(2);
    // Once the queue is back, it goes out.
    clock.advance(10_000);
    const pub = new Recorder();
    expect(await new OutboxRelay(pool, clock, pub).runOnce()).toEqual({ published: 1, failed: 0 });
    expect(pub.seen).toEqual([id]);
  });

  it('raises an alert log line after 10 failed tries', async () => {
    const id = await addEvent();
    await admin.query('UPDATE integration.outbox SET attempts = 9 WHERE id = $1', [id]);
    clock.advance(10 * 60_000);
    const lines: Record<string, unknown>[] = [];
    const failing: EventPublisher = {
      publish: async () => {
        throw new Error('still down');
      },
    };
    await new OutboxRelay(pool, clock, failing, (l) => lines.push(l)).runOnce();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: 'alert', event_id: id, attempts: 10 });
  });
});

describe('queue consumer', () => {
  class Counting extends BaseConsumer {
    handled = 0;
    protected async handle(): Promise<void> {
      this.handled += 1;
    }
  }
  const message = (id: string): OutboxMessage => ({
    id,
    topic: 'approval.approved',
    tenantId: TENANT_A,
    correlationId: 'COR-consumer1',
    payload: {},
  });

  it('processes an event delivered twice only once', async () => {
    const c = new Counting(pool, clock, 'test-consumer');
    const id = uuid();
    expect(await c.consume(message(id))).toBe(true);
    expect(await c.consume(message(id))).toBe(false);
    expect(c.handled).toBe(1);
  });

  it('keeps one inbox per consumer, and rolls the inbox row back if the work fails', async () => {
    const id = uuid();
    const other = new Counting(pool, clock, 'other-consumer');
    expect(await other.consume(message(id))).toBe(true);
    class Failing extends BaseConsumer {
      protected async handle(): Promise<void> {
        throw new Error('work failed');
      }
    }
    const bad = new Failing(pool, clock, 'failing-consumer');
    const mid = uuid();
    await expect(bad.consume(message(mid))).rejects.toThrow('work failed');
    // The failure left no inbox row, so a redelivery is processed.
    const left = await admin.query(
      "SELECT 1 FROM integration.inbox WHERE consumer = 'failing-consumer'",
    );
    expect(left.rowCount).toBe(0);
  });
});

describe('approvals expiry job', () => {
  it('expires overdue pending requests, audits and emits an event, once', async () => {
    const overdue = uuid();
    const fresh = uuid();
    for (const [id, expires] of [
      [overdue, '2026-01-15T09:00:00Z'],
      [fresh, '2099-01-01T00:00:00Z'],
    ] as const) {
      await admin.query(
        `INSERT INTO iam.approval_requests (id, tenant_id, action_type, target_type, payload, payload_hash,
           requested_by, reason, expires_at, created_at, correlation_id)
         VALUES ($1,$2,'iam.role.grant','user','{}',$3,$4,'r',$5,$6,'COR-expiry001')`,
        [id, TENANT_A, 'a'.repeat(64), USER_A, expires, T0],
      );
    }
    clock.advance(24 * 3_600_000);
    const job = new ApprovalsExpiryJob(pool, clock, ids, audit);
    expect(await job.runOnce()).toBe(1);
    const st = await admin.query(
      'SELECT id, status FROM iam.approval_requests WHERE id = ANY($1)',
      [[overdue, fresh]],
    );
    expect(Object.fromEntries(st.rows.map((r) => [r.id, r.status]))).toEqual({
      [overdue]: 'expired',
      [fresh]: 'pending',
    });
    const ev = await admin.query(
      "SELECT * FROM audit.audit_events WHERE action = 'approval.expired'",
    );
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0].approval_request_id).toBe(overdue);
    const ob = await admin.query(
      "SELECT payload FROM integration.outbox WHERE topic = 'approval.expired'",
    );
    expect(ob.rows.map((r) => r.payload.approval_id)).toEqual([overdue]);
    expect(await job.runOnce()).toBe(0);
  });
});

describe('elevation expiry job', () => {
  it('ends overdue elevations with end_reason expired, once', async () => {
    const id = uuid();
    await admin.query(
      `INSERT INTO iam.tenant_elevations (id, user_id, home_tenant_id, target_tenant_id, reason, started_at, expires_at, correlation_id)
       VALUES ($1,$2,$3,$4,'a long enough reason',$5,$6,'COR-elev00001')`,
      [
        id,
        USER_A,
        TENANT_A,
        TENANT_B,
        clock.now().toISOString(),
        new Date(clock.now().getTime() + 30 * 60_000).toISOString(),
      ],
    );
    const job = new ElevationExpiryJob(pool, clock, ids, audit);
    expect(await job.runOnce()).toBe(0); // not due yet
    clock.advance(31 * 60_000);
    expect(await job.runOnce()).toBe(1);
    const row = (
      await admin.query(
        'SELECT ended_at, expires_at, end_reason FROM iam.tenant_elevations WHERE id = $1',
        [id],
      )
    ).rows[0];
    expect(row.end_reason).toBe('expired');
    expect(row.ended_at.getTime()).toBe(row.expires_at.getTime());
    const ev = await admin.query(
      "SELECT * FROM audit.audit_events WHERE action = 'tenant.elevation_ended' AND elevation_id = $1",
      [id],
    );
    expect(ev.rows).toHaveLength(1);
    expect(ev.rows[0].tenant_id).toBe(TENANT_B);
    expect(await job.runOnce()).toBe(0);
  });

  it('the audit chain written by the worker stays linear', async () => {
    const rows = (await admin.query('SELECT prev_hash, hash FROM audit.audit_events ORDER BY seq'))
      .rows;
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < rows.length; i++) expect(rows[i].prev_hash).toBe(rows[i - 1].hash);
  });
});
