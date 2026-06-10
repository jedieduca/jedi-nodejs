/*
 * Ferramentas de diagnóstico de performance inspiradas no guia fornecido.
 *
 * Ativação:
 *  - Query string ?perf=1
 *  - localStorage.setItem('perf:diagnostics', '1')
 *  - window.__ENABLE_PERF_DIAGNOSTICS__ = true
 *
 * Os logs ficam acessíveis via window.__perfLogBuffer.
 */

type PerfLogType = 'measure' | 'memory' | 'render' | 'longtask' | 'event' | 'frame';

interface PerfLogEntry {
  ts: number;
  type: PerfLogType;
  label: string;
  duration?: number;
  data?: Record<string, unknown>;
}

const MAX_LOG_ENTRIES = 250;

let enabledCache: boolean | null = null;
let initialized = false;

const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function resolveEnabled(): boolean {
  if (enabledCache !== null) {
    return enabledCache;
  }

  if (typeof window === 'undefined') {
    enabledCache = false;
    return enabledCache;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('perf') === '1') {
      enabledCache = true;
      return enabledCache;
    }

    if (window.localStorage.getItem('perf:diagnostics') === '1') {
      enabledCache = true;
      return enabledCache;
    }

    if ((window as any).__ENABLE_PERF_DIAGNOSTICS__ === true) {
      enabledCache = true;
      return enabledCache;
    }
  } catch (error) {
    console.warn('[perf] Falha ao verificar ativação:', error);
  }

  enabledCache = false;
  return enabledCache;
}

export const PERF_DIAGNOSTICS_ENABLED = resolveEnabled();

let writeLogToFile: (entry: PerfLogEntry) => void = () => {};
/* OBS: logging em arquivo desabilitado no bundle web para evitar dependências de Node */

function pushLog(entry: PerfLogEntry) {
  if (!PERF_DIAGNOSTICS_ENABLED || typeof window === 'undefined') {
    return;
  }

  const targetWindow = window as any;
  targetWindow.__perfLogBuffer = targetWindow.__perfLogBuffer ?? [];
  const buffer: PerfLogEntry[] = targetWindow.__perfLogBuffer;

  buffer.push(entry);
  if (buffer.length > MAX_LOG_ENTRIES) {
    buffer.splice(0, buffer.length - MAX_LOG_ENTRIES);
  }
  writeLogToFile(entry);
}

function logConsole(entry: PerfLogEntry) {
  if (!PERF_DIAGNOSTICS_ENABLED) {
    return;
  }

  const { type, label, duration, data } = entry;
  const prefix = `[PERF][${type}] ${label}`;

  if (duration !== undefined) {
    console.log(`${prefix}: ${duration.toFixed(2)}ms`, data ?? {});
  } else {
    console.log(prefix, data ?? {});
  }
}

export function logPerfEvent(label: string, data?: Record<string, unknown>) {
  if (!PERF_DIAGNOSTICS_ENABLED) {
    return;
  }

  const entry: PerfLogEntry = {
    ts: getNow(),
    type: 'event',
    label,
    data
  };

  pushLog(entry);
  logConsole(entry);
}

export function useRenderDiagnostics(
  componentName: string,
  extraInfo?: () => Record<string, unknown>,
  reportEvery: number = 10
) {
  // Lazy import apenas quando necessário
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react') as typeof import('react');
  const renderCountRef = React.useRef(0);

  if (PERF_DIAGNOSTICS_ENABLED) {
    renderCountRef.current += 1;
  }

  const count = renderCountRef.current;

  React.useEffect(() => {
    if (!PERF_DIAGNOSTICS_ENABLED) {
      return;
    }

    if (count === 1 || count % reportEvery === 0) {
      const data = {
        renders: count,
        ...(extraInfo ? extraInfo() : {})
      };
      const entry: PerfLogEntry = {
        ts: getNow(),
        type: 'render',
        label: componentName,
        data
      };
      pushLog(entry);
      logConsole(entry);
    }
  });
}

interface PerfTimer {
  end: (extraData?: Record<string, unknown>) => void;
  cancel: () => void;
}

export function startPerfTimer(label: string, baseData?: Record<string, unknown>): PerfTimer {
  if (!PERF_DIAGNOSTICS_ENABLED) {
    return {
      end: () => undefined,
      cancel: () => undefined
    };
  }

  const startTime = getNow();
  let finished = false;

  return {
    end(extraData?: Record<string, unknown>) {
      if (finished) return;
      finished = true;
      const duration = getNow() - startTime;
      const data = { ...(baseData ?? {}), ...(extraData ?? {}) };
      const entry: PerfLogEntry = {
        ts: getNow(),
        type: 'measure',
        label,
        duration,
        data
      };
      pushLog(entry);
      if (duration > 16.7) {
        console.warn(`[PERF][measure] ${label}: ${duration.toFixed(2)}ms`, data);
      } else {
        logConsole(entry);
      }
    },
    cancel() {
      finished = true;
    }
  };
}


