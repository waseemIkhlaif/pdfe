import { randomBytes, randomInt } from 'node:crypto';
import { uniformInt } from 'pure-rand/distribution/uniformInt';
import { xoroshiro128plus } from 'pure-rand/generator/xoroshiro128plus';

/** Source of randomness. Scenario runs use SeededRandom, everything else SystemRandom. */
export interface RandomService {
  /** Integer in [min, max], both included. */
  int(min: number, max: number): number;
  bytes(n: number): Uint8Array;
}

export class SeededRandom implements RandomService {
  private readonly rng;

  constructor(seed: number) {
    this.rng = xoroshiro128plus(seed);
  }

  int(min: number, max: number): number {
    return uniformInt(this.rng, min, max);
  }

  bytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = this.int(0, 255);
    return out;
  }
}

export class SystemRandom implements RandomService {
  int(min: number, max: number): number {
    return randomInt(min, max + 1);
  }

  bytes(n: number): Uint8Array {
    return new Uint8Array(randomBytes(n));
  }
}
