import { useState } from 'react';
import type { TraceFlowParameterSchemaDto, TraceFlowValidationContractDto } from 'traceflow/protocol';
import { findParamValue } from '../functions/validation-contract.function';

interface ValidationContractComponentProps {
  contract: TraceFlowValidationContractDto;
  input: unknown;
}

export function ValidationContractComponent({ contract, input }: ValidationContractComponentProps): React.JSX.Element {
  const [expandedParam, setExpandedParam] = useState<string | null>(null);

  return (
    <div className="mt-1 space-y-2">
      {/* Header: DTO name with (query)/(body) and count */}
      <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{contract.dtoName ?? 'Filtros'}</span>
          {contract.location ? <span className="font-sans text-[10px] text-zinc-400 dark:text-zinc-500">({contract.location})</span> : null}
        </div>
        <span className="font-mono text-[10px]">
          {contract.parameters.length} {contract.parameters.length === 1 ? 'campo' : 'campos'}
        </span>
      </div>

      {/* Accordion List */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900/60">
        {contract.parameters.map((param) => (
          <ParameterRow key={param.name} param={param} input={input} isOpen={expandedParam === param.name} onToggle={() => setExpandedParam((curr) => (curr === param.name ? null : param.name))} />
        ))}
      </div>
    </div>
  );
}

function ParameterRow({ param, input, isOpen, onToggle }: { param: TraceFlowParameterSchemaDto; input: unknown; isOpen: boolean; onToggle: () => void }): React.JSX.Element {
  const receivedValue = findParamValue(input, param.name);
  const hasReceived = receivedValue !== undefined;

  return (
    <details open={isOpen} className="group border-b border-zinc-200/70 last:border-b-0 dark:border-zinc-800/70">
      <summary
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
        className="flex cursor-pointer list-none select-none items-center justify-between gap-2 px-3.5 py-2.5 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 [&::-webkit-details-marker]:hidden"
      >
        {/* Left: Chevron and Name with optional red asterisk */}
        <div className="flex min-w-0 items-center gap-2">
          <svg
            className={`size-3.5 shrink-0 text-zinc-400 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''} dark:text-zinc-500`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>

          <span className="font-mono text-[12px] font-semibold text-zinc-900 dark:text-zinc-100">
            {param.name}
            {param.required ? (
              <span className="ml-0.5 text-[13px] font-bold text-rose-500" title="Requerido">
                *
              </span>
            ) : null}
          </span>
        </div>

        {/* Right: Value received in trace (or default hint / missing status) */}
        <div className="shrink-0">
          {hasReceived ? (
            <div className="flex items-center gap-1.5">
              <code className="max-w-40 truncate rounded bg-zinc-100 px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {typeof receivedValue === 'string' ? '"' + receivedValue + '"' : JSON.stringify(receivedValue)}
              </code>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400" title="Valor verificado en la traza">
                ✓
              </span>
            </div>
          ) : param.required ? (
            <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">No provisto ⚠</span>
          ) : param.default !== undefined ? (
            <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">defecto: {String(param.default)}</span>
          ) : (
            <span className="text-[10px] italic text-zinc-400 dark:text-zinc-500">no enviado</span>
          )}
        </div>
      </summary>

      {/* Expanded Content: Detail table style matching Studio standard */}
      <div className="border-t border-zinc-200/70 bg-zinc-50/40 px-3.5 py-1 text-xs dark:border-zinc-800/70 dark:bg-zinc-950/40">
        <DetailRow label="Tipo">
          <span className="font-mono text-xs">{param.type}</span>
        </DetailRow>

        <DetailRow label="Requerido">
          {param.required ? (
            <span className="font-semibold text-rose-600 dark:text-rose-400">Sí (requerido)</span>
          ) : (
            <span className="font-normal text-zinc-500 dark:text-zinc-400">No (opcional)</span>
          )}
        </DetailRow>

        <DetailRow label="Descripción">
          {param.description ? <span className="font-normal text-zinc-700 dark:text-zinc-300">{param.description}</span> : <span className="font-normal text-zinc-400 dark:text-zinc-600">—</span>}
        </DetailRow>

        {param.rules.length > 0 ? (
          <DetailRow label="Reglas">
            <div className="flex flex-wrap gap-1">
              {param.rules.map((rule, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center rounded border border-zinc-200 bg-zinc-100/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {rule.description ?? rule.name}
                </span>
              ))}
            </div>
          </DetailRow>
        ) : null}

        {param.enum && param.enum.length > 0 ? (
          <DetailRow label="Valores">
            <div className="flex flex-wrap gap-1">
              {param.enum.map((item, idx) => (
                <code key={idx} className="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {String(item)}
                </code>
              ))}
            </div>
          </DetailRow>
        ) : null}

        {param.default !== undefined ? (
          <DetailRow label="Defecto">
            <code className="font-mono text-xs">{String(param.default)}</code>
          </DetailRow>
        ) : null}

        {param.example !== undefined ? (
          <DetailRow label="Ejemplo">
            <code className="font-mono text-xs">{typeof param.example === 'string' ? '"' + param.example + '"' : String(param.example)}</code>
          </DetailRow>
        ) : null}

        <DetailRow label="Valor real">
          {hasReceived ? (
            <code className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {typeof receivedValue === 'string' ? '"' + receivedValue + '"' : JSON.stringify(receivedValue)}
            </code>
          ) : param.required ? (
            <span className="font-semibold text-rose-600 dark:text-rose-400">No provisto ⚠</span>
          ) : (
            <span className="font-normal italic text-zinc-400 dark:text-zinc-500">No enviado {param.default !== undefined ? '(aplica defecto: ' + String(param.default) + ')' : ''}</span>
          )}
        </DetailRow>
      </div>
    </details>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-2.5 border-b border-zinc-200/80 py-2.5 last:border-b-0 dark:border-zinc-800">
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{label}:</span>
      <div className="min-w-0 break-words text-xs font-semibold text-zinc-800 dark:text-zinc-200">{children}</div>
    </div>
  );
}
