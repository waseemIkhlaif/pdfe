import { AppError } from '@pdfe/platform-core';
import type { AdapterKind, AdapterPort } from '@pdfe/domain-types';

/** A live adapter was called. It never contacts anything: the call fails first. */
export class LiveAdapterDisabledError extends AppError {
  constructor(kind: string) {
    super('LIVE_ADAPTER_DISABLED', 500);
    this.message = `The live ${kind} adapter is disabled. This platform runs in DEMO mode only and cannot contact real services.`;
  }
}

/**
 * Interface placeholder for a future live adapter. Disabled by default and never registered in DEMO.
 * Every property that is called as a method throws, so operations added to the ports later also fail closed.
 */
export function createDisabledLiveAdapter(kind: AdapterKind): AdapterPort {
  const base = { kind, type: `live:${kind}` };
  return new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'kind' || prop === 'type') return Reflect.get(target, prop, receiver);
      if (typeof prop === 'symbol' || prop === 'then') return undefined; // keeps await and logging working
      return () => {
        throw new LiveAdapterDisabledError(kind);
      };
    },
  }) as AdapterPort;
}
