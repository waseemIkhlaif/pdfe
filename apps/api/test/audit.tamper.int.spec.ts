import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { IdGenerator, ScenarioClock, SystemRandom } from '@pdfe/platform-core';
import { AnchorRecorder, AuditRecorder, chainHash } from '@pdfe/platform-core/audit';
import { createPool, withTx, type Pool } from '@pdfe/platform-core/db';
import { runMigrations } from '@pdfe/platform-core/migrate';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { AuditVerifier, toHashRow } from '../src/audit/audit.verifier';

// A disposable database. Each case changes the store as a superuser, with the append-only trigger off, checks what
// verification says, and puts everything back.
const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
const N = 12;

let pgh: PgHandle;
let urls: DbUrls;
let pool: Pool;
let admin: pg.Client;
let verifier: AuditVerifier;

async function tamper<T>(fn: () => Promise<T>): Promise<T> {
  await admin.query('ALTER TABLE audit.audit_events DISABLE TRIGGER trg_audit_events_append_only');
  await admin.query('ALTER TABLE audit.anchors DISABLE TRIGGER trg_anchors_append_only');
  try {
    return await fn();
  } finally {
    await admin.query('ALTER TABLE audit.audit_events ENABLE TRIGGER trg_audit_events_append_only');
    await admin.query('ALTER TABLE audit.anchors ENABLE TRIGGER trg_anchors_append_only');
  }
}

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  pool = createPool(urls.app, 4);
  verifier = new AuditVerifier(pool);

  const clock = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
  const ids = new IdGenerator(clock, new SystemRandom());
  const audit = new AuditRecorder(clock, ids);
  const anchors = new AnchorRecorder(clock, ids);
  for (let i = 1; i <= N; i++) {
    clock.tick();
    await withTx(pool, {}, async (tx) => {
      await audit.record(tx, {
        action: 'test.event',
        actorRole: 'test',
        reason: `reason ${i}`,
        correlationId: `COR-tamper${i}`,
        data: { i },
      });
      if (i === 5) await anchors.record(tx, { kind: 'epoch_start', epochLabel: 'run-1' });
      if (i === N) await anchors.record(tx, { kind: 'periodic' });
    });
  }
});
afterAll(async () => {
  await pool?.end();
  await admin?.end();
  await pgh?.stop();
});

