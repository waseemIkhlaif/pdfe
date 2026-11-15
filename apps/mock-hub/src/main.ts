import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { configRegistry } from '@pdfe/domain-types';
import { guardStartup, installEgressGuard } from '@pdfe/platform-core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Safety first: refuse to start unless this is DEMO, then close the network.
  guardStartup();
  installEgressGuard(
    process.env.INTERNAL_HOSTS?.split(',').map((h) => h.trim()) ??
      configRegistry['egress.internal_hosts'].default,
  );

  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 4100);
  await app.listen(port, '0.0.0.0');
  console.log(JSON.stringify({ msg: 'mock-hub listening', port }));
}

bootstrap().catch((err: unknown) => {
  console.error('mock-hub failed to start:', (err as Error).message);
  process.exit(1);
});
