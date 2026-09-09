import { Background, BackgroundVariant, Controls, Panel, ReactFlow, useEdgesState, useNodesInitialized, useNodesState, useReactFlow } from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useThemeStore } from '../../../stores/theme.store';
import { TRACEFLOW_FIT_PADDING } from '../constants/flow.constant';
import { TraceSelectionContext } from '../contexts/trace-selection.context';
import { buildTraceGraph } from '../functions/graph.function';
import type { TraceCanvasProps } from '../interfaces/trace-canvas.interface';
import type { TraceNodeDimensions } from '../interfaces/trace-graph.interface';
import { TraceNodeCardComponent } from '../components/trace-node-card.component';

const nodeTypes = { traceSpan: TraceNodeCardComponent };

export function TraceCanvasLayout({ trace, onSelectSpan }: TraceCanvasProps): React.JSX.Element {
  const [nodes, setNodes, onNodesChange] = useNodesState(buildTraceGraph(trace).nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildTraceGraph(trace).edges);
  const [layoutRevision, setLayoutRevision] = useState(0);
  const { fitView, getNodes } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const themeMode = useThemeStore((state) => state.mode);
  const traceRef = useRef(trace);
  const appliedRevisionRef = useRef(0);
  const darkTheme = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const applyLayout = useCallback(() => {
    const dimensions = new Map<string, TraceNodeDimensions>();
    getNodes().forEach((node) => {
      const width = node.measured?.width ?? node.width;
      const height = node.measured?.height ?? node.height;
      if (width && height) {
        dimensions.set(node.id, { width, height });
      }
    });

    const graph = buildTraceGraph(traceRef.current, dimensions);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    window.requestAnimationFrame(() => void fitView({ padding: TRACEFLOW_FIT_PADDING, duration: 350 }));
  }, [fitView, getNodes, setEdges, setNodes]);

  useEffect(() => {
    traceRef.current = trace;
    const graph = buildTraceGraph(trace);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setLayoutRevision((revision) => revision + 1);
  }, [setEdges, setNodes, trace]);

  useEffect(() => {
    if (!nodesInitialized || layoutRevision === 0 || appliedRevisionRef.current === layoutRevision) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      appliedRevisionRef.current = layoutRevision;
      applyLayout();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [applyLayout, layoutRevision, nodesInitialized]);

  return (
    <TraceSelectionContext.Provider value={onSelectSpan}>
      <ReactFlow
        className="[&_.react-flow__node]:!visible"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesConnectable={false}
        nodesDraggable
        edgesReconnectable={false}
        elementsSelectable={false}
        panOnDrag
        minZoom={0.2}
        maxZoom={1.8}
        fitView
        fitViewOptions={{ padding: TRACEFLOW_FIT_PADDING }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={darkTheme ? '#34363f' : '#d9dce3'} />
        <Controls
          showInteractive={false}
          className="!overflow-hidden !rounded-xl !border !border-zinc-200 !shadow-lg dark:!border-zinc-800 [&>button]:!border-zinc-200 [&>button]:!bg-white [&>button]:!fill-zinc-500 hover:[&>button]:!bg-zinc-100 dark:[&>button]:!border-zinc-800 dark:[&>button]:!bg-zinc-900 dark:hover:[&>button]:!bg-zinc-800"
        />
        <Panel position="top-right" className="flex gap-2">
          <button
            className="h-8 rounded-xl border border-zinc-200 bg-white/90 px-3 text-[10px] text-zinc-600 shadow-sm backdrop-blur transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800"
            type="button"
            onClick={applyLayout}
          >
            Recalcular layout
          </button>
          <button
            className="h-8 rounded-xl border border-zinc-200 bg-white/90 px-3 text-[10px] text-zinc-600 shadow-sm backdrop-blur transition hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800"
            type="button"
            onClick={() => void fitView({ padding: TRACEFLOW_FIT_PADDING, duration: 350 })}
          >
            Ajustar vista
          </button>
        </Panel>
        <Panel
          position="bottom-center"
          className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-2 text-[9px] text-zinc-500 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90"
        >
          <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ Correcto</span>
          <span className="font-bold text-rose-600 dark:text-rose-400">× Error</span>
          <span className="font-bold text-zinc-500">• No ejecutado</span>
        </Panel>
      </ReactFlow>
    </TraceSelectionContext.Provider>
  );
}
