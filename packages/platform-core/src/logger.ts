import { trace } from '@opentelemetry/api';
import pino, { type DestinationStream, type Logger } from 'pino';
import { getContext } from './correlation';

/** What a redacted value is replaced with. */
export const REDACTED = '[REDACTED]';

/**
 * Field names whose value is never logged, wherever they are in the object, in any letter case. Personal names (the
 * synthetic display names too, so that a log never links a name to an action), credentials, session secrets and
 * one-time passwords.
 */
const SENSITIVE_KEY =
  /^(display_?name|full_?name|first_?name|last_?name|name|authorization|cookie|set-cookie|password|passwd|secret|client_?secret|token|access_?token|refresh_?token|id_?token|session|totp|otp|api_?key)$/i;

/**
 * Text that looks like personal data, whatever field it is in: a document number (9 or more digits in a row, not part of
 * a longer identifier such as a UUID) and an IBAN. Applied to string values only, so numbers such as durations and
 * counters are left alone.
 */
const DOCUMENT_NUMBER = /(?<![\w-])\d{9,}(?![\w-])/g;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g;

export function redactString(s: string): string {
  return s.replace(IBAN, REDACTED).replace(DOCUMENT_NUMBER, REDACTED);
}

/** A copy of `value` with sensitive fields and values replaced. Cycles and very deep objects are cut off. */
export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (depth > 8) return '[DEPTH]';
  if (value instanceof Error) {
    return {
      type: value.name,
      message: redactString(value.message),
      stack: value.stack && redactString(value.stack),
    };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}

export interface LoggerOptions {
  /** Which process writes the line: `api`, `worker`, `mock-hub`. */
  service: string;
  level?: string;
  /** Where the lines go. Default: standard output. Tests pass their own stream. */
  destination?: DestinationStream;
}

/**
 * Structured JSON logging for every service. Each line carries `service`, `correlation_id` (from the request or job
 * context) and `trace_id` and `span_id` (from the active trace), so one action can be followed by its ID. Every field and
 * message goes through `redact` first, so personal data and credentials do not reach the log.
 */
export function createLogger(opts: LoggerOptions): Logger {
  return pino(
    {
      level: opts.level ?? process.env.LOG_LEVEL ?? 'info',
      base: { service: opts.service },
      timestamp: pino.stdTimeFunctions.isoTime,
      mixin() {
        const span = trace.getActiveSpan()?.spanContext();
        return {
          correlation_id: getContext()?.correlationId ?? 'none',
          trace_id: span?.traceId ?? 'none',
          span_id: span?.spanId ?? 'none',
        };
      },
      hooks: {
        // Arguments are redacted before pino formats them: the object of a call and the text of its message.
        logMethod(args, method) {
          method.apply(this, args.map((a) => redact(a)) as Parameters<typeof method>);
        },
      },
      formatters: {
        // Fields added by the mixin and the base are ours; everything a caller put in the line is redacted already.
        level: (label) => ({ level: label }),
      },
    },
    opts.destination,
  );
}

type NestArgs = [message: unknown, ...rest: unknown[]];

/**
 * The same logger behind Nest's `LoggerService` interface (a structural match, so platform-core needs no Nest
 * dependency). `app.useLogger(new PinoNestLogger(logger))` replaces Nest's default logger.
 */
export class PinoNestLogger {
  constructor(private readonly logger: Logger) {}

  private write(
    level: 'info' | 'error' | 'warn' | 'debug' | 'trace' | 'fatal',
    [message, ...rest]: NestArgs,
  ) {
    const context = typeof rest[rest.length - 1] === 'string' ? (rest.pop() as string) : undefined;
    const extra = rest.length ? { details: rest.length === 1 ? rest[0] : rest } : {};
    const msg =
      message instanceof Error
        ? message.message
        : typeof message === 'string'
          ? message
          : JSON.stringify(message);
    this.logger[level]({ ...(context ? { context } : {}), ...extra }, msg);
  }

  log(...a: NestArgs) {
    this.write('info', a);
  }
  error(...a: NestArgs) {
    this.write('error', a);
  }
  warn(...a: NestArgs) {
    this.write('warn', a);
  }
  debug(...a: NestArgs) {
    this.write('debug', a);
  }
  verbose(...a: NestArgs) {
    this.write('trace', a);
  }
  fatal(...a: NestArgs) {
    this.write('fatal', a);
  }
}
