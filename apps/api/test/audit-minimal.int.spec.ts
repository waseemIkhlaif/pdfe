import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createWorld, type World } from './support/world';

let w: World;
beforeAll(async () => {
  w = await createWorld();
});
afterAll(async () => {
  await w?.t.close();
});

describe('audit through the minimal writer', () => {
  it('an approved role grant produces exactly one iam.role.granted event with every required field', async () => {
    const req = await w.requestGrant(w.alice, 'merchant_owner');
    const res = await w.decide(req.body.id, w.admin2);
    expect(res.status).toBe(200);

    const rows = (
      await w.t.admin.query("SELECT * FROM audit.audit_events WHERE action = 'iam.role.granted'")
    ).rows;
    expect(rows).toHaveLength(1);
    const e = rows[0];
    expect(e.actor_id).toBe(w.admin2.id); // who approved it
    expect(e.tenant_id).toBe(w.tenant);
    expect(e.target_type).toBe('user');
    expect(e.target_id).toBe(w.alice.id);
    expect(e.reason).toBe('needed for work');
    expect(e.approval_request_id).toBe(req.body.id);
    expect(e.data.role_code).toBe('merchant_owner');
    expect(e.data.requested_by).toBe(w.admin1.id);
    expect(e.occurred_at).toBeInstanceOf(Date);
    expect(e.correlation_id).toBe(res.headers['x-correlation-id']);
    expect(e.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a forced audit insert failure rolls the grant back', async () => {
    // A constraint that refuses this one action, so the audit insert fails after the role insert.
    await w.t.admin.query(
      "ALTER TABLE audit.audit_events ADD CONSTRAINT force_fail CHECK (action <> 'iam.role.granted') NOT VALID",
    );
    try {
      const target = await w.t.createUser('rollback', w.tenant, ['individual']);
      const req = await w.requestGrant(target, 'merchant_cashier');
      expect(req.status).toBe(201);
      const res = await w.decide(req.body.id, w.admin3);
      expect(res.status).toBe(500);
      const held = await w.t.admin.query(
        'SELECT role_code FROM iam.user_roles WHERE user_id = $1',
        [target.id],
      );
      expect(held.rows.map((r) => r.role_code)).toEqual(['individual']);
      // The whole decision rolled back with it.
      const st = await w.t.admin.query('SELECT status FROM iam.approval_requests WHERE id = $1', [
        req.body.id,
      ]);
      expect(st.rows[0].status).toBe('pending');
      const decided = await w.t.admin.query(
        "SELECT 1 FROM audit.audit_events WHERE action = 'approval.decided' AND approval_request_id = $1",
        [req.body.id],
      );
      expect(decided.rowCount).toBe(0);
    } finally {
      await w.t.admin.query('ALTER TABLE audit.audit_events DROP CONSTRAINT force_fail');
    }
  });

  it('UPDATE and DELETE on audit.audit_events as app_role fail', async () => {
    await expect(w.t.pool.query("UPDATE audit.audit_events SET action = 'x'")).rejects.toThrow(
      /permission denied/,
    );
    await expect(w.t.pool.query('DELETE FROM audit.audit_events')).rejects.toThrow(
      /permission denied/,
    );
  });

  it('the chain stays linear across all of this', async () => {
    const rows = (
      await w.t.admin.query('SELECT prev_hash, hash FROM audit.audit_events ORDER BY seq')
    ).rows;
    expect(rows.length).toBeGreaterThan(5);
    for (let i = 1; i < rows.length; i++) expect(rows[i].prev_hash).toBe(rows[i - 1].hash);
  });
});
