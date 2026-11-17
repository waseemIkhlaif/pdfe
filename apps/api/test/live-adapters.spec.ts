import net from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { ADAPTER_KINDS } from '@pdfe/domain-types';
import { AppError } from '@pdfe/platform-core';
import {
  createDisabledLiveAdapter,
  LiveAdapterDisabledError,
} from '../src/integration/adapters/live/disabled-live.adapter';

describe('disabled live adapters', () => {
  it.each(ADAPTER_KINDS)('%s: every method throws LiveAdapterDisabledError', async (kind) => {
    const adapter = createDisabledLiveAdapter(kind) as unknown as Record<string, () => unknown>;
    // ping() exists today; any method added later must fail closed too, so probe a few names.
    for (const method of ['ping', 'transfer', 'someFutureOperation']) {
      await expect(Promise.resolve().then(() => adapter[method]!())).rejects.toBeInstanceOf(
        LiveAdapterDisabledError,
      );
    }
  });

  it('the error carries the LIVE_ADAPTER_DISABLED code', () => {
    const e = new LiveAdapterDisabledError('bank');
    expect(e).toBeInstanceOf(AppError);
    expect(e.code).toBe('LIVE_ADAPTER_DISABLED');
    expect(e.message).toContain('bank');
  });

  it('opens no socket when called', async () => {
    const spy = vi.spyOn(net.Socket.prototype, 'connect');
    for (const kind of ADAPTER_KINDS) {
      const adapter = createDisabledLiveAdapter(kind);
      try {
        await adapter.ping();
      } catch {
        // expected: the call fails before anything is attempted
      }
    }
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('reports its kind and a non-mock type', () => {
    const a = createDisabledLiveAdapter('chain');
    expect(a.kind).toBe('chain');
    expect(a.type.startsWith('mock:')).toBe(false);
  });
});
