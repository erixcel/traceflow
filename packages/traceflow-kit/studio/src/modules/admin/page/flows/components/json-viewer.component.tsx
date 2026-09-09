import { useState } from 'react';
import { formatJsonPrimitive, getJsonPrimitiveClass, isJsonContainer, parseJsonValue } from '../functions/json.function';
import type { JsonEntryProps, JsonViewerProps } from '../interfaces/json-viewer.interface';

export function JsonViewerComponent({ value, label, fill = false }: JsonViewerProps): React.JSX.Element {
  const data = parseJsonValue(value);
  return (
    <div
      className={`${fill ? 'h-full min-h-0' : 'mt-2 max-h-90'} overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-[10px] leading-5 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300`}
      aria-label={label}
    >
      <JsonEntry value={data} depth={0} />
    </div>
  );
}

function JsonEntry({ name, value, depth }: JsonEntryProps): React.JSX.Element {
  const [open, setOpen] = useState(depth <= 1);

  if (!isJsonContainer(value)) {
    return (
      <div className="min-w-max">
        {name === undefined ? null : <span className="mr-1 font-semibold text-blue-600 dark:text-blue-300">{name}:</span>}
        <span className={getJsonPrimitiveClass(value)}>{formatJsonPrimitive(value)}</span>
      </div>
    );
  }

  const entries = Array.isArray(value) ? value.map((child, index) => [String(index), child] as const) : Object.entries(value);
  const opening = Array.isArray(value) ? '[' : '{';
  const closing = Array.isArray(value) ? ']' : '}';

  if (entries.length === 0) {
    return (
      <div className="min-w-max">
        {name === undefined ? null : <span className="mr-1 font-semibold text-blue-600 dark:text-blue-300">{name}:</span>}
        <span>
          {opening}
          {closing}
        </span>
      </div>
    );
  }

  return (
    <div className="min-w-max">
      <div className="flex items-center">
        {name === undefined ? null : <span className="mr-1 font-semibold text-blue-600 dark:text-blue-300">{name}:</span>}
        <span>{opening}</span>
        <button
          className={
            open
              ? 'ml-1 grid size-4 place-items-center rounded-full text-[9px] text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              : 'mx-1 inline-flex h-4 min-w-6 items-center justify-center rounded-full border border-zinc-300 bg-white px-1 text-[7px] tracking-wider text-zinc-500 shadow-sm transition hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? 'Contraer JSON' : 'Expandir JSON'}
        >
          {open ? '⌃' : '•••'}
        </button>
        {open ? null : <span>{closing}</span>}
      </div>

      {open ? (
        <div className="ml-2 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          {entries.map(([key, child]) => (
            <JsonEntry key={key} name={key} value={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
      {open ? <div>{closing}</div> : null}
    </div>
  );
}
