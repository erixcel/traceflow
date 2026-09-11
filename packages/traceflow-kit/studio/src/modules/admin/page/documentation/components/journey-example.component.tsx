import { ReactFlowProvider } from '@xyflow/react';
import { useState } from 'react';
import type { TraceFlowSpanDto } from 'traceflow/protocol';
import { TraceGroupedCanvasLayout } from '../../flows/layout/trace-grouped-canvas.layout';
import type { TraceCanvasProps } from '../../flows/interfaces/trace-canvas.interface';
import { DetailsPanelLayout } from '../../flows/layout/details-panel.layout';
import { DOCUMENTATION_JOURNEY_TRACE } from '../constants/journey-example.constant';

interface SelectedExampleSpan {
  span: TraceFlowSpanDto;
  tab: 'input' | 'output' | 'context';
}

export function JourneyExampleComponent(): React.JSX.Element {
  const [selected, setSelected] = useState<SelectedExampleSpan | null>(null);
  const selectSpan: TraceCanvasProps['onSelectSpan'] = (span, tab = 'input') => setSelected(span ? { span, tab } : null);

  return (
    <div className="relative mt-8 flex h-[42rem] min-h-0 overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 shadow-sm dark:border-zinc-800 dark:bg-[#101116]">
      <ReactFlowProvider>
        <TraceGroupedCanvasLayout trace={DOCUMENTATION_JOURNEY_TRACE} onSelectSpan={selectSpan} />
      </ReactFlowProvider>
      {selected ? <DetailsPanelLayout key={`${selected.span.spanId}-${selected.tab}`} span={selected.span} initialTab={selected.tab} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
