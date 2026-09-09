import { useEffect } from 'react';
import { TRACEFLOW_EVENT_NAMES, TRACEFLOW_POLLING_INTERVAL_MS, TRACEFLOW_REFRESH_DELAY_MS } from '../constants/flow.constant';
import { useTraceStore } from '../stores/trace.store';

export function useTraceStream(): void {
  const refreshTraces = useTraceStore((state) => state.refreshTraces);
  const setConnectionStatus = useTraceStore((state) => state.setConnectionStatus);

  useEffect(() => {
    void refreshTraces();
    const source = new EventSource('/api/v1/events');
    let refreshTimer: number | undefined;
    let pollingTimer: number | undefined;

    const scheduleRefresh = (): void => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void refreshTraces(), TRACEFLOW_REFRESH_DELAY_MS);
    };
    const beginPolling = (): void => {
      if (pollingTimer === undefined) {
        pollingTimer = window.setInterval(() => void refreshTraces(), TRACEFLOW_POLLING_INTERVAL_MS);
      }
    };

    source.onopen = () => {
      setConnectionStatus('connected');
      scheduleRefresh();
      if (pollingTimer !== undefined) {
        window.clearInterval(pollingTimer);
        pollingTimer = undefined;
      }
    };
    source.onerror = () => {
      setConnectionStatus(source.readyState === EventSource.CLOSED ? 'disconnected' : 'reconnecting');
      beginPolling();
    };
    TRACEFLOW_EVENT_NAMES.forEach((eventName) => source.addEventListener(eventName, scheduleRefresh));

    return () => {
      source.close();
      window.clearTimeout(refreshTimer);
      if (pollingTimer !== undefined) {
        window.clearInterval(pollingTimer);
      }
    };
  }, [refreshTraces, setConnectionStatus]);
}
