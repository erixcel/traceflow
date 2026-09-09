import type { Span } from '@opentelemetry/api';
import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS } from '../../../../../src/modules/settings/constants';
import { TRACEFLOW_TRACER } from '../../../../../src/modules/traces/shared/constants/trace-span.constant';
import { runTraceSpan } from '../../../../../src/modules/traces/shared/functions/trace-span.function';

describe('runTraceSpan', () => {
  afterEach(() => jest.restoreAllMocks());

  it('captures input and output by default', () => {
    const span = createSpan();
    jest.spyOn(TRACEFLOW_TRACER, 'startActiveSpan').mockImplementation(((...args: unknown[]) => (args.at(-1) as (activeSpan: Span) => unknown)(span as unknown as Span)) as never);

    const result = runTraceSpan('customer.findAll', () => ({ total: 1 }), {}, { filters: { page: 1 } });

    expect(result).toEqual({ total: 1 });
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.nodeType, 'method');
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input, JSON.stringify({ filters: { page: 1 } }));
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output, JSON.stringify({ total: 1 }));
  });

  it('allows each automatic capture to be disabled', () => {
    const span = createSpan();
    jest.spyOn(TRACEFLOW_TRACER, 'startActiveSpan').mockImplementation(((...args: unknown[]) => (args.at(-1) as (activeSpan: Span) => unknown)(span as unknown as Span)) as never);

    runTraceSpan('customer.findAll', () => [], { capture: { input: false, output: false } }, { page: 1 });

    expect(span.setAttribute).not.toHaveBeenCalledWith(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input, expect.anything());
    expect(span.setAttribute).not.toHaveBeenCalledWith(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output, expect.anything());
  });
});

function createSpan() {
  return {
    setAttribute: jest.fn(),
    setAttributes: jest.fn(),
    setStatus: jest.fn(),
    recordException: jest.fn(),
    end: jest.fn(),
  };
}
