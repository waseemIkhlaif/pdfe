import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { IdGenerator, getContext, type ClockService } from '@pdfe/platform-core';
import { AuditRecorder } from '@pdfe/platform-core/audit';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import { CSV_LABEL_LINE, jsonWithLabel } from '@pdfe/platform-core/sim-label';
import { parseInput } from '../common/validate';
import { CLOCK, PG_POOL } from '../core/tokens';
import type { Principal } from '../identity/principal';
import { AuditVerifier, type VerifyResult } from './audit.verifier';

export type { AuditEventInput, AuditRecord } from '@pdfe/platform-core/audit';

export interface AuditEventView {
  seq: number;
  id: string;
  tenant_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  approval_request_id: string | null;
  elevation_id: string | null;
  correlation_id: string;
  occurred_at: string;
  data: Record<string, unknown>;
  prev_hash: string;
  hash: string;
}

const isoDate = z.string().datetime({ offset: true });
export const filterSchema = z.object({
  actor: z.string().uuid().optional(),
  action: z.string().min(1).max(100).optional(),
  tenant: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  correlation_id: z.string().min(1).max(64).optional(),
});
export const searchSchema = filterSchema.extend({
  cursor: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export const exportSchema = filterSchema.extend({ format: z.enum(['csv', 'json']) });
export const verifySchema = z
  .object({
    from_seq: z.number().int().min(1).optional(),
    to_seq: z.number().int().min(1).optional(),
  })
  .refine((v) => v.from_seq === undefined || v.to_seq === undefined || v.from_seq <= v.to_seq, {
    message: 'from_seq must not be after to_seq',
    path: ['to_seq'],
  });

type Filters = z.infer<typeof filterSchema>;

const COLUMNS = `seq, id, tenant_id, actor_id, actor_role, action, target_type, target_id, reason,
  approval_request_id, elevation_id, correlation_id, occurred_at, data, prev_hash, hash`;

interface DbRow extends Omit<AuditEventView, 'seq' | 'occurred_at'> {
  seq: string;
  occurred_at: Date;
}
const toView = (r: DbRow): AuditEventView => ({
  ...r,
  seq: Number(r.seq),
  occurred_at: r.occurred_at.toISOString(),
});

/** Builds the WHERE clause of a search; every value is a bound parameter. */
function where(
  f: Filters,
  extra: string[] = [],
  extraParams: unknown[] = [],
): { sql: string; params: unknown[] } {
  const parts = [...extra];
  const params = [...extraParams];
  const add = (cond: string, v: unknown) => {
    params.push(v);
    parts.push(cond.replace('?', `$${params.length}`));
  };
  if (f.actor) add('actor_id = ?', f.actor);
  if (f.action) add('action = ?', f.action);
  if (f.tenant) add('tenant_id = ?', f.tenant);
  if (f.from) add('occurred_at >= ?', f.from);
  if (f.to) add('occurred_at <= ?', f.to);
  if (f.correlation_id) add('correlation_id = ?', f.correlation_id);
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params };
}

const CSV_HEADER = [
  'seq',
  'id',
  'occurred_at',
  'tenant_id',
  'actor_id',
  'actor_role',
  'action',
  'target_type',
  'target_id',
  'reason',
  'approval_request_id',
  'elevation_id',
  'correlation_id',
  'data',
  'prev_hash',
  'hash',
] as const;

/** RFC 4180: quote a field that holds a comma, a quote or a line break; double the quotes inside. */
const csvField = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const csvLine = (e: AuditEventView): string =>
  CSV_HEADER.map((k) => csvField(e[k as keyof AuditEventView])).join(',');

const EXPORT_BATCH = 500;

/**
 * The audit trail: the shared recorder (append in the caller's transaction, one linear hash chain) plus what an
 * auditor does with it: search, a labelled export, and chain verification. Exporting and verifying are themselves
 * audited, so a look at the trail leaves a mark on it.
 */
@Injectable()
export class AuditService extends AuditRecorder {
  constructor(
    @Inject(CLOCK) clock: ClockService,
    ids: IdGenerator,
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly verifier: AuditVerifier,
  ) {
    super(clock, ids);
  }

  /** Matching events, newest first, at most 100 per page. */
  async search(query: unknown): Promise<{ items: AuditEventView[]; next_cursor: number | null }> {
    const q = parseInput(searchSchema, query);
    const w = where(q, q.cursor ? ['seq < $1'] : [], q.cursor ? [q.cursor] : []);
    w.params.push(q.limit + 1);
    const r = await this.pool.query<DbRow>(
      `SELECT ${COLUMNS} FROM audit.audit_events ${w.sql} ORDER BY seq DESC LIMIT $${w.params.length}`,
      w.params,
    );
    const rows = r.rows.slice(0, q.limit).map(toView);
    return {
      items: rows,
      next_cursor: r.rows.length > q.limit ? rows[rows.length - 1]!.seq : null,
    };
  }

  /** Verifies the chain and records `audit.verified` with the outcome. */
  async verify(p: Principal, body: unknown): Promise<VerifyResult> {
    const input = parseInput(verifySchema, body ?? {});
    const result = await this.verifier.verify({
      ...(input.from_seq !== undefined ? { fromSeq: input.from_seq } : {}),
      ...(input.to_seq !== undefined ? { toSeq: input.to_seq } : {}),
    });
    const correlationId = getContext()?.correlationId ?? 'unknown';
    await withTx(this.pool, { tenantId: p.tenantId, correlationId }, (tx) =>
      this.record(tx, {
        tenantId: p.tenantId,
        actorId: p.userId,
        actorRole: p.roles[0] ?? null,
        action: 'audit.verified',
        targetType: 'audit_chain',
        correlationId,
        data: {
          from_seq: input.from_seq ?? 1,
          to_seq: input.to_seq ?? null,
          result: result.result,
          ...(result.result === 'broken' ? { seq: result.seq, reason: result.reason } : {}),
        },
      }),
    );
    return result;
  }

  /**
   * Validates the request and records `audit.exported`, then returns a generator of text chunks: the label first, then
   * the matching events in `seq` order, read in batches inside one snapshot, so the file holds exactly the events that
   * matched when it started. Validation happens before the first chunk, so a bad request is still a normal 422.
   */
  async prepareExport(
    p: Principal,
    query: unknown,
  ): Promise<{ format: 'csv' | 'json'; filename: string; chunks: () => AsyncGenerator<string> }> {
    const q = parseInput(exportSchema, query);
    const { format, ...filters } = q;
    const correlationId = getContext()?.correlationId ?? 'unknown';
    await withTx(this.pool, { tenantId: p.tenantId, correlationId }, (tx) =>
      this.record(tx, {
        tenantId: p.tenantId,
        actorId: p.userId,
        actorRole: p.roles[0] ?? null,
        action: 'audit.exported',
        targetType: 'audit_chain',
        correlationId,
        data: { format, filters },
      }),
    );
    const generatedAt = this.clock.now().toISOString();
    const pool = this.pool;
    async function* chunks(): AsyncGenerator<string> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
        if (format === 'csv') {
          yield `${CSV_LABEL_LINE}${CSV_HEADER.join(',')}\n`;
        } else {
          const { meta } = jsonWithLabel({}, { generated_at: generatedAt, filters });
          yield `{"meta":${JSON.stringify(meta)},"events":[`;
        }
        let last = 0;
        let first = true;
        for (;;) {
          const w = where(filters, ['seq > $1'], [last]);
          w.params.push(EXPORT_BATCH);
          const r = await client.query<DbRow>(
            `SELECT ${COLUMNS} FROM audit.audit_events ${w.sql} ORDER BY seq LIMIT $${w.params.length}`,
            w.params,
          );
          if (r.rows.length === 0) break;
          const out = r.rows.map(toView);
          last = out[out.length - 1]!.seq;
          yield format === 'csv'
            ? out
                .map(
                  (e) => `${csvLine(e)}
`,
                )
                .join('')
            : out.map((e, i) => `${first && i === 0 ? '' : ','}${JSON.stringify(e)}`).join('');
          first = false;
        }
        if (format === 'json') yield ']}\n';
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    }
    // The file name carries the date only, not the person or the filters.
    return { format, filename: `pdfe-audit-${generatedAt.slice(0, 10)}.${format}`, chunks };
  }
}
