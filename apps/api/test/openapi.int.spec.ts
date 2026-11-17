import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ZodType } from 'zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/openapi/document';
import { REGISTRY } from '../src/openapi/registry';
import { collectControllers, routesOf } from '../src/openapi/routes';
import * as S from '../src/openapi/schemas';
import { MATRIX } from './authz.matrix';
import { createWorld, type World } from './support/world';

const COMMITTED = resolve(__dirname, '../../../packages/contracts/openapi.json');
const version = (
  JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as { version: string }
).version;

let w: World;
beforeAll(async () => {
  w = await createWorld();
});
afterAll(async () => {
  await w?.t.close();
});

const routes = collectControllers(AppModule).flatMap(routesOf);

describe('the OpenAPI document follows the routes', () => {
  it('describes every route that exists, and nothing else', () => {
    const keys = routes.map((r) => r.key).sort();
    expect(keys.length).toBeGreaterThan(10);
    expect(Object.keys(REGISTRY).sort()).toEqual(keys);
  });

  it('knows the same routes as the authorization matrix', () => {
    expect(Object.keys(MATRIX).sort()).toEqual(routes.map((r) => r.key).sort());
  });

  it('the committed packages/contracts/openapi.json is what the code generates (run `pnpm --filter @pdfe/contracts generate`)', () => {
    const committed = JSON.parse(readFileSync(COMMITTED, 'utf8'));
    expect(committed).toEqual(JSON.parse(JSON.stringify(buildOpenApiDocument(version))));
  });

  it('marks protected routes with a permission, and public routes as open', () => {
    const doc = buildOpenApiDocument(version) as {
      paths: Record<string, Record<string, { security: unknown[]; 'x-permission'?: string }>>;
    };
    expect(doc.paths['/v1/health']!.get!.security).toEqual([]);
    expect(doc.paths['/v1/me']!.get!['x-permission']).toBe('me.read');
    expect(doc.paths['/v1/approvals/{id}/decisions']!.post!['x-permission']).toBe(
      'service-checked',
    );
  });
});

describe('real responses match the documented schemas', () => {
  const parse = (schema: ZodType, body: unknown) => {
    const r = schema.safeParse(body);
    expect(r.success, JSON.stringify(r.success ? '' : r.error.issues)).toBe(true);
  };
  const raw = async (path: string) =>
    (await import('supertest')).default(w.t.app.getHttpServer()).get(path);

  it('GET /v1/health and /v1/meta (public)', async () => {
    parse(S.Health, (await raw('/v1/health')).body);
    parse(S.Meta, (await raw('/v1/meta')).body);
  });

  it('GET /v1/me, /v1/iam/users, /v1/iam/roles', async () => {
    const a = w.as(w.admin1);
    parse(S.Me, (await a.get('/v1/me')).body);
    parse(S.IamUserList, (await a.get('/v1/iam/users')).body);
    parse(S.IamRoleList, (await a.get('/v1/iam/roles')).body);
  });

  it('role grant, approval list, one approval, decision and cancel', async () => {
    const a = w.as(w.admin1);
    const target = await w.t.createUser('doc-target', w.tenant, ['individual']);
    const grant = await w.requestGrant(target, 'merchant_owner');
    expect(grant.status).toBe(201);
    parse(S.Approval, grant.body);

    parse(S.ApprovalList, (await a.get('/v1/approvals')).body);
    const one = await a.get(`/v1/approvals/${grant.body.id}`);
    parse(S.Approval, one.body);

    const decided = await w.decide(grant.body.id, w.admin2);
    expect(decided.status).toBe(200);
    parse(S.Approval, decided.body);
    expect(decided.body.decisions).toHaveLength(1);

    const other = await w.requestGrant(
      await w.t.createUser('doc-target-2', w.tenant, ['individual']),
      'merchant_owner',
    );
    const cancelled = await a.post(`/v1/approvals/${other.body.id}/cancel`, {
      reason: 'no longer needed',
    });
    expect(cancelled.status).toBe(200);
    parse(S.Approval, cancelled.body);
  });

  it('elevation: none, start, current, end', async () => {
    const ops = await w.t.createUser('doc-ops', w.tenant, ['ops_analyst']);
    const otherTenant = await w.t.createTenant('doc-other');
    const o = w.as(ops);
    expect((await o.get('/v1/elevations/current')).status).toBe(204);
    const start = await o.post('/v1/elevations', {
      target_tenant_id: otherTenant,
      reason: 'documenting the contract',
    });
    expect(start.status).toBe(201);
    parse(S.Elevation, start.body);
    const cur = await o.get('/v1/elevations/current');
    expect(cur.status).toBe(200);
    parse(S.Elevation, cur.body);
    const end = await o.post(`/v1/elevations/${start.body.id}/end`);
    expect(end.status).toBe(204);
    expect(end.text).toBe('');
  });

  it('audit: search and verify', async () => {
    const auditor = await w.t.createUser('doc-auditor', w.tenant, ['auditor']);
    const a = w.as(auditor);
    const events = await a.get('/v1/audit/events?limit=5');
    expect(events.status).toBe(200);
    parse(S.AuditEventList, events.body);
    expect(events.body.items.length).toBeGreaterThan(0);
    const verify = await a.post('/v1/audit/verify');
    expect(verify.status).toBe(200);
    parse(S.VerifyResult, verify.body);
    expect(verify.body.result).toBe('ok');
  });

  it('errors use the one envelope', async () => {
    const a = w.as(w.admin1);
    const res = await a.get('/v1/approvals/00000000-0000-7000-8000-00000000dead');
    expect(res.status).toBe(404);
    parse(S.ErrorEnvelope, res.body);
    const sod = await w.requestGrant(w.fin, 'finance_approver');
    expect(sod.status).toBe(409);
    parse(S.ErrorEnvelope, sod.body);
    expect(sod.body.error.details.length).toBeGreaterThan(0);
  });
});
