import { useEffect } from 'react';
import { initPerfDiagnostics, PERF_DIAGNOSTICS_ENABLED } from '../utils/perfDiagnostics';

export function usePerfDiagnostics() {
  useEffect(() => {
    if (!PERF_DIAGNOSTICS_ENABLED) {
      return;
    }

    initPerfDiagnostics({
      memoryIntervalMs: 10000,
      frameDropThresholdMs: 28
    });
  }, []);
}

export default usePerfDiagnostics;

