import { Injectable } from '@nestjs/common';
import type { ScenarioManifest } from '@pdfe/domain-types';

/** What a run tells the mock hub: how each kind of mock should behave, and the seed of its failures. */
export interface HubSettings {
  seed: number;
  entries: ScenarioManifest['mock_hub'];
}

/**
 * Sets the behaviour of the mock hub for a run (`POST /mock/_control`, internal token). Provided as a class so tests can
 * replace it. With no `MOCK_HUB_URL` there is no hub to configure (fast development mode), and it does nothing; with a
 * URL, a failure to reach the hub fails the run.
 */
@Injectable()
export class MockHubControl {
  async configure(settings: HubSettings): Promise<'configured' | 'skipped'> {
    const base = process.env.MOCK_HUB_URL;
    if (!base) return 'skipped';
    const token = process.env.SCENARIO_TOKEN;
    if (!token) throw new Error('SCENARIO_TOKEN is not set: the mock hub cannot be configured');
    const res = await fetch(`${base.replace(/\/$/, '')}/mock/_control`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-scenario-token': token },
      body: JSON.stringify({
        seed: settings.seed,
        entries: settings.entries.map((e) => ({
          kind: e.kind,
          latency_ms: e.latency_ms,
          failure_rate: e.failure_rate,
          ...(e.script ? { script: e.script } : {}),
        })),
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`the mock hub refused its configuration (${res.status})`);
    return 'configured';
  }
}
