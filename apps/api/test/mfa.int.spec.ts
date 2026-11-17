import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { LocalIssuer } from '@pdfe/test-kit';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

// Token-level second-factor rules, with the local issuer. The same rules are proved against the real
// Keycloak realm in mfa.keycloak.int.spec.ts.
let t: TestApp;
let finance: TestUser;
let individual: TestUser;
let tenant: string;

const me = async (u: TestUser, otp: boolean) =>
  request(t.app.getHttpServer())
    .get('/v1/me')
    .set('Authorization', `Bearer ${await t.token(u, { otp })}`);

beforeAll(async () => {
  t = await createTestApp();
  tenant = await t.createTenant('a');
  finance = await t.createUser('fin', tenant, ['finance_analyst']);
  individual = await t.createUser('ind', tenant, ['individual']);
});
afterAll(async () => {
  await t?.close();
});

describe('second factor', () => {
  it('a privileged user without otp in amr gets 401 MFA_REQUIRED, and the denial is audited', async () => {
    const res = await me(finance, false);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MFA_REQUIRED');
    const rows = (
      await t.admin.query(
        "SELECT * FROM audit.audit_events WHERE action = 'auth.signin_denied_mfa'",
      )
    ).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].actor_id).toBe(finance.id);
    expect(rows[0].tenant_id).toBe(tenant);
    expect(rows[0].correlation_id).toBe(res.headers['x-correlation-id']);
  });

  it('with otp, access works and reports mfa: true', async () => {
    const res = await me(finance, true);
    expect(res.status).toBe(200);
    expect(res.body.mfa).toBe(true);
    expect(res.body.roles).toEqual(['finance_analyst']);
  });

  it('a non-privileged user works without a second factor', async () => {
    const res = await me(individual, false);
    expect(res.status).toBe(200);
    expect(res.body.mfa).toBe(false);
  });

  it('refuses a missing, malformed, expired or wrongly signed token with 401', async () => {
    const http = () => request(t.app.getHttpServer());
    expect((await http().get('/v1/me')).status).toBe(401);
    expect((await http().get('/v1/me').set('Authorization', 'Bearer nope')).status).toBe(401);
    const expired = await t.issuer.token({ sub: individual.sub, tenantId: tenant, expiresIn: -60 });
    expect((await http().get('/v1/me').set('Authorization', `Bearer ${expired}`)).status).toBe(401);
    const stranger = await LocalIssuer.create();
    const forged = await stranger.token({ sub: individual.sub, tenantId: tenant });
    expect((await http().get('/v1/me').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });

  it('refuses a token whose tenant claim does not match the user', async () => {
    const other = await t.createTenant('b');
    const token = await t.issuer.token({ sub: individual.sub, tenantId: other });
    const res = await request(t.app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('records auth.signin once per session ID', async () => {
    const get = async () =>
      request(t.app.getHttpServer())
        .get('/v1/me')
        .set('Authorization', `Bearer ${await t.token(individual, { sessionId: 'session-one' })}`);
    await get();
    await get();
    const rows = (
      await t.admin.query(
        "SELECT 1 FROM audit.audit_events WHERE action = 'auth.signin' AND data->>'sid' = 'session-one'",
      )
    ).rows;
    expect(rows).toHaveLength(1);
  });

  it('public routes need no token', async () => {
    expect((await request(t.app.getHttpServer()).get('/v1/health')).status).toBe(200);
    expect((await request(t.app.getHttpServer()).get('/v1/meta')).status).toBe(200);
  });
});
