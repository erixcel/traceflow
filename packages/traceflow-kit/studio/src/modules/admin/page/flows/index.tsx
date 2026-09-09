import { useEffect } from 'react';
import { useHeaderStore } from '../../stores/header.store';
import { useTraceStream } from './hooks/trace-stream.hook';
import { FlowsLayout } from './layout/flows.layout';
import { useTraceStore } from './stores/trace.store';

export function FlowsPage(): React.JSX.Element {
  useTraceStream();
  const setHeader = useHeaderStore((state) => state.setHeader);
  const activeTrace = useTraceStore((state) => state.activeTrace);

  useEffect(() => {
    setHeader({
      eyebrow: 'Recorrido de ejecución',
      title: activeTrace?.rootName ?? 'Explorador de trazas',
      summary: activeTrace ? { serviceName: activeTrace.serviceName, durationMs: activeTrace.durationMs, spanCount: activeTrace.spanCount, status: activeTrace.status } : null,
    });
  }, [activeTrace, setHeader]);

  return <FlowsLayout />;
}
