---
title: "render-kit — Unified Observability SDK for React"
description: "API reference for createRenderKit, RenderKitProvider, useRenderKit, subsystem access, plugin lifecycle, and disabled mode."
keywords: ["render-kit", "createRenderKit", "RenderKitProvider", "react render sdk"]
canonical: "https://react-render-kit.vercel.app/docs/render-kit"
---

# render-kit

`@sapanmozammel/render-kit` is the unified entry point for the react-render-kit ecosystem. One install, one config object, and pre-wired telemetry, replay, and intelligence subsystems. All 11 sibling packages are re-exported from this single import surface.

## Install

```bash
npm install @sapanmozammel/render-kit
```

Peer dependency: `react >= 18`

## `createRenderKit(config?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `NODE_ENV !== 'production'` | Master on/off switch |
| `telemetry.maxEvents` | `number` | `1000` | Buffer ring size (clamped ≥ 1) |
| `telemetry.transports` | `TelemetryTransport[]` | `[]` | Initial transports registered at kit creation |
| `replay.maxFrames` | `number` | `100` | Max frames per session (clamped ≥ 1) |
| `replay.pruningStrategy` | `'fifo'` | `'fifo'` | Frame eviction strategy when maxFrames is reached |
| `intelligence.maxBottlenecks` | `number` | `10` | Bottlenecks returned per `kit.analyze()` call |
| `intelligence.maxRecommendations` | `number` | `20` | Recommendations returned per call |
| `intelligence.confidenceThreshold` | `number` | `0.3` | Minimum root-cause confidence (0–1) |
| `intelligence.correlationWindowMs` | `number` | `16` | Window for detecting co-renders |
| `intelligence.includeWellOptimized` | `boolean` | `false` | Include healthy components in the report |
| `plugins` | `RenderKitPlugin[]` | `[]` | Plugin lifecycle hooks |

## `RenderKit` instance shape

```ts
kit.enabled                   // boolean
kit.config                    // ResolvedRenderKitConfig (frozen, all defaults filled)
```

### Telemetry subsystem (`kit.telemetry`)

```ts
kit.telemetry.enabled                     // boolean
kit.telemetry.buffer                      // TelemetryBuffer (useSyncExternalStore compatible)
kit.telemetry.createSession(name)         // TelemetrySession
kit.telemetry.endSession(session)         // TelemetrySession
kit.telemetry.registerTransport(t)        // () => void  (returns deregister fn)
kit.telemetry.unregisterAllTransports()   // removes all transports for this kit
kit.telemetry.snapshot()                  // TelemetryBufferSnapshot
kit.telemetry.serialize()                 // JSON string of full buffer snapshot
kit.telemetry.clear()                     // empties buffer
```

### Replay subsystem (`kit.replay`)

```ts
kit.replay.enabled                               // boolean
kit.replay.fromBuffer(options?)                  // ReplaySession[]
kit.replay.fromEvents(events, options?)          // ReplaySession[]
kit.replay.fromSerialized(json, options?)        // ReplaySession[]
kit.replay.engine(source, sessionId?, options?)  // ReplayEngine
```

### Intelligence (`kit.analyze`)

```ts
kit.analyze()                                      // IntelligenceReport — uses buffer snapshot
kit.analyze({ type: 'events', events })            // IntelligenceReport — explicit source
kit.analyze({ type: 'snapshot', snapshot })        // IntelligenceReport
kit.analyze({ type: 'replay', sessions }, options) // IntelligenceReport with option overrides
```

### Lifecycle

```ts
kit.destroy()   // idempotent — deregisters this kit's transports, calls plugin onDestroy hooks
```

## Provider + context

```tsx
import { createRenderKit, RenderKitProvider, useRenderKit } from '@sapanmozammel/render-kit';

const kit = createRenderKit();

// Wrap your app:
const App = () => (
  <RenderKitProvider kit={kit}>
    <MyApp />
  </RenderKitProvider>
);

// Access in any descendant:
const MyComponent = () => {
  const kit = useRenderKit(); // throws RenderKitError CONTEXT_MISSING if no provider
  const sessions = kit.replay.fromBuffer();
  return <div>{sessions.length} sessions recorded</div>;
};
```

## Telemetry transports

