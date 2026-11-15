import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fcRuns } from '@pdfe/test-kit';
import { ScenarioClock, SystemClock } from '../src/clock';
import { IdGenerator } from '../src/ids';
import { SeededRandom, SystemRandom } from '../src/random';

const V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const gen = (seed: number) => new IdGenerator(new ScenarioClock('2026-01-15T08:00:00Z', 1), new SeededRandom(seed));

describe('IdGenerator', () => {
  it('produces valid UUIDv7 (version and variant bits)', () => {
    const g = new IdGenerator(new SystemClock(), new SystemRandom());
    for (let i = 0; i < 200; i++) expect(g.next()).toMatch(V7);
  });
  it('encodes the clock time in the first 48 bits', () => {
    const id = gen(1).next().replace(/-/g, '');
    expect(parseInt(id.slice(0, 12), 16)).toBe(Date.parse('2026-01-15T08:00:00Z'));
  });
  it('increases monotonically, also when the clock does not move', () => {
    const g = gen(7);
    const ids = Array.from({ length: 5000 }, () => g.next());
    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('same seed and same clock give an identical sequence; different seeds differ', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        fc.pre(a !== b);
        const seq = (s: number) => {
          const g = gen(s);
          return Array.from({ length: 10 }, () => g.next());
        };
        expect(seq(a)).toEqual(seq(a));
        expect(seq(a)).not.toEqual(seq(b));
      }),
      { numRuns: fcRuns(50) },
    );
  });
});
