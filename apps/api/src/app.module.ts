import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ApprovalsModule } from './approvals/approvals.module';
import { AuditModule } from './audit/audit.module';
import { CoreModule } from './core/core.module';
import { RequestContextMiddleware } from './core/request-context.middleware';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { AuthGuard } from './identity/auth.guard';
import { IdentityModule } from './identity/identity.module';
import { MfaGuard } from './identity/mfa.guard';
import { PermissionsGuard } from './identity/permissions.guard';
import { IdempotencyInterceptor } from './integration/idempotency.interceptor';
import { IntegrationModule } from './integration/integration.module';
import { ElevatedReadInterceptor } from './tenancy/elevated-read.interceptor';
import { ReadOnlyElevationGuard } from './tenancy/read-only-elevation.guard';
import { TenancyModule } from './tenancy/tenancy.module';
import { TenantContextInterceptor } from './tenancy/tenant-context.interceptor';

@Module({
  imports: [
    CoreModule,
    DbModule,
    AuditModule,
    ApprovalsModule,
    IntegrationModule,
    IdentityModule,
    TenancyModule,
    HealthModule,
  ],
  providers: [
    // Order matters. Guards: sign in, second factor, permission, no writes during an elevation.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: MfaGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ReadOnlyElevationGuard },
    // Interceptors, outermost first: idempotency, elevated-read audit, request transaction.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ElevatedReadInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*path');
  }
}
