import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS } from '../../../settings/constants';
import { TRACEFLOW_TRACER } from '../../shared/constants/trace-span.constant';
import { monotonicUnixTime } from '../../shared/functions/monotonic-time.function';
import { toJsonSerializable } from '../../shared/functions/json.function';
import type { TracePgCaptureOptions, TracePgOptions } from '../interfaces/pg-instrumentation.interface';
import { instrumentedPgClients, instrumentedPgPools } from '../pg-instrumentation.runtime';
import { getPgQueryMetadata } from './pg-query.function';

/** Configuración única para Drizzle/node-postgres. Conserva el Pool y sus clientes originales. */
export function instrumentPgPool<T extends object>(pool: T, options: TracePgOptions = {}): T {
  if (options.enabled === false || instrumentedPgPools.has(pool)) return pool;
  const on: unknown = Reflect.get(pool, 'on');
  const connect: unknown = Reflect.get(pool, 'connect');
  if (typeof on !== 'function' || typeof connect !== 'function') throw new TypeError('instrumentPgPool requiere un Pool de node-postgres');

  Reflect.apply(on, pool, ['acquire', (client: object) => instrumentPgClient(client, options)]);
  Reflect.set(pool, 'connect', function (this: object, ...args: unknown[]): unknown {
    // A queued checkout may be delivered from a different request's release().
    const bound = args.map((arg) => (typeof arg === 'function' ? context.bind(context.active(), arg) : arg));
    return Reflect.apply(connect, this, bound);
  });
  instrumentedPgPools.add(pool);
  return pool;
}

/** Para aplicaciones que usan Client directamente, sin Pool. */
export function instrumentPgClient<T extends object>(client: T, options: TracePgOptions = {}): T {
  if (options.enabled === false || instrumentedPgClients.has(client)) return client;
  const query: unknown = Reflect.get(client, 'query');
  if (typeof query !== 'function') throw new TypeError('instrumentPgClient requiere un cliente de node-postgres');
  // Prepared statement names belong to one connection; never share across clients.
  const prepared = new Map<string, string>();
  Reflect.set(client, 'query', function (this: object, ...args: unknown[]): unknown {
    const config = args[0];
    const queryObject = config && typeof config === 'object' ? config : null;
    if (queryObject && typeof Reflect.get(queryObject, 'submit') === 'function') return Reflect.apply(query, this, args);
    const name: unknown = queryObject ? Reflect.get(queryObject, 'name') : undefined;
    const text: unknown = typeof config === 'string' ? config : queryObject ? Reflect.get(queryObject, 'text') : undefined;
    if (typeof name === 'string' && typeof text === 'string' && !prepared.has(name)) prepared.set(name, text);
    const sql = typeof text === 'string' ? text : typeof name === 'string' ? prepared.get(name) : undefined;
    // Query construction/startup and methods returning without SQL do not create traces.
    if (!sql || !trace.getActiveSpan()?.isRecording()) return Reflect.apply(query, this, args);
    const metadata = getPgQueryMetadata(sql);
    if (metadata.control) return Reflect.apply(query, this, args);
    const parent = context.active();
    const spanName = `${metadata.operation} ${metadata.tables.slice(0, 4).join(' · ') || 'PostgreSQL'}`.slice(0, 500);
    return TRACEFLOW_TRACER.startActiveSpan(spanName, { startTime: monotonicUnixTime() }, (span) => {
      span.setAttributes({
        [TRACEFLOW_ATTRIBUTE_KEYS.nodeType]: 'table',
        [TRACEFLOW_ATTRIBUTE_KEYS.codeFunction]: metadata.operation,
        [TRACEFLOW_ATTRIBUTE_KEYS.labels]: [metadata.operation.toLowerCase(), ...(metadata.tables.length > 1 ? ['varias tablas'] : [])],
        'traceflow.timing.clock': 'monotonic',
        'traceflow.db.query': true,
        'db.system': 'postgresql',
        'db.operation.name': metadata.operation,
        'db.tables': metadata.tables.slice(0, 200).map((table) => table.slice(0, 4096)),
        'traceflow.db.tables.status': metadata.status,
      });
      const captureConfig: TracePgCaptureOptions =
        typeof options.capture === 'boolean' ? { statement: options.capture, parameters: options.capture, result: options.capture } : (options.capture ?? {});
      if (captureConfig.statement) span.setAttribute('db.query.text', sql.slice(0, 4096));
      const parameters: unknown = Array.isArray(args[1]) ? args[1] : queryObject ? Reflect.get(queryObject, 'values') : undefined;
      if (captureConfig.parameters && parameters !== undefined) span.setAttribute(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input, JSON.stringify(toJsonSerializable({ parameters })));
      let ended = false;
      const finish = (error: unknown, result?: unknown): void => {
        if (ended) return;
        ended = true;
        finishPgSpan(span, error, result, captureConfig);
      };
      const finalArg = args.at(-1);
      const configCallback: unknown = queryObject ? Reflect.get(queryObject, 'callback') : undefined;
      const callback = typeof finalArg === 'function' ? finalArg : typeof configCallback === 'function' ? configCallback : undefined;
      if (callback) {
        const wrappedCallback = function (this: unknown, ...values: unknown[]): unknown {
          finish(values[0], values[1]);
          return context.with(parent, () => Reflect.apply(callback, this, values));
        };
        if (typeof finalArg === 'function') args[args.length - 1] = wrappedCallback;
        else args[0] = { ...queryObject, callback: wrappedCallback };
      }
      try {
        const result: unknown = Reflect.apply(query, this, args);
        if (callback) return result;
        if (result && typeof result === 'object' && 'then' in result && typeof result.then === 'function') {
          return Promise.resolve(result).then(
            (value: unknown) => {
              finish(null, value);
              return value;
            },
            (error: unknown) => {
              finish(error);
              throw error;
            },
          );
        }
        finish(null, result);
        return result;
      } catch (error) {
        finish(error);
        throw error;
      }
    });
  });
  instrumentedPgClients.add(client);
  return client;
}

function finishPgSpan(span: Span, error: unknown, result: unknown, captureConfig: TracePgCaptureOptions = {}): void {
  if (error) {
    const exception = error instanceof Error ? error : new Error(String(error));
    span.recordException(exception, monotonicUnixTime());
    span.setStatus({ code: SpanStatusCode.ERROR, message: exception.message });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
    const rowCount: unknown = result && typeof result === 'object' ? Reflect.get(result, 'rowCount') : undefined;
    const shouldCaptureResult = captureConfig.result ?? captureConfig.rows;
    if (shouldCaptureResult && result !== undefined) {
      const outputData: Record<string, unknown> = {};
      if (typeof rowCount === 'number') outputData.rowCount = rowCount;
      if (result && typeof result === 'object' && 'rows' in result) {
        const rows: unknown = Reflect.get(result, 'rows');
        outputData.rows = toJsonSerializable(rows);
      } else {
        outputData.rows = toJsonSerializable(result);
      }
      span.setAttribute(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output, JSON.stringify(outputData));
    } else if (typeof rowCount === 'number') {
      span.setAttribute(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output, JSON.stringify({ rowCount }));
    }
  }
  span.end(monotonicUnixTime());
}
