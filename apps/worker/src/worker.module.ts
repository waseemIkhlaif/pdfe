import { Module } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';
import { JobsService } from './jobs.service';

/** Recurring jobs. Later stories add audit anchors and configuration activation. */
@Module({ providers: [HeartbeatService, JobsService] })
export class WorkerModule {}
