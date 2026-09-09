import type { Span } from '@opentelemetry/api';
import { Trace } from '../../../../../src';
import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS } from '../../../../../src/modules/settings/constants';
import { TRACEFLOW_TRACER } from '../../../../../src/modules/traces/shared/constants/trace-span.constant';

describe('@Trace', () => {
  afterEach(() => jest.restoreAllMocks());

  it('traces a static method', () => {
    const span = createSpan();
    jest.spyOn(TRACEFLOW_TRACER, 'startActiveSpan').mockImplementation(((...args: unknown[]) => (args.at(-1) as (activeSpan: Span) => unknown)(span as unknown as Span)) as never);

    class PaginationFunctions {
      @Trace({ name: 'Crear paginación', type: 'method', labels: ['module'] })
      static createPaginationMeta(total: number, page: number, limit: number) {
        return { total, page, limit, totalPages: Math.ceil(total / limit) };
      }
    }

    expect(PaginationFunctions.createPaginationMeta(25, 2, 10)).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.nodeType, 'method');
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.codeClass, 'PaginationFunctions');
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.codeFunction, 'createPaginationMeta');
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.labels, ['module']);
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input, JSON.stringify({ total: 25, page: 2, limit: 10 }));
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output, JSON.stringify({ total: 25, page: 2, limit: 10, totalPages: 3 }));
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
