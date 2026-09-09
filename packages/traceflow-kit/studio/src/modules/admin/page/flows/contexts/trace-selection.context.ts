import type { TraceFlowSpanDto } from 'traceflow/protocol';
import { createContext } from 'react';

export const TraceSelectionContext = createContext<(span: TraceFlowSpanDto) => void>(() => undefined);