describe('an untouched store', () => {
  it('verifies ok, with consecutive sequence numbers', async () => {
    const r = await verifier.verify();
    expect(r).toEqual({ result: 'ok', from_seq: 1, to_seq: N, events: N, anchors_checked: 2 });
    const seqs = (await admin.query('SELECT seq FROM audit.audit_events ORDER BY seq')).rows.map(
      (x) => Number(x.seq),
    );
    expect(seqs).toEqual(Array.from({ length: N }, (_, i) => i + 1));
  });

  it('refuses a change by the application role, and by a superuser while the trigger is on', async () => {
    await expect(
      pool.query("UPDATE audit.audit_events SET reason = 'x' WHERE seq = 3"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      admin.query("UPDATE audit.audit_events SET reason = 'x' WHERE seq = 3"),
    ).rejects.toThrow(/append-only/);
    await expect(admin.query('DELETE FROM audit.anchors')).rejects.toThrow(/append-only/);
  });
});

describe('an altered field gives hash_mismatch at that event', () => {
  it.each([
    ['reason', "UPDATE audit.audit_events SET reason = 'changed' WHERE seq = 6"],
    ['action', "UPDATE audit.audit_events SET action = 'other.action' WHERE seq = 6"],
    ['actor', 'UPDATE audit.audit_events SET actor_id = gen_random_uuid() WHERE seq = 6'],
    [
      'time',
      "UPDATE audit.audit_events SET occurred_at = occurred_at + interval '1 second' WHERE seq = 6",
    ],
    ['data', `UPDATE audit.audit_events SET data = '{"i": 999}' WHERE seq = 6`],
  ])('%s', async (_name, sql) => {
    const original = (await admin.query('SELECT * FROM audit.audit_events WHERE seq = 6')).rows[0];
    const r = await tamper(async () => {
      await admin.query(sql);
      const out = await verifier.verify();
      // put it back
      await admin.query(
        'UPDATE audit.audit_events SET reason=$2, action=$3, actor_id=$4, occurred_at=$5, data=$6 WHERE seq = $1',
        [
          6,
          original.reason,
          original.action,
          original.actor_id,
          original.occurred_at,
          original.data,
        ],
      );
      return out;
    });
    expect(r).toEqual({ result: 'broken', seq: 6, reason: 'hash_mismatch' });
    expect((await verifier.verify()).result).toBe('ok');
  });
});

describe('structure', () => {
  it('a deleted event gives seq_gap at the missing number', async () => {
    const original = (await admin.query('SELECT * FROM audit.audit_events WHERE seq = 8')).rows[0];
    const r = await tamper(async () => {
      await admin.query('DELETE FROM audit.audit_events WHERE seq = 8');
      const out = await verifier.verify();
      await admin.query(
        `INSERT INTO audit.audit_events (seq,id,tenant_id,actor_id,actor_role,action,target_type,target_id,reason,
           approval_request_id,elevation_id,correlation_id,occurred_at,data,prev_hash,hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          original.seq,
          original.id,
          original.tenant_id,
          original.actor_id,
          original.actor_role,
          original.action,
          original.target_type,
          original.target_id,
          original.reason,
          original.approval_request_id,
          original.elevation_id,
          original.correlation_id,
          original.occurred_at,
          original.data,
          original.prev_hash,
          original.hash,
        ],
      );
      return out;
    });
    expect(r).toEqual({ result: 'broken', seq: 8, reason: 'seq_gap' });
    expect((await verifier.verify()).result).toBe('ok');
  });

  it('two swapped events give prev_link_mismatch', async () => {
    const swap = () =>
      admin.query(`
        UPDATE audit.audit_events SET seq = 100003 WHERE seq = 3;
        UPDATE audit.audit_events SET seq = 3 WHERE seq = 4;
        UPDATE audit.audit_events SET seq = 4 WHERE seq = 100003;`);
    const r = await tamper(async () => {
      await swap();
      const out = await verifier.verify();
      await swap(); // swapping again restores them
      return out;
    });
    expect(r).toEqual({ result: 'broken', seq: 3, reason: 'prev_link_mismatch' });
    expect((await verifier.verify()).result).toBe('ok');
  });
});

describe('anchors are reported separately', () => {
  it('an altered anchor gives anchor_mismatch while the events still verify', async () => {
    const a = (await admin.query("SELECT id, hash FROM audit.anchors WHERE kind = 'periodic'"))
      .rows[0];
    const r = await tamper(async () => {
      await admin.query('UPDATE audit.anchors SET hash = $2 WHERE id = $1', [a.id, 'f'.repeat(64)]);
      const out = await verifier.verify();
      await admin.query('UPDATE audit.anchors SET hash = $2 WHERE id = $1', [a.id, a.hash]);
      return out;
    });
    expect(r).toEqual({ result: 'broken', seq: N, reason: 'anchor_mismatch', anchor_id: a.id });
    // The events alone are intact.
    expect((await verifier.verify({ fromSeq: 1, toSeq: N - 1 })).result).toBe('ok');
  });

  it('a chain rewritten consistently from some event on is still caught by the anchor', async () => {
    // Change event 9 and recompute every hash after it, so each link and each hash is internally consistent.
    const original = (
      await admin.query(
        'SELECT seq, prev_hash, hash, reason FROM audit.audit_events WHERE seq >= 9 ORDER BY seq',
      )
    ).rows;
    const r = await tamper(async () => {
      const rows = (
        await admin.query('SELECT * FROM audit.audit_events WHERE seq >= 9 ORDER BY seq')
      ).rows;
      let prev = (await admin.query('SELECT hash FROM audit.audit_events WHERE seq = 8')).rows[0]
        .hash as string;
      for (const row of rows) {
        const changed = {
          ...row,
          reason: row.seq === '9' || row.seq === 9 ? 'rewritten' : row.reason,
          prev_hash: prev,
        };
        const hash = chainHash(prev, toHashRow({ ...changed, seq: String(row.seq) }));
        await admin.query(
          'UPDATE audit.audit_events SET reason = $2, prev_hash = $3, hash = $4 WHERE seq = $1',
          [row.seq, changed.reason, prev, hash],
        );
        prev = hash;
      }
      const out = await verifier.verify();
      for (const o of original) {
        await admin.query(
          'UPDATE audit.audit_events SET reason = $2, prev_hash = $3, hash = $4 WHERE seq = $1',
          [o.seq, o.reason, o.prev_hash, o.hash],
        );
      }
      return out;
    });
    expect(r.result).toBe('broken');
    expect(r).toMatchObject({ reason: 'anchor_mismatch', seq: N });
    expect((await verifier.verify()).result).toBe('ok');
  });

  it('a deleted last event is caught by the anchor that points at it', async () => {
    const original = (await admin.query('SELECT * FROM audit.audit_events WHERE seq = $1', [N]))
      .rows[0];
    const r = await tamper(async () => {
      await admin.query('DELETE FROM audit.audit_events WHERE seq = $1', [N]);
      const out = await verifier.verify();
      await admin.query(
        `INSERT INTO audit.audit_events (seq,id,tenant_id,actor_id,actor_role,action,target_type,target_id,reason,
           approval_request_id,elevation_id,correlation_id,occurred_at,data,prev_hash,hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          original.seq,
          original.id,
          original.tenant_id,
          original.actor_id,
          original.actor_role,
          original.action,
          original.target_type,
          original.target_id,
          original.reason,
          original.approval_request_id,
          original.elevation_id,
          original.correlation_id,
          original.occurred_at,
          original.data,
          original.prev_hash,
          original.hash,
        ],
      );
      return out;
    });
    expect(r).toMatchObject({ result: 'broken', reason: 'anchor_mismatch', seq: N });
  });
});

describe('ranges and epochs', () => {
  it('a range verifies only its own events', async () => {
    const r = await tamper(async () => {
      await admin.query("UPDATE audit.audit_events SET reason = 'x' WHERE seq = 2");
      const inside = await verifier.verify({ fromSeq: 3, toSeq: 10 });
      const outside = await verifier.verify({ fromSeq: 1, toSeq: 4 });
      await admin.query("UPDATE audit.audit_events SET reason = 'reason 2' WHERE seq = 2");
      return { inside, outside };
    });
    expect(r.inside).toMatchObject({ result: 'ok', from_seq: 3, to_seq: 10, events: 8 });
    expect(r.outside).toEqual({ result: 'broken', seq: 2, reason: 'hash_mismatch' });
  });

  it('an epoch verifies from its anchor, so damage before the epoch does not count against it', async () => {
    const r = await tamper(async () => {
      await admin.query("UPDATE audit.audit_events SET reason = 'x' WHERE seq = 2");
      const whole = await verifier.verify();
      const epoch = await verifier.verify({ epoch: 'run-1' });
      await admin.query("UPDATE audit.audit_events SET reason = 'reason 2' WHERE seq = 2");
      return { whole, epoch };
    });
    expect(r.whole).toEqual({ result: 'broken', seq: 2, reason: 'hash_mismatch' });
    // The anchor of the epoch is at seq 5, so the epoch is events 6..N.
    expect(r.epoch).toMatchObject({ result: 'ok', from_seq: 6, events: N - 5 });
    await expect(verifier.verify({ epoch: 'no-such-run' })).rejects.toThrow(/no epoch anchor/);
  });

  it('a range past the head verifies ok with no events', async () => {
    expect(await verifier.verify({ fromSeq: N + 1, toSeq: N + 5 })).toMatchObject({
      result: 'ok',
      events: 0,
    });
  });
});
