import { SpanStatusCode } from '@opentelemetry/api';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-node';
import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS } from '../../../../../src/modules/settings/constants';
import { readableSpanToTraceFlowSpan } from '../../../../../src/modules/traces/shared/functions/span-converter.function';

describe('readableSpanToTraceFlowSpan', () => {
  it('promotes captured values and keeps documentation attributes separate', () => {
    const span = {
      spanContext: () => ({ traceId: '1'.repeat(32), spanId: '2'.repeat(16) }),
      resource: { attributes: { 'service.name': 'customers-api' } },
      attributes: {
        [TRACEFLOW_ATTRIBUTE_KEYS.nodeType]: 'method',
        [TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input]: JSON.stringify({ filters: { page: 1 } }),
        [TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output]: JSON.stringify({ total: 0 }),
        'db.system': 'postgresql',
      },
      parentSpanContext: undefined,
      name: 'CustomerRepository.findAll',
      startTime: [1, 100_000],
      endTime: [1, 300_000],
      duration: [0, 200_000],
      status: { code: SpanStatusCode.OK },
      events: [],
    } as unknown as ReadableSpan;

    const result = readableSpanToTraceFlowSpan(span, 'fallback');

    expect(result.startedAt).toBe(result.endedAt);
    expect(result.input).toEqual({ filters: { page: 1 } });
    expect(result.output).toEqual({ total: 0 });
    expect(result.type).toBe('method');
    expect(result.attributes).toEqual({ 'db.system': 'postgresql', 'traceflow.timing.startUnixMs': 1000.1, 'traceflow.timing.endUnixMs': 1000.3 });
  });

  it('maps node types removed from the protocol to custom', () => {
    const span = {
      spanContext: () => ({ traceId: '1'.repeat(32), spanId: '2'.repeat(16) }),
      resource: { attributes: {} },
      attributes: { [TRACEFLOW_ATTRIBUTE_KEYS.nodeType]: 'repository' },
      parentSpanContext: undefined,
      name: 'Legacy call',
      startTime: [1, 0],
      endTime: [1, 1],
      duration: [0, 1],
      status: { code: SpanStatusCode.OK },
      events: [],
    } as unknown as ReadableSpan;

    expect(readableSpanToTraceFlowSpan(span, 'fallback').type).toBe('custom');
  });
});
