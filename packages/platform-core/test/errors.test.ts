import { describe, expect, it } from 'vitest';
import { AppError, toEnvelope } from '../src/errors';

describe('toEnvelope', () => {
  it('maps an AppError to the single error format', () => {
    const e = toEnvelope(new AppError('SELF_APPROVAL', 409), 'COR-123');
    expect(e.status).toBe(409);
    expect(e.body).toEqual({
      error: {
        code: 'SELF_APPROVAL',
        message_key: 'errors.self_approval',
        correlation_id: 'COR-123',
      },
    });
  });
  it('adds details only for validation errors', () => {
    const v = toEnvelope(
      new AppError('VALIDATION_FAILED', 422, [{ path: 'a.b', message_key: 'errors.too_small' }]),
      'COR-1',
    );
    expect(v.body.error.details).toEqual([{ path: 'a.b', message_key: 'errors.too_small' }]);
    const f = toEnvelope(
      new AppError('FORBIDDEN', 403, [{ path: 'x', message_key: 'y' }]),
      'COR-1',
    );
    expect(f.body.error.details).toBeUndefined();
  });
  it('maps unknown errors to INTERNAL without leaking the message', () => {
    const e = toEnvelope(new Error('database password is hunter2'), 'COR-9');
    expect(e.status).toBe(500);
    expect(e.body.error.code).toBe('INTERNAL');
    expect(JSON.stringify(e.body)).not.toContain('hunter2');
  });
});
