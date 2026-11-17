import type { PoolClient } from 'pg';
import type { ClockService } from '../clock';
import type { IdGenerator } from '../ids';
import { GENESIS_HASH } from './chain';

export interface AnchorInput {
  kind: 'periodic' | 'epoch_start';
  /** Required for `epoch_start` (the demo run it begins), forbidden otherwise. */
  epochLabel?: string;
}

export interface AnchorRecord {
  id: string;
  upToSeq: number;
  hash: string;
}

/**
 * Writes an anchor: the head of the chain as it is right now. It takes the audit lock, so the head is exact and no
 * event can slip in between reading it and recording the anchor. An empty chain anchors at seq 0 with the genesis hash.
 */
export class AnchorRecorder {
  constructor(
    private readonly clock: ClockService,
    private readonly ids: IdGenerator,
  ) {}

  async record(tx: { client: PoolClient }, a: AnchorInput): Promise<AnchorRecord> {
    if ((a.kind === 'epoch_start') !== (a.epochLabel !== undefined)) {
      throw new Error(
        'anchor: epochLabel is required for epoch_start and not allowed for periodic',
      );
    }
    await tx.client.query("SELECT pg_advisory_xact_lock(hashtext('audit'))");
    const head = await tx.client.query<{ seq: string; hash: string }>(
      'SELECT seq, hash FROM audit.audit_events ORDER BY seq DESC LIMIT 1',
    );
    const upToSeq = Number(head.rows[0]?.seq ?? 0);
    const hash = head.rows[0]?.hash ?? GENESIS_HASH;
    const id = this.ids.next();
    await tx.client.query(
      `INSERT INTO audit.anchors (id, up_to_seq, hash, kind, epoch_label, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, upToSeq, hash, a.kind, a.epochLabel ?? null, this.clock.now().toISOString()],
    );
    return { id, upToSeq, hash };
  }
}
