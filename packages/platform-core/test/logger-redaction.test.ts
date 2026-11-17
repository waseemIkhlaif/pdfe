import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { runWithContext } from '../src/correlation';
import { REDACTED, PinoNestLogger, createLogger, redact, redactString } from '../src/logger';

/** A logger whose lines are collected, parsed, in `lines`. */
function capture(level = 'debug') {
  const lines: Record<string, unknown>[] = [];
  const raw: string[] = [];
  const destination = new Writable({
    write(chunk, _enc, cb) {
      raw.push(String(chunk));
      lines.push(JSON.parse(String(chunk)));
      cb();
    },
  });
  return { logger: createLogger({ service: 'test', level, destination }), lines, raw };
}

describe('field redaction', () => {
  it.each([
    'display_name',
    'full_name',
    'name',
    'Authorization',
    'cookie',
    'password',
    'secret',
    'token',
    'totp',
    'access_token',
    'Set-Cookie',
    'client_secret',
  ])('%s becomes [REDACTED], at any depth', (key) => {
    const { logger, lines, raw } = capture();
    logger.info(
      { [key]: 'a-sensitive-value', nested: { deeper: [{ [key]: 'another-one' }] } },
      'event',
    );
    const line = lines[0] as Record<string, any>;
    expect(line[key]).toBe(REDACTED);
    expect(line.nested.deeper[0][key]).toBe(REDACTED);
    expect(raw[0]).not.toContain('a-sensitive-value');
    expect(raw[0]).not.toContain('another-one');
  });

  it('keeps ordinary fields, and numbers, untouched', () => {
    const { logger, lines } = capture();
    logger.info(
      {
        route: '/v1/me',
        status: 200,
        duration_ms: 123456789012,
        tenant_id: '00000000-0000-7000-8000-000000000001',
      },
      'done',
    );
    expect(lines[0]).toMatchObject({
      route: '/v1/me',
      status: 200,
      duration_ms: 123456789012,
      tenant_id: '00000000-0000-7000-8000-000000000001',
      msg: 'done',
    });
  });
});

describe('value redaction', () => {
  it('replaces document-number-like values (9 or more digits) in any field and in the message', () => {
    const { logger, lines, raw } = capture();
    logger.info(
      { note: 'passport 123456789 issued', other: '1234567890123' },
      'lookup for 987654321',
    );
    const line = lines[0] as Record<string, string>;
    expect(line.note).toBe(`passport ${REDACTED} issued`);
    expect(line.other).toBe(REDACTED);
    expect(line.msg).toBe(`lookup for ${REDACTED}`);
    expect(raw[0]).not.toMatch(/\d{9}/);
  });

  it('keeps shorter digit runs, UUIDs, correlation IDs and timestamps', () => {
    for (const ok of [
      '12345678',
      'order 1234',
      '00000000-0000-7000-8000-000000000001',
      'COR-019bc0ab-2400-70d6-91a3-b4f2199938f3',
      '2026-01-15T08:00:00.000Z',
    ]) {
      expect(redactString(ok)).toBe(ok);
    }
  });

  it.each(['DE89370400440532013000', 'GB29NWBK60161331926819', 'PS92PALS000000000400123456702'])(
    'replaces the IBAN-like value %s',
    (iban) => {
      expect(redactString(`paid to ${iban} today`)).toBe(`paid to ${REDACTED} today`);
      const { logger, raw } = capture();
      logger.info({ account: iban }, 'transfer');
      expect(raw[0]).not.toContain(iban);
    },
  );

  it('redacts inside errors', () => {
    const { logger, raw } = capture();
    logger.error({ err: new Error('failed for 123456789012') }, 'oops');
    expect(raw[0]).not.toContain('123456789012');
  });

  it('survives a cycle, and does not change the caller object', () => {
    const o: Record<string, unknown> = { password: 'p', ok: 1 };
    o.self = o;
    expect(() => redact(o)).not.toThrow();
    expect(o.password).toBe('p');
  });
});

describe('correlation and trace IDs', () => {
  it('are on every line, from the request context when there is one', () => {
    const { logger, lines } = capture();
    logger.info('outside any request');
    runWithContext({ correlationId: 'COR-019bc0ab-0000-7000-8000-000000000001' }, () =>
      logger.info({ a: 1 }, 'inside'),
    );
    for (const l of lines) {
      expect(l).toHaveProperty('correlation_id');
      expect(l).toHaveProperty('trace_id');
      expect(l).toHaveProperty('span_id');
      expect(l.service).toBe('test');
    }
    expect(lines[0]!.correlation_id).toBe('none');
    expect(lines[1]!.correlation_id).toBe('COR-019bc0ab-0000-7000-8000-000000000001');
  });

  it('are present at every level, and are never redacted', () => {
    const { logger, lines } = capture('trace');
    runWithContext({ correlationId: 'COR-keep-me-0001' }, () => {
      for (const level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const)
        logger[level]({ x: 1 }, level);
    });
    expect(lines).toHaveLength(6);
    expect(lines.every((l) => l.correlation_id === 'COR-keep-me-0001')).toBe(true);
  });
});

describe('PinoNestLogger', () => {
  it('writes Nest-style calls through the same redaction, with the context name', () => {
    const { logger, lines, raw } = capture();
    const nest = new PinoNestLogger(logger);
    nest.log('started for 123456789', 'Bootstrap');
    nest.warn('slow', { token: 'abc' }, 'Http');
    nest.error(new Error('boom'), 'Http');
    expect(lines[0]).toMatchObject({
      msg: `started for ${REDACTED}`,
      context: 'Bootstrap',
      level: 'info',
    });
    expect(lines[1]).toMatchObject({ level: 'warn', context: 'Http' });
    expect(raw[1]).not.toContain('abc');
    expect(lines[2]).toMatchObject({ level: 'error', msg: 'boom' });
  });
});
