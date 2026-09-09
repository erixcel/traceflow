export function formatDuration(durationMs: number): string {
  if (durationMs < 1) {
    return `${Math.round(durationMs * 1_000)} μs`;
  }

  if (durationMs < 1_000) {
    return `${durationMs.toFixed(durationMs < 10 ? 2 : 1)} ms`;
  }

  return `${(durationMs / 1_000).toFixed(2)} s`;
}
