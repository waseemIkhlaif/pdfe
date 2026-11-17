import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { CorrelationMiddleware } from './core/correlation.middleware';
import { ControlController } from './control/control.controller';
import { ControlService } from './control/control.service';
import { PingController } from './mocks/ping.controller';

@Module({ controllers: [PingController, ControlController], providers: [ControlService] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationMiddleware).forRoutes('*path');
  }
}
