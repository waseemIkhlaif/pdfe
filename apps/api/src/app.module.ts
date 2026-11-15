import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { RequestContextMiddleware } from './core/request-context.middleware';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { IntegrationModule } from './integration/integration.module';

@Module({ imports: [CoreModule, DbModule, IntegrationModule, HealthModule] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*path');
  }
}
