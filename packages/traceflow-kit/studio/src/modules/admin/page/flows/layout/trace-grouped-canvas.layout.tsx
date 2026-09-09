import { Background, BackgroundVariant, Controls, ReactFlow } from '@xyflow/react';
import { useMemo, useState } from 'react';
import { HttpInputSettingsComponent } from '../components/http-input-settings.component';
import { JsonViewerComponent } from '../components/json-viewer.component';
import { GROUPED_FLOW_CONTROL_CLASS } from '../constants/grouped-flow.constant';
import { GROUPED_FLOW_NODE_TYPES } from '../constants/grouped-node-types.constant';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { buildGroupedFlowJson } from '../functions/grouped-flow-json.function';
import { useGroupedFlow } from '../hooks/use-grouped-flow.hook';
import type { TraceCanvasProps } from '../interfaces/trace-canvas.interface';

export function TraceGroupedCanvasLayout({ trace, onSelectSpan }: TraceCanvasProps): React.JSX.Element {
  const flow = useGroupedFlow(trace);
  const [view, setView] = useState<'flow' | 'json'>('flow');
  const groupedJson = useMemo(() => buildGroupedFlowJson(trace), [trace]);
  return (
    <GroupedFlowContext.Provider value={{ selectSpan: onSelectSpan, toggleGroup: flow.toggleGroup }}>
      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-x-5 top-3 z-20 flex items-start justify-between gap-4">
          <div className="pointer-events-auto flex min-w-0 items-center gap-3">
            <label className="flex w-64 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-400 shadow-sm focus-within:border-pink-400 dark:border-zinc-700 dark:bg-zinc-900">
              <span aria-hidden="true">⌕</span>
              <input
                className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-700 outline-none dark:text-zinc-200"
                placeholder="Buscar método, tabla o servicio…"
                aria-label="Buscar en el recorrido"
                value={flow.query}
                onChange={(event) => flow.setQuery(event.target.value)}
              />
              {flow.query ? (
                <button onClick={() => flow.setQuery('')} className="cursor-pointer" aria-label="Borrar búsqueda del recorrido">
                  ×
                </button>
              ) : null}
            </label>
          </div>
          <div className="pointer-events-auto flex shrink-0 items-center gap-2">
            <button className={GROUPED_FLOW_CONTROL_CLASS} type="button" aria-pressed={view === 'json'} onClick={() => setView((current) => (current === 'flow' ? 'json' : 'flow'))}>
              {view === 'json' ? 'Vista flujo' : 'Vista JSON'}
            </button>
            <HttpInputSettingsComponent />
          </div>
        </div>
        {view === 'json' ? (
          <div className="h-full min-h-0 px-6 pt-16 pb-6 max-md:px-4">
            <JsonViewerComponent value={groupedJson} label="JSON del flujo agrupado" fill />
          </div>
        ) : (
          <div className="h-full min-h-0" aria-label="Diagrama de entrada, proceso y salida">
            <div className="pointer-events-none absolute right-5 bottom-4 z-20 flex items-center gap-2">
              <button className={`${GROUPED_FLOW_CONTROL_CLASS} pointer-events-auto disabled:opacity-40`} disabled={!flow.canExpand || Boolean(flow.query.trim())} onClick={flow.toggleAll}>
                {flow.allExpanded ? 'Contraer grupos' : 'Expandir grupos'}
              </button>
              <button className={`${GROUPED_FLOW_CONTROL_CLASS} pointer-events-auto`} onClick={flow.fit}>
                Ajustar vista
              </button>
            </div>
            <ReactFlow
              nodes={flow.nodes}
              edges={flow.edges}
              nodeTypes={GROUPED_FLOW_NODE_TYPES}
              onNodesChange={flow.onNodesChange}
              nodesConnectable={false}
              nodesDraggable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              elementsSelectable={false}
              edgesReconnectable={false}
              minZoom={0.25}
              maxZoom={1.8}
              panOnDrag
              fitView
              fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={0.7} className="opacity-30 dark:opacity-15" color="#9696a5" />
              <Controls
                showInteractive={false}
                className="!overflow-hidden !rounded-xl !border !border-zinc-200 !shadow-sm dark:!border-zinc-700 [&>button]:!border-zinc-200 [&>button]:!bg-white [&>button]:!fill-zinc-500 dark:[&>button]:!border-zinc-700 dark:[&>button]:!bg-zinc-900 dark:[&>button]:!fill-zinc-300"
              />
            </ReactFlow>
          </div>
        )}
      </div>
    </GroupedFlowContext.Provider>
  );
}
