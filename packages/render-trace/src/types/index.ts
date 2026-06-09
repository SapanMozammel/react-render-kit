export type LogMode = 'tree' | 'flat' | 'silent';

export type RenderTraceOptions = {
  enabled?: boolean;
  maxCycles?: number;
  logMode?: LogMode;
};

export type TraceRenderOptions = {
  enabled?: boolean;
  instance?: TraceInstance;
};

export type RenderNode = {
  id: string;
  componentName: string;
  cycleId: string;
  depth: number;
  parentName: string | null;
  renderIndex: number;
  timestamp: number;
};

export type RenderCycle = {
  id: string;
  startTime: number;
  endTime: number | null;
  nodes: RenderNode[];
  rootTrigger: string | null;
  maxDepth: number;
  totalRenders: number;
  status: 'active' | 'flushed';
};

export type TraceInstance = {
  enabled: boolean;
  registerNode(componentName: string): void;
  unregisterNode(componentName: string): void;
  getRenderChains(): RenderCycle[];
  getRootCause(): string | null;
  resetTrace(): void;
  start(): void;
  stop(): void;
};
