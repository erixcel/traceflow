import type { Span } from '@opentelemetry/api';
import { Table, Trace } from '../../../../../src';
import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS } from '../../../../../src/modules/settings/constants';
import { TRACEFLOW_TRACER } from '../../../../../src/modules/traces/shared/constants/trace-span.constant';

describe('@Table', () => {
  afterEach(() => jest.restoreAllMocks());

  it('traces every class method as a table operation with one decorator', async () => {
    const span = createSpan();
    const startActiveSpan = jest
      .spyOn(TRACEFLOW_TRACER, 'startActiveSpan')
      .mockImplementation(((...args: unknown[]) => (args.at(-1) as (activeSpan: Span) => unknown)(span as unknown as Span)) as never);

    @Table({ name: 'users', system: 'postgresql' })
    class UserTable {
      async findById(id: number) {
        return { id };
      }
    }

    await expect(new UserTable().findById(7)).resolves.toEqual({ id: 7 });
    expect(startActiveSpan).toHaveBeenCalledTimes(1);
    expect(startActiveSpan).toHaveBeenCalledWith('users', expect.anything(), expect.any(Function));
    expect(span.setAttributes).toHaveBeenCalledWith({ 'db.collection.name': 'users', 'db.system': 'postgresql' });
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.nodeType, 'table');
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.codeClass, 'UserTable');
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.codeFunction, 'findById');
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_ATTRIBUTE_KEYS.labels, ['table', 'select']);
    expect(span.setAttribute).toHaveBeenCalledWith(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input, JSON.stringify({ id: 7 }));
  });

  it('does not wrap excluded or already traced methods twice', () => {
    const span = createSpan();
    const startActiveSpan = jest
      .spyOn(TRACEFLOW_TRACER, 'startActiveSpan')
      .mockImplementation(((...args: unknown[]) => (args.at(-1) as (activeSpan: Span) => unknown)(span as unknown as Span)) as never);

    @Table({ name: 'users', exclude: ['health'] })
    class MixedTable {
      @Trace({ name: 'custom lookup', type: 'service' })
      findOne() {
        return 1;
      }

      health() {
        return 'ok';
      }
    }

    const table = new MixedTable();
    expect(table.findOne()).toBe(1);
    expect(table.health()).toBe('ok');
    expect(startActiveSpan).toHaveBeenCalledTimes(1);
    expect(startActiveSpan).toHaveBeenCalledWith('custom lookup', expect.anything(), expect.any(Function));
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
