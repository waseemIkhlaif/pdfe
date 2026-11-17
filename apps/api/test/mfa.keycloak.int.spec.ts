import { createRemoteJWKSet } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startKeycloak, type KeycloakHandle } from '@pdfe/test-kit';
import { createTestApp, type TestApp } from './support/test-app';

// Second-factor rules against the real realm `pdfe-demo` (Testcontainers Keycloak with the realm import).
let kc: KeycloakHandle;
let t: TestApp;

const api = () => request(t.app.getHttpServer());
const me = (token: string) => api().get('/v1/me').set('Authorization', `Bearer ${token}`);

beforeAll(async () => {
  kc = await startKeycloak();
  t = await createTestApp({
    oidc: { issuers: [kc.issuer], keys: createRemoteJWKSet(new URL(kc.jwksUrl)) },
  });
  for (const [code, id] of Object.entries(kc.tenants)) await t.createTenant(code, id);
  // The users the realm knows, with the same subjects and tenants, as the seed creates them.
  for (const u of kc.users) {
    await t.createUser(u.username, u.tenantId, [u.role], { id: u.subject, sub: u.subject });
  }
});
afterAll(async () => {
  await t?.close();
  await kc?.stop();
});

describe('second factor against the real realm', () => {
  it('Keycloak refuses a privileged user who gives no one-time password, or a wrong one', async () => {
    const none = await kc.tokenResponse('demo.admin.a');
    expect(none.status).toBe(400);
    expect(((await none.json()) as { error: string }).error).toBe('invalid_grant');
    const wrong = await kc.tokenResponse('demo.admin.a', { otp: '000000' });
    expect(wrong.status).toBe(400);
    expect(((await wrong.json()) as { error: string }).error).toBe('invalid_grant');
  });

  it('with the code from the fixed secret, a privileged user signs in and the API lets them in', async () => {
    const token = await kc.tokenFor('demo.admin.a', { otp: true });
    const claims = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()) as {
      amr: string[];
      tenant_id: string;
      sub: string;
    };
    expect(claims.amr).toEqual(['pwd', 'otp']);
    expect(claims.tenant_id).toBe(kc.tenants.platform);

    const res = await me(token);
    expect(res.status).toBe(200);
    expect(res.body.mfa).toBe(true);
    expect(res.body.roles).toEqual(['platform_admin']);
    expect(res.body.tenant_id).toBe(kc.tenants.platform);
    expect(res.body.user.display_name).toBe('demo.admin.a');
  });

  it('every console role has a second factor in the realm, and every other role does not', async () => {
    for (const u of kc.users) {
      expect(u.privileged, u.username).toBe(u.otpSecret !== null);
      const noOtp = await kc.tokenResponse(u.username);
      expect(noOtp.status === 200, `${u.username} without otp`).toBe(!u.privileged);
    }
  });

  it('a non-privileged user signs in with a password alone', async () => {
    const token = await kc.tokenFor('demo.individual');
    const claims = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString()) as {
      amr: string[];
    };
    expect(claims.amr).toEqual(['pwd']);
    const res = await me(token);
    expect(res.status).toBe(200);
    expect(res.body.mfa).toBe(false);
    expect(res.body.tenant_id).toBe(kc.tenants.consumers);
  });

  it('the API refuses a privileged role on a token without otp, and audits it', async () => {
    // The realm would not issue such a token for a console user. Make one by giving a password-only
    // user a console role in the database: the API must still refuse, whatever the realm did.
    const viewer = kc.users.find((u) => u.username === 'demo.demo_viewer')!;
    await t.admin.query(
      "INSERT INTO iam.user_roles (user_id, role_code, granted_at) VALUES ($1,'ops_analyst',now())",
      [viewer.subject],
    );
    const token = await kc.tokenFor('demo.demo_viewer');
    const res = await me(token);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('MFA_REQUIRED');
    const audited = await t.admin.query(
      "SELECT 1 FROM audit.audit_events WHERE action = 'auth.signin_denied_mfa' AND actor_id = $1",
      [viewer.subject],
    );
    expect(audited.rowCount).toBe(1);
  });

  it('the token of one user cannot be used as another tenant', async () => {
    // A tenant_id claim is trusted only together with the user it was issued for.
    const token = await kc.tokenFor('demo.individual');
    await t.admin.query('UPDATE iam.users SET tenant_id = $1 WHERE external_subject = $2', [
      kc.tenants['demo-merchant'],
      kc.users.find((u) => u.username === 'demo.individual')!.subject,
    ]);
    expect((await me(token)).status).toBe(401);
  });
});
