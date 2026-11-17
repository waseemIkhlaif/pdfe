import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbConfigReader } from '../src/config/db-config-reader';
import { createWorld, type World } from './support/world';

// Safe, reversible configuration (US7, SC-009). The scheduled half (the worker activating a version when its time comes)
// is tested with the worker, in apps/worker/test/config-activation.int.spec.ts.
let w: World;

type Version = {
  version: number;
  value: unknown;
  status: string;
  rollback_of_version: number | null;
};

const versions = async (key: string): Promise<Version[]> =>
  (await w.as(w.admin1).get(`/v1/config/${key}/versions`)).body.items;
const active = async (key: string) =>
  (await w.as(w.admin1).get('/v1/config')).body.items.find((i: { key: string }) => i.key === key)
    .active;
const propose = (key: string, value: unknown, extra: object = {}, by = w.admin1) =>
  w.as(by).post(`/v1/config/${key}/versions`, { value, reason: 'test of the change', ...extra });
const actions = async (correlationId: string): Promise<string[]> =>
  (
    await w.t.admin.query(
      'SELECT action FROM audit.audit_events WHERE correlation_id = $1 ORDER BY seq',
      [correlationId],
    )
  ).rows.map((r) => r.action);
const cid = (res: { headers: Record<string, unknown> }) =>
  res.headers['x-correlation-id'] as string;

beforeAll(async () => {
  w = await createWorld();
});
afterAll(async () => {
  await w?.t.close();
});

describe('listing', () => {
  it('shows every setting with its active version, and marks the safety-locked ones as not editable', async () => {
    const res = await w.as(w.admin1).get('/v1/config');
    expect(res.status).toBe(200);
    const byKey = new Map<string, { editable: boolean; safety_locked: boolean; active: Version }>(
      res.body.items.map((i: { key: string }) => [i.key, i]),
    );
    for (const key of ['app.mode', 'adapters.allowlist', 'egress.internal_hosts']) {
      expect(byKey.get(key)).toMatchObject({ editable: false, safety_locked: true });
    }
    expect(byKey.get('fees.default_minor')).toMatchObject({ editable: true });
    expect(byKey.get('fees.default_minor')!.active).toMatchObject({
      version: 1,
      value: 0,
      status: 'active',
    });
  });

  it('is for people who may read configuration only', async () => {
    expect((await w.as(w.alice).get('/v1/config')).status).toBe(403);
  });

  it('404 for a setting that does not exist', async () => {
    expect((await w.as(w.admin1).get('/v1/config/nope.nothing/versions')).status).toBe(404);
    expect((await propose('nope.nothing', 1)).status).toBe(404);
  });
});

