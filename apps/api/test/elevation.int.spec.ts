import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ProbeController } from './support/probe.controller';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

let t: TestApp;
let tenantA: string;
let tenantB: string;
let ops: TestUser; // ops_analyst in tenant A: holds tenant.elevate
let bob: TestUser; // tenant B user, readable only through an elevation
let plain: TestUser; // tenant A user without tenant.elevate

const http = () => request(t.app.getHttpServer());
const auth = async (u: TestUser) => ({
  Authorization: `Bearer ${await t.token(u, { otp: true })}`,
});
let key = 0;
const idem = () => ({ 'Idempotency-Key': `elevation-test-key-${(key += 1)}` });
const audit = async (action: string) =>
  (await t.admin.query('SELECT * FROM audit.audit_events WHERE action = $1 ORDER BY seq', [action]))
    .rows;

beforeAll(async () => {
  t = await createTestApp({ controllers: [ProbeController] });
  tenantA = await t.createTenant('a');
  tenantB = await t.createTenant('b');
  ops = await t.createUser('ops', tenantA, ['ops_analyst']);
  plain = await t.createUser('plain', tenantA, ['individual']);
  bob = await t.createUser('bob', tenantB, ['individual']);
  for (const [id, tenant, name] of [
    ['00000000-0000-7000-8000-0000000000a1', tenantA, 'org-in-a'],
    ['00000000-0000-7000-8000-0000000000b1', tenantB, 'org-in-b'],
  ] as const) {
    await t.admin.query(
      "INSERT INTO platform.organizations (id, tenant_id, type, display_name, created_at) VALUES ($1,$2,'merchant',$3,now())",
      [id, tenant, name],
    );
  }
});
afterAll(async () => {
  await t?.close();
});

