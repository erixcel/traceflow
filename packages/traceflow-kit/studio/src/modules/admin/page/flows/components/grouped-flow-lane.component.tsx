import type { NodeProps } from '@xyflow/react';
import type { GroupedLaneNode } from '../types/grouped-flow.type';

export function GroupedFlowLaneComponent({ data }: NodeProps<GroupedLaneNode>): React.JSX.Element {
  return (
    <div className={`pointer-events-none h-full w-full px-6 ${data.divided ? 'border-r border-dashed border-zinc-300 dark:border-zinc-700' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full border border-zinc-200 bg-white font-mono text-[10px] text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">{data.number}</span>
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">{data.title}</h2>
          <p className="mt-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">{data.description}</p>
        </div>
      </div>
    </div>
  );
}
