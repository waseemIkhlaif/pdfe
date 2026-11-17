import request from 'supertest';
import { canonicalJson, sha256Hex } from '@pdfe/platform-core';
import { createTestApp, type TestApp, type TestUser } from './test-app';

/** A small world for the maker-checker suites: one tenant, three platform admins, a target user, an analyst. */
export interface World {
  t: TestApp;
  tenant: string;
  admin1: TestUser;
  admin2: TestUser;
  admin3: TestUser;
  alice: TestUser;
  fin: TestUser;
  as(u: TestUser): {
    get(path: string): Promise<request.Response>;
    post(path: string, body?: object): Promise<request.Response>;
  };
  /** admin1 asks for a role grant for `user`; returns the HTTP response. */
  requestGrant(user: TestUser, role: string, by?: TestUser): Promise<request.Response>;
  decide(id: string, by: TestUser, decision?: 'approve' | 'reject'): Promise<request.Response>;
  /** Inserts a pending request directly, for cases the HTTP API cannot create (2 approvals). */
  insertRequest(opts: {
    requestedBy: TestUser;
    required?: number;
    target?: TestUser;
  }): Promise<string>;
}

let seq = 0;

export async function createWorld(): Promise<World> {
  const t = await createTestApp();
  const tenant = await t.createTenant('a');
  const admin1 = await t.createUser('admin1', tenant, ['platform_admin']);
  const admin2 = await t.createUser('admin2', tenant, ['platform_admin']);
  const admin3 = await t.createUser('admin3', tenant, ['platform_admin']);
  const alice = await t.createUser('alice', tenant, ['individual']);
  const fin = await t.createUser('fin', tenant, ['finance_analyst']);

  const as = (u: TestUser) => ({
    get: async (path: string) =>
      request(t.app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${await t.token(u, { otp: true })}`),
    post: async (path: string, body: object = {}) =>
      request(t.app.getHttpServer())
        .post(path)
        .set('Authorization', `Bearer ${await t.token(u, { otp: true })}`)
        .set('Idempotency-Key', `world-key-${(seq += 1)}-padding`)
        .send(body),
  });

  return {
    t,
    tenant,
    admin1,
    admin2,
    admin3,
    alice,
    fin,
    as,
    requestGrant: async (user, role, by = admin1) =>
      as(by).post(`/v1/iam/users/${user.id}/role-grants`, {
        role_code: role,
        reason: 'needed for work',
      }),
    decide: async (id, by, decision = 'approve') =>
      as(by).post(`/v1/approvals/${id}/decisions`, { decision, reason: 'reviewed' }),
    async insertRequest({ requestedBy, required = 1, target = alice }) {
      const body = { user_id: target.id, role_code: 'biz_preparer', organization_id: null };
      const id = `00000000-0000-7000-8000-${(0xf000 + (seq += 1)).toString(16).padStart(12, '0')}`;
      await t.admin.query(
        `INSERT INTO iam.approval_requests (id, tenant_id, action_type, target_type, target_id, payload, payload_hash,
           requested_by, reason, required_approvals, expires_at, created_at, correlation_id)
         VALUES ($1,$2,'iam.role.grant','user',$3,$4,$5,$6,'direct',$7,'2026-12-01T00:00:00Z','2026-01-15T08:00:00Z','COR-direct01')`,
        [
          id,
          tenant,
          target.id,
          JSON.stringify(body),
          sha256Hex(canonicalJson(body)),
          requestedBy.id,
          required,
        ],
      );
      return id;
    },
  };
}
