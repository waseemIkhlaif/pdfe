import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTx } from '@pdfe/platform-core/db';
import { createWorld, type World } from './support/world';

let w: World;
beforeAll(async () => {
  w = await createWorld();
});
afterAll(async () => {
  await w?.t.close();
});

let n = 0;
const fresh = async () => w.t.createUser(`user${(n += 1)}`, w.tenant, ['individual']);

const status = async (id: string) =>
  (await w.t.admin.query('SELECT status FROM iam.approval_requests WHERE id = $1', [id])).rows[0]
    .status;
const auditCount = async (action: string, id: string) =>
  Number(
    (
      await w.t.admin.query(
        'SELECT count(*) n FROM audit.audit_events WHERE action = $1 AND approval_request_id = $2',
        [action, id],
      )
    ).rows[0].n,
  );

describe('maker-checker', () => {
  it('refuses self-approval in the service (409) and in the database (trigger)', async () => {
    const req = await w.requestGrant(await fresh(), 'biz_preparer');
    expect(req.status).toBe(201);
    const self = await w.decide(req.body.id, w.admin1);
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('SELF_APPROVAL');

    // A direct SQL insert by the application role is refused by trg_no_self_approval.
    await expect(
      withTx(w.t.pool, { tenantId: w.tenant }, ({ client }) =>
        client.query(
          `INSERT INTO iam.approval_decisions (id, approval_request_id, decided_by, decision, decided_at)
           VALUES (gen_random_uuid(), $1, $2, 'approve', now())`,
          [req.body.id, w.admin1.id],
        ),
      ),
    ).rejects.toThrow(/SELF_APPROVAL/);
    expect(await status(req.body.id)).toBe('pending');
  });

  it('refuses a decider without the approve permission (403)', async () => {
    const req = await w.requestGrant(await fresh(), 'biz_approver');
    const res = await w.decide(req.body.id, w.fin);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(await status(req.body.id)).toBe('pending');
  });

  it('refuses a changed payload (409 PAYLOAD_CHANGED)', async () => {
    const target = await fresh();
    const req = await w.requestGrant(target, 'merchant_cashier');
    await w.t.admin.query(
      `UPDATE iam.approval_requests SET payload = jsonb_set(payload, '{role_code}', '"merchant_owner"') WHERE id = $1`,
      [req.body.id],
    );
    const res = await w.decide(req.body.id, w.admin2);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PAYLOAD_CHANGED');
    // Nothing was granted.
    const held = await w.t.admin.query('SELECT role_code FROM iam.user_roles WHERE user_id = $1', [
      target.id,
    ]);
    expect(held.rows.map((r) => r.role_code)).toEqual(['individual']);
  });

  it('refuses a cancelled or decided request (409 NOT_PENDING)', async () => {
    const a = await w.requestGrant(await fresh(), 'merchant_owner');
    const cancelled = await w
      .as(w.admin1)
      .post(`/v1/approvals/${a.body.id}/cancel`, { reason: 'no longer needed' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe('cancelled');
    const afterCancel = await w.decide(a.body.id, w.admin2);
    expect(afterCancel.status).toBe(409);
    expect(afterCancel.body.error.code).toBe('NOT_PENDING');

    const b = await w.requestGrant(await fresh(), 'merchant_owner');
    expect((await w.decide(b.body.id, w.admin2)).status).toBe(200);
    const again = await w.decide(b.body.id, w.admin3);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('NOT_PENDING');
  });

  it('only the requester can cancel (403)', async () => {
    const req = await w.requestGrant(await fresh(), 'biz_preparer');
    const res = await w
      .as(w.admin2)
      .post(`/v1/approvals/${req.body.id}/cancel`, { reason: 'not mine' });
    expect(res.status).toBe(403);
  });

  it('refuses an expired request (409 EXPIRED)', async () => {
    const req = await w.requestGrant(await fresh(), 'biz_preparer');
    w.t.clock.advance(25 * 3_600_000); // default expiry is 24 hours
    const res = await w.decide(req.body.id, w.admin2);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EXPIRED');
  });

  it('two concurrent approvals give exactly one outcome', async () => {
    const target = await fresh();
    const req = await w.requestGrant(target, 'biz_preparer');
    const [a, b] = await Promise.all([
      w.decide(req.body.id, w.admin2),
      w.decide(req.body.id, w.admin3),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe('NOT_PENDING');
    expect(await status(req.body.id)).toBe('approved');
    // The action ran once.
    const granted = await w.t.admin.query(
      "SELECT 1 FROM iam.user_roles WHERE user_id = $1 AND role_code = 'biz_preparer'",
      [target.id],
    );
    expect(granted.rowCount).toBe(1);
    expect(await auditCount('approval.decided', req.body.id)).toBe(1);
  });

  it('with required_approvals = 2, a cancel after the first approval leaves the request cancelled', async () => {
    const id = await w.insertRequest({ requestedBy: w.admin1, required: 2, target: await fresh() });
    const first = await w.decide(id, w.admin2);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe('pending');
    const cancel = await w
      .as(w.admin1)
      .post(`/v1/approvals/${id}/cancel`, { reason: 'changed my mind' });
    expect(cancel.body.status).toBe('cancelled');
    const late = await w.decide(id, w.admin3);
    expect(late.status).toBe(409);
    expect(await status(id)).toBe('cancelled');
  });

  it('with required_approvals = 2, the second distinct approver completes it, and the same one cannot count twice', async () => {
    const id = await w.insertRequest({ requestedBy: w.admin1, required: 2, target: await fresh() });
    expect((await w.decide(id, w.admin2)).body.status).toBe('pending');
    const twice = await w.decide(id, w.admin2);
    expect(twice.status).toBe(409);
    const second = await w.decide(id, w.admin3);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('approved');
  });

  it('a rejection ends the request and grants nothing', async () => {
    const target = await fresh();
    const req = await w.requestGrant(target, 'biz_preparer');
    const res = await w.decide(req.body.id, w.admin2, 'reject');
    expect(res.body.status).toBe('rejected');
    const held = await w.t.admin.query('SELECT role_code FROM iam.user_roles WHERE user_id = $1', [
      target.id,
    ]);
    expect(held.rows.map((r) => r.role_code)).toEqual(['individual']);
  });

  it('refuses a decision from an approver who lost the permission while the request was pending', async () => {
    const req = await w.requestGrant(w.fin, 'ops_analyst');
    // ops_analyst conflicts with finance_approver, not finance_analyst, so the request itself is allowed.
    expect(req.status).toBe(201);
    const demoted = await w.t.createUser('admin4', w.tenant, ['platform_admin']);
    await w.t.admin.query('DELETE FROM iam.user_roles WHERE user_id = $1', [demoted.id]);
    const res = await w.decide(req.body.id, demoted);
    expect(res.status).toBe(403);
    expect(await status(req.body.id)).toBe('pending');
  });

  it('records exactly one audit event per step', async () => {
    const req = await w.requestGrant(await fresh(), 'merchant_cashier');
    const id = req.body.id;
    expect(await auditCount('approval.created', id)).toBe(1);
    await w.decide(id, w.admin2);
    expect(await auditCount('approval.decided', id)).toBe(1);

    const other = await w.requestGrant(await fresh(), 'biz_approver');
    await w
      .as(w.admin1)
      .post(`/v1/approvals/${other.body.id}/cancel`, { reason: 'cancelling this one' });
    expect(await auditCount('approval.created', other.body.id)).toBe(1);
    expect(await auditCount('approval.cancelled', other.body.id)).toBe(1);
    expect(await auditCount('approval.decided', other.body.id)).toBe(0);
  });

  it('writes an outbox event with each step, in the same transaction', async () => {
    const req = await w.requestGrant(await fresh(), 'biz_preparer');
    await w.decide(req.body.id, w.admin3);
    const topics = (
      await w.t.admin.query(
        "SELECT topic FROM integration.outbox WHERE payload->>'approval_id' = $1 ORDER BY created_at, id",
        [req.body.id],
      )
    ).rows.map((r) => r.topic);
    expect(topics).toEqual(['approval.requested', 'approval.approved']);
  });

  it('lists what the caller made or can decide, and shows one request with its decisions', async () => {
    const mine = await w.as(w.admin1).get('/v1/approvals?status=approved&limit=2');
    expect(mine.status).toBe(200);
    expect(mine.body.items.length).toBeLessThanOrEqual(2);
    expect(mine.body.items.every((x: { status: string }) => x.status === 'approved')).toBe(true);
    const fin = await w.as(w.fin).get('/v1/approvals');
    expect(fin.status).toBe(200);
    expect(fin.body.items).toEqual([]); // fin made none and cannot decide any
    const id = mine.body.items[0].id;
    const one = await w.as(w.admin2).get(`/v1/approvals/${id}`);
    expect(one.status).toBe(200);
    expect(Array.isArray(one.body.decisions)).toBe(true);
    expect((await w.as(w.fin).get(`/v1/approvals/${id}`)).status).toBe(404);
  });
});