describe('tenant elevation', () => {
  it('needs the tenant.elevate permission', async () => {
    await http()
      .post('/v1/elevations')
      .set(await auth(plain))
      .set(idem())
      .send({ target_tenant_id: tenantB, reason: 'investigating a problem' })
      .expect(403);
  });

  it('needs a reason of at least 10 characters', async () => {
    const res = await http()
      .post('/v1/elevations')
      .set(await auth(ops))
      .set(idem())
      .send({ target_tenant_id: tenantB, reason: 'too short' })
      .expect(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details[0].path).toBe('reason');
  });

  it('without an elevation, the caller sees only its own tenant', async () => {
    const res = await http()
      .get('/v1/me')
      .set(await auth(ops))
      .expect(200);
    expect(res.body.tenant_id).toBe(tenantA);
    expect(res.body.elevation).toBeNull();
    await http()
      .get('/v1/elevations/current')
      .set(await auth(ops))
      .expect(204);
  });

  let elevationId: string;
  it('starts, and a second active elevation gives 409 ELEVATION_ACTIVE', async () => {
    const res = await http()
      .post('/v1/elevations')
      .set(await auth(ops))
      .set(idem())
      .send({ target_tenant_id: tenantB, reason: 'investigating a problem' })
      .expect(201);
    elevationId = res.body.id;
    expect(res.body.target_tenant_id).toBe(tenantB);
    // Default TTL is 30 minutes.
    expect(Date.parse(res.body.expires_at) - Date.parse(res.body.started_at)).toBe(30 * 60_000);

    const again = await http()
      .post('/v1/elevations')
      .set(await auth(ops))
      .set(idem())
      .send({ target_tenant_id: tenantB, reason: 'another long reason' })
      .expect(409);
    expect(again.body.error.code).toBe('ELEVATION_ACTIVE');
  });

  it('reads return the target tenant, and /me shows the elevation', async () => {
    const res = await http()
      .get('/v1/me')
      .set(await auth(ops))
      .expect(200);
    expect(res.body.elevation.id).toBe(elevationId);
    const orgs = await http()
      .get('/v1/probe/orgs')
      .set(await auth(ops))
      .expect(200);
    expect(orgs.body.orgs).toEqual(['org-in-b']);
    const cur = await http()
      .get('/v1/elevations/current')
      .set(await auth(ops))
      .expect(200);
    expect(cur.body.id).toBe(elevationId);
  });

  it('refuses any POST during the elevation with ELEVATION_READ_ONLY', async () => {
    const res = await http()
      .post('/v1/probe')
      .set(await auth(ops))
      .set(idem())
      .send({})
      .expect(409);
    expect(res.body.error.code).toBe('ELEVATION_READ_ONLY');
  });

  it('records one elevated read per read', async () => {
    const before = (await audit('tenant.elevated_read')).length;
    await http()
      .get('/v1/me')
      .set(await auth(ops))
      .expect(200);
    await http()
      .get('/v1/me')
      .set(await auth(ops))
      .expect(200);
    const after = await audit('tenant.elevated_read');
    expect(after.length - before).toBe(2);
    expect(after.at(-1).tenant_id).toBe(tenantB);
    expect(after.at(-1).elevation_id).toBe(elevationId);
    expect(after.at(-1).actor_id).toBe(ops.id);
  });

  it('only the owner can end it, and ending works', async () => {
    await http()
      .post(`/v1/elevations/${elevationId}/end`)
      .set(await auth(plain))
      .set(idem())
      .expect(404);
    await http()
      .post(`/v1/elevations/${elevationId}/end`)
      .set(await auth(ops))
      .set(idem())
      .expect(204);
    const me = await http()
      .get('/v1/me')
      .set(await auth(ops))
      .expect(200);
    expect(me.body.elevation).toBeNull();
    const orgs = await http()
      .get('/v1/probe/orgs')
      .set(await auth(ops))
      .expect(200);
    expect(orgs.body.orgs).toEqual(['org-in-a']);
  });

  it('after the expiry passes mid-session, the next read is 403 with no data, and the elevation is closed', async () => {
    const start = await http()
      .post('/v1/elevations')
      .set(await auth(ops))
      .set(idem())
      .send({ target_tenant_id: tenantB, reason: 'second investigation' })
      .expect(201);
    t.clock.advance(31 * 60_000);
    const res = await http()
      .get('/v1/me')
      .set(await auth(ops))
      .expect(403);
    expect(res.body.user).toBeUndefined();
    const row = (
      await t.admin.query('SELECT ended_at, end_reason FROM iam.tenant_elevations WHERE id = $1', [
        start.body.id,
      ])
    ).rows[0];
    expect(row.end_reason).toBe('expired');
    // The request after that is an ordinary request in the home tenant.
    const next = await http()
      .get('/v1/me')
      .set(await auth(ops))
      .expect(200);
    expect(next.body.elevation).toBeNull();
  });

  it('audits the start, each read and each end', async () => {
    const started = await audit('tenant.elevation_started');
    expect(started).toHaveLength(2);
    expect(started[0].reason).toBe('investigating a problem');
    expect(started[0].tenant_id).toBe(tenantB);
    const ended = await audit('tenant.elevation_ended');
    expect(ended.map((e) => e.data.end_reason)).toEqual(['user', 'expired']);
  });

  it('a write inside the read-only elevation transaction fails in the database', async () => {
    // The API never writes during an elevation; prove the transaction itself would refuse.
    const { withTx } = await import('@pdfe/platform-core/db');
    await expect(
      withTx(t.pool, { tenantId: tenantB, elevationId: 'e1' }, ({ client }) =>
        client.query(
          "INSERT INTO platform.organizations (id, tenant_id, type, display_name, created_at) VALUES ('00000000-0000-7000-8000-0000000000f1', $1, 'merchant', 'x', now())",
          [tenantB],
        ),
      ),
    ).rejects.toThrow(/read-only transaction/);
    expect(bob.tenantId).toBe(tenantB);
  });
});
