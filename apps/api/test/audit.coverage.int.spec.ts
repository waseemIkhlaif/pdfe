import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createWorld, type World } from './support/world';
import type { TestUser } from './support/test-app';

/**
 * Every audit action of the contract is either triggered here, once, and checked for its required fields, or listed in
 * the spec as not yet implemented. Adding an action to the spec without either fails this file.
 */
const SPEC = resolve(
  __dirname,
  '../../../specs/001-platform-foundation/contracts/events-and-config.md',
);
const WORKER_TEST = resolve(__dirname, '../../worker/test/jobs.int.spec.ts');

function actionsIn(section: string): string[] {
  const out: string[] = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const first = line.split('|')[1] ?? '';
    for (const m of first.matchAll(/`([a-z_]+(?:\.[a-z_]+)+)`/g)) out.push(m[1]!);
  }
  return out;
}
const spec = readFileSync(SPEC, 'utf8').replace(/\r\n/g, '\n');
const start = spec.indexOf('## Audit actions (Phase 2)');
const notYetAt = spec.indexOf('### Audit actions not yet implemented');
const AFTER = spec.indexOf('\n## ', notYetAt + 1);
const ALL = actionsIn(spec.slice(start, notYetAt));
const NOT_YET = new Set(actionsIn(spec.slice(notYetAt, AFTER === -1 ? undefined : AFTER)));

/** Fields that must be present, per action. Every event also has an ID, action, correlation ID, time and hashes. */
const ACTOR = ['actor_id', 'actor_role', 'tenant_id'];
const TARGET = ['target_type', 'target_id'];
const REQUIRED: Record<string, string[]> = {
  'auth.signin': [...ACTOR, ...TARGET],
  'auth.signin_denied_mfa': [...ACTOR, ...TARGET],
  'approval.created': [...ACTOR, ...TARGET, 'reason', 'approval_request_id'],
  'approval.decided': [...ACTOR, ...TARGET, 'reason', 'approval_request_id'],
  'approval.cancelled': [...ACTOR, ...TARGET, 'reason', 'approval_request_id'],
  'approval.expired': ['tenant_id', 'actor_role', ...TARGET, 'approval_request_id'],
  'iam.role.granted': [...ACTOR, ...TARGET, 'reason', 'approval_request_id'],
  'iam.role.revoked': [...ACTOR, ...TARGET, 'reason', 'approval_request_id'],
  'iam.role.grant_refused_sod': [...ACTOR, ...TARGET],
  'tenant.elevation_started': [...ACTOR, ...TARGET, 'reason', 'elevation_id'],
  'tenant.elevated_read': [...ACTOR, ...TARGET, 'elevation_id'],
  'tenant.elevation_ended': [...ACTOR, ...TARGET, 'elevation_id'],
  'audit.exported': [...ACTOR, 'target_type'],
  'audit.verified': [...ACTOR, 'target_type'],
  'demo.error_simulated': [...ACTOR, ...TARGET],
};
/** Triggered by the worker; its own test checks the same fields (see the last describe block). */
const BY_WORKER = new Set(['approval.expired']);

let w: World;
let auditor: TestUser;
let ops: TestUser;
let otherTenant: string;
let seq = 0;

const api = () => request(w.t.app.getHttpServer());

/** The events of one action produced by one request, found by its correlation ID. */
async function eventsOf(action: string, correlationId: string) {
  return (
    await w.t.admin.query(
      'SELECT * FROM audit.audit_events WHERE action = $1 AND correlation_id = $2',
      [action, correlationId],
    )
  ).rows;
}
const cid = (res: request.Response): string => res.headers['x-correlation-id'] as string;

