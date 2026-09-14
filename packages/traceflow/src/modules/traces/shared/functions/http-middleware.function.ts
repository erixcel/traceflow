import { context, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import { TRACEFLOW_ATTRIBUTE_KEYS, TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS } from '../../../settings/constants';
import { TRACEFLOW_DEDICATED_HTTP_HEADERS, TRACEFLOW_DEFAULT_HTTP_CAPTURE, TRACEFLOW_TRACER } from '../constants';
import type {
  ResolvedTraceFlowHttpCaptureOptions,
  TraceFlowHttpCaptureOptions,
  TraceFlowHttpInput,
  TraceFlowHttpMiddleware,
  TraceFlowHttpMiddlewareOptions,
  TraceFlowHttpRequest,
  TraceFlowHttpResponse,
} from '../interfaces/http-middleware.interface';
import { toJsonSerializable } from './json.function';
import { monotonicUnixTime } from './monotonic-time.function';
import { findMatchingTracedDto } from './validation-schema.function';

/** Creates a Connect-compatible middleware. Register it before guards so every
 * decorated call created during the request inherits the same active context.
 */
export function createTraceFlowHttpMiddleware(options: TraceFlowHttpMiddlewareOptions = {}): TraceFlowHttpMiddleware {
  const capture = resolveTraceFlowHttpCapture(options.capture);
  return (request, response, next) => {
    if (options.ignore?.(request)) {
      next();
      return;
    }

    const activeSpan = trace.getSpan(context.active());
    if (activeSpan?.isRecording()) {
      markHttpRequestSpan(activeSpan, request, false);
      captureHttpRequest(activeSpan, request, capture);
      observeActiveHttpSpan(activeSpan, request, response, capture, next);
      return;
    }

    const method = request.method?.toUpperCase() || 'HTTP';
    const path = getRequestPath(request);
    TRACEFLOW_TRACER.startActiveSpan(`${method} ${path}`, { kind: SpanKind.SERVER, startTime: monotonicUnixTime() }, (span) => {
      markHttpRequestSpan(span, request, true);
      let ended = false;
      const responseChunks: Buffer[] = [];

      if (typeof response.write === 'function' && typeof response.end === 'function') {
        const originalWrite = response.write.bind(response);
        const originalEnd = response.end.bind(response);

        response.write = ((chunk: unknown, ...args: unknown[]) => {
          if (chunk) {
            try {
              const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
              if (responseChunks.length < 50) responseChunks.push(buf);
            } catch {
              // ignore
            }
          }
          return Reflect.apply(originalWrite, response, [chunk, ...args]);
        }) as typeof response.write;

        response.end = ((chunk: unknown, ...args: unknown[]) => {
          if (chunk && typeof chunk !== 'function') {
            try {
              const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
              if (responseChunks.length < 50) responseChunks.push(buf);
            } catch {
              // ignore
            }
          }
          return Reflect.apply(originalEnd, response, [chunk, ...args]);
        }) as typeof response.end;
      }

      const finish = () => {
        if (ended) return;
        ended = true;
        detachResponseListeners(response, finish, close);
        captureHttpRequest(span, request, capture);
        finishHttpRequestSpan(span, response, responseChunks, request);
      };
      const close = () => {
        if (ended) return;
        ended = true;
        detachResponseListeners(response, finish, close);
        captureHttpRequest(span, request, capture);
        if (response.finished || response.writableEnded) finishHttpRequestSpan(span, response, responseChunks, request);
        else failHttpRequestSpan(span, new Error('La conexión HTTP terminó antes de completar la respuesta'));
      };
      response.once('finish', finish);
      response.once('close', close);
      try {
        next();
      } catch (error: unknown) {
        ended = true;
        detachResponseListeners(response, finish, close);
        captureHttpRequest(span, request, capture);
        failHttpRequestSpan(span, error);
        throw error;
      }
    });
  };
}

export function resolveTraceFlowHttpCapture(options: TraceFlowHttpCaptureOptions = {}): ResolvedTraceFlowHttpCaptureOptions {
  return {
    query: options.query ?? TRACEFLOW_DEFAULT_HTTP_CAPTURE.query,
    body: options.body ?? TRACEFLOW_DEFAULT_HTTP_CAPTURE.body,
    formData: options.formData ?? TRACEFLOW_DEFAULT_HTTP_CAPTURE.formData,
    cookies: options.cookies ?? TRACEFLOW_DEFAULT_HTTP_CAPTURE.cookies,
    authorization: options.authorization ?? TRACEFLOW_DEFAULT_HTTP_CAPTURE.authorization,
    headers: options.headers ?? TRACEFLOW_DEFAULT_HTTP_CAPTURE.headers,
  };
}

export function buildTraceFlowHttpInput(request: TraceFlowHttpRequest, capture: ResolvedTraceFlowHttpCaptureOptions): TraceFlowHttpInput {
  const input: TraceFlowHttpInput = {};
  const contentType = getRequestHeader(request, 'content-type')?.toLocaleLowerCase() ?? '';
  const formRequest = contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded');
  const query = capture.query ? readRequestQuery(request) : undefined;
  const body = capture.body && !formRequest ? request.body : undefined;
  const formData = capture.formData && formRequest ? readRequestFormData(request) : undefined;
  const cookies = capture.cookies ? readRequestCookies(request) : undefined;
  const authorization = capture.authorization === 'none' ? undefined : readRequestAuthorization(request, capture.authorization === 'full');
  const headers = capture.headers === false ? undefined : readRequestHeaders(request, capture.headers);

  if (!isEmptyHttpCaptureValue(query)) input.query = query;
  if (!isEmptyHttpCaptureValue(body)) input.body = body;
  if (!isEmptyHttpCaptureValue(formData)) input.formData = formData;
  if (!isEmptyHttpCaptureValue(cookies)) input.cookies = cookies;
  if (authorization) input.authorization = authorization;
  if (headers && Object.keys(headers).length) input.headers = headers;
  return input;
}

export function getRequestPath(request: TraceFlowHttpRequest): string {
  const value = request.originalUrl || request.url || '/';
  return value.split('?')[0] || '/';
}

function observeActiveHttpSpan(span: Span, request: TraceFlowHttpRequest, response: TraceFlowHttpResponse, capture: ResolvedTraceFlowHttpCaptureOptions, next: () => void): void {
  let captured = false;
  const captureOnce = () => {
    if (captured) return;
    captured = true;
    detachResponseListeners(response, captureOnce, captureOnce);
    captureHttpRequest(span, request, capture);
  };
  response.once('finish', captureOnce);
  response.once('close', captureOnce);
  try {
    next();
  } catch (error: unknown) {
    captureOnce();
    throw error;
  }
}

function captureHttpRequest(span: Span, request: TraceFlowHttpRequest, capture: ResolvedTraceFlowHttpCaptureOptions): void {
  const serialized = toJsonSerializable(buildTraceFlowHttpInput(request, capture));
  if (serialized && typeof serialized === 'object' && !Array.isArray(serialized) && Object.keys(serialized).length) {
    span.setAttribute(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.input, JSON.stringify(serialized));
  }
}

function markHttpRequestSpan(span: Span, request: TraceFlowHttpRequest, monotonic: boolean): void {
  span.setAttribute(TRACEFLOW_ATTRIBUTE_KEYS.nodeType, 'http');
  span.setAttribute('traceflow.http.request_root', true);
  span.setAttribute('traceflow.timing.clock', monotonic ? 'monotonic' : 'opentelemetry');
  span.setAttribute('http.request.method', request.method?.toUpperCase() || 'HTTP');
  span.setAttribute('url.path', getRequestPath(request));
  const forwardedProto = request.headers?.['x-forwarded-proto'];
  const scheme = (request as unknown as { protocol?: string }).protocol || (forwardedProto ? String(forwardedProto).split(',')[0]?.trim() : 'http') || 'http';
  span.setAttribute('url.scheme', scheme);
}

function finishHttpRequestSpan(span: Span, response: TraceFlowHttpResponse, responseChunks?: Buffer[], request?: TraceFlowHttpRequest): void {
  const statusCode = response.statusCode ?? 200;
  span.setAttribute('http.response.status_code', statusCode);

  let responseData: unknown = undefined;
  let errorMessage: string | undefined = undefined;

  if (responseChunks && responseChunks.length > 0 && statusCode >= 400) {
    try {
      const text = Buffer.concat(responseChunks).toString('utf8');
      const parsed = JSON.parse(text) as Record<string, unknown>;
      responseData = parsed;
      if (parsed && typeof parsed === 'object') {
        const msg = parsed.message;
        if (Array.isArray(msg) && msg.length > 0) {
          errorMessage = msg.join('; ');
        } else if (typeof msg === 'string') {
          errorMessage = msg;
        } else if (typeof parsed.error === 'string') {
          errorMessage = parsed.error;
        }
      }
    } catch {
      // not json or parse error
    }
  }

  const isError = statusCode >= 400;
  if (isError) {
    const message = errorMessage ?? `HTTP ${statusCode}`;
    span.setStatus({ code: SpanStatusCode.ERROR, message });
    span.recordException(new Error(message), monotonicUnixTime());
    if (responseData !== undefined) {
      span.setAttribute(TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS.output, JSON.stringify(responseData));
    }
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  if (request) {
    const query = readRequestQuery(request);
    const matchingDto = findMatchingTracedDto({
      query: query && typeof query === 'object' ? (query as Record<string, unknown>) : undefined,
      body: request.body && typeof request.body === 'object' ? (request.body as Record<string, unknown>) : undefined,
      errorMessage,
    });
    if (matchingDto) {
      if (matchingDto.dtoName) {
        span.setAttribute('traceflow.controller.dto', matchingDto.dtoName);
      }
      span.setAttribute('traceflow.validation.schema', JSON.stringify(matchingDto));
      if (matchingDto.location) {
        span.setAttribute('traceflow.validation.location', matchingDto.location);
      }
    }
  }

  span.end(monotonicUnixTime());
}

function failHttpRequestSpan(span: Span, error: unknown): void {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const endedAt = monotonicUnixTime();
  span.recordException(normalized, endedAt);
  span.setStatus({ code: SpanStatusCode.ERROR, message: normalized.message });
  span.end(endedAt);
}

function detachResponseListeners(response: TraceFlowHttpResponse, finish: () => void, close: () => void): void {
  response.off?.('finish', finish);
  response.off?.('close', close);
}

function readRequestQuery(request: TraceFlowHttpRequest): unknown {
  if (!isEmptyHttpCaptureValue(request.query)) return request.query;
  const value = request.originalUrl || request.url;
  if (!value?.includes('?')) return undefined;
  const result: Record<string, string | string[]> = {};
  for (const [key, item] of new URLSearchParams(value.slice(value.indexOf('?') + 1))) {
    const current = result[key];
    result[key] = current === undefined ? item : Array.isArray(current) ? [...current, item] : [current, item];
  }
  return result;
}

function readRequestAuthorization(request: TraceFlowHttpRequest, full: boolean): string | undefined {
  const authorization = getRequestHeader(request, 'authorization');
  if (!authorization) return undefined;
  return full ? authorization : authorization.split(/\s+/, 1)[0];
}

function readRequestCookies(request: TraceFlowHttpRequest): unknown {
  if (!isEmptyHttpCaptureValue(request.cookies)) return request.cookies;
  const header = getRequestHeader(request, 'cookie');
  if (!header) return undefined;
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=');
        const key = separator < 0 ? part : part.slice(0, separator);
        const value = separator < 0 ? '' : part.slice(separator + 1);
        return [decodeHttpValue(key), decodeHttpValue(value)];
      }),
  );
}

