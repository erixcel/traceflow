export interface TraceFlowHttpRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers?: Readonly<Record<string, string | string[] | undefined>>;
  query?: unknown;
  body?: unknown;
  cookies?: unknown;
  file?: unknown;
  files?: unknown;
}

export interface TraceFlowHttpResponse {
  statusCode?: number;
  finished?: boolean;
  writableEnded?: boolean;
  write?(chunk: unknown, ...args: unknown[]): unknown;
  end?(chunk?: unknown, ...args: unknown[]): unknown;
  once(event: 'finish' | 'close', listener: () => void): unknown;
  off?(event: 'finish' | 'close', listener: () => void): unknown;
}

export interface TraceFlowHttpMiddlewareOptions {
  ignore?: (request: TraceFlowHttpRequest) => boolean;
  capture?: TraceFlowHttpCaptureOptions;
}

export type TraceFlowAuthorizationCapture = 'none' | 'scheme' | 'full';

export interface TraceFlowHttpCaptureOptions {
  query?: boolean;
  body?: boolean;
  formData?: boolean;
  cookies?: boolean;
  authorization?: TraceFlowAuthorizationCapture;
  headers?: boolean | readonly string[];
}

export interface ResolvedTraceFlowHttpCaptureOptions {
  query: boolean;
  body: boolean;
  formData: boolean;
  cookies: boolean;
  authorization: TraceFlowAuthorizationCapture;
  headers: boolean | readonly string[];
}

export interface TraceFlowHttpInput {
  query?: unknown;
  body?: unknown;
  formData?: unknown;
  cookies?: unknown;
  authorization?: string;
  headers?: Record<string, string | string[]>;
}

export interface TraceFlowHttpMiddleware {
  (request: TraceFlowHttpRequest, response: TraceFlowHttpResponse, next: () => void): void;
}
