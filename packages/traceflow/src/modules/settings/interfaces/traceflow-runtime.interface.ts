import type { NodeSDK } from '@opentelemetry/sdk-node';
import type { TraceFlowHttpExporter } from '../../traces/shared/exporters/traceflow-http.exporter';

export interface TraceFlowRuntimeState {
  sdk: NodeSDK | null;
  exporter: TraceFlowHttpExporter | null;
  signalHandlersRegistered: boolean;
  shuttingDown: boolean;
}