describe('a proposal', () => {
  it('leaves the active value unchanged until it is approved', async () => {
    const res = await propose('limits.transfer_max_minor', 750000);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      action_type: 'config.change',
      target_id: 'limits.transfer_max_minor',
      status: 'pending',
    });
    expect((await active('limits.transfer_max_minor')).value).toBe(500000);
    const list = await versions('limits.transfer_max_minor');
    expect(list.map((v) => [v.version, v.status])).toEqual([
      [2, 'pending_approval'],
      [1, 'active'],
    ]);
  });

  it('cannot be approved by the person who made it, and approval by another administrator activates it', async () => {
    const res = await propose('fx.spread_bps', 25);
    const self = await w.decide(res.body.id, w.admin1);
    expect(self.status).toBe(409);
    expect(self.body.error.code).toBe('SELF_APPROVAL');
    expect((await active('fx.spread_bps')).value).toBe(0);

    const ok = await w.decide(res.body.id, w.admin2);
    expect(ok.status).toBe(200);
    expect(await active('fx.spread_bps')).toMatchObject({
      version: 2,
      value: 25,
      status: 'active',
    });
    expect((await versions('fx.spread_bps')).map((v) => v.status)).toEqual([
      'active',
      'superseded',
    ]);
    // The reader the rest of the system uses sees it at once.
    const reader = w.t.app.get(DbConfigReader);
    expect(await reader.get('fx.spread_bps')).toBe(25);
  });

  it('is audited at every step, with the ID of the request that did it', async () => {
    const res = await propose('approvals.default_expiry_hours', 48);
    expect(await actions(cid(res))).toEqual(['approval.created', 'config.proposed']);
    const done = await w.decide(res.body.id, w.admin2);
    expect(await actions(cid(done))).toEqual(['approval.decided', 'config.activated']);
    const outbox = await w.t.admin.query(
      "SELECT payload FROM integration.outbox WHERE topic = 'config.activated' AND payload->>'key' = 'approvals.default_expiry_hours'",
    );
    expect(outbox.rows).toHaveLength(1);
    expect(outbox.rows[0].payload).toMatchObject({ version: 2 });
  });

  it('with a later effective time is scheduled, not active, and does not touch the current value', async () => {
    const later = new Date(w.t.clock.now().getTime() + 3_600_000).toISOString();
    const res = await propose('security.elevation.ttl_minutes', 60, { effective_from: later });
    expect(res.status).toBe(201);
    const done = await w.decide(res.body.id, w.admin2);
    expect(await actions(cid(done))).toEqual(['approval.decided', 'config.scheduled']);
    expect(
      (await versions('security.elevation.ttl_minutes')).map((v) => [v.version, v.status]),
    ).toEqual([
      [2, 'scheduled'],
      [1, 'active'],
    ]);
    expect((await active('security.elevation.ttl_minutes')).value).toBe(30);
  });

  it('with two waiting for the same setting: approving one makes the other stale, and it can no longer be approved', async () => {
    const first = await propose('features.flags', { paper_trading: true });
    const second = await propose('features.flags', { remittance: true });
    expect((await w.decide(first.body.id, w.admin2)).status).toBe(200);
    expect((await versions('features.flags')).map((v) => [v.version, v.status])).toEqual([
      [3, 'stale'],
      [2, 'active'],
      [1, 'superseded'],
    ]);
    const late = await w.decide(second.body.id, w.admin3);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('CONFIG_STALE');
    expect((await active('features.flags')).value).toEqual({ paper_trading: true });
  });

  it('shows a version whose request was rejected as rejected', async () => {
    const res = await propose('idempotency.ttl_hours', 72);
    await w.decide(res.body.id, w.admin2, 'reject');
    expect((await versions('idempotency.ttl_hours'))[0]).toMatchObject({
      version: 2,
      status: 'rejected',
    });
    expect((await active('idempotency.ttl_hours')).value).toBe(24);
  });
});

describe('validation', () => {
  it('refuses a value outside the range with 422 CONFIG_INVALID and says where', async () => {
    const res = await propose('security.elevation.ttl_minutes', 9999);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CONFIG_INVALID');
    expect(res.body.error.details[0]).toMatchObject({ path: 'value' });
    expect(res.body.error.details[0].message_key).toMatch(/^validation\.config\./);
    const wrongShape = await propose('api.rate_limit', { per_user_per_minute: 'many' });
    expect(wrongShape.status).toBe(422);
    expect(wrongShape.body.error.details.map((d: { path: string }) => d.path)).toContain(
      'value.per_user_per_minute',
    );
  });

  it('needs a reason, and a well-formed effective time', async () => {
    const noReason = await w
      .as(w.admin1)
      .post('/v1/config/fees.default_minor/versions', { value: 1 });
    expect(noReason.status).toBe(422);
    expect((await propose('fees.default_minor', 1, { effective_from: 'tomorrow' })).status).toBe(
      422,
    );
  });
});

