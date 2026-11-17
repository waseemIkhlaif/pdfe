import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
import { withCorrelation, type OutboxMessage } from '@pdfe/platform-core/queue';
import type { EventPublisher } from './outbox-relay.job';

/**
 * One BullMQ queue per topic family (`approval.approved` goes to `pdfe-approval`). The outbox row ID is the job
 * ID, so publishing the same row twice creates one job.
 */
export class BullPublisher implements EventPublisher {
  private readonly queues = new Map<string, Queue>();

  constructor(private readonly connection: Redis) {}

  async publish(message: OutboxMessage): Promise<void> {
    const family = message.topic.split('.')[0] ?? 'misc';
    let q = this.queues.get(family);
    if (!q) {
      q = new Queue(`pdfe-${family}`, { connection: this.connection });
      this.queues.set(family, q);
    }
    // `correlation_id` is on the job data, next to the message, for consumers and tools that read it from there.
    await q.add(message.topic, withCorrelation(message, message.correlationId), {
      jobId: message.id,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }

  async close(): Promise<void> {
    await Promise.all([...this.queues.values()].map((q) => q.close()));
  }
}
