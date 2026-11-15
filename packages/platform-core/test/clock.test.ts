import { describe, expect, it } from 'vitest';
import { ScenarioClock, SystemClock } from '../src/clock';

describe('SystemClock', () => {
  it('returns the current time', () => {
    const before = Date.now();
    const t = new SystemClock().now().getTime();
    expect(t).toBeGreaterThanOrEqual(before);
    expect(t).toBeLessThanOrEqual(Date.now());
  });
});

describe('ScenarioClock', () => {
  it('starts at the base and does not move by itself', () => {
    const c = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
    expect(c.now().toISOString()).toBe('2026-01-15T08:00:00.000Z');
    expect(c.now().toISOString()).toBe('2026-01-15T08:00:00.000Z');
  });
  it('advances only on tick() (by stepMs) and advance(ms)', () => {
    const c = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
    c.tick();
    expect(c.now().toISOString()).toBe('2026-01-15T08:00:01.000Z');
    c.advance(500);
    expect(c.now().toISOString()).toBe('2026-01-15T08:00:01.500Z');
  });
  it('two clocks with the same base and step give the same sequence', () => {
    const a = new ScenarioClock('2026-01-15T08:00:00Z', 250);
    const b = new ScenarioClock('2026-01-15T08:00:00Z', 250);
    const seq = (c: ScenarioClock) =>
      Array.from({ length: 5 }, () => {
        c.tick();
        return c.now().toISOString();
      });
    expect(seq(a)).toEqual(seq(b));
  });
  it('returns copies, so callers cannot move the clock', () => {
    const c = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
    c.now().setTime(0);
    expect(c.now().toISOString()).toBe('2026-01-15T08:00:00.000Z');
  });
  it('rejects an invalid base', () => {
    expect(() => new ScenarioClock('not a date', 1000)).toThrow();
  });
});
