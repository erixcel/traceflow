import { createRequire } from 'node:module';

const requireFromPackage = createRequire(__filename);
const packageMetadata = requireFromPackage('../../../../package.json') as {
  version: string;
};

export const TRACEFLOW_PROTOCOL_VERSION = 1 as const;
export const TRACEFLOW_SDK_NAME = 'traceflow';
export const TRACEFLOW_SDK_VERSION = packageMetadata.version;

export const TRACEFLOW_ATTRIBUTE_KEYS = {
  nodeType: 'traceflow.node.type',
  codeClass: 'traceflow.code.class',
  codeFunction: 'traceflow.code.function',
  nodeDescription: 'traceflow.node.description',
  labels: 'traceflow.node.labels',
} as const;

export const TRACEFLOW_CAPTURE_ATTRIBUTE_KEYS = {
  input: 'traceflow.request.input',
  output: 'traceflow.response.output',
} as const;

export const TRACEFLOW_DEFAULT_STUDIO_URL = 'http://127.0.0.1:4789';
export const TRACEFLOW_DEFAULT_REQUEST_TIMEOUT_MS = 2_000;
export const TRACEFLOW_MAX_TRACES = 200;
export const TRACEFLOW_MAX_SPANS_PER_TRACE = 1_000;
export const TRACEFLOW_MAX_BODY_BYTES = 2 * 1024 * 1024;
