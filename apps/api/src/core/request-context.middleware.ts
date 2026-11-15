import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { IdGenerator, acceptOrGenerate, runWithContext } from '@pdfe/platform-core';

/**
 * First thing every request passes: settle the correlation ID (accept a well-formed one, otherwise create one),
 * echo it, mark the response as DEMO, and run the rest of the request inside the correlation context.
 * Doing this in middleware means error and 404 responses carry the headers too.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly ids: IdGenerator) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const header = req.header('x-correlation-id');
    const correlationId = acceptOrGenerate(header, this.ids);
    res.setHeader('X-Correlation-Id', correlationId);
    res.setHeader('X-PDFE-Mode', 'DEMO');
    runWithContext({ correlationId }, () => next());
  }
}
