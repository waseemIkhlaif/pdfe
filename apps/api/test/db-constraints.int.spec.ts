import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbRoles, startPostgres, type DbUrls, type PgHandle } from '@pdfe/test-kit';
import { runMigrations, seedReferenceData } from '@pdfe/platform-core/migrate';

// Database-level backstops of 0003-0005, checked directly. The service-level tests (T080, T081, T083, T087) build on these.
const MIGRATIONS = resolve(__dirname, '../../../db/migrations');
const TENANT = '00000000-0000-7000-8000-00000000000a';
const U1 = '00000000-0000-7000-8000-0000000000a1';
const U2 = '00000000-0000-7000-8000-0000000000a2';
const REQ = '00000000-0000-7000-8000-0000000000c1';
const T = '2026-01-15T08:00:00Z';
const H = 'a'.repeat(64);

let pgh: PgHandle;
let urls: DbUrls;
let admin: pg.Client;
let app: pg.Client;

const grant = (user: string, role: string) =>
  admin.query('INSERT INTO iam.user_roles (user_id, role_code, granted_at) VALUES ($1,$2,$3)', [
    user,
    role,
    T,
  ]);

beforeAll(async () => {
  pgh = await startPostgres();
  urls = await createDbRoles(pgh.url);
  await runMigrations({ url: urls.admin, dir: MIGRATIONS });
  await seedReferenceData(urls.admin);
  admin = new pg.Client({ connectionString: urls.admin });
  await admin.connect();
  await admin.query(
    "INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ($1,'a','A','merchant',$2)",
    [TENANT, T],
  );
  for (const [id, sub] of [
    [U1, 'u1'],
    [U2, 'u2'],
  ]) {
    await admin.query(
      'INSERT INTO iam.users (id, tenant_id, external_subject, display_name, created_at) VALUES ($1,$2,$3,$3,$4)',
      [id, TENANT, sub, T],
    );
  }
  await admin.query(
    `INSERT INTO iam.approval_requests (id, tenant_id, action_type, target_type, payload, payload_hash, requested_by, reason,
       expires_at, created_at, correlation_id) VALUES ($1,$2,'config.change','config','{}',$3,$4,'because','2026-02-01T00:00:00Z',$5,'c')`,
    [REQ, TENANT, H, U1, T],
  );
  app = new pg.Client({ connectionString: urls.app });
  await app.connect();
});
afterAll(async () => {
  await app?.end();
  await admin?.end();
  await pgh?.stop();
});

describe('reference data', () => {
  it('seeds 15 roles, 9 privileged, symmetric conflicts, and is idempotent', async () => {
    await seedReferenceData(urls.admin);
    const r = await admin.query(
      'SELECT count(*)::int n, count(*) FILTER (WHERE privileged)::int p FROM iam.roles',
    );
    expect(r.rows[0]).toEqual({ n: 15, p: 9 });
    const asym = await admin.query(
      'SELECT 1 FROM iam.sod_conflicts a WHERE NOT EXISTS (SELECT 1 FROM iam.sod_conflicts b WHERE b.role_a = a.role_b AND b.role_b = a.role_a)',
    );
    expect(asym.rows).toHaveLength(0);
  });
});

describe('trg_no_self_approval', () => {
  it('refuses a decision by the requester, accepts another user', async () => {
    await app.query('BEGIN');
    try {
      await app.query("SELECT set_config('app.tenant_id', $1, true)", [TENANT]);
      await expect(
        app.query(
          "INSERT INTO iam.approval_decisions (id, approval_request_id, decided_by, decision, decided_at) VALUES (gen_random_uuid(),$1,$2,'approve',$3)",
          [REQ, U1, T],
        ),
      ).rejects.toThrow(/cannot decide their own request/);
    } finally {
      await app.query('ROLLBACK');
    }
    await admin.query(
      "INSERT INTO iam.approval_decisions (id, approval_request_id, decided_by, decision, decided_at) VALUES (gen_random_uuid(),$1,$2,'approve',$3)",
      [REQ, U2, T],
    );
  });
});

