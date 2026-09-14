import { Background, BackgroundVariant, Controls, ReactFlow } from '@xyflow/react';
import { useMemo, useState } from 'react';
import { HttpInputSettingsComponent } from '../components/http-input-settings.component';
import { GroupedFlowDepthComponent } from '../components/grouped-flow-depth.component';
import { JsonViewerComponent } from '../components/json-viewer.component';
import { GROUPED_FLOW_CONTROL_CLASS } from '../constants/grouped-flow.constant';
import { GROUPED_FLOW_EDGE_TYPES, GROUPED_FLOW_NODE_TYPES } from '../constants/grouped-node-types.constant';
import { GroupedFlowContext } from '../contexts/grouped-flow.context';
import { buildGroupedFlowJson } from '../functions/grouped-flow-json.function';
import { useGroupedFlow } from '../hooks/use-grouped-flow.hook';
import type { TraceCanvasProps } from '../interfaces/trace-canvas.interface';

export function TraceGroupedCanvasLayout({ trace, onSelectSpan }: TraceCanvasProps): React.JSX.Element {
  const flow = useGroupedFlow(trace, onSelectSpan);
  const [view, setView] = useState<'flow' | 'json'>('flow');
  const groupedJson = useMemo(() => buildGroupedFlowJson(trace), [trace]);
  return (
    <GroupedFlowContext.Provider
      value={{ selectSpan: onSelectSpan, selectCard: flow.selectCard, toggleGroup: flow.toggleGroup, openStep: flow.openStep, closeDetail: flow.closeDetail, fit: flow.fit }}
    >
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
            <button
              className={`${GROUPED_FLOW_CONTROL_CLASS} w-8 justify-center !px-0 font-mono text-[11px] font-semibold ${view === 'json' ? 'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-500/10 dark:text-pink-300' : ''}`}
              type="button"
              aria-label={view === 'json' ? 'Volver a la vista del flujo' : 'Mostrar vista JSON'}
              title={view === 'json' ? 'Volver a la vista del flujo' : 'Vista JSON'}
              aria-pressed={view === 'json'}
              onClick={() => setView((current) => (current === 'flow' ? 'json' : 'flow'))}
            >
              {'{}'}
            </button>
            <HttpInputSettingsComponent />
          </div>
        </div>
        {view === 'json' ? (
          <div className="h-full min-h-0 px-6 pt-16 pb-6 max-md:px-4">
            <JsonViewerComponent value={groupedJson} label="JSON del flujo agrupado" fill />
          </div>
        ) : (
          <div
            className="h-full min-h-0 [--flow-edge-label-bg:var(--color-zinc-50)] [--flow-edge-label-text:var(--color-zinc-500)] dark:[--flow-edge-label-bg:var(--color-zinc-900)] dark:[--flow-edge-label-text:var(--color-zinc-400)]"
            aria-label="Diagrama de entrada, proceso y salida"
          >
            <div className="pointer-events-none absolute right-5 bottom-4 z-20 flex items-center gap-2">
              <button
                className={`${GROUPED_FLOW_CONTROL_CLASS} pointer-events-auto w-9 justify-center !px-0`}
                type="button"
                aria-label="Ajustar vista"
                title="Ajustar vista"
                onClick={() => flow.fit({ forceFull: true })}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0 fill-none stroke-current" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12Z" />
                  <circle cx="12" cy="12" r="3.4" />
                </svg>
              </button>
              <GroupedFlowDepthComponent value={flow.visibleDepth} max={flow.maxVisibleDepth} onChange={flow.setVisibleDepth} />
            </div>
            <ReactFlow
              nodes={flow.nodes}
              edges={flow.edges}
              onInit={() => {
                window.requestAnimationFrame(() => flow.fit({ forceFull: true, duration: 0 }));
              }}
              nodeTypes={GROUPED_FLOW_NODE_TYPES}
              edgeTypes={GROUPED_FLOW_EDGE_TYPES}
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
