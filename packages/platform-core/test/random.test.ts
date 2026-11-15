import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fcRuns } from '@pdfe/test-kit';
import { SeededRandom, SystemRandom } from '../src/random';

const draw = (seed: number) => {
  const r = new SeededRandom(seed);
  return Array.from({ length: 20 }, () => r.int(0, 1_000_000));
};

describe('SeededRandom', () => {
  it('same seed gives the same sequence', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        expect(draw(seed)).toEqual(draw(seed));
      }),
      { numRuns: fcRuns() },
    );
  });
  it('different seeds give different sequences', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (x, y) => {
        fc.pre(x !== y);
        expect(draw(x)).not.toEqual(draw(y));
      }),
      { numRuns: fcRuns() },
    );
  });
  it('int(min, max) stays in range', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (seed, min, span) => {
          const r = new SeededRandom(seed);
          for (let i = 0; i < 20; i++) {
            const v = r.int(min, min + span);
            expect(v).toBeGreaterThanOrEqual(min);
            expect(v).toBeLessThanOrEqual(min + span);
          }
        },
      ),
      { numRuns: fcRuns() },
    );
  });
  it('bytes(n) returns n bytes', () => {
    expect(new SeededRandom(1).bytes(10)).toHaveLength(10);
  });
});

describe('SystemRandom', () => {
  it('returns values in range', () => {
    const r = new SystemRandom();
    for (let i = 0; i < 50; i++) {
      const v = r.int(3, 5);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(5);
    }
    expect(r.bytes(8)).toHaveLength(8);
  });
});