describe('trg_user_roles_sod', () => {
  it('refuses a conflicting role and names both roles', async () => {
    await grant(U1, 'finance_analyst');
    await expect(grant(U1, 'finance_approver')).rejects.toThrow(
      /finance_approver.*finance_analyst/,
    );
  });
  it('refuses the auditor next to a writer, in either order', async () => {
    await grant(U2, 'auditor');
    await expect(grant(U2, 'individual')).rejects.toThrow(/SOD_CONFLICT/);
    await grant(U1, 'individual');
    await expect(grant(U1, 'auditor')).rejects.toThrow(/SOD_CONFLICT/);
  });
  it('refuses the triple rule', async () => {
    // No Phase 2 role holds these permissions, so build a throw-away role set.
    await admin.query("INSERT INTO iam.roles (code) VALUES ('t_ledger'), ('t_issue'), ('t_admin')");
    await admin.query(
      `INSERT INTO iam.role_permissions (role_code, permission_code) VALUES
         ('t_ledger','ledger.post'), ('t_issue','stb.issuance.approve'), ('t_admin','audit.admin')`,
    );
    const u = '00000000-0000-7000-8000-0000000000a3';
    await admin.query(
      'INSERT INTO iam.users (id, tenant_id, external_subject, display_name, created_at) VALUES ($1,$2,$3,$3,$4)',
      [u, TENANT, 'u3', T],
    );
    await grant(u, 't_ledger');
    await grant(u, 't_issue');
    await expect(grant(u, 't_admin')).rejects.toThrow(/triple rule/);
  });
});

describe('tenant_elevations', () => {
  const ins = (id: string, reason: string) =>
    admin.query(
      `INSERT INTO iam.tenant_elevations (id, user_id, home_tenant_id, target_tenant_id, reason, started_at, expires_at, correlation_id)
       VALUES ($1,$2,$3,$3,$4,$5,'2026-01-15T09:00:00Z','c')`,
      [id, U2, TENANT, reason, T],
    );
  it('needs a reason of 10 characters', async () => {
    await expect(ins('00000000-0000-7000-8000-0000000000e1', 'short')).rejects.toThrow(/check/);
  });
  it('allows one active elevation per user', async () => {
    await ins('00000000-0000-7000-8000-0000000000e2', 'a long enough reason');
    await expect(
      ins('00000000-0000-7000-8000-0000000000e3', 'another long reason'),
    ).rejects.toThrow(/duplicate key/);
  });
});

describe('audit.audit_events', () => {
  // `seq` has no default since migration 0007: the writer assigns it under the audit lock.
  const row = `INSERT INTO audit.audit_events (seq, id, action, correlation_id, occurred_at, prev_hash, hash)
               VALUES (1, gen_random_uuid(),'x','c',$1,$2,$2) RETURNING seq`;
  it('app_role can insert and read, but not update, delete or truncate', async () => {
    const r = await app.query(row, [T, '0'.repeat(64)]);
    expect(r.rows[0].seq).toBeTruthy();
    await expect(app.query("UPDATE audit.audit_events SET action = 'y'")).rejects.toThrow(
      /permission denied/,
    );
    await expect(app.query('DELETE FROM audit.audit_events')).rejects.toThrow(/permission denied/);
    await expect(app.query('TRUNCATE audit.audit_events')).rejects.toThrow(/permission denied/);
  });
  it('the trigger blocks even a superuser', async () => {
    await expect(admin.query("UPDATE audit.audit_events SET action = 'y'")).rejects.toThrow(
      /audit is append-only/,
    );
    await expect(admin.query('DELETE FROM audit.audit_events')).rejects.toThrow(
      /audit is append-only/,
    );
    await expect(admin.query('TRUNCATE audit.audit_events')).rejects.toThrow(
      /audit is append-only/,
    );
  });
});

describe('demo_reset_role', () => {
  it('may truncate demo tables but not audit or the reference tables', async () => {
    await app.query('BEGIN');
    try {
      await app.query('SET LOCAL ROLE demo_reset_role');
      await expect(app.query('TRUNCATE audit.audit_events')).rejects.toThrow(/permission denied/);
      await app.query('ROLLBACK');
      await app.query('BEGIN');
      await app.query('SET LOCAL ROLE demo_reset_role');
      await expect(app.query('TRUNCATE iam.roles')).rejects.toThrow(/permission denied/);
    } finally {
      await app.query('ROLLBACK');
    }
    await app.query('BEGIN');
    try {
      await app.query('SET LOCAL ROLE demo_reset_role');
      await app.query(
        `TRUNCATE integration.outbox, integration.idempotency_keys, iam.tenant_elevations, iam.approval_decisions, config.config_versions,
           iam.approval_requests, iam.user_roles, iam.users, platform.organizations, platform.legal_entities, platform.tenants`,
      );
    } finally {
      await app.query('ROLLBACK');
    }
  });
});
