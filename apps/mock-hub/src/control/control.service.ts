import { Injectable } from '@nestjs/common';
import { SeededRandom } from '@pdfe/platform-core';

/** What a mock does when it is called: wait, then answer ok or with a failure. */
export interface Behavior {
  latency_ms: number;
  /** Chance of a failure, 0 to 1, drawn from a seeded sequence so a run always sees the same failures. */
  failure_rate: number;
  /** Outcomes used one after another before the failure rate applies (`ok` or `fail`). */
  script: ('ok' | 'fail')[];
}

export interface ControlEntry {
  kind: string;
  latency_ms: number;
  failure_rate: number;
  script?: ('ok' | 'fail')[];
}

const DEFAULT: Behavior = { latency_ms: 0, failure_rate: 0, script: [] };
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * The behaviour of each mock kind, set by a scenario run (`POST /mock/_control`). The state lives in this process only:
 * a restart gives the defaults (answer at once, never fail), and the next run sets it again.
 */
@Injectable()
export class ControlService {
  private behaviors = new Map<string, Behavior>();
  private rng = new SeededRandom(0);

  /** Replaces the whole configuration: kinds not listed go back to the defaults. */
  configure(seed: number, entries: ControlEntry[]): void {
    this.rng = new SeededRandom(seed);
    this.behaviors = new Map(
      entries.map((e) => [
        e.kind,
        { latency_ms: e.latency_ms, failure_rate: e.failure_rate, script: [...(e.script ?? [])] },
      ]),
    );
  }

  current(kind: string): Behavior {
    return this.behaviors.get(kind) ?? { ...DEFAULT, script: [] };
  }

  /** Waits for the configured latency and says whether this call should fail. */
  async behave(kind: string): Promise<'ok' | 'fail'> {
    const b = this.behaviors.get(kind);
    if (!b) return 'ok';
    if (b.latency_ms > 0) await sleep(b.latency_ms);
    const scripted = b.script.shift();
    if (scripted) return scripted;
    // Always draw, so the sequence does not depend on whether a rate is set.
    const draw = this.rng.int(0, 9999) / 10000;
    return draw < b.failure_rate ? 'fail' : 'ok';
  }
}
