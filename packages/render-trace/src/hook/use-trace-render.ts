import { useLayoutEffect, useRef } from 'react';
import { createEngine } from '../engine/engine';
import { logCycle } from '../logger/trace-logger';
import type { TraceInstance, TraceRenderOptions } from '../types';

// Module-level singleton — shared when no custom instance is provided
export const defaultTrace: TraceInstance = createEngine(undefined, logCycle);

export const useTraceRender = (componentName: string, options?: TraceRenderOptions): void => {
  // useRef must come before any early return — Rules of Hooks
  const instanceRef = useRef<TraceInstance>(options?.instance ?? defaultTrace);

  if (process.env.NODE_ENV !== 'development') return;

  const instance = options?.instance ?? defaultTrace;
  instanceRef.current = instance;

  if (instance.enabled && options?.enabled !== false) {
    instance.registerNode(componentName);
  }

  // Placed after the production guard — NODE_ENV is a build-time constant so
  // this is always called in the same order within a given build.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLayoutEffect(() => {
    const inst = instanceRef.current;
    return () => {
      inst.unregisterNode(componentName);
    };
  });
};
