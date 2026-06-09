/* eslint-disable no-console */
import type { LogMode, RenderCycle, RenderNode, RenderTraceOptions, TraceInstance } from '../types';

type LogFn = (cycle: RenderCycle, mode: LogMode) => void;

const DEFAULT_OPTIONS = {
  enabled: true,
  maxCycles: 50,
  logMode: 'tree' as LogMode,
} satisfies Required<RenderTraceOptions>;

export const createEngine = (options?: RenderTraceOptions, logFn?: LogFn): TraceInstance => {
  const opts: Required<RenderTraceOptions> = {
    enabled: options?.enabled ?? DEFAULT_OPTIONS.enabled,
    maxCycles: options?.maxCycles ?? DEFAULT_OPTIONS.maxCycles,
    logMode: options?.logMode ?? DEFAULT_OPTIONS.logMode,
  };

  const cycles: RenderCycle[] = [];
  let activeCycle: RenderCycle | null = null;
  let cycleCounter = 0;
  const stack: string[] = [];
  let flushPending = false;
  let strictModeWarned = false;
  let concurrentModeWarned = false;

  const getOrCreateCycle = (): RenderCycle => {
    if (activeCycle) return activeCycle;
    cycleCounter += 1;
    activeCycle = {
      id: `cycle-${cycleCounter}`,
      startTime: Date.now(),
      endTime: null,
      nodes: [],
      rootTrigger: null,
      maxDepth: 0,
      totalRenders: 0,
      status: 'active',
    };
    return activeCycle;
  };

  const flush = (): void => {
    flushPending = false;
    if (!activeCycle) return;

    const cycle = activeCycle;
    cycle.endTime = Date.now();
    cycle.totalRenders = cycle.nodes.length;

    let maxDepth = 0;
    for (const node of cycle.nodes) {
      if (node.depth > maxDepth) maxDepth = node.depth;
    }
    cycle.maxDepth = maxDepth;

    const rootNode = cycle.nodes.find((n) => n.depth === 0);
    cycle.rootTrigger = rootNode?.componentName ?? null;

    cycle.status = 'flushed';
    activeCycle = null;

    cycles.push(cycle);
    if (cycles.length > opts.maxCycles) {
      cycles.shift();
    }

    // Safety: clear any stale stack entries after flush (handles initial-mount case)
    stack.length = 0;

    if (opts.logMode !== 'silent' && logFn) {
      logFn(cycle, opts.logMode);
    }
  };

  const scheduleFlush = (): void => {
    if (flushPending) return;
    flushPending = true;
    queueMicrotask(flush);
  };

  const engine: TraceInstance = {
    enabled: opts.enabled,

    registerNode: (componentName: string): void => {
      if (!engine.enabled) return;

      // Strict Mode deduplication: consecutive double-invocation of the same component
      if (stack.length > 0 && stack[stack.length - 1] === componentName) {
        if (!strictModeWarned) {
          strictModeWarned = true;
          console.warn(
            '[render-trace] React Strict Mode detected — skipping duplicate registration of "' +
              componentName +
              '". Depth values in the first cycle may be approximate.',
          );
        }
        return;
      }

      const depth = stack.length;
      const parentName = stack.length > 0 ? (stack[stack.length - 1] ?? null) : null;
      stack.push(componentName);

      const cycle = getOrCreateCycle();
      const renderIndex = cycle.nodes.length;

      const node: RenderNode = {
        id: `${cycle.id}:${componentName}:${renderIndex}`,
        componentName,
        cycleId: cycle.id,
        depth,
        parentName,
        renderIndex,
        timestamp: Date.now(),
      };

      cycle.nodes.push(node);
      scheduleFlush();
    },

    unregisterNode: (componentName: string): void => {
      if (stack.length === 0) return;

      const top = stack[stack.length - 1];
      if (top !== componentName) {
        // Concurrent Mode artifact: interrupted render left a stale stack frame.
        // Discard the in-flight cycle and recover cleanly for the next render.
        if (!concurrentModeWarned) {
          concurrentModeWarned = true;
          console.warn(
            '[render-trace] Render stack mismatch (Concurrent Mode artifact) — expected "' +
              componentName +
              '", found "' +
              top +
              '". In-flight cycle discarded.',
          );
        }
        stack.length = 0;
        activeCycle = null;
        flushPending = false;
        return;
      }

      stack.pop();
    },

    getRenderChains: (): RenderCycle[] => [...cycles],

    getRootCause: (): string | null => cycles.at(-1)?.rootTrigger ?? null,

    resetTrace: (): void => {
      cycles.length = 0;
      cycleCounter = 0;
      stack.length = 0;
      activeCycle = null;
      flushPending = false;
    },

    start: (): void => {
      engine.enabled = true;
    },

    stop: (): void => {
      if (activeCycle) flush();
      engine.enabled = false;
    },
  };

  return engine;
};