```ts
import {
  createMemoryTransport,
  createLocalStorageTransport,
  createCustomTransport,
} from '@sapanmozammel/render-kit';

// In-memory — collect and inspect events in tests or dev tools
const mem = createMemoryTransport();
kit.telemetry.registerTransport(mem);
mem.getEmitted();    // TelemetryEvent[]
mem.clearEmitted();

// Persist to localStorage between page reloads
kit.telemetry.registerTransport(
  createLocalStorageTransport('rk-telemetry', { maxBytes: 512_000, onExceed: 'prune' })
);

// Send to your own backend
kit.telemetry.registerTransport(
  createCustomTransport('my-backend', async (events) => {
    await fetch('/api/telemetry', { method: 'POST', body: JSON.stringify(events) });
  })
);
```

## Replay

```ts
// Build sessions from the live buffer
const sessions = kit.replay.fromBuffer();

// Navigate frame by frame
const engine = kit.replay.engine({ type: 'buffer', buffer: kit.telemetry.buffer });
engine.navigator.next();
engine.navigator.jumpTo(5);
engine.cursor.frameIndex   // current position

// Filter to only frames with issues
const filtered = engine.withFilter(engine, { minScore: 0, maxScore: 50 });
```

## Intelligence analysis

```ts
const report = kit.analyze();

report.applicationHealth.score        // 0–100
report.applicationHealth.grade        // 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL'
report.bottlenecks[0].componentName
report.correlations                   // components that co-render
report.rootCauses                     // highest-confidence cause per component
report.recommendations                // ranked string[]
```

## Disabled mode

```ts
const kit = createRenderKit({ enabled: false });
// kit.telemetry.buffer   → DISABLED_BUFFER (shared frozen constant, zero allocation)
// kit.replay.fromBuffer() → []
// kit.analyze()           → throws RenderKitError { code: 'DISABLED' }
// kit.destroy()           → no-op
```

Production gating pattern:

```ts
const kit = createRenderKit({
  enabled: process.env.NODE_ENV !== 'production',
});
```

## Plugin system

```ts
import type { RenderKitPlugin } from '@sapanmozammel/render-kit';

const plugin: RenderKitPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  onInit: (kit) => {
    console.log('Kit initialized, telemetry enabled:', kit.telemetry.enabled);
  },
  onDestroy: (kit) => {
    console.log('Kit destroyed');
  },
  analysisPlugin: {
    id: 'my-analysis',
    name: 'My Analysis',
    version: '1.0.0',
    analyze: (components, context) => ({
      bottlenecks: [],
      rootCauses: [],
      recommendations: ['Custom recommendation'],
      correlations: [],
    }),
  },
};

const kit = createRenderKit({ plugins: [plugin] });
```

Plugin lifecycle:
- `onInit` — called in registration order during `createRenderKit()`
- `onDestroy` — called in reverse order during `kit.destroy()`
- Errors in lifecycle hooks are caught and logged, never rethrown
- `analysisPlugin` is forwarded to `render-intelligence` and runs before call-site plugins

## Error codes

| Code | Thrown by | Condition |
|---|---|---|
| `CONTEXT_MISSING` | `useRenderKit()` | No `RenderKitProvider` in ancestor tree |
| `DISABLED` | `kit.analyze()`, `kit.replay.engine()` | Kit created with `enabled: false` |
| `ANALYSIS_FAILED` | `kit.analyze()` | Empty source or internal analysis error |
| `REPLAY_FAILED` | `kit.replay.*` | Empty source, malformed JSON, or decode error |
| `INIT_FAILED` | `createRenderKit()` | Factory initialization failure |
| `INVALID_CONFIG` | `createRenderKit()` | Config value outside valid range |

## Re-exports

Every hook, factory, type, and constant from all 11 sibling packages is re-exported:

```ts
import {
  // Hooks
  useWhyRender, useRenderFrequency, useTraceRender,
  useUnstablePropsDetector, useMemoEffectAnalyzer,
  useRenderInsights, useRenderPlayground,
  // Components
  RenderPlaygroundPanel, PlaygroundProvider,
  // Telemetry
  createTelemetryBuffer, createMemoryTransport,
  createLocalStorageTransport, createCustomTransport,
  serializeBuffer, deserializeBuffer,
  // Replay
  buildReplaySessions, createReplayEngine,
  applyFilter, applyPreset, createBookmarkStore,
  // Intelligence
  analyzeRenders, createPlugin,
  // Schema
  isHealthGrade, isEventType, CURRENT_SCHEMA_VERSION,
} from '@sapanmozammel/render-kit';
```
