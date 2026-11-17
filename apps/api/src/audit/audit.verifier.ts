import { Inject, Injectable } from '@nestjs/common';
import { GENESIS_HASH, chainHash, type AuditHashRow } from '@pdfe/platform-core/audit';
import type { Pool } from '@pdfe/platform-core/db';
import { PG_POOL } from '../core/tokens';

export type BrokenReason = 'hash_mismatch' | 'prev_link_mismatch' | 'seq_gap' | 'anchor_mismatch';

export type VerifyResult =
  | {
      result: 'ok';
      from_seq: number;
      to_seq: number;
      events: number;
      anchors_checked: number;
    }
  | {
      result: 'broken';
      /** The first event that does not check out (or, for an anchor, the sequence number it points to). */
      seq: number;
      reason: BrokenReason;
      /** Set when an anchor is the problem. */
      anchor_id?: string;
    };

export interface VerifyRange {
  fromSeq?: number;
  toSeq?: number;
  /** Verify from the start of an audit epoch (a demo run): after the `epoch_start` anchor of this label. */
  epoch?: string;
}

interface EventRow {
  seq: string;
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
  occurred_at: Date;
  data: Record<string, unknown>;
  prev_hash: string;
  hash: string;
}

const BATCH = 1000;

/** The row as it was hashed when it was written (without `seq` and `hash`). */
export function toHashRow(r: EventRow): AuditHashRow {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    actor_id: r.actor_id,
    actor_role: r.actor_role,
    action: r.action,
    target_type: r.target_type,
    target_id: r.target_id,
    reason: r.reason,
    approval_request_id: r.approval_request_id,
    elevation_id: r.elevation_id,
    correlation_id: r.correlation_id,
    occurred_at: r.occurred_at.toISOString(),
    data: r.data,
    prev_hash: r.prev_hash,
  };
}

/**
 * Walks the audit chain in `seq` order and returns the first failure, or `ok`. For each event it checks, in this
 * order, that the sequence has no gap, that `prev_hash` is the previous event's hash, and that `hash` is the hash of the
 * row's own content. Then it checks every anchor in range against the event it points to, so a chain that was
 * rewritten consistently from some point on is still caught. Events are read in batches, never all at once.
 */
@Injectable()
export class AuditVerifier {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async verify(range: VerifyRange = {}): Promise<VerifyResult> {
    let fromSeq = range.fromSeq ?? 1;
    if (range.epoch !== undefined) {
      const a = await this.pool.query<{ up_to_seq: string }>(
        `SELECT up_to_seq FROM audit.anchors WHERE kind = 'epoch_start' AND epoch_label = $1
          ORDER BY up_to_seq DESC, created_at DESC LIMIT 1`,
        [range.epoch],
      );
      if (!a.rows[0]) throw new Error(`no epoch anchor named ${range.epoch}`);
      fromSeq = Number(a.rows[0].up_to_seq) + 1;
    }
    const head = await this.pool.query<{ seq: string | null }>(
      'SELECT max(seq) AS seq FROM audit.audit_events',
    );
    const headSeq = Number(head.rows[0]?.seq ?? 0);
    const toSeq = range.toSeq ?? headSeq;

    // Where the chain starts: the genesis hash, or the hash of the event just before the range.
    let expectedPrev = GENESIS_HASH;
    if (fromSeq > 1) {
      const before = await this.pool.query<{ hash: string }>(
        'SELECT hash FROM audit.audit_events WHERE seq = $1',
        [fromSeq - 1],
      );
      if (!before.rows[0]) return { result: 'broken', seq: fromSeq - 1, reason: 'seq_gap' };
      expectedPrev = before.rows[0].hash;
    }

    let expectedSeq = fromSeq;
    let events = 0;
    let cursor = fromSeq - 1;
    for (;;) {
      const batch = await this.pool.query<EventRow>(
        'SELECT * FROM audit.audit_events WHERE seq > $1 AND seq <= $2 ORDER BY seq LIMIT $3',
        [cursor, toSeq, BATCH],
      );
      if (batch.rows.length === 0) break;
      for (const r of batch.rows) {
        const seq = Number(r.seq);
        if (seq !== expectedSeq) return { result: 'broken', seq: expectedSeq, reason: 'seq_gap' };
        if (r.prev_hash !== expectedPrev)
          return { result: 'broken', seq, reason: 'prev_link_mismatch' };
        if (chainHash(r.prev_hash, toHashRow(r)) !== r.hash) {
          return { result: 'broken', seq, reason: 'hash_mismatch' };
        }
        expectedPrev = r.hash;
        expectedSeq += 1;
        events += 1;
        cursor = seq;
      }
    }

    const anchors = await this.checkAnchors(fromSeq - 1, range.toSeq);
    if (anchors.broken) return anchors.broken;
    return {
      result: 'ok',
      from_seq: fromSeq,
      to_seq: events > 0 ? expectedSeq - 1 : toSeq,
      events,
      anchors_checked: anchors.checked,
    };
  }

  /** Every anchor from `fromSeq` on (to `toSeq` when given) must equal the event it points to. */
  private async checkAnchors(
    fromSeq: number,
    toSeq: number | undefined,
  ): Promise<{ checked: number; broken?: VerifyResult }> {
    const anchors = await this.pool.query<{ id: string; up_to_seq: string; hash: string }>(
      `SELECT id, up_to_seq, hash FROM audit.anchors
        WHERE up_to_seq >= $1 AND ($2::bigint IS NULL OR up_to_seq <= $2)
        ORDER BY up_to_seq, created_at`,
      [Math.max(fromSeq, 0), toSeq ?? null],
    );
    let checked = 0;
    for (const a of anchors.rows) {
      const seq = Number(a.up_to_seq);
      let actual: string | undefined = GENESIS_HASH;
      if (seq > 0) {
        const e = await this.pool.query<{ hash: string }>(
          'SELECT hash FROM audit.audit_events WHERE seq = $1',
          [seq],
        );
        actual = e.rows[0]?.hash;
      }
      if (actual !== a.hash) {
        return {
          checked,
          broken: { result: 'broken', seq, reason: 'anchor_mismatch', anchor_id: a.id },
        };
      }
      checked += 1;
    }
    return { checked };
  }
}
