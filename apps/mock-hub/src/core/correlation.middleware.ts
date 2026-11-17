import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  IdGenerator,
  SystemClock,
  SystemRandom,
  acceptOrGenerate,
  runWithContext,
} from '@pdfe/platform-core';

/**
 * Every request to the mock hub joins the correlation of the call that caused it. A well-formed `X-Correlation-Id` is
 * kept, anything else (too long, wrong characters) is replaced by a new ID and the raw value is never logged or echoed.
 * The ID is returned in the response header, and the hub's own log line carries it, so a partner call can be found by
 * the ID of the action it belongs to.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  private readonly ids = new IdGenerator(new SystemClock(), new SystemRandom());
  private readonly log = new Logger('mock-hub');

  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = acceptOrGenerate(req.header('x-correlation-id'), this.ids);
    res.setHeader('X-Correlation-Id', correlationId);
    runWithContext({ correlationId }, () => {
      this.log.log(`mock partner call ${req.method} ${req.originalUrl.split('?')[0]}`);
      next();
    });
  }
}
