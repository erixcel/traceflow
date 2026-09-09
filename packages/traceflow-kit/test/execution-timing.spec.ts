import { EventEmitter } from 'node:events';
import { context, trace as traceApi } from '@opentelemetry/api';
import { InMemorySpanExporter, NodeTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Trace } from '../../traceflow/src/modules/traces/normal/decorators/trace.decorator';
import { runTraceSpan } from '../../traceflow/src/modules/traces/shared/functions/trace-span.function';
import { readableSpanToTraceFlowSpan } from '../../traceflow/src/modules/traces/shared/functions/span-converter.function';
import { buildTraceFlowHttpInput, createTraceFlowHttpMiddleware, resolveTraceFlowHttpCapture } from '../../traceflow/src/modules/traces/shared/functions/http-middleware.function';
import { groupConcurrentSpans, hasMonotonicTiming } from '../studio/src/modules/admin/page/flows/functions/execution-flow.function';

describe('SDK timing through Studio concurrency grouping', () => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });

  class Repository {
    @Trace({ type: 'method' })
    async findByDateRange() {
      return [];
    }

    @Trace({ type: 'method' })
    async pet() {
      return [];
    }

    @Trace({ type: 'method' })
    async type() {
      return [];
    }

    @Trace({ type: 'method' })
    async branch() {
      return [];
    }

    @Trace({ type: 'method' })
    async customer() {
      return [];
    }
  }

  beforeAll(() => provider.register());
  afterEach(() => {
    jest.restoreAllMocks();
    exporter.reset();
  });
  afterAll(async () => {
    await provider.shutdown();
    context.disable();
    traceApi.disable();
  });

  it('keeps await → Promise.all(3) → await as 1–3–1 even when every wall-clock timestamp is identical', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_788_796_650_888);
    const repository = new Repository();
    for (let iteration = 0; iteration < 10; iteration++) {
      await runTraceSpan('service', async () => {
        await repository.findByDateRange();
        await Promise.all([repository.pet(), repository.type(), repository.branch()]);
        await repository.customer();
      });
    }
    await provider.forceFlush();
    const spans = exporter.getFinishedSpans().map((span) => readableSpanToTraceFlowSpan(span, 'test'));
    const services = spans.filter((span) => span.name === 'service');
    expect(hasMonotonicTiming(spans)).toBe(true);
    expect(services).toHaveLength(10);
    for (const service of services) {
      const children = spans.filter((span) => span.parentSpanId === service.spanId);
      expect(groupConcurrentSpans(children).map((group) => group.map((span) => span.methodName))).toEqual([['findByDateRange'], ['pet', 'type', 'branch'], ['customer']]);
      expect(children.every((span) => (span.attributes['traceflow.timing.startUnixMs'] as number) >= (service.attributes['traceflow.timing.startUnixMs'] as number))).toBe(true);
      expect(children.every((span) => (span.attributes['traceflow.timing.endUnixMs'] as number) <= (service.attributes['traceflow.timing.endUnixMs'] as number))).toBe(true);
    }
  });

  it('does not present legacy or mixed clock data as confirmed monotonic timing', async () => {
    runTraceSpan('timed', () => 1);
    await provider.forceFlush();
    const span = readableSpanToTraceFlowSpan(exporter.getFinishedSpans()[0], 'test');
    const legacy = { ...span, attributes: { ...span.attributes } };
    delete legacy.attributes['traceflow.timing.clock'];
    expect(hasMonotonicTiming([])).toBe(false);
    expect(hasMonotonicTiming([span])).toBe(true);
    expect(hasMonotonicTiming([legacy])).toBe(false);
    expect(hasMonotonicTiming([span, legacy])).toBe(false);
  });

  it('starts the request context before auth and controller spans', async () => {
    const response = Object.assign(new EventEmitter(), { statusCode: 200, finished: false, writableEnded: false });
    await new Promise<void>((resolve, reject) => {
      createTraceFlowHttpMiddleware({ capture: { authorization: 'full' } })(
        {
          method: 'GET',
          originalUrl: '/admin/dashboard/transactions?page=1',
          headers: { authorization: 'Bearer test-token', cookie: 'session=abc', accept: 'application/json' },
        },
        response,
        () => {
          void (async () => {
            await runTraceSpan('auth', async () => 1, { type: 'service' });
            await runTraceSpan('controller', async () => 2, { type: 'controller' });
            response.finished = true;
            response.writableEnded = true;
            response.emit('finish');
            resolve();
          })().catch(reject);
        },
      );
    });
    await provider.forceFlush();
    const spans = exporter.getFinishedSpans().map((span) => readableSpanToTraceFlowSpan(span, 'test'));
    const request = spans.find((span) => span.name === 'GET /admin/dashboard/transactions')!;
    expect(request.parentSpanId).toBeNull();
    expect(request.attributes).toMatchObject({ 'traceflow.http.request_root': true, 'http.request.method': 'GET', 'url.path': '/admin/dashboard/transactions' });
    expect(request.input).toEqual({ query: { page: '1' }, cookies: { session: 'abc' }, authorization: 'Bearer test-token', headers: { accept: 'application/json' } });
    expect(spans.filter((span) => span.parentSpanId === request.spanId).map((span) => span.name)).toEqual(['auth', 'controller']);
    expect(new Set(spans.map((span) => span.traceId))).toEqual(new Set([request.traceId]));
  });

  it('captures form-data metadata and allows every HTTP section to be configured', () => {
    const input = buildTraceFlowHttpInput(
      {
        headers: { 'content-type': 'multipart/form-data; boundary=test', authorization: 'Bearer hidden', cookie: 'session=hidden', 'x-request-id': 'request-1' },
        body: { title: 'Photo' },
        file: { fieldname: 'file', originalname: 'dog.png', mimetype: 'image/png', size: 2048, buffer: Buffer.from('not exported') },
      },
      resolveTraceFlowHttpCapture({ query: false, body: false, formData: true, cookies: false, authorization: 'none', headers: ['x-request-id'] }),
    );
    expect(input).toEqual({
      formData: { title: 'Photo', file: { fieldname: 'file', originalname: 'dog.png', mimetype: 'image/png', size: 2048 } },
      headers: { 'x-request-id': 'request-1' },
    });
  });

  it('keeps synchronous and rejected calls ordered across a wall-clock adjustment', async () => {
    let wallTime = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => (wallTime -= 1_000));
    await runTraceSpan('service', async () => {
      runTraceSpan('sync', () => 0);
      expect(() =>
        runTraceSpan('throw', () => {
          throw new Error('sync failure');
        }),
      ).toThrow('sync failure');
      await expect(runTraceSpan('reject', () => Promise.reject(new Error('async failure')))).rejects.toThrow('async failure');
      await runTraceSpan('last', async () => false);
    });
    await provider.forceFlush();
    const spans = exporter.getFinishedSpans().map((span) => readableSpanToTraceFlowSpan(span, 'test'));
    const children = spans.filter((span) => span.name !== 'service');
    expect(groupConcurrentSpans(children).map((group) => group.map((span) => span.name))).toEqual([['sync'], ['throw'], ['reject'], ['last']]);
    expect(children.filter((span) => span.status === 'error').map((span) => span.name)).toEqual(['throw', 'reject']);
    expect(children.every((span) => span.durationMs >= 0)).toBe(true);
  });
});
