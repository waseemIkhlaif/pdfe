import type { ClockService } from '@pdfe/platform-core';
import { withTx, type Pool } from '@pdfe/platform-core/db';
import type { OutboxMessage } from '@pdfe/platform-core/queue';

/** Where published events go. Production: BullMQ queues. Tests: an in-memory list. */
export interface EventPublisher {
  publish(message: OutboxMessage): Promise<void>;
}

export interface RelayResult {
  published: number;
  failed: number;
}

/** After this many failed tries an event raises an alert log line. It keeps being retried, with backoff. */
export const ALERT_AFTER_ATTEMPTS = 10;
const MAX_BACKOFF_SECONDS = 300;

interface Row {
  id: string;
  tenant_id: string | null;
  topic: string;
  payload: Record<string, unknown>;
  correlation_id: string;
  attempts: number;
}

/**
 * Publishes unpublished outbox rows (data-model §Lifecycles). Each run takes a batch with
 * `FOR UPDATE SKIP LOCKED`, so any number of relays can run and each event goes out once per success. Rows stay
 * locked while they are published, and `published_at` is set in the same transaction.
 *
 * Backoff needs no extra column: after n failed tries a row is eligible again only when it is older than
 * 2^n seconds (at most 5 minutes), so retries get rarer as failures pile up.
 */
export class OutboxRelay {
  constructor(
    private readonly pool: Pool,
    private readonly clock: ClockService,
    private readonly publisher: EventPublisher,
    private readonly log: (line: Record<string, unknown>) => void = (l) =>
      console.error(JSON.stringify(l)),
  ) {}

  async runOnce(limit = 50): Promise<RelayResult> {
    const now = this.clock.now();
    return withTx(this.pool, {}, async ({ client }) => {
      const rows = await client.query<Row>(
        `SELECT id, tenant_id, topic, payload, correlation_id, attempts
           FROM integration.outbox
          WHERE published_at IS NULL
            AND (attempts = 0
                 OR created_at <= $1::timestamptz - make_interval(secs => least(power(2, attempts), $3)))
          ORDER BY created_at, id
          LIMIT $2
          FOR UPDATE SKIP LOCKED`,
        [now.toISOString(), limit, MAX_BACKOFF_SECONDS],
      );
      const result: RelayResult = { published: 0, failed: 0 };
      for (const r of rows.rows) {
        try {
          await this.publisher.publish({
            id: r.id,
            topic: r.topic,
            tenantId: r.tenant_id,
            correlationId: r.correlation_id,
            payload: r.payload,
          });
          await client.query(
            'UPDATE integration.outbox SET published_at = $2, attempts = attempts + 1 WHERE id = $1',
            [r.id, now.toISOString()],
          );
          result.published += 1;
        } catch (err) {
          const attempts = r.attempts + 1;
          await client.query('UPDATE integration.outbox SET attempts = $2 WHERE id = $1', [
            r.id,
            attempts,
          ]);
          result.failed += 1;
          if (attempts >= ALERT_AFTER_ATTEMPTS) {
            this.log({
              level: 'alert',
              msg: 'outbox event could not be published',
              event_id: r.id,
              topic: r.topic,
              attempts,
              error: (err as Error).message,
            });
          }
        }
      }
      return result;
    });
  }
}
