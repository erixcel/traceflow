import type { ResolvedTraceFlowHttpCaptureOptions } from '../interfaces/http-middleware.interface';

export const TRACEFLOW_DEFAULT_HTTP_CAPTURE: Readonly<ResolvedTraceFlowHttpCaptureOptions> = {
  query: true,
  body: true,
  formData: true,
  cookies: true,
  authorization: 'scheme',
  headers: true,
};

export const TRACEFLOW_DEDICATED_HTTP_HEADERS: ReadonlySet<string> = new Set(['authorization', 'cookie']);
