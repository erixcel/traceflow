import type { ConnectionStatus, TraceNodeExecutionState } from '../types/trace.type';

export function connectionDotClass(status: ConnectionStatus): string {
  return status === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : status === 'reconnecting' ? 'animate-pulse bg-amber-400' : 'bg-zinc-400 dark:bg-zinc-600';
}

export function stateHandleClass(state: TraceNodeExecutionState): string {
  return state === 'success' ? '!bg-emerald-500' : state === 'error' ? '!bg-rose-500' : '!bg-zinc-500';
}
