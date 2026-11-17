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

const refusals = async () =>
  (
    await w.t.admin.query(
      "SELECT * FROM audit.audit_events WHERE action = 'iam.role.grant_refused_sod' ORDER BY seq",
    )
  ).rows;

describe('separation of duties', () => {
  it('refuses a conflicting grant in the service: 409 SOD_CONFLICT listing both roles', async () => {
    // fin holds finance_analyst; finance_approver conflicts with it.
    const res = await w.requestGrant(w.fin, 'finance_approver');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SOD_CONFLICT');
    const keys = res.body.error.details.map((d: { message_key: string }) => d.message_key);
    expect(keys).toContain('roles.finance_approver');
    expect(keys).toContain('roles.finance_analyst');
    // No approval request was created.
    const n = await w.t.admin.query('SELECT count(*)::int n FROM iam.approval_requests');
    expect(n.rows[0].n).toBe(0);
  });

  it('audits the refusal even though the request fails', async () => {
    const rows = await refusals();
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_id).toBe(w.admin1.id);
    expect(rows[0].target_id).toBe(w.fin.id);
    expect(rows[0].tenant_id).toBe(w.tenant);
    expect(rows[0].data.role_code).toBe('finance_approver');
    expect(rows[0].data.conflicts).toEqual(['finance_analyst']);
  });

  it('refuses it in the database too: the trigger on a direct insert', async () => {
    await expect(
      withTx(w.t.pool, { tenantId: w.tenant }, ({ client }) =>
        client.query(
          `INSERT INTO iam.user_roles (user_id, role_code, granted_at) VALUES ($1, 'finance_approver', now())`,
          [w.fin.id],
        ),
      ),
    ).rejects.toThrow(
      /SOD_CONFLICT: role finance_approver conflicts with held role\(s\) finance_analyst/,
    );
  });

  it('refuses the platform administrator holding an approver role, in both directions', async () => {
    expect((await w.requestGrant(w.admin2, 'compliance_approver')).status).toBe(409);
    // A user holding an approver role cannot be given platform_admin either.
    const approver = await w.t.createUser('cmp', w.tenant, ['compliance_approver']);
    expect((await w.requestGrant(approver, 'platform_admin')).status).toBe(409);
  });

  it('refuses the auditor next to any role with a write permission', async () => {
    expect((await w.requestGrant(w.alice, 'auditor')).status).toBe(409); // alice is an individual
    const readonly = await w.t.createUser('viewer', w.tenant, ['demo_viewer']);
    expect((await w.requestGrant(readonly, 'auditor')).status).toBe(201);
  });

  it('refuses the triple rule by the trigger (no Phase 2 role holds all three groups)', async () => {
    await w.t.admin.query(
      "INSERT INTO iam.roles (code) VALUES ('x_ledger'), ('x_issue'), ('x_admin')",
    );
    await w.t.admin.query(
      `INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
         ('x_ledger','ledger.post'), ('x_issue','stb.issuance.approve'), ('x_admin','audit.admin')`,
    );
    const u = await w.t.createUser('triple', w.tenant, ['x_ledger', 'x_issue']);
    await expect(
      w.t.admin.query(
        "INSERT INTO iam.user_roles (user_id, role_code, granted_at) VALUES ($1,'x_admin',now())",
        [u.id],
      ),
    ).rejects.toThrow(/triple rule/);
  });

  it('re-checks at approval time: a conflict that appeared since the request is refused, and audited', async () => {
    const target = await w.t.createUser('later', w.tenant, ['individual']);
    const before = (await refusals()).length;
    const req = await w.requestGrant(target, 'biz_preparer');
    expect(req.status).toBe(201);
    // Meanwhile the user is given biz_approver by some other path.
    await w.t.admin.query(
      "INSERT INTO iam.user_roles (user_id, role_code, granted_at) VALUES ($1,'biz_approver',now())",
      [target.id],
    );
    const res = await w.decide(req.body.id, w.admin2);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('SOD_CONFLICT');
    const rows = await refusals();
    expect(rows.length).toBe(before + 1);
    expect(rows.at(-1).approval_request_id).toBe(req.body.id);
    // The decision rolled back: the request is still pending, and nothing was granted.
    const st = await w.t.admin.query('SELECT status FROM iam.approval_requests WHERE id = $1', [
      req.body.id,
    ]);
    expect(st.rows[0].status).toBe('pending');
    const held = await w.t.admin.query(
      'SELECT role_code FROM iam.user_roles WHERE user_id = $1 ORDER BY 1',
      [target.id],
    );
    expect(held.rows.map((r) => r.role_code)).toEqual(['biz_approver', 'individual']);
  });

  it('a non-conflicting grant goes through approval and is applied', async () => {
    const target = await w.t.createUser('ok', w.tenant, ['individual']);
    const req = await w.requestGrant(target, 'merchant_owner');
    expect(req.status).toBe(201);
    expect((await w.decide(req.body.id, w.admin2)).status).toBe(200);
    const roles = await w.as(w.admin1).get('/v1/iam/users');
    const row = roles.body.items.find((u: { id: string }) => u.id === target.id);
    expect(row.roles.sort()).toEqual(['individual', 'merchant_owner']);
  });

  it('a revocation goes through approval too', async () => {
    const target = await w.t.createUser('revoke', w.tenant, ['individual', 'merchant_owner']);
    const req = await w.as(w.admin1).post(`/v1/iam/users/${target.id}/role-revocations`, {
      role_code: 'merchant_owner',
      reason: 'no longer a merchant',
    });
    expect(req.status).toBe(201);
    expect((await w.decide(req.body.id, w.admin2)).status).toBe(200);
    const held = await w.t.admin.query('SELECT role_code FROM iam.user_roles WHERE user_id = $1', [
      target.id,
    ]);
    expect(held.rows.map((r) => r.role_code)).toEqual(['individual']);
    const bad = await w.as(w.admin1).post(`/v1/iam/users/${target.id}/role-revocations`, {
      role_code: 'merchant_owner',
      reason: 'again, not held now',
    });
    expect(bad.status).toBe(422);
  });

  it('refuses an unknown role and an unknown user', async () => {
    expect((await w.requestGrant(w.alice, 'superuser')).status).toBe(422);
    const ghost = { ...w.alice, id: '00000000-0000-7000-8000-00000000dead' };
    expect((await w.requestGrant(ghost, 'merchant_owner')).status).toBe(404);
  });

  it('lists roles with their permissions and conflicts', async () => {
    const res = await w.as(w.admin1).get('/v1/iam/roles');
    expect(res.status).toBe(200);
    const fin = res.body.items.find((r: { code: string }) => r.code === 'finance_analyst');
    expect(fin.privileged).toBe(true);
    expect(fin.conflicts).toContain('finance_approver');
  });
});
