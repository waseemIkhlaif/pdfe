import { configRegistry } from '@pdfe/domain-types';

/** The process must not start. The message is shown to the operator and names the cause. */
export class StartupRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StartupRefusedError';
  }
}

type Env = Record<string, string | undefined>;

/** Only DEMO exists (FR-006). Anything else stops the process. */
export function assertDemoMode(env: Env): void {
  const mode = env.APP_MODE;
  if (mode === 'LIVE')
    throw new StartupRefusedError(
      'LIVE mode is not supported. This platform runs in DEMO mode only.',
    );
  if (mode !== 'DEMO')
    throw new StartupRefusedError(`APP_MODE must be DEMO (got ${JSON.stringify(mode ?? null)}).`);
}

const hostSet = (list: string): Set<string> =>
  new Set(
    list
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );

/**
 * Safety-locked settings come from the deployment environment and must equal their registry values (FR-010).
 * Today that is the internal host list. The adapter allowlist is enforced by the adapter configuration loader.
 */
export function assertSafetyEnv(env: Env): void {
  if (env.INTERNAL_HOSTS === undefined) return;
  const expected = hostSet(configRegistry['egress.internal_hosts'].default.join(','));
  const actual = hostSet(env.INTERNAL_HOSTS);
  const extra = [...actual].filter((h) => !expected.has(h));
  const missing = [...expected].filter((h) => !actual.has(h));
  if (extra.length > 0 || missing.length > 0) {
    const parts = [
      extra.length > 0 ? `not allowed: ${extra.join(', ')}` : '',
      missing.length > 0 ? `missing: ${missing.join(', ')}` : '',
    ].filter(Boolean);
    throw new StartupRefusedError(
      `INTERNAL_HOSTS differs from the safety-locked list (${parts.join('; ')}). It cannot be changed by deployment.`,
    );
  }
}

/** Print the refusal and exit with status 1. Used by the mains before anything else starts. */
export function refuseStart(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`system.start_refused: ${message}`);
  process.exit(1);
}

/** Run every environment-level start check. Exits the process on the first failure. */
export function guardStartup(env: Env = process.env): void {
  try {
    assertDemoMode(env);
    assertSafetyEnv(env);
  } catch (err) {
    refuseStart(err);
  }
}
