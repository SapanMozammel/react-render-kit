---
title: "render-trace — react-render-kit"
description: "Trace React render cascade propagation — identify root-trigger components and render chain depth."
keywords: ["react render trace", "render cascade detection", "useTraceRender"]
canonical: "https://react-render-kit.vercel.app/docs/render-trace"
---

# render-trace

`@sapanmozammel/render-trace` shows you which component triggered a render cascade, how deep it went, and which components were dragged along. It traces propagation across the component tree without relying on React's internal fiber.

## Install

```bash
npm install @sapanmozammel/render-trace
```

Peer dependency: `react >= 18`

## `createRenderTrace(options?)`

Returns a shared `TraceInstance` used to correlate renders across components:

```ts
import { createRenderTrace } from '@sapanmozammel/render-trace';

const trace = createRenderTrace({
  logMode: 'tree',   // 'tree' | 'flat' | 'silent'
  maxCycles: 50,     // how many completed cycles to retain
  enabled: true,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `NODE_ENV === 'development'` | Disable without removing calls |
| `maxCycles` | `number` | `50` | Maximum retained `RenderCycle` entries |
| `logMode` | `'tree' \| 'flat' \| 'silent'` | `'tree'` | Console output format |

## `useTraceRender(componentName, options?)`

Register a component with a `TraceInstance`. Call this in every component you want to trace:

```tsx
import { useTraceRender } from '@sapanmozammel/render-trace';

const Form = () => {
  useTraceRender('Form', { instance: trace });
  return <form>...</form>;
};

const FormField = () => {
  useTraceRender('FormField', { instance: trace });
  return <input />;
};
```

## Console output (`logMode: 'tree'`)

```
▶ [render-trace] Cycle #3 — triggered by <Form>

  Form              depth 0  (root trigger)
  └── FormField     depth 1
  └── SubmitButton  depth 1
```

## `TraceInstance` API

```ts
trace.getRenderChains()   // RenderCycle[] — all completed cycles
trace.getRootCause()      // RenderCycle | undefined — the most recent cycle
trace.resetTrace()        // clear all recorded cycles
trace.start()             // enable tracing if it was stopped
trace.stop()              // disable tracing
```

## `RenderCycle` shape

```ts
type RenderCycle = {
  id: string;
  startTime: number;
  endTime: number;
  nodes: RenderNode[];
  rootTrigger: string;   // component name that started the cascade
  maxDepth: number;
  totalRenders: number;
  status: 'in-progress' | 'completed';
};
```

## `RenderNode` shape

```ts
type RenderNode = {
  id: string;
  componentName: string;
  cycleId: string;
  depth: number;
  parentName: string | null;
};
```

## `defaultTrace`

A module-scope singleton for use without an explicit instance:

```tsx
import { useTraceRender, defaultTrace } from '@sapanmozammel/render-trace';

// No instance option needed — uses the shared default
const MyComponent = () => {
  useTraceRender('MyComponent');
  return <div />;
};

defaultTrace.getRenderChains();
```

## `logCycle(cycle)`

Standalone logger for custom output:

```ts
import { logCycle } from '@sapanmozammel/render-trace';

const cycle = trace.getRootCause();
if (cycle) logCycle(cycle);  // logs the cycle regardless of logMode setting
```