function readRequestHeaders(request: TraceFlowHttpRequest, setting: boolean | readonly string[]): Record<string, string | string[]> {
  const allowed = Array.isArray(setting) ? new Set(setting.map((name) => name.toLocaleLowerCase())) : null;
  const result: Record<string, string | string[]> = {};
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    const normalizedName = name.toLocaleLowerCase();
    if (value === undefined || TRACEFLOW_DEDICATED_HTTP_HEADERS.has(normalizedName) || (allowed && !allowed.has(normalizedName))) continue;
    result[normalizedName] = value;
  }
  return result;
}

function readRequestFormData(request: TraceFlowHttpRequest): unknown {
  const body = request.body && typeof request.body === 'object' && !Array.isArray(request.body) ? request.body : isEmptyHttpCaptureValue(request.body) ? {} : { value: request.body };
  const file = normalizeUploadedFile(request.file);
  const files = normalizeUploadedFile(request.files);
  return { ...body, ...(file === undefined ? {} : { file }), ...(files === undefined ? {} : { files }) };
}

function normalizeUploadedFile(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeUploadedFile);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if ('originalname' in record || 'mimetype' in record || 'fieldname' in record) {
    return Object.fromEntries(['fieldname', 'originalname', 'encoding', 'mimetype', 'size'].flatMap((key) => (record[key] === undefined ? [] : [[key, record[key]]])));
  }
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, normalizeUploadedFile(item)]));
}

function getRequestHeader(request: TraceFlowHttpRequest, expectedName: string): string | undefined {
  const entry = Object.entries(request.headers ?? {}).find(([name]) => name.toLocaleLowerCase() === expectedName);
  const value = entry?.[1];
  return Array.isArray(value) ? value.join(', ') : value;
}

function isEmptyHttpCaptureValue(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === 'object' && Object.keys(value).length === 0;
}

function decodeHttpValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
