import type { PoolClient } from 'pg';
import type { ClockService } from '../clock';
import { runWithContext } from '../correlation';
import { withTx, type Pool } from '../db';

/** An event as the relay publishes it and a consumer receives it. */
export interface OutboxMessage {
  /** The outbox row ID: the once-only key. */
  id: string;
  topic: string;
  tenantId: string | null;
  correlationId: string;
  payload: Record<string, unknown>;
}

/**
 * Base for queue consumers. Delivery is at-least-once, so every consumer records `(consumer, event_id)` in
 * `integration.inbox` in the same transaction as its work: a repeated event finds the row and does nothing.
 */
export abstract class BaseConsumer {
  constructor(
    protected readonly pool: Pool,
    protected readonly clock: ClockService,
    /** Stable name, part of the inbox key. */
    readonly name: string,
  ) {}

  /** The work, run at most once per event ID, inside the inbox transaction. */
  protected abstract handle(tx: { client: PoolClient }, message: OutboxMessage): Promise<void>;

  /**
   * Returns true if the event was processed now, false if it had been processed before. The work runs in the correlation
   * context of the event, so everything it logs, audits or sends carries the ID of the request that caused it.
   */
  async consume(message: OutboxMessage): Promise<boolean> {
    return runWithContext(
      {
        correlationId: message.correlationId,
        ...(message.tenantId ? { tenantId: message.tenantId } : {}),
      },
      () => this.consumeInContext(message),
    );
  }

  private consumeInContext(message: OutboxMessage): Promise<boolean> {
    return withTx(
      this.pool,
      {
        ...(message.tenantId ? { tenantId: message.tenantId } : {}),
        correlationId: message.correlationId,
      },
      async (tx) => {
        const first = await tx.client.query(
          `INSERT INTO integration.inbox (consumer, event_id, processed_at) VALUES ($1,$2,$3)
           ON CONFLICT DO NOTHING`,
          [this.name, message.id, this.clock.now().toISOString()],
        );
        if (!first.rowCount) return false;
        await this.handle(tx, message);
        return true;
      },
    );
  }
}
