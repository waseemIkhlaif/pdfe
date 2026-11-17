import type { ZodType } from 'zod';
import { AppError } from '@pdfe/platform-core';

/** Parses request input; a failure is 422 VALIDATION_FAILED with one entry per field (message keys, no free text). */
export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (r.success) return r.data;
  throw new AppError(
    'VALIDATION_FAILED',
    422,
    r.error.issues.map((i) => ({
      path: i.path.join('.'),
      message_key: `validation.${i.code}`,
    })),
  );
}
