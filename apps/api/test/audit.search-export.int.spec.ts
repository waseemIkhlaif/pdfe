import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SIM_LABEL } from '@pdfe/platform-core/sim-label';
import { withTx } from '@pdfe/platform-core/db';
import { AuditService } from '../src/audit/audit.service';
import { createWorld, type World } from './support/world';
import type { TestUser } from './support/test-app';

let w: World;
let auditor: TestUser;
let analyst: TestUser; // compliance_analyst: audit.read only
let otherTenant: string;
const BULK = 520; // more than one export batch (500)

const api = () => request(w.t.app.getHttpServer());
const authHeader = async (u: TestUser) => `Bearer ${await w.t.token(u, { otp: true })}`;
const get = async (u: TestUser, path: string) =>
  api()
    .get(path)
    .set('Authorization', await authHeader(u));

/** The oracle: the same filter written as SQL, straight on the table. */
const sqlSeqs = async (where: string, params: unknown[] = []) =>
  (
    await w.t.admin.query(`SELECT seq FROM audit.audit_events WHERE ${where} ORDER BY seq`, params)
  ).rows.map((r) => Number(r.seq));
const allPages = async (u: TestUser, query: string): Promise<{ seq: number }[]> => {
  const out: { seq: number }[] = [];
  let cursor: number | null = null;
  do {
    const res = await get(
      u,
      `/v1/audit/events?${query}&limit=100${cursor ? `&cursor=${cursor}` : ''}`,
    );
    expect(res.status).toBe(200);
    out.push(...res.body.items);
    cursor = res.body.next_cursor;
  } while (cursor);
  return out;
};

beforeAll(async () => {
  w = await createWorld();
  auditor = await w.t.createUser('auditor', w.tenant, ['auditor']);
  analyst = await w.t.createUser('analyst', w.tenant, ['compliance_analyst']);
  otherTenant = await w.t.createTenant('other');

  // A varied history, with the clock moving between phases so time ranges mean something.
  const target = await w.t.createUser('target', w.tenant, ['individual']);
  const req = await w.requestGrant(target, 'merchant_owner');
  w.t.clock.advance(60_000);
  await w.decide(req.body.id, w.admin2);
  w.t.clock.advance(60_000);
  const audit = w.t.app.get(AuditService);
  await withTx(w.t.pool, {}, async (tx) => {
    for (let i = 0; i < BULK; i++) {
      await audit.record(tx, {
        tenantId: i % 2 === 0 ? w.tenant : otherTenant,
        actorId: i % 3 === 0 ? w.admin1.id : null,
        actorRole: 'test',
        action: 'test.bulk',
        correlationId: `COR-bulk${i % 5}`,
        reason: i === 7 ? 'has a comma, a "quote"\nand a line break' : null,
        data: { i },
      });
    }
  });
});
afterAll(async () => {
  await w?.t.close();
});

