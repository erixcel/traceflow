import type { TraceFlowRuntimeState } from './interfaces/traceflow-runtime.interface';

export const traceFlowRuntime: TraceFlowRuntimeState = {
  sdk: null,
  exporter: null,
  signalHandlersRegistered: false,
  shuttingDown: false,
};
