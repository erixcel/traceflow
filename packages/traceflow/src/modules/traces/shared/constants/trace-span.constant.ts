import { trace } from '@opentelemetry/api';
import { TRACEFLOW_SDK_NAME, TRACEFLOW_SDK_VERSION } from '../../../settings/constants';

export const TRACEFLOW_TRACER = trace.getTracer(TRACEFLOW_SDK_NAME, TRACEFLOW_SDK_VERSION);
