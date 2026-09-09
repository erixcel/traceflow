import type { TraceNodeOptions } from '../../../settings/interfaces/traceflow-options.interface';

export interface TraceSpanOptions extends TraceNodeOptions {
  className?: string;
  methodName?: string;
}