describe('safety-locked settings', () => {
  it.each([
    ['app.mode', 'DEMO'],
    ['adapters.allowlist', ['mock:*']],
    ['egress.internal_hosts', ['localhost']],
  ])(
    '%s cannot be changed: 409 CONFIG_SAFETY_LOCKED, audited as config.refused_locked',
    async (key, value) => {
      const res = await propose(key, value);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFIG_SAFETY_LOCKED');
      expect(await actions(cid(res))).toEqual(['config.refused_locked']);
      const rollback = await w
        .as(w.admin1)
        .post(`/v1/config/${key}/rollback`, { to_version: 1, reason: 'try' });
      expect(rollback.status).toBe(409);
      expect((await versions(key)).map((v) => v.status)).toEqual(['active']);
    },
  );
});

describe('rollback', () => {
  it('creates a new version that restores the old value, through approval', async () => {
    const change = await propose('limits.transfer_max_minor', 900000);
    // The earlier test left a version 2 waiting for this setting; approve ours and look at the history.
    await w.decide(change.body.id, w.admin2);
    const before = await versions('limits.transfer_max_minor');
    const activeNow = before.find((v) => v.status === 'active')!;
    const back = await w.as(w.admin1).post('/v1/config/limits.transfer_max_minor/rollback', {
      to_version: 1,
      reason: 'the new limit was a mistake',
    });
    expect(back.status).toBe(201);
    expect(back.body.action_type).toBe('config.rollback');
    expect((await active('limits.transfer_max_minor')).value).toBe(900000); // nothing yet

    const done = await w.decide(back.body.id, w.admin2);
    expect(await actions(cid(done))).toEqual(['approval.decided', 'config.rolled_back']);
    const now = await versions('limits.transfer_max_minor');
    const restored = now.find((v) => v.status === 'active')!;
    expect(restored).toMatchObject({ value: 500000, rollback_of_version: 1 });
    expect(restored.version).toBeGreaterThan(activeNow.version);
    expect(now.find((v) => v.version === activeNow.version)!.status).toBe('superseded');
  });

  it('is refused with 422 when the old value no longer passes the current schema', async () => {
    // A value from before a schema was tightened: put there directly, as an older release would have left it.
    await w.t.admin.query(
      `INSERT INTO config.config_versions (id, key, version, value, effective_from, status, created_by, created_at)
       VALUES ('00000000-0000-7000-8000-0000000000e1','security.elevation.ttl_minutes',9,'1',$1,'superseded','old',$1)`,
      [w.t.clock.now().toISOString()],
    );
    const res = await w.as(w.admin1).post('/v1/config/security.elevation.ttl_minutes/rollback', {
      to_version: 9,
      reason: 'back to the old one',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CONFIG_INVALID');
    expect(res.body.error.details[0].path).toBe('to_version');
  });

  it('only goes back to a version that was once in force', async () => {
    const res = await w.as(w.admin1).post('/v1/config/features.flags/rollback', {
      to_version: 3, // stale
      reason: 'not allowed',
    });
    expect(res.status).toBe(422);
    expect(
      (
        await w
          .as(w.admin1)
          .post('/v1/config/features.flags/rollback', { to_version: 99, reason: 'x' })
      ).status,
    ).toBe(404);
  });
});

describe('diff', () => {
  it('returns the JSON Patch between two versions', async () => {
    const res = await w.as(w.admin1).get('/v1/config/features.flags/diff?from=1&to=2');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ key: 'features.flags', from: 1, to: 2 });
    expect(res.body.patch).toEqual([
      { op: 'remove', path: '/remittance' },
      { op: 'replace', path: '/paper_trading', value: true },
    ]);
    const plain = await w.as(w.admin1).get('/v1/config/fx.spread_bps/diff?from=1&to=2');
    expect(plain.body.patch).toEqual([{ op: 'replace', path: '', value: 25 }]);
  });

  it('422 for bad version numbers and 404 for a version that does not exist', async () => {
    expect((await w.as(w.admin1).get('/v1/config/features.flags/diff?from=x&to=2')).status).toBe(
      422,
    );
    expect((await w.as(w.admin1).get('/v1/config/features.flags/diff?from=1&to=99')).status).toBe(
      404,
    );
  });
});
