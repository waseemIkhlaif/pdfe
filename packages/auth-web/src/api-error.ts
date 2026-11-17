/** A correlation ID as the API issues and accepts it (`^[A-Za-z0-9._-]{8,64}$`). Anything else is not shown or forwarded. */
const CORRELATION_ID = /^[A-Za-z0-9._-]{8,64}$/;

export const isCorrelationId = (v: unknown): v is string =>
  typeof v === 'string' && CORRELATION_ID.test(v);

/** A failed call to the API: the status, the error code and the correlation ID of the request, to show the user. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly messageKey: string,
    readonly correlationId?: string,
  ) {
    super(`API ${status} ${code}`);
    this.name = 'ApiError';
  }
}

/** The correlation ID of a response: the header first, else the one in the error envelope. */
export async function correlationIdOf(res: Response): Promise<string | undefined> {
  const header = res.headers.get('x-correlation-id');
  if (isCorrelationId(header)) return header;
  try {
    const body = (await res.clone().json()) as { error?: { correlation_id?: unknown } };
    return isCorrelationId(body.error?.correlation_id) ? body.error.correlation_id : undefined;
  } catch {
    return undefined;
  }
}

/** Returns the response if it succeeded, otherwise throws an ApiError with the code, message key and correlation ID. */
export async function ensureOk(res: Response): Promise<Response> {
  if (res.ok) return res;
  let code = 'INTERNAL';
  let messageKey = 'errors.internal';
  try {
    const body = (await res.clone().json()) as {
      error?: { code?: unknown; message_key?: unknown };
    };
    if (typeof body.error?.code === 'string') code = body.error.code;
    if (typeof body.error?.message_key === 'string') messageKey = body.error.message_key;
  } catch {
    // not JSON (a gateway error page): keep the defaults
  }
  throw new ApiError(res.status, code, messageKey, await correlationIdOf(res));
}

/** Where a page sends the user after an ApiError: the error page, with the ID to show (only if it is well formed). */
export function errorPath(locale: string, err: ApiError): string {
  const cid = isCorrelationId(err.correlationId)
    ? `?cid=${encodeURIComponent(err.correlationId)}`
    : '';
  return `/${locale}/error${cid}`;
}
