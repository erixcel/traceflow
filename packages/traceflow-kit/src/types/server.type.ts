import type { TraceStore } from '../modules/traces/trace.store';

export interface StudioServerOptions {
  store?: TraceStore;
  studioRoot?: string;
  serveStudio?: boolean;
  debug?: boolean;
}
