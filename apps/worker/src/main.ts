import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  if (process.argv.includes('--once')) await app.close();
}

bootstrap().catch((err: unknown) => {
  console.error('worker failed to start:', (err as Error).message);
  process.exit(1);
});
