export interface ErrorDetail {
  path: string;
  message_key: string;
}

export interface ErrorEnvelope {
  error: { code: string; message_key: string; correlation_id: string; details?: ErrorDetail[] };
}

/** Codes whose responses may carry per-field details. */
const WITH_DETAILS = new Set(['VALIDATION_FAILED', 'CONFIG_INVALID']);

/** A failure that is safe to show to a client: a stable code, an HTTP status and optional field details. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly details?: ErrorDetail[],
  ) {
    super(code);
    this.name = 'AppError';
  }
}

/** The single error format of the HTTP API (FR-042). Unknown errors never leak their message. */
export function toEnvelope(
  err: unknown,
  correlationId: string,
): { status: number; body: ErrorEnvelope } {
  if (err instanceof AppError) {
    const error: ErrorEnvelope['error'] = {
      code: err.code,
      message_key: `errors.${err.code.toLowerCase()}`,
      correlation_id: correlationId,
    };
    if (err.details && WITH_DETAILS.has(err.code)) error.details = err.details;
    return { status: err.status, body: { error } };
  }
  return {
    status: 500,
    body: {
      error: { code: 'INTERNAL', message_key: 'errors.internal', correlation_id: correlationId },
    },
  };
}
