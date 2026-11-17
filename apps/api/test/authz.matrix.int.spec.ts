import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, ModulesContainer } from '@nestjs/core';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { isPrivileged, rolePermissions, roles } from '@pdfe/domain-types';
import { canonicalJson, sha256Hex } from '@pdfe/platform-core';
import { MATRIX } from './authz.matrix';
import { createTestApp, type TestApp, type TestUser } from './support/test-app';

/** Every route of every controller, as `METHOD /path`, read from the Nest metadata. */
function discoverRoutes(t: TestApp): string[] {
  const discovery = new DiscoveryService(t.app.get(ModulesContainer));
  const out: string[] = [];
  for (const w of discovery.getControllers()) {
    const type = w.metatype as (new (...a: never[]) => object) | null;
    if (!type || type.name === 'ProbeController') continue;
    const base = String(Reflect.getMetadata(PATH_METADATA, type) ?? '');
    for (const name of Object.getOwnPropertyNames(type.prototype)) {
      const handler = (type.prototype as Record<string, unknown>)[name];
      if (typeof handler !== 'function') continue;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
      if (method === undefined) continue;
      const path = String(Reflect.getMetadata(PATH_METADATA, handler) ?? '');
      const clean = (x: string) => x.replace(/^\/+|\/+$/g, '');
      out.push(`${RequestMethod[method]} /${[clean(base), clean(path)].filter(Boolean).join('/')}`);
    }
  }
  return out.sort();
}

let t: TestApp;
let tenantA: string;
let tenantB: string;
const users = new Map<string, TestUser>();
let ownUserId: string;
let ownApprovalId: string;
let foreignUserId: string;
let foreignApprovalId: string;
const NO_RECORD = '00000000-0000-7000-8000-00000000dead';

beforeAll(async () => {
  t = await createTestApp();
  tenantA = await t.createTenant('a');
  tenantB = await t.createTenant('b');
  for (const r of roles) users.set(r.name, await t.createUser(`u-${r.name}`, tenantA, [r.name]));
  ownUserId = (await t.createUser('own-target', tenantA, ['individual'])).id;
  const foreign = await t.createUser('foreign-target', tenantB, ['individual']);
  foreignUserId = foreign.id;
  const insert = async (id: string, tenant: string, requestedBy: string) => {
    const payload = { user_id: requestedBy, role_code: 'merchant_owner', organization_id: null };
    await t.admin.query(
      `INSERT INTO iam.approval_requests (id, tenant_id, action_type, target_type, target_id, payload, payload_hash,
         requested_by, reason, expires_at, created_at, correlation_id)
       VALUES ($1,$2,'iam.role.grant','user',$3::text,$4,$5,$3::uuid,'matrix','2026-12-01T00:00:00Z','2026-01-15T08:00:00Z','COR-matrix01')`,
      [id, tenant, requestedBy, JSON.stringify(payload), sha256Hex(canonicalJson(payload))],
    );
  };
  ownApprovalId = '00000000-0000-7000-8000-0000000000a1';
  foreignApprovalId = '00000000-0000-7000-8000-0000000000b1';
  await insert(ownApprovalId, tenantA, ownUserId);
  await insert(foreignApprovalId, tenantB, foreign.id);
});
afterAll(async () => {
  await t?.close();
});

/** Fills `:id` with a record of the caller's tenant, of the other tenant, or one that does not exist. */
function pathFor(route: string, target: 'own' | 'other'): { method: string; url: string } {
  const [method, template] = route.split(' ') as [string, string];
  const url = template
    .replace(':key', 'fees.default_minor')
    .replace(':code', 'baseline')
    .replace(':id', () => {
      if (template.includes('/approvals/'))
        return target === 'own' ? ownApprovalId : foreignApprovalId;
      if (template.includes('/iam/users/')) return target === 'own' ? ownUserId : foreignUserId;
      return NO_RECORD; // elevations/:id/end: no such elevation in either tenant
    });
  return { method, url };
}

