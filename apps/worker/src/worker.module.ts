import { Module } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';

/** Jobs are added by later stories: outbox relay, approval and elevation expiry, audit anchors, config activation. */
@Module({ providers: [HeartbeatService] })
export class WorkerModule {}
