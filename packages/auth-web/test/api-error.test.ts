import { describe, expect, it } from 'vitest';
import { ApiError, correlationIdOf, ensureOk, errorPath, isCorrelationId } from '../src/api-error';

const ID = 'COR-019bc0ab-2400-70d6-91a3-b4f2199938f3';
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

describe('isCorrelationId', () => {
  it.each([ID, 'abcdefgh', 'a.b_c-d.e1234'])('accepts %s', (v) =>
    expect(isCorrelationId(v)).toBe(true),
  );
  it.each(['short', 'x'.repeat(65), 'has space here', 'semi;colon-1234', '', null, undefined, 42])(
    'rejects %s',
    (v) => expect(isCorrelationId(v)).toBe(false),
  );
});

describe('correlationIdOf', () => {
  it('prefers the header, falls back to the envelope, and ignores a malformed one', async () => {
    expect(await correlationIdOf(json(500, {}, { 'X-Correlation-Id': ID }))).toBe(ID);
    expect(await correlationIdOf(json(500, { error: { correlation_id: ID } }))).toBe(ID);
    expect(
      await correlationIdOf(json(500, { error: { correlation_id: '<script>' } })),
    ).toBeUndefined();
    expect(
      await correlationIdOf(new Response('<html>bad gateway</html>', { status: 502 })),
    ).toBeUndefined();
  });

  it('leaves the response readable afterwards', async () => {
    const res = json(500, { error: { correlation_id: ID } });
    await correlationIdOf(res);
    expect(await res.json()).toEqual({ error: { correlation_id: ID } });
  });
});

describe('ensureOk', () => {
  it('returns a successful response as it is', async () => {
    const ok = json(200, { a: 1 });
    expect(await ensureOk(ok)).toBe(ok);
  });

  it('throws an ApiError with the code, the message key and the ID of the failed request', async () => {
    const res = json(409, {
      error: { code: 'SOD_CONFLICT', message_key: 'errors.sod_conflict', correlation_id: ID },
    });
    const err = await ensureOk(res).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 409,
      code: 'SOD_CONFLICT',
      messageKey: 'errors.sod_conflict',
      correlationId: ID,
    });
  });

  it('copes with a failure that is not the envelope', async () => {
    const err = await ensureOk(new Response('upstream down', { status: 502 })).catch((e) => e);
    expect(err).toMatchObject({ status: 502, code: 'INTERNAL', messageKey: 'errors.internal' });
    expect(err.correlationId).toBeUndefined();
  });
});

describe('errorPath', () => {
  it('sends the user to the error page with the ID, and drops one that is not well formed', () => {
    expect(errorPath('ar', new ApiError(500, 'INTERNAL', 'errors.internal', ID))).toBe(
      `/ar/error?cid=${ID}`,
    );
    expect(errorPath('en', new ApiError(500, 'INTERNAL', 'errors.internal'))).toBe('/en/error');
    expect(errorPath('en', new ApiError(500, 'INTERNAL', 'errors.internal', '<script>'))).toBe(
      '/en/error',
    );
  });
});
