import { Inject, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { IdGenerator, type ClockService } from '@pdfe/platform-core';
import { CLOCK } from '../core/tokens';

export interface OutboxEventInput {
  /** Topic, e.g. `approval.requested` (contracts/events-and-config.md). */
  topic: string;
  payload: Record<string, unknown>;
  tenantId?: string | null;
  correlationId: string;
}

/**
 * Writes an event in the caller's transaction, so the event exists exactly when its cause does: a rollback
 * leaves no event. The worker's relay publishes it afterwards (at-least-once).
 */
@Injectable()
export class OutboxWriter {
  constructor(
    @Inject(CLOCK) private readonly clock: ClockService,
    private readonly ids: IdGenerator,
  ) {}

  async write(tx: { client: PoolClient }, e: OutboxEventInput): Promise<string> {
    const id = this.ids.next();
    await tx.client.query(
      `INSERT INTO integration.outbox (id, tenant_id, topic, payload, correlation_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        e.tenantId ?? null,
        e.topic,
        JSON.stringify(e.payload),
        e.correlationId,
        this.clock.now().toISOString(),
      ],
    );
    return id;
  }
}
