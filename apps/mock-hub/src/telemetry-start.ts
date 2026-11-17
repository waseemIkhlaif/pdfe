import { startTelemetry } from '@pdfe/platform-core/telemetry';

/**
 * Imported first by main.ts, so OpenTelemetry is running before anything it instruments (http, pg, ioredis, fetch)
 * is loaded. It starts only when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 */
export const telemetry = startTelemetry({ service: 'mock-hub' });
