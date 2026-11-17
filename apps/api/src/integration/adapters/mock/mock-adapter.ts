import { getContext } from '@pdfe/platform-core';
import {
  mockTypeFor,
  type AdapterKind,
  type AdapterPing,
  type AdapterPort,
} from '@pdfe/domain-types';

/** An adapter that talks to the mock partner hub over the internal network. One class serves all eight kinds. */
export function createMockAdapter(kind: AdapterKind, hubUrl: string): AdapterPort {
  return {
    kind,
    type: mockTypeFor(kind),
    async ping(): Promise<AdapterPing> {
      const correlationId = getContext()?.correlationId;
      const res = await fetch(`${hubUrl}/mock/${kind}/ping`, {
        headers: correlationId ? { 'X-Correlation-Id': correlationId } : {},
      });
      if (!res.ok) throw new Error(`mock ${kind} ping failed with status ${res.status}`);
      return (await res.json()) as AdapterPing;
    },
  };
}