/** Valid bodies where the record lookup must be reached; empty where validation is the harmless stop. */
function bodyFor(route: string): object {
  if (route.endsWith('/decisions')) return { decision: 'approve', reason: 'matrix check' };
  if (route.endsWith('/cancel')) return { reason: 'matrix check' };
  if (route.includes('/role-')) return { role_code: 'merchant_owner', reason: 'matrix check' };
  return {};
}

async function call(
  route: string,
  role: string,
  otp: boolean,
  target: 'own' | 'other',
  anon = false,
) {
  const { method, url } = pathFor(route, target);
  let r = request(t.app.getHttpServer())[method.toLowerCase() as 'get' | 'post'](url);
  if (!anon) r = r.set('Authorization', `Bearer ${await t.token(users.get(role)!, { otp })}`);
  if (method !== 'GET') {
    r = r
      .set('Idempotency-Key', `matrix-${Math.random().toString(36).slice(2)}-pad`)
      .send(bodyFor(route));
  }
  return r;
}

describe('authorization matrix', () => {
  it('has an entry for every route that exists, and none for a route that does not', () => {
    const found = discoverRoutes(t);
    expect(found.length).toBeGreaterThan(10);
    const missing = found.filter((r) => !(r in MATRIX));
    expect(missing, `routes with no matrix entry: ${missing.join(', ')}`).toEqual([]);
    const stale = Object.keys(MATRIX).filter((r) => !found.includes(r));
    expect(stale, `matrix entries with no route: ${stale.join(', ')}`).toEqual([]);
  });

  it('every protected route refuses a call with no token (401)', async () => {
    for (const [route, entry] of Object.entries(MATRIX)) {
      if (entry.kind === 'public') continue;
      const res = await call(route, 'individual', true, 'own', true);
      expect(res.status, `${route} without a token`).toBe(401);
    }
  });

  for (const [route, entry] of Object.entries(MATRIX)) {
    describe(route, () => {
      for (const r of roles) {
        for (const otp of [true, false]) {
          for (const target of ['own', 'other'] as const) {
            it(`${r.name} ${otp ? 'with' : 'without'} second factor, ${target} tenant`, async () => {
              const res = await call(route, r.name, otp, target);
              const privilegedWithoutOtp = isPrivileged(r.name) && !otp;
              if (entry.kind === 'public') {
                expect(res.status).toBe(200);
              } else if (privilegedWithoutOtp) {
                expect(res.status).toBe(401);
                expect(res.body.error.code).toBe('MFA_REQUIRED');
              } else if (
                entry.kind === 'permission' &&
                !rolePermissions[r.name].includes(entry.permission)
              ) {
                expect(res.status).toBe(403);
              } else if (target === 'other' && (entry.kind === 'authenticated' || entry.foreign)) {
                // Another tenant's record does not exist for this caller.
                expect(res.status).toBe(entry.foreign);
              } else if (entry.kind === 'authenticated') {
                // The service decides (approve permission, requester only): it may refuse with 403, never 401.
                expect(res.status).not.toBe(401);
              } else {
                // Authorization passed: whatever happens next (data, validation, a missing record), it is not a denial.
                expect(
                  [401, 403],
                  `${route} as ${r.name}: ${JSON.stringify(res.body)}`,
                ).not.toContain(res.status);
              }
              // The platform administrator's user directory spans tenants by design.
              // The platform administrator's user directory and the audit reads span tenants by design.
              const directory =
                (route === 'GET /v1/iam/users' && r.name === 'platform_admin') ||
                route === 'GET /v1/audit/events' ||
                route === 'GET /v1/audit/export';
              if (
                target === 'other' &&
                !directory &&
                res.status < 300 &&
                res.body &&
                typeof res.body === 'object'
              ) {
                // A read never carries the other tenant's data.
                expect(JSON.stringify(res.body)).not.toContain(foreignApprovalId);
                expect(JSON.stringify(res.body)).not.toContain(foreignUserId);
              }
            });
          }
        }
      }
    });
  }
});
