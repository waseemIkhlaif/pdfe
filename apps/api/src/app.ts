import type { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from './core/error.filter';

/** Settings shared by the real server and the test applications. */
export function configureApp(app: INestApplication): void {
  app.useGlobalFilters(new AllExceptionsFilter());
}
