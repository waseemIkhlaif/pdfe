import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureApp(app);
  app.enableShutdownHooks();
  if (process.argv.includes('--once')) {
    // Start, check that everything wired up, and exit (startup-guard tests and smoke runs).
    await app.init();
    await app.close();
    return;
  }
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  console.log(JSON.stringify({ msg: 'api listening', port, mode: 'DEMO' }));
}

bootstrap().catch((err: unknown) => {
  console.error('api failed to start:', (err as Error).message);
  process.exit(1);
});