function setupLongTaskObserver() {
  if (typeof PerformanceObserver === 'undefined') {
    return;
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const duration = entry.duration;
        const data = {
          name: entry.name,
          startTime: entry.startTime,
          duration
        } as Record<string, unknown>;

        const logEntry: PerfLogEntry = {
          ts: getNow(),
          type: 'longtask',
          label: 'main-thread',
          duration,
          data
        };

        pushLog(logEntry);
        console.warn('[PERF][longtask]', data);
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
    (window as any).__perfLongTaskObserver = observer;
  } catch (error) {
    console.warn('[perf] LongTask observer não disponível:', error);
  }
}

function setupMemoryLogger(intervalMs: number) {
  if (typeof window === 'undefined' || !(performance as Performance & { memory?: any }).memory) {
    return;
  }

  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  const logMemory = () => {
    if (!PERF_DIAGNOSTICS_ENABLED || !memory) return;

    const entry: PerfLogEntry = {
      ts: getNow(),
      type: 'memory',
      label: 'js-heap',
      data: {
        usedMB: (memory.usedJSHeapSize / 1048576).toFixed(1),
        totalMB: (memory.totalJSHeapSize / 1048576).toFixed(1),
        limitMB: (memory.jsHeapSizeLimit / 1048576).toFixed(0)
      }
    };

    pushLog(entry);
    logConsole(entry);
  };

  const id = window.setInterval(logMemory, intervalMs);
  (window as any).__perfMemoryInterval = id;
  logMemory();
}

function setupFrameMonitor(thresholdMs: number) {
  let last = getNow();

  const tick = () => {
    if (!PERF_DIAGNOSTICS_ENABLED) {
      return;
    }

    const now = getNow();
    const delta = now - last;
    last = now;

    if (delta > thresholdMs) {
      const entry: PerfLogEntry = {
        ts: now,
        type: 'frame',
        label: 'frame-drop',
        duration: delta,
        data: {
          thresholdMs
        }
      };
      pushLog(entry);
      console.warn(`[PERF][frame-drop] ${delta.toFixed(2)}ms (> ${thresholdMs}ms)`);
    }

    (window as any).__perfFrameRaf = requestAnimationFrame(tick);
  };

  (window as any).__perfFrameRaf = requestAnimationFrame(tick);
}

export interface InitPerfDiagnosticsOptions {
  memoryIntervalMs?: number;
  frameDropThresholdMs?: number;
}

export function initPerfDiagnostics(options: InitPerfDiagnosticsOptions = {}) {
  if (!PERF_DIAGNOSTICS_ENABLED || initialized || typeof window === 'undefined') {
    return;
  }

  initialized = true;

  const { memoryIntervalMs = 15000, frameDropThresholdMs = 40 } = options;

  logPerfEvent('perf-diagnostics:init', {
    memoryIntervalMs,
    frameDropThresholdMs
  });

  setupLongTaskObserver();
  setupMemoryLogger(memoryIntervalMs);
  setupFrameMonitor(frameDropThresholdMs);

  // Expor helper para coleta manual
  (window as any).__perfDiagnosticsStop = () => {
    if ((window as any).__perfFrameRaf) {
      cancelAnimationFrame((window as any).__perfFrameRaf);
    }
    if ((window as any).__perfMemoryInterval) {
      clearInterval((window as any).__perfMemoryInterval);
    }
    if ((window as any).__perfLongTaskObserver) {
      try {
        (window as any).__perfLongTaskObserver.disconnect();
      } catch (error) {
        console.warn('[perf] erro ao desligar observer', error);
      }
    }
  };

  (window as any).__saveLogBuffer = (filename = `perf-log-${Date.now()}.json`) => {
    try {
      const buffer: PerfLogEntry[] = (window as any).__perfLogBuffer ?? [];

      if (!buffer.length) {
        console.warn('[perf] Nenhum log disponível para salvar.');
        return;
      }

      const payload = JSON.stringify(buffer, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[perf] Falha ao salvar logs de performance:', error);
    }
  };
}

export function withPerfMeasure<T>(label: string, fn: () => T, baseData?: Record<string, unknown>): T {
  if (!PERF_DIAGNOSTICS_ENABLED) {
    return fn();
  }

  const timer = startPerfTimer(label, baseData);

  try {
    const result = fn();
    timer.end();
    return result;
  } catch (error) {
    timer.end({ error: (error as Error)?.message ?? 'unknown' });
    throw error;
  }
}

export async function withPerfMeasureAsync<T>(
  label: string,
  fn: () => Promise<T>,
  baseData?: Record<string, unknown>
): Promise<T> {
  if (!PERF_DIAGNOSTICS_ENABLED) {
    return fn();
  }

  const timer = startPerfTimer(label, baseData);

  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.end({ error: (error as Error)?.message ?? 'unknown' });
    throw error;
  }
}


