import { z } from 'zod';

/**
 * Typed registry of every configuration setting (FR-029). Keys, shapes, defaults and safety locks are
 * the single source for the API, the database seed and the admin screens.
 * Money values are integer minor units (constitution Article III).
 */
const mockPattern = z.string().regex(/^mock:(\*|[a-z]+)$/, 'only mock adapters are allowed');
const hostname = z.string().regex(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i);
const minor = z.number().int().min(0);

export interface ConfigItem<S extends z.ZodType = z.ZodType> {
  schema: S;
  default: z.infer<S>;
  /** Safety-locked settings can never get a new version through the API (FR-010). */
  safetyLocked: boolean;
  description: string;
}

const item = <S extends z.ZodType>(i: ConfigItem<S>): ConfigItem<S> => i;

export const configRegistry = {
  'app.mode': item({
    schema: z.literal('DEMO'),
    default: 'DEMO' as const,
    safetyLocked: true,
    description: 'Operating mode. Only DEMO exists.',
  }),
  'adapters.allowlist': item({
    schema: z.array(mockPattern).min(1),
    default: ['mock:*'],
    safetyLocked: true,
    description: 'Adapter types that may be registered. Mock types only.',
  }),
  'egress.internal_hosts': item({
    schema: z.array(hostname).min(1),
    default: [
      'postgres',
      'redis',
      'keycloak',
      'mock-hub',
      'api',
      'worker',
      'lgtm',
      'localhost',
      '127.0.0.1',
    ],
    safetyLocked: true,
    description: 'Hosts application components may connect to.',
  }),
  'security.elevation.ttl_minutes': item({
    schema: z.number().int().min(5).max(120),
    default: 30,
    safetyLocked: false,
    description: 'Default time limit of a read-only tenant elevation.',
  }),
  'approvals.default_expiry_hours': item({
    schema: z.number().int().min(1).max(168),
    default: 24,
    safetyLocked: false,
    description: 'Default expiry of an approval request.',
  }),
  'api.rate_limit': item({
    schema: z.object({
      per_user_per_minute: z.number().int().min(10).max(6000),
      per_ip_per_minute: z.number().int().min(10).max(6000),
    }),
    default: { per_user_per_minute: 600, per_ip_per_minute: 1200 },
    safetyLocked: false,
    description: 'Baseline rate limits (placeholders).',
  }),
  'idempotency.ttl_hours': item({
    schema: z.number().int().min(1).max(168),
    default: 24,
    safetyLocked: false,
    description: 'How long an idempotency key is remembered.',
  }),
  'fees.default_minor': item({
    schema: minor,
    default: 0,
    safetyLocked: false,
    description: 'Default fee in minor units (decision D-07 placeholder).',
  }),
  'limits.transfer_max_minor': item({
    schema: minor,
    default: 500000,
    safetyLocked: false,
    description: 'Maximum transfer in minor units (placeholder).',
  }),
  'fx.spread_bps': item({
    schema: z.number().int().min(0).max(1000),
    default: 0,
    safetyLocked: false,
    description: 'FX spread in basis points (placeholder).',
  }),
  'features.flags': item({
    schema: z.record(z.string(), z.boolean()),
    default: { paper_trading: false, remittance: false } as Record<string, boolean>,
    safetyLocked: false,
    description: 'Feature flags.',
  }),
} as const;

export type ConfigKey = keyof typeof configRegistry;
export type ConfigValue<K extends ConfigKey> = z.infer<(typeof configRegistry)[K]['schema']>;

export const configKeys = Object.keys(configRegistry) as ConfigKey[];
export const safetyLockedKeys: ConfigKey[] = configKeys.filter(
  (k) => configRegistry[k].safetyLocked,
);

/** Reads the active value of a setting. The database-backed reader replaces the defaults one in the configuration story. */
export interface ConfigReader {
  get<K extends ConfigKey>(key: K): Promise<ConfigValue<K>>;
}

export class DefaultsConfigReader implements ConfigReader {
  async get<K extends ConfigKey>(key: K): Promise<ConfigValue<K>> {
    return configRegistry[key].default as ConfigValue<K>;
  }
}
