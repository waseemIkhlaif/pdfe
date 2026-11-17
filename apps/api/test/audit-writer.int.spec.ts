import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { IdGenerator, ScenarioClock, SystemRandom } from '@pdfe/platform-core';
import { createPool, withTx, type Pool } from '@pdfe/platform-core/db';
import { runMigrations } from '@pdfe/platform-core/migrate';
import { AuditWriter } from '../src/audit/audit.writer';
import { GENESIS_HASH, chainHash, type AuditHashRow } from '../src/audit/audit.chain';

const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
let pgh: PgHandle;
let urls: DbUrls;
let pool: Pool;
let writer: AuditWriter;

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  pool = createPool(urls.app, 4);
  const clock = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
  writer = new AuditWriter(clock, new IdGenerator(clock, new SystemRandom()));
});
afterAll(async () => {
  await pool?.end();
  await pgh?.stop();
});

describe('AuditWriter', () => {
  it('links each event to the previous hash, starting at the genesis hash', async () => {
    const a = await withTx(pool, {}, (tx) =>
      writer.record(tx, { action: 'x.one', correlationId: 'COR-1' }),
    );
    const b = await withTx(pool, {}, (tx) =>
      writer.record(tx, { action: 'x.two', correlationId: 'COR-2', data: { k: 1 } }),
    );
    const rows = await pool.query('SELECT * FROM audit.audit_events ORDER BY seq');
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows[0].prev_hash).toBe(GENESIS_HASH);
    expect(rows.rows[1].prev_hash).toBe(a.hash);
    expect(b.seq).toBeGreaterThan(a.seq);
    for (const r of rows.rows) {
      const hashRow: AuditHashRow = {
        id: r.id,
        tenant_id: r.tenant_id,
        actor_id: r.actor_id,
        actor_role: r.actor_role,
        action: r.action,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        approval_request_id: r.approval_request_id,
        elevation_id: r.elevation_id,
        correlation_id: r.correlation_id,
        occurred_at: (r.occurred_at as Date).toISOString(),
        data: r.data,
        prev_hash: r.prev_hash,
      };
      expect(chainHash(r.prev_hash, hashRow)).toBe(r.hash);
    }
  });

  it('rolls back with the caller transaction', async () => {
    const before = Number(
      (await pool.query('SELECT count(*) n FROM audit.audit_events')).rows[0].n,
    );
    await expect(
      withTx(pool, {}, async (tx) => {
        await writer.record(tx, { action: 'x.rolled_back', correlationId: 'COR-3' });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const after = Number((await pool.query('SELECT count(*) n FROM audit.audit_events')).rows[0].n);
    expect(after).toBe(before);
  });

  it('keeps the chain linear under concurrent writers', async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        withTx(pool, {}, (tx) =>
          writer.record(tx, { action: 'x.concurrent', correlationId: `COR-c${i}` }),
        ),
      ),
    );
    const rows = (await pool.query('SELECT prev_hash, hash FROM audit.audit_events ORDER BY seq'))
      .rows;
    for (let i = 1; i < rows.length; i++) expect(rows[i].prev_hash).toBe(rows[i - 1].hash);
  });

  it('refuses an event without an action or a correlation ID', async () => {
    await expect(
      withTx(pool, {}, (tx) => writer.record(tx, { action: '', correlationId: 'c' })),
    ).rejects.toThrow(/action/);
    await expect(
      withTx(pool, {}, (tx) => writer.record(tx, { action: 'a', correlationId: '' })),
    ).rejects.toThrow(/correlationId/);
  });
});
