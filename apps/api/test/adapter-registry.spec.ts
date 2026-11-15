import { describe, expect, it } from 'vitest';
import { ADAPTER_KINDS, type AdapterPort } from '@pdfe/domain-types';
import { AdapterRegistry } from '../src/integration/adapter-registry';

const fake = (kind: (typeof ADAPTER_KINDS)[number], type = `mock:${kind}`): AdapterPort => ({
  kind,
  type,
  ping: async () => ({ kind, status: 'ok', type }),
});

describe('AdapterRegistry', () => {
  it('registers and resolves an adapter', async () => {
    const r = new AdapterRegistry();
    r.register(fake('bank'));
    const a = r.resolve('bank');
    expect((await a.ping()).type).toBe('mock:bank');
  });

  it('refuses to register a kind twice', () => {
    const r = new AdapterRegistry();
    r.register(fake('bank'));
    expect(() => r.register(fake('bank'))).toThrow(/already registered/);
  });

  it('refuses an adapter whose type is not a mock type', () => {
    const r = new AdapterRegistry();
    expect(() => r.register(fake('bank', 'http:real'))).toThrow(/bank: http:real/);
  });

  it('refuses a mock type that belongs to another kind', () => {
    const r = new AdapterRegistry();
    expect(() => r.register(fake('bank', 'mock:psp'))).toThrow(/bank: mock:psp/);
  });

  it('throws when resolving an unregistered kind', () => {
    const r = new AdapterRegistry();
    expect(() => r.resolve('fx')).toThrow(/no adapter registered for fx/);
  });

  it('list() returns kind to type, and every type starts with mock:', () => {
    const r = new AdapterRegistry();
    for (const k of ADAPTER_KINDS) r.register(fake(k));
    const list = r.list();
    expect(Object.keys(list).sort()).toEqual([...ADAPTER_KINDS].sort());
    for (const t of Object.values(list)) expect(t.startsWith('mock:')).toBe(true);
  });
});
