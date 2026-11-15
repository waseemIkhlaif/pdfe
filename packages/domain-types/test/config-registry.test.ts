import { describe, expect, it } from 'vitest';
import { configRegistry, safetyLockedKeys, DefaultsConfigReader } from '../src/config-registry';

// The table in specs/001-platform-foundation/contracts/events-and-config.md, section "Configuration settings".
const CONTRACT_KEYS = [
  'adapters.allowlist',
  'api.rate_limit',
  'app.mode',
  'approvals.default_expiry_hours',
  'egress.internal_hosts',
  'features.flags',
  'fees.default_minor',
  'fx.spread_bps',
  'idempotency.ttl_hours',
  'limits.transfer_max_minor',
  'security.elevation.ttl_minutes',
];

describe('config registry', () => {
  it('has exactly the keys of the contract', () => {
    expect(Object.keys(configRegistry).sort()).toEqual(CONTRACT_KEYS);
  });

  it('every default validates against its own schema', () => {
    for (const [key, item] of Object.entries(configRegistry)) {
      const r = item.schema.safeParse(item.default);
      expect(r.success, `default of ${key}`).toBe(true);
    }
  });

  it('the safety-locked set is exactly app.mode, adapters.allowlist and egress.internal_hosts', () => {
    expect([...safetyLockedKeys].sort()).toEqual([
      'adapters.allowlist',
      'app.mode',
      'egress.internal_hosts',
    ]);
  });

  it('every money value (key ending in _minor) is a non-negative integer', () => {
    const minor = Object.entries(configRegistry).filter(([k]) => k.endsWith('_minor'));
    expect(minor.length).toBeGreaterThan(0);
    for (const [key, item] of minor) {
      expect(item.schema.safeParse(-1).success, `${key} rejects -1`).toBe(false);
      expect(item.schema.safeParse(1.5).success, `${key} rejects 1.5`).toBe(false);
      expect(item.schema.safeParse(0).success, `${key} accepts 0`).toBe(true);
    }
  });

  it('enforces the ranges of the contract', () => {
    const s = (k: keyof typeof configRegistry) => configRegistry[k].schema;
    expect(s('security.elevation.ttl_minutes').safeParse(4).success).toBe(false);
    expect(s('security.elevation.ttl_minutes').safeParse(120).success).toBe(true);
    expect(s('security.elevation.ttl_minutes').safeParse(121).success).toBe(false);
    expect(s('approvals.default_expiry_hours').safeParse(0).success).toBe(false);
    expect(s('approvals.default_expiry_hours').safeParse(168).success).toBe(true);
    expect(s('fx.spread_bps').safeParse(1001).success).toBe(false);
    expect(
      s('api.rate_limit').safeParse({ per_user_per_minute: 9, per_ip_per_minute: 100 }).success,
    ).toBe(false);
    expect(s('app.mode').safeParse('LIVE').success).toBe(false);
    expect(s('adapters.allowlist').safeParse(['http:real']).success).toBe(false);
    expect(s('features.flags').safeParse({ x: 'yes' }).success).toBe(false);
  });

  it('DefaultsConfigReader returns the defaults', async () => {
    const reader = new DefaultsConfigReader();
    expect(await reader.get('security.elevation.ttl_minutes')).toBe(30);
    expect(await reader.get('fees.default_minor')).toBe(0);
    expect(await reader.get('app.mode')).toBe('DEMO');
  });
});
