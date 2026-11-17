import { getContext } from '../correlation';

/**
 * Job data with the correlation ID of the caller on it, as `correlation_id`. A producer calls this on whatever it puts in a
 * queue, so the consumer (BaseConsumer restores the ID before it runs) and the logs of the worker carry the same ID as the
 * request that caused the job. `explicit` wins over the current context, for a relay that publishes on behalf of an event.
 */
export function withCorrelation<T extends object>(
  data: T,
  explicit?: string,
): T & { correlation_id: string } {
  const id = explicit ?? getContext()?.correlationId ?? 'none';
  return { ...data, correlation_id: id };
}
