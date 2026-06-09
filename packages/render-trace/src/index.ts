import { createEngine } from './engine/engine';
import { logCycle } from './logger/trace-logger';
import type { RenderTraceOptions, TraceInstance } from './types';

export { createEngine } from './engine/engine';
export { logCycle } from './logger/trace-logger';
export { defaultTrace, useTraceRender } from './hook/use-trace-render';
export type { LogMode, RenderCycle, RenderNode, RenderTraceOptions, TraceInstance, TraceRenderOptions } from './types';

// Public factory — wires the default logger
export const createRenderTrace = (options?: RenderTraceOptions): TraceInstance =>
  createEngine(options, logCycle);
