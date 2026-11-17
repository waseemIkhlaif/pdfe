import { Inject, Injectable } from '@nestjs/common';
import {
  configRegistry,
  type ConfigKey,
  type ConfigReader,
  type ConfigValue,
} from '@pdfe/domain-types';
import type { ClockService } from '@pdfe/platform-core';
import type { Pool } from '@pdfe/platform-core/db';
import { CLOCK, PG_POOL } from '../core/tokens';

/** How long a value is trusted before the database is asked again (another process may have activated a version). */
const TTL_MS = 5_000;

/**
 * Reads the active version of a setting from `config.config_versions`. It replaces the defaults reader: a setting with no
 * active row (the database is not seeded yet), or while the database cannot be reached, gives the last known value or the
 * registry default. Values are cached for a few seconds, and the
 * cache is cleared at once when this process activates a version (`config.activated`).
 */
@Injectable()
export class DbConfigReader implements ConfigReader {
  private readonly cache = new Map<string, { value: unknown; at: number }>();

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(CLOCK) private readonly clock: ClockService,
  ) {}

  async get<K extends ConfigKey>(key: K): Promise<ConfigValue<K>> {
    const now = this.clock.now().getTime();
    const hit = this.cache.get(key);
    if (hit && Math.abs(now - hit.at) < TTL_MS) return hit.value as ConfigValue<K>;
    let value: unknown;
    try {
      const r = await this.pool.query<{ value: unknown }>(
        "SELECT value FROM config.config_versions WHERE key = $1 AND status = 'active'",
        [key],
      );
      value = r.rows.length ? r.rows[0]!.value : configRegistry[key].default;
    } catch {
      // The database cannot be reached: keep serving the last value this process knew, or the default. A request is not
      // refused because a setting could not be read (the health check reports the database itself).
      value = hit ? hit.value : configRegistry[key].default;
    }
    this.cache.set(key, { value, at: now });
    return value as ConfigValue<K>;
  }

  /** Forget what is cached: the next read goes to the database. */
  invalidate(key?: string): void {
    if (key) this.cache.delete(key);
    else this.cache.clear();
  }
}
