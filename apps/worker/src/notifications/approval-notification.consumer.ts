import type { PoolClient } from 'pg';
import type { ClockService } from '@pdfe/platform-core';
import type { Pool } from '@pdfe/platform-core/db';
import { BaseConsumer, type OutboxMessage } from '@pdfe/platform-core/queue';
import { notificationWithLabel } from '@pdfe/platform-core/sim-label';

/**
 * The notification for `approval.requested` (contracts/events-and-config.md). Phase 2 sends nothing anywhere: the
 * notification is written to the log, labelled like every message (FR-022). Delivery is at least once, and the
 * inbox makes the log line appear once per approval.
 */
export class ApprovalNotificationConsumer extends BaseConsumer {
  constructor(
    pool: Pool,
    clock: ClockService,
    private readonly out: (line: string) => void = (l) => console.log(l),
  ) {
    super(pool, clock, 'notification:approval.requested');
  }

  protected async handle(_tx: { client: PoolClient }, m: OutboxMessage): Promise<void> {
    const actionType = String(m.payload.action_type ?? 'unknown');
    const n = notificationWithLabel({
      subject: `Approval requested: ${actionType}`,
      body: `A request of type ${actionType} is waiting for an independent decision (approval ${String(m.payload.approval_id ?? '')}).`,
    });
    this.out(
      JSON.stringify({
        msg: 'notification (log only)',
        channel: 'log',
        topic: m.topic,
        correlation_id: m.correlationId,
        ...n,
      }),
    );
  }
}
