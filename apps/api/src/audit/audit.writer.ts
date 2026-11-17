import { Inject, Injectable } from '@nestjs/common';
import { IdGenerator, type ClockService } from '@pdfe/platform-core';
import { AuditRecorder } from '@pdfe/platform-core/audit';
import { CLOCK } from '../core/tokens';

export type { AuditEventInput, AuditRecord } from '@pdfe/platform-core/audit';

/**
 * The API's audit writer: the shared recorder with Nest wiring. It inserts in the caller's transaction, so a
 * failed audit write rolls back the action it describes. US4 adds verification, anchors and export on this chain.
 */
@Injectable()
export class AuditWriter extends AuditRecorder {
  constructor(@Inject(CLOCK) clock: ClockService, ids: IdGenerator) {
    super(clock, ids);
  }
}
