import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Redis } from 'ioredis';
import { IdGenerator, SystemClock, SystemRandom } from '@pdfe/platform-core';
import { AuditRecorder } from '@pdfe/platform-core/audit';
import { createPool, type Pool } from '@pdfe/platform-core/db';
import { AnchorJob } from './audit-anchor/anchor.job';
import { ApprovalsExpiryJob } from './approvals-expiry/expiry.job';
import { ElevationExpiryJob } from './elevation-expiry/expiry.job';
import { BullPublisher } from './outbox-relay/bull.publisher';
import { OutboxRelay } from './outbox-relay/outbox-relay.job';

/** Starts the recurring jobs: the outbox relay every second, the two expiry jobs every 30 seconds. */
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger('jobs');
  private readonly timers: NodeJS.Timeout[] = [];
  private pool?: Pool;
  private redis?: Redis;
  private publisher?: BullPublisher;

  onModuleInit(): void {
    const url = process.env.DATABASE_URL;
    const redisUrl = process.env.REDIS_URL;
    if (!url || !redisUrl) {
      this.log.warn('DATABASE_URL or REDIS_URL is not set: recurring jobs are not started');
      return;
    }
    const clock = new SystemClock();
    const ids = new IdGenerator(clock, new SystemRandom());
    const audit = new AuditRecorder(clock, ids);
    this.pool = createPool(url, 4);
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.publisher = new BullPublisher(this.redis);

    const relay = new OutboxRelay(this.pool, clock, this.publisher);
    const approvals = new ApprovalsExpiryJob(this.pool, clock, ids, audit);
    const elevations = new ElevationExpiryJob(this.pool, clock, ids, audit);
    const anchors = new AnchorJob(this.pool, clock, ids);
    this.every('outbox-relay', 1_000, () => relay.runOnce());
    this.every('audit-anchor', 30_000, () => anchors.runOnce());
    this.every('approvals-expiry', 30_000, () => approvals.runOnce());
    this.every('elevation-expiry', 30_000, () => elevations.runOnce());
  }

  /** Runs a job on an interval, never overlapping itself, and logs a failure instead of crashing the worker. */
  private every(name: string, ms: number, job: () => Promise<unknown>): void {
    let running = false;
    this.timers.push(
      setInterval(() => {
        if (running) return;
        running = true;
        job()
          .catch((err: unknown) => this.log.error(`${name} failed: ${(err as Error).message}`))
          .finally(() => {
            running = false;
          });
      }, ms),
    );
  }

  async onModuleDestroy(): Promise<void> {
    for (const t of this.timers) clearInterval(t);
    await this.publisher?.close().catch(() => undefined);
    this.redis?.disconnect();
    await this.pool?.end().catch(() => undefined);
  }
}
