import type { ClockService, IdGenerator } from '@pdfe/platform-core';
import { AnchorRecorder } from '@pdfe/platform-core/audit';
import { withTx, type Pool } from '@pdfe/platform-core/db';

/** An anchor is due after this many new events, or after this long with at least one new event. */
export const ANCHOR_EVERY_EVENTS = 100;
export const ANCHOR_EVERY_MS = 60 * 60 * 1000;

/**
 * Anchors the head of the audit chain: after 100 new events, or an hour after the last anchor (or after the first
 * event, while there is no anchor yet), whichever comes first. An anchor is a second copy of one event's hash in an
 * append-only table, so rewriting the chain after the fact no longer matches it. Time comes from the injected clock.
 */
export class AnchorJob {
  private readonly anchors: AnchorRecorder;

  constructor(
    private readonly pool: Pool,
    private readonly clock: ClockService,
    ids: IdGenerator,
  ) {
    this.anchors = new AnchorRecorder(clock, ids);
  }

  /** Returns the sequence number anchored, or null when no anchor was due. */
  async runOnce(): Promise<number | null> {
    const now = this.clock.now().getTime();
    return withTx(this.pool, {}, async (tx) => {
      const head = await tx.client.query<{ seq: string; first_at: Date }>(
        `SELECT max(seq) AS seq, (SELECT occurred_at FROM audit.audit_events ORDER BY seq LIMIT 1) AS first_at
           FROM audit.audit_events`,
      );
      const headSeq = Number(head.rows[0]?.seq ?? 0);
      if (headSeq === 0) return null;
      const last = await tx.client.query<{ up_to_seq: string; created_at: Date }>(
        'SELECT up_to_seq, created_at FROM audit.anchors ORDER BY up_to_seq DESC, created_at DESC LIMIT 1',
      );
      const lastSeq = Number(last.rows[0]?.up_to_seq ?? 0);
      if (headSeq <= lastSeq) return null; // nothing new to anchor
      const since = (last.rows[0]?.created_at ?? head.rows[0]!.first_at).getTime();
      const due = headSeq - lastSeq >= ANCHOR_EVERY_EVENTS || now - since >= ANCHOR_EVERY_MS;
      if (!due) return null;
      return (await this.anchors.record(tx, { kind: 'periodic' })).upToSeq;
    });
  }
}
