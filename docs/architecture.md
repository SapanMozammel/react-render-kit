---
title: "Architecture — react-render-kit"
description: "How 12 react-render-kit packages interact: dependency graph, event pipeline, and the render-kit orchestration layer."
keywords: ["react render architecture", "telemetry pipeline", "react observability design"]
canonical: "https://react-render-kit.vercel.app/docs/architecture"
---

# Architecture

## Package dependency graph

```
render-core-schema  (zero deps — types + guards only)
       │
       ├── render-telemetry-core  (zero deps — event protocol + buffer + transports)
       │         │
       │         └── render-replay-engine  (peer: render-telemetry-core)
       │
       └── render-intelligence  (peer: render-core-schema)

React hooks  (all peer: react >= 18)
  why-render
  why-render-frequency
  render-trace
  unstable-props-detector
  memo-effect-analyzer
  render-insights          (uses all 5 hooks internally)
  render-playground        (peer: render-insights)

render-kit  (depends on all 11 above — the unified SDK layer)
```

## Event pipeline lifecycle

```
Component renders
     │
     ▼
useRenderInsights (or individual hooks)
     │  produces InsightReport per render
     ▼
render-telemetry-core
     │  createRenderEvent, createScoreEvent, createPropChangeEvent, etc.
     ▼
TelemetryBuffer  (in-memory ring buffer, maxEvents=1000)
     │  push/subscribe via useSyncExternalStore
     ▼
Transport(s)  (memory / localStorage / custom)
     │
     ├── render-replay-engine
     │     buildReplaySessions → ReplaySession[]
     │     createReplayEngine → frame navigation + filtering + bookmarks
     │
     └── render-intelligence
           analyzeRenders → IntelligenceReport
               applicationHealth + bottlenecks + correlations
               + rootCauses + recommendations
```

## Layer responsibilities

| Layer | Packages | Responsibility |
|---|---|---|
| Schema | `render-core-schema` | All types, guards, version utilities — zero runtime |
| Telemetry | `render-telemetry-core` | Event creation, buffer management, transport dispatch |
| Replay | `render-replay-engine` | Frame grouping, timeline, cursor navigation, filters, bookmarks |
| Intelligence | `render-intelligence` | Cross-session aggregation, bottleneck ranking, correlation detection, root cause |
| Hook | `why-render`, `why-render-frequency`, `render-trace`, `unstable-props-detector`, `memo-effect-analyzer`, `render-insights`, `render-playground` | React instrumentation — prop diffing, frequency tracking, scoring |
| SDK | `render-kit` | Factory, lifecycle, React context, plugin protocol, unified re-exports |

## Disabled mode

`createRenderKit({ enabled: false })` short-circuits at factory init. No buffer is allocated, no transports are registered, no hooks compute anything. The entire cost is one boolean check at the top of each hook.

```ts
// Zero allocation — DISABLED_BUFFER is a module-scope frozen constant
const kit = createRenderKit({ enabled: false });
kit.telemetry.buffer   // → DISABLED_BUFFER (shared, frozen)
kit.replay.fromBuffer() // → []
kit.analyze()           // → throws RenderKitError { code: 'DISABLED' }
```

## Multi-instance safety

Multiple `createRenderKit()` calls produce fully isolated instances. Each kit tracks its own transport deregister functions. `kit.destroy()` only deregisters that kit's transports — it never calls `unregisterAllTransports()`. Multiple kits on the same page will not interfere with each other's telemetry streams.

## The transport registry

`render-telemetry-core` maintains a module-level transport registry singleton. The `push()` path on `TelemetryBuffer` calls `emitEvents(events)`, which dispatches to all currently registered transports. Each kit's `registerTransport()` returns a deregister function; `kit.destroy()` calls each of those functions in registration order.

## `useSyncExternalStore` compatibility

`TelemetryBuffer.subscribe(listener)` and `TelemetryBuffer.getSnapshot()` satisfy the `useSyncExternalStore` contract — subscribe returns an unsubscribe function, getSnapshot returns a stable reference when nothing has changed. Components that read from the buffer will re-render only when new events are pushed.
