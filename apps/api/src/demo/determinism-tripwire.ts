import { AsyncLocalStorage } from 'node:async_hooks';
import nodeCrypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';

/** Thrown (inside a scenario run only) when project code reads the wall clock or system randomness directly. */
export class DeterminismViolation extends Error {
  constructor(readonly source: string) {
    super(
      `${source} was called during a scenario run: use the injected clock, ID and random sources`,
    );
    this.name = 'DeterminismViolation';
  }
}

const inRun = new AsyncLocalStorage<{ active: true }>();
let installed = false;

/**
 * Is the code that called the patched function ours? Frames inside `node_modules` and Node itself are not: a driver or the
 * runtime may read the clock for its own timeouts, and that cannot make a run non-deterministic. Only a call from project
 * code can bypass the injected sources.
 */
function calledFromProjectCode(): boolean {
  const frames = (new Error().stack ?? '').split('\n').slice(1);
  const first = frames.find((f) => !f.includes('determinism-tripwire'));
  if (!first) return false;
  return !/node_modules|node:|\(native\)|<anonymous>$/.test(first);
}

function guard<A extends unknown[], R>(source: string, original: (...a: A) => R): (...a: A) => R {
  return function (this: unknown, ...args: A): R {
    if (inRun.getStore() && calledFromProjectCode()) throw new DeterminismViolation(source);
    return original.apply(this, args);
  };
}

/**
 * Wraps `Date.now`, `Math.random` and `crypto.randomUUID` (once per process). The wrappers behave exactly as before except
 * inside `runDeterministic`, where a direct call from project code throws a DeterminismViolation, so a code path that
 * ignores the injected sources fails the run instead of quietly making it differ from the last one (FR-035, SC-010).
 * Nothing outside a run is affected.
 */
export function installTripwire(): void {
  if (installed) return;
  installed = true;
  Date.now = guard('Date.now', Date.now.bind(Date));
  Math.random = guard('Math.random', Math.random.bind(Math));
  nodeCrypto.randomUUID = guard('crypto.randomUUID', nodeCrypto.randomUUID.bind(nodeCrypto));
  // `import { randomUUID } from 'node:crypto'` reads the ESM export, which is only refreshed on request.
  syncBuiltinESMExports();
  const web = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (web?.randomUUID) {
    try {
      web.randomUUID = guard(
        'crypto.randomUUID',
        web.randomUUID.bind(web),
      ) as () => `${string}-${string}-${string}-${string}-${string}`;
    } catch {
      // A read-only global: the node:crypto function above still covers the usual callers.
    }
  }
}

/** Runs `fn` (and everything it awaits) with the tripwire armed. */
export function runDeterministic<T>(fn: () => Promise<T>): Promise<T> {
  installTripwire();
  return inRun.run({ active: true }, fn);
}
