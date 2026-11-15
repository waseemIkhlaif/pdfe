import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
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
