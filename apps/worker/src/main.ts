import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { configRegistry } from '@pdfe/domain-types';
import { guardStartup, installEgressGuard } from '@pdfe/platform-core';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  // Safety first: refuse to start unless this is DEMO, then close the network.
  guardStartup();
  installEgressGuard(
    process.env.INTERNAL_HOSTS?.split(',').map((h) => h.trim()) ??
      configRegistry['egress.internal_hosts'].default,
  );

  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  if (process.argv.includes('--once')) await app.close();
}

bootstrap().catch((err: unknown) => {
  console.error('worker failed to start:', (err as Error).message);
  process.exit(1);
});
