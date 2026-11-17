import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IdGenerator, ScenarioClock, SystemRandom } from '@pdfe/platform-core';
import { createPool, withTx, type Pool } from '@pdfe/platform-core/db';
import { runMigrations } from '@pdfe/platform-core/migrate';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { OutboxWriter } from '../src/integration/outbox.writer';

// The relay and the consumer de-duplication are tested with the worker (apps/worker/test/jobs.int.spec.ts).
const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
let pgh: PgHandle;
let urls: DbUrls;
let pool: Pool;
let writer: OutboxWriter;

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  pool = createPool(urls.app, 4);
  const clock = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
  writer = new OutboxWriter(clock, new IdGenerator(clock, new SystemRandom()));
});
afterAll(async () => {
  await pool?.end();
  await pgh?.stop();
});

const count = async () =>
  Number((await pool.query('SELECT count(*) n FROM integration.outbox')).rows[0].n);

describe('OutboxWriter', () => {
  it('writes the event in the same transaction as its cause', async () => {
    await withTx(pool, {}, async (tx) => {
      await tx.client.query(
        "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ('00000000-0000-7000-8000-000000000001','t','T','merchant', now())",
      );
      await writer.write(tx, {
        topic: 'tenant.created',
        correlationId: 'COR-writer001',
        payload: { code: 't' },
      });
    });
    expect(await count()).toBe(1);
    const row = (
      await pool.query('SELECT topic, published_at, attempts, payload FROM integration.outbox')
    ).rows[0];
    expect(row).toMatchObject({
      topic: 'tenant.created',
      published_at: null,
      attempts: 0,
      payload: { code: 't' },
    });
  });

  it('a rollback leaves no event', async () => {
    const before = await count();
    await expect(
      withTx(pool, {}, async (tx) => {
        await writer.write(tx, {
          topic: 'x.rolled_back',
          correlationId: 'COR-writer002',
          payload: {},
        });
        throw new Error('cause failed');
      }),
    ).rejects.toThrow('cause failed');
    expect(await count()).toBe(before);
  });
});
