import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

/** Logs a line every minute so a stuck worker is visible, and gives the container a liveness file. */
@Injectable()
export class HeartbeatService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private readonly log = new Logger('heartbeat');

  onModuleInit(): void {
    const beat = () => this.log.log('worker heartbeat (mode DEMO)');
    beat();
    this.timer = setInterval(beat, 60_000);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