describe('search', () => {
  it('filters by actor, action, tenant and correlation ID, returning exactly the matching events', async () => {
    const byActor = await allPages(auditor, `actor=${w.admin1.id}`);
    expect(byActor.map((e) => e.seq).sort((a, b) => a - b)).toEqual(
      await sqlSeqs('actor_id = $1', [w.admin1.id]),
    );

    const byAction = await allPages(auditor, 'action=approval.decided');
    expect(byAction.map((e) => e.seq).sort((a, b) => a - b)).toEqual(
      await sqlSeqs("action = 'approval.decided'"),
    );
    expect(byAction.length).toBeGreaterThan(0);

    const byTenant = await allPages(auditor, `tenant=${otherTenant}`);
    expect(byTenant.length).toBe(BULK / 2);
    expect(
      byTenant.every((e) => (e as unknown as { tenant_id: string }).tenant_id === otherTenant),
    ).toBe(true);

    const byCorrelation = await allPages(auditor, 'correlation_id=COR-bulk3');
    expect(byCorrelation.length).toBe(BULK / 5);

    const combined = await allPages(
      auditor,
      `action=test.bulk&tenant=${w.tenant}&actor=${w.admin1.id}`,
    );
    expect(combined.map((e) => e.seq).sort((a, b) => a - b)).toEqual(
      await sqlSeqs("action = 'test.bulk' AND tenant_id = $1 AND actor_id = $2", [
        w.tenant,
        w.admin1.id,
      ]),
    );
  });

  it('filters by time range', async () => {
    const rows = (
      await w.t.admin.query(
        'SELECT DISTINCT occurred_at FROM audit.audit_events ORDER BY occurred_at',
      )
    ).rows;
    expect(rows.length).toBeGreaterThanOrEqual(3); // the clock moved twice
    const middle = (rows[1].occurred_at as Date).toISOString();
    const from = await allPages(auditor, `from=${encodeURIComponent(middle)}`);
    expect(from.map((e) => e.seq).sort((a, b) => a - b)).toEqual(
      await sqlSeqs('occurred_at >= $1', [middle]),
    );
    const to = await allPages(auditor, `to=${encodeURIComponent(middle)}`);
    expect(to.map((e) => e.seq).sort((a, b) => a - b)).toEqual(
      await sqlSeqs('occurred_at <= $1', [middle]),
    );
    const both = await allPages(
      auditor,
      `from=${encodeURIComponent(middle)}&to=${encodeURIComponent(middle)}`,
    );
    expect(both.map((e) => e.seq).sort((a, b) => a - b)).toEqual(
      await sqlSeqs('occurred_at = $1', [middle]),
    );
  });

  it('pages newest first with a cursor, never more than 100 a page, with no event twice or missed', async () => {
    const first = await get(auditor, '/v1/audit/events');
    expect(first.body.items).toHaveLength(50); // the default page
    const seqs = first.body.items.map((e: { seq: number }) => e.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => b - a));
    const max = await get(auditor, '/v1/audit/events?limit=100');
    expect(max.body.items).toHaveLength(100);
    expect((await get(auditor, '/v1/audit/events?limit=101')).status).toBe(422);
    expect((await get(auditor, '/v1/audit/events?limit=0')).status).toBe(422);

    const everything = await allPages(auditor, '');
    const total = Number(
      (await w.t.admin.query('SELECT count(*) n FROM audit.audit_events')).rows[0].n,
    );
    expect(everything).toHaveLength(total);
    expect(new Set(everything.map((e) => e.seq)).size).toBe(total);
  });

  it('refuses malformed filters with 422', async () => {
    for (const q of [
      'actor=nope',
      'tenant=123',
      'from=yesterday',
      'cursor=abc',
      'correlation_id=' + 'x'.repeat(65),
    ]) {
      expect((await get(auditor, `/v1/audit/events?${q}`)).status, q).toBe(422);
    }
  });

  it('each event carries its chain fields', async () => {
    const e = (await get(auditor, '/v1/audit/events?limit=1')).body.items[0];
    expect(Object.keys(e).sort()).toEqual(
      [
        'action',
        'actor_id',
        'actor_role',
        'approval_request_id',
        'correlation_id',
        'data',
        'elevation_id',
        'hash',
        'id',
        'occurred_at',
        'prev_hash',
        'reason',
        'seq',
        'target_id',
        'target_type',
        'tenant_id',
      ].sort(),
    );
    expect(e.hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('export', () => {
  const filter = 'action=test.bulk';

  it('CSV: the first line is the simulation label, then the header, then exactly the matching events', async () => {
    const res = await get(auditor, `/v1/audit/export?format=csv&${filter}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="pdfe-audit-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    const text = res.text;
    expect(text.split('\n')[0]).toBe(`# ${SIM_LABEL}`);
    expect(text.split('\n')[1]).toMatch(/^seq,id,occurred_at,tenant_id,/);
    // Parse with quotes honoured: the event with a comma, quotes and a line break stays one record.
    const records = parseCsv(text.split('\n').slice(1).join('\n'));
    expect(records).toHaveLength(1 + BULK); // header + events (more than one 500-event batch)
    const seqs = records.slice(1).map((r) => Number(r[0]));
    expect(seqs).toEqual(await sqlSeqs("action = 'test.bulk'"));
    const tricky = records.find((r) => r[9]?.startsWith('has a comma'));
    expect(tricky?.[9]).toBe('has a comma, a "quote"\nand a line break');
  });

  it('JSON: meta.label, the filters, and exactly the matching events in order', async () => {
    const res = await get(auditor, `/v1/audit/export?format=json&${filter}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    const body = JSON.parse(res.text);
    expect(body.meta.label).toBe(SIM_LABEL);
    expect(body.meta.filters).toEqual({ action: 'test.bulk' });
    expect(body.events.map((e: { seq: number }) => e.seq)).toEqual(
      await sqlSeqs("action = 'test.bulk'"),
    );
  });

  it('an export of nothing is still a valid, labelled file', async () => {
    const json = JSON.parse(
      (await get(auditor, '/v1/audit/export?format=json&action=no.such.action')).text,
    );
    expect(json.meta.label).toBe(SIM_LABEL);
    expect(json.events).toEqual([]);
    const csv = (await get(auditor, '/v1/audit/export?format=csv&action=no.such.action')).text;
    expect(csv.split('\n')[0]).toBe(`# ${SIM_LABEL}`);
  });

  it('refuses an unknown or missing format with 422, and sends nothing', async () => {
    for (const q of ['format=xml', '', 'format=csv&actor=nope']) {
      const res = await get(auditor, `/v1/audit/export?${q}`);
      expect(res.status, q).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('is itself audited, with the format and the filters', async () => {
    const rows = (
      await w.t.admin.query(
        "SELECT * FROM audit.audit_events WHERE action = 'audit.exported' ORDER BY seq",
      )
    ).rows;
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const e = rows.find((r) => r.data.format === 'json' && r.data.filters.action === 'test.bulk')!;
    expect(e.actor_id).toBe(auditor.id);
    expect(e.tenant_id).toBe(w.tenant);
    expect(e.correlation_id).toBeTruthy();
  });
});

describe('verify', () => {
  it('returns ok on the real chain and records audit.verified', async () => {
    const res = await w.as(auditor).post('/v1/audit/verify');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ result: 'ok', from_seq: 1 });
    const e = (
      await w.t.admin.query(
        "SELECT * FROM audit.audit_events WHERE action = 'audit.verified' ORDER BY seq DESC LIMIT 1",
      )
    ).rows[0];
    expect(e.actor_id).toBe(auditor.id);
    expect(e.data.result).toBe('ok');
  });

  it('takes a range, and refuses a malformed one', async () => {
    const r = await w.as(auditor).post('/v1/audit/verify', { from_seq: 5, to_seq: 50 });
    expect(r.body).toMatchObject({ result: 'ok', from_seq: 5, to_seq: 50, events: 46 });
    expect((await w.as(auditor).post('/v1/audit/verify', { from_seq: 9, to_seq: 3 })).status).toBe(
      422,
    );
    expect((await w.as(auditor).post('/v1/audit/verify', { from_seq: 0 })).status).toBe(422);
  });

  it('records a broken result with the failing event', async () => {
    await w.t.admin.query(
      'ALTER TABLE audit.audit_events DISABLE TRIGGER trg_audit_events_append_only',
    );
    const orig = (await w.t.admin.query('SELECT reason FROM audit.audit_events WHERE seq = 4'))
      .rows[0].reason;
    try {
      await w.t.admin.query("UPDATE audit.audit_events SET reason = 'tampered' WHERE seq = 4");
      const res = await w.as(auditor).post('/v1/audit/verify');
      expect(res.body).toEqual({ result: 'broken', seq: 4, reason: 'hash_mismatch' });
      const e = (
        await w.t.admin.query(
          "SELECT data FROM audit.audit_events WHERE action = 'audit.verified' ORDER BY seq DESC LIMIT 1",
        )
      ).rows[0];
      expect(e.data).toMatchObject({ result: 'broken', seq: 4, reason: 'hash_mismatch' });
    } finally {
      await w.t.admin.query('UPDATE audit.audit_events SET reason = $1 WHERE seq = 4', [orig]);
      await w.t.admin.query(
        'ALTER TABLE audit.audit_events ENABLE TRIGGER trg_audit_events_append_only',
      );
    }
  });
});

describe('permissions', () => {
  it('audit.read alone (compliance analyst) can search but not export or verify', async () => {
    expect((await get(analyst, '/v1/audit/events')).status).toBe(200);
    expect((await get(analyst, '/v1/audit/export?format=csv')).status).toBe(403);
    expect((await w.as(analyst).post('/v1/audit/verify')).status).toBe(403);
  });

  it('a role with none of the audit permissions gets 403 on all three', async () => {
    expect((await get(w.admin1, '/v1/audit/events')).status).toBe(403);
    expect((await get(w.admin1, '/v1/audit/export?format=csv')).status).toBe(403);
    expect((await w.as(w.admin1).post('/v1/audit/verify')).status).toBe(403);
    const individual = await w.t.createUser('plain', w.tenant, ['individual']);
    expect(
      (
        await api()
          .get('/v1/audit/events')
          .set('Authorization', `Bearer ${await w.t.token(individual)}`)
      ).status,
    ).toBe(403);
  });

  it('refused calls leave no export or verification event', async () => {
    const before = Number(
      (
        await w.t.admin.query(
          "SELECT count(*) n FROM audit.audit_events WHERE action IN ('audit.exported','audit.verified')",
        )
      ).rows[0].n,
    );
    await get(analyst, '/v1/audit/export?format=csv');
    await w.as(analyst).post('/v1/audit/verify');
    const after = Number(
      (
        await w.t.admin.query(
          "SELECT count(*) n FROM audit.audit_events WHERE action IN ('audit.exported','audit.verified')",
        )
      ).rows[0].n,
    );
    expect(after).toBe(before);
  });
});

/** Minimal RFC 4180 reader: quoted fields may hold commas, doubled quotes and line breaks. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
