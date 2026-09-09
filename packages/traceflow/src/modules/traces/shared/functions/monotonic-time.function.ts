import { performance } from 'node:perf_hooks';
import type { HrTime } from '@opentelemetry/api';

/** One process-wide clock origin for every start and end. HrTime avoids the
 * per-span wall-clock correction OpenTelemetry applies to numeric time inputs.
 */
export function monotonicUnixTime(): HrTime {
  const origin = performance.timeOrigin;
  const elapsed = performance.now();
  const seconds = Math.floor(origin / 1_000) + Math.floor(elapsed / 1_000);
  const nanoseconds = Math.round(((origin % 1_000) + (elapsed % 1_000)) * 1_000_000);
  return [seconds + Math.floor(nanoseconds / 1_000_000_000), nanoseconds % 1_000_000_000];
}
