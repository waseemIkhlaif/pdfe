import { Catch, HttpException, Logger, type ArgumentsHost, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { AppError, getContext, toEnvelope } from '@pdfe/platform-core';

const CODE_BY_STATUS: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
};

/** Every error leaves the API in the single envelope: { error: { code, message_key, correlation_id } }. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger('errors');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const correlationId = getContext()?.correlationId ?? String(res.getHeader('X-Correlation-Id') ?? 'unknown');
    let err: unknown = exception;
    if (!(exception instanceof AppError) && exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = CODE_BY_STATUS[status];
      err = code ? new AppError(code, status) : new AppError('INTERNAL', status >= 500 ? status : 500);
    }
    const { status, body } = toEnvelope(err, correlationId);
    if (status >= 500) {
      this.log.error(`${body.error.code} correlation_id=${correlationId} ${(exception as Error)?.name ?? ''}`);
    }
    res.status(status).json(body);
  }
}
