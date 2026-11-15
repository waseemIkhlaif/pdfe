import type { ClockService } from './clock';
import type { RandomService } from './random';

const hex = (bytes: ArrayLike<number>): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

/**
 * UUIDv7 generator: 48-bit millisecond time, version 7, a 12-bit sequence that makes IDs strictly
 * increasing even when the clock does not move, variant 10, and 62 random bits.
 * Deterministic when the clock and the random source are.
 */
export class IdGenerator {
  private lastMs = -1;
  private seq = 0;

  constructor(
    private readonly clock: ClockService,
    private readonly random: RandomService,
  ) {}

  next(): string {
    const now = this.clock.now().getTime();
    if (now > this.lastMs) {
      this.lastMs = now;
      this.seq = this.random.int(0, 0x7ff); // leave headroom for increments inside one millisecond
    } else {
      this.seq += 1;
      if (this.seq > 0xfff) {
        this.lastMs += 1;
        this.seq = 0;
      }
    }
    const time = this.lastMs.toString(16).padStart(12, '0');
    const rand = this.random.bytes(8);
    rand[0] = ((rand[0] ?? 0) & 0x3f) | 0x80; // variant 10
    const seqHex = this.seq.toString(16).padStart(3, '0');
    const tail = hex(rand);
    return `${time.slice(0, 8)}-${time.slice(8, 12)}-7${seqHex}-${tail.slice(0, 4)}-${tail.slice(4)}`;
  }
}
