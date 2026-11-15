/**
 * The only file in the repository that may read the wall clock (lint rule pdfe/no-nondeterminism).
 * Everything else asks a ClockService, so scenario runs can replace time with a seeded clock.
 */
export interface ClockService {
  /** Current time. Always a fresh Date, so callers cannot move the clock. */
  now(): Date;
}

export class SystemClock implements ClockService {
  now(): Date {
    return new Date(Date.now());
  }
}

/** A clock that moves only when told to. Same base and step always give the same sequence. */
export class ScenarioClock implements ClockService {
  private ms: number;

  constructor(
    base: string | Date,
    readonly stepMs: number,
  ) {
    const t = new Date(base).getTime();
    if (Number.isNaN(t)) throw new Error(`ScenarioClock: invalid base time ${String(base)}`);
    this.ms = t;
  }

  now(): Date {
    return new Date(this.ms);
  }

  /** Move forward by one step. */
  tick(): void {
    this.ms += this.stepMs;
  }

  /** Move forward by an explicit number of milliseconds. */
  advance(ms: number): void {
    this.ms += ms;
  }
}
