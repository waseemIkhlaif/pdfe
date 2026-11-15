import { AsyncLocalStorage } from 'node:async_hooks';
import type { IdGenerator } from './ids';

export interface RequestContext {
  correlationId: string;
  tenantId?: string;
  actorId?: string;
  elevationId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export const runWithContext = <T>(ctx: RequestContext, fn: () => T): T => storage.run(ctx, fn);
export const getContext = (): RequestContext | undefined => storage.getStore();

const VALID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Accept a client-supplied correlation ID only if it is well formed, otherwise create COR-<uuidv7>.
 * A rejected value is never echoed or logged (spec edge case).
 */
export function acceptOrGenerate(header: string | undefined, ids: IdGenerator): string {
  if (header !== undefined && VALID.test(header)) return header;
  return `COR-${ids.next()}`;
}
