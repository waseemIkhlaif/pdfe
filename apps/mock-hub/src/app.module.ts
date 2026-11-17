import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { CorrelationMiddleware } from './core/correlation.middleware';
import { PingController } from './mocks/ping.controller';

@Module({ controllers: [PingController] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*path');
  }
}