/** Each trigger performs the action once and returns the correlation ID that identifies its request. */
const TRIGGERS: Record<string, () => Promise<string>> = {
  'auth.signin': async () => {
    const u = await w.t.createUser(`fresh${(seq += 1)}`, w.tenant, ['individual']);
    const res = await api()
      .get('/v1/me')
      .set('Authorization', `Bearer ${await w.t.token(u, { sessionId: `session-cov-${seq}` })}`);
    return cid(res);
  },
  'auth.signin_denied_mfa': async () => {
    const u = await w.t.createUser(`nomfa${(seq += 1)}`, w.tenant, ['finance_analyst']);
    const res = await api()
      .get('/v1/me')
      .set('Authorization', `Bearer ${await w.t.token(u, { otp: false })}`);
    expect(res.status).toBe(401);
    return cid(res);
  },
  'approval.created': async () => {
    const u = await w.t.createUser(`ac${(seq += 1)}`, w.tenant, ['individual']);
    return cid(await w.requestGrant(u, 'merchant_owner'));
  },
  'approval.decided': async () => {
    const u = await w.t.createUser(`ad${(seq += 1)}`, w.tenant, ['individual']);
    const r = await w.requestGrant(u, 'merchant_owner');
    return cid(await w.decide(r.body.id, w.admin2, 'reject'));
  },
  'approval.cancelled': async () => {
    const u = await w.t.createUser(`ax${(seq += 1)}`, w.tenant, ['individual']);
    const r = await w.requestGrant(u, 'merchant_owner');
    return cid(
      await w.as(w.admin1).post(`/v1/approvals/${r.body.id}/cancel`, { reason: 'not needed' }),
    );
  },
  'iam.role.granted': async () => {
    const u = await w.t.createUser(`g${(seq += 1)}`, w.tenant, ['individual']);
    const r = await w.requestGrant(u, 'merchant_owner');
    return cid(await w.decide(r.body.id, w.admin2));
  },
  'iam.role.revoked': async () => {
    const u = await w.t.createUser(`rv${(seq += 1)}`, w.tenant, ['individual', 'merchant_owner']);
    const r = await w.as(w.admin1).post(`/v1/iam/users/${u.id}/role-revocations`, {
      role_code: 'merchant_owner',
      reason: 'no longer needed',
    });
    return cid(await w.decide(r.body.id, w.admin2));
  },
  'iam.role.grant_refused_sod': async () => {
    const res = await w.requestGrant(w.fin, 'finance_approver');
    expect(res.status).toBe(409);
    return cid(res);
  },
  'tenant.elevation_started': async () => {
    const u = await w.t.createUser(`el${(seq += 1)}`, w.tenant, ['ops_analyst']);
    const res = await w.as(u).post('/v1/elevations', {
      target_tenant_id: otherTenant,
      reason: 'coverage check of the elevation',
    });
    expect(res.status).toBe(201);
    elevated = { user: u, id: res.body.id };
    return cid(res);
  },
  'tenant.elevated_read': async () => cid(await w.as(elevated.user).get('/v1/me')),
  'tenant.elevation_ended': async () =>
    cid(await w.as(elevated.user).post(`/v1/elevations/${elevated.id}/end`)),
  'audit.exported': async () =>
    cid(await w.as(auditor).get('/v1/audit/export?format=csv&action=approval.created')),
  'audit.verified': async () => cid(await w.as(auditor).post('/v1/audit/verify')),
  'demo.error_simulated': async () => {
    const res = await w.as(w.admin1).post('/v1/demo/simulate-error');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(res.body.error.correlation_id).toBe(cid(res));
    return cid(res);
  },
};
let elevated: { user: TestUser; id: string };

beforeAll(async () => {
  w = await createWorld();
  auditor = await w.t.createUser('auditor', w.tenant, ['auditor']);
  ops = await w.t.createUser('ops', w.tenant, ['ops_analyst']);
  otherTenant = await w.t.createTenant('other');
  void ops;
});
afterAll(async () => {
  await w?.t.close();
});

describe('the spec and the test agree', () => {
  it('reads the audit actions of the contract', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(14);
    expect(NOT_YET.size).toBeGreaterThan(0);
    for (const a of NOT_YET)
      expect(ALL, `${a} is listed as not implemented but is not an audit action`).toContain(a);
  });

  it('every implemented action has a trigger and a field list here, and nothing else does', () => {
    const implemented = ALL.filter((a) => !NOT_YET.has(a)).sort();
    const covered = [...Object.keys(TRIGGERS), ...BY_WORKER].sort();
    expect(covered).toEqual(implemented);
    expect(Object.keys(REQUIRED).sort()).toEqual(implemented);
  });
});

describe('each implemented action records exactly one event with every required field', () => {
  // The elevation actions depend on each other, so they run in this order.
  const order = Object.keys(TRIGGERS);
  it.each(order)('%s', async (action) => {
    const correlationId = await TRIGGERS[action]!();
    const rows = await eventsOf(action, correlationId);
    expect(rows, `${action} events for correlation ${correlationId}`).toHaveLength(1);
    const e = rows[0];
    for (const f of [
      ...REQUIRED[action]!,
      'id',
      'action',
      'correlation_id',
      'occurred_at',
      'hash',
      'prev_hash',
    ]) {
      expect(e[f], `${action}: ${f}`).not.toBeNull();
      expect(e[f], `${action}: ${f}`).not.toBeUndefined();
    }
    // An event with an actor always names the actor's role too.
    if (e.actor_id) expect(e.actor_role, `${action}: actor_role`).toBeTruthy();
    expect(e.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('actions the worker records', () => {
  it('is covered, with the same field checks, in the worker test', () => {
    const text = readFileSync(WORKER_TEST, 'utf8');
    for (const action of BY_WORKER) {
      expect(text, `${action} must be asserted in ${WORKER_TEST}`).toContain(`'${action}'`);
    }
    expect(text).toContain('actor_role');
  });
});
