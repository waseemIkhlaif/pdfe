import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTx } from '@pdfe/platform-core/db';
import { AuditService } from '../src/audit/audit.service';
import { createWorld, type World } from './support/world';

let w: World;
let auditor: Awaited<ReturnType<World['t']['createUser']>>;

beforeAll(async () => {
  w = await createWorld();
  auditor = await w.t.createUser('auditor', w.tenant, ['auditor']);
});
afterAll(async () => {
  await w?.t.close();
});

const seqs = async () =>
  (await w.t.admin.query('SELECT seq FROM audit.audit_events ORDER BY seq')).rows.map((r) =>
    Number(r.seq),
  );

describe('the audit chain under load', () => {
  it('50 concurrent privileged actions give 50 events, consecutive sequence numbers, and a chain that verifies', async () => {
    const targets = [];
    for (let i = 0; i < 50; i++)
      targets.push(await w.t.createUser(`target${i}`, w.tenant, ['individual']));
    const before = (await seqs()).length;
    const admins = [w.admin1, w.admin2, w.admin3];
    const res = await Promise.all(
      targets.map((t, i) => w.requestGrant(t, 'merchant_owner', admins[i % 3]!)),
    );
    expect(res.every((r) => r.status === 201)).toBe(true);

    const created = await w.t.admin.query(
      "SELECT count(*)::int n FROM audit.audit_events WHERE action = 'approval.created'",
    );
    expect(created.rows[0].n).toBe(50);
    // Every event, including the sign-in events the first requests caused, is numbered 1, 2, 3, ... with no hole.
    const all = await seqs();
    expect(all.length).toBeGreaterThanOrEqual(before + 50);
    expect(all).toEqual(Array.from({ length: all.length }, (_, i) => i + 1));

    const verify = await w.as(auditor).post('/v1/audit/verify');
    expect(verify.status).toBe(200);
    expect(verify.body.result).toBe('ok');
    expect(verify.body.events).toBeGreaterThanOrEqual(all.length);
  });

  it('writes that roll back leave no hole in the sequence', async () => {
    const audit = w.t.app.get(AuditService);
    const before = (await seqs()).length;
    const outcomes = await Promise.allSettled(
      Array.from({ length: 30 }, (_, i) =>
        withTx(w.t.pool, {}, async (tx) => {
          await audit.record(tx, { action: 'test.maybe', correlationId: `COR-roll${i}` });
          if (i % 2 === 1) throw new Error('the action failed after its audit write');
        }),
      ),
    );
    expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(15);
    const all = await seqs();
    expect(all.length).toBe(before + 15);
    expect(all).toEqual(Array.from({ length: all.length }, (_, i) => i + 1));
    expect((await w.as(auditor).post('/v1/audit/verify')).body.result).toBe('ok');
  });
});
