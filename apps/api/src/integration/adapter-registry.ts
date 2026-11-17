import { Injectable } from '@nestjs/common';
import { mockTypeFor, type AdapterKind, type AdapterPort } from '@pdfe/domain-types';

/**
 * The only way application code reaches an external dependency (FR-005).
 * In DEMO the only registrable type for a kind is its mock type; anything else is refused when registered.
 */
@Injectable()
export class AdapterRegistry {
  private readonly adapters = new Map<AdapterKind, AdapterPort>();

  register(adapter: AdapterPort): void {
    if (this.adapters.has(adapter.kind))
      throw new Error(`adapter for ${adapter.kind} is already registered`);
    if (adapter.type !== mockTypeFor(adapter.kind)) {
      throw new Error(
        `${adapter.kind}: ${adapter.type} is not allowed. Only ${mockTypeFor(adapter.kind)} exists in DEMO mode.`,
      );
    }
    this.adapters.set(adapter.kind, adapter);
  }

  resolve<T extends AdapterPort = AdapterPort>(kind: AdapterKind): T {
    const a = this.adapters.get(kind);
    if (!a) throw new Error(`no adapter registered for ${kind}`);
    return a as T;
  }

  /** Kind to adapter type, for health output and the partner_adapters table. */
  list(): Record<string, string> {
    return Object.fromEntries([...this.adapters].map(([kind, a]) => [kind, a.type]));
  }
}
