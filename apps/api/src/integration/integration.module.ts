import { Global, Inject, Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { ADAPTER_KINDS, mockTypeFor } from '@pdfe/domain-types';
import type { Pool } from '@pdfe/platform-core/db';
import { PG_POOL } from '../core/tokens';
import { loadAdapterConfig } from './adapter-config.loader';
import { AdapterRegistry } from './adapter-registry';
import { createMockAdapter } from './adapters/mock/mock-adapter';

const MOCK_HUB_URL = process.env.MOCK_HUB_URL ?? 'http://mock-hub:4100';

/** Builds the adapter registry from the validated configuration and records it in integration.partner_adapters. */
@Global()
@Module({
  providers: [
    {
      provide: AdapterRegistry,
      useFactory: () => {
        const config = loadAdapterConfig(process.env.ADAPTERS_CONFIG);
        const registry = new AdapterRegistry();
        // loadAdapterConfig has already refused anything but each kind's own mock type.
        for (const kind of ADAPTER_KINDS) {
          if (config[kind] === mockTypeFor(kind))
            registry.register(createMockAdapter(kind, MOCK_HUB_URL));
        }
        return registry;
      },
    },
  ],
  exports: [AdapterRegistry],
})
export class IntegrationModule implements OnApplicationBootstrap {
  private readonly log = new Logger('integration');

  constructor(
    private readonly registry: AdapterRegistry,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  /** Best effort: the process is already safe without the table. A failure is logged, not hidden. */
  async onApplicationBootstrap(): Promise<void> {
    try {
      for (const [kind, type] of Object.entries(this.registry.list())) {
        await this.pool.query(
          `INSERT INTO integration.partner_adapters (code, kind, adapter_type) VALUES ($1, $1, $2)
           ON CONFLICT (code) DO UPDATE SET adapter_type = EXCLUDED.adapter_type`,
          [kind, type],
        );
      }
    } catch (err) {
      this.log.warn(`could not record adapters in the database yet: ${(err as Error).message}`);
    }
  }
}
