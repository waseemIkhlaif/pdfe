import type { Context } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  BatchSpanProcessor,
  type ReadableSpan,
  type Span,
  type SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { getContext } from './correlation';

/**
 * Puts the correlation ID of the request or job on every span, so a trace can be found by the same ID that is in the
 * logs, the audit event and the error the user saw.
 */
export class CorrelationSpanProcessor implements SpanProcessor {
  onStart(span: Span, _parentContext: Context): void {
    const id = getContext()?.correlationId;
    if (id) span.setAttribute('correlation_id', id);
  }
  onEnd(_span: ReadableSpan): void {}
  async forceFlush(): Promise<void> {}
  async shutdown(): Promise<void> {}
}

export interface Telemetry {
  shutdown(): Promise<void>;
}

/**
 * Starts OpenTelemetry for a service: HTTP, pg, ioredis, undici (fetch) and Pino instrumentation; traces, metrics and logs sent over
 * OTLP/HTTP to `OTEL_EXPORTER_OTLP_ENDPOINT` (the `lgtm` container in the stack). Metrics carry exemplars that link to
 * the trace of the request. Without that variable nothing is started and nothing is sent, so tests and the fast
 * development mode run without a collector. Call it first in `main`, before anything that is instrumented is loaded.
 */
export function startTelemetry(opts: {
  service: string;
  env?: NodeJS.ProcessEnv;
}): Telemetry | null {
  const env = opts.env ?? process.env;
  const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.replace(/\/$/, '');
  if (!endpoint) return null;
  const sdk = new NodeSDK({
    serviceName: opts.service,
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
        exportIntervalMillis: 15_000,
      }),
    ],
    // Log lines go to Loki through the same collector: the Pino instrumentation forwards each line, with its fields.
    logRecordProcessors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${endpoint}/v1/logs` }),
      }),
    ],
    // With `spanProcessors` the SDK ignores `traceExporter`, so the exporter is a processor here, after the one that adds
    // the correlation ID: the attribute is on the span before it is exported.
    spanProcessors: [
      new CorrelationSpanProcessor(),
      new BatchSpanProcessor(new OTLPTraceExporter({ url: `${endpoint}/v1/traces` })),
    ],
    instrumentations: [
      new HttpInstrumentation(),
      new PinoInstrumentation(),
      new PgInstrumentation(),
      new IORedisInstrumentation(),
      new UndiciInstrumentation(),
    ],
  });
  sdk.start();
  return {
    shutdown: () => sdk.shutdown(),
  };
}
