# @sapanmozammel/render-kit

Unified observability SDK for React. One install brings all 12 react-render-kit packages — pre-wired telemetry, time-travel replay, and static intelligence analysis — with a single config object and React context.

**[Live demo →](https://react-render-kit.vercel.app/render-kit)**

## Install

```bash
npm install @sapanmozammel/render-kit
```

Peer dependency: `react >= 18`

## Quick start

```tsx
import { createRenderKit, RenderKitProvider, useWhyRender } from '@sapanmozammel/render-kit';

const kit = createRenderKit();

export const App = () => (
  <RenderKitProvider kit={kit}>
    <MyApp />
  </RenderKitProvider>
);

const UserCard = (props: UserCardProps) => {
  useWhyRender('UserCard', props);
  return <div>{props.user.name}</div>;
};
```

## `createRenderKit(config?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `NODE_ENV !== 'production'` | Master on/off switch |
| `telemetry.maxEvents` | `number` | `1000` | Buffer ring size |
| `telemetry.transports` | `TelemetryTransport[]` | `[]` | Initial transports |
| `replay.maxFrames` | `number` | `100` | Max frames per session |
| `replay.pruningStrategy` | `'fifo'` | `'fifo'` | Frame eviction strategy |
| `intelligence.maxBottlenecks` | `number` | `10` | Bottlenecks returned |
| `intelligence.maxRecommendations` | `number` | `20` | Recommendations returned |
| `intelligence.confidenceThreshold` | `number` | `0.3` | Min root-cause confidence (0–1) |
| `intelligence.correlationWindowMs` | `number` | `16` | Co-render detection window |
| `intelligence.includeWellOptimized` | `boolean` | `false` | Include healthy components |
| `plugins` | `RenderKitPlugin[]` | `[]` | Plugin lifecycle hooks |

## `RenderKit` instance

```ts
kit.enabled                   // boolean
kit.config                    // ResolvedRenderKitConfig (frozen)

// Telemetry subsystem
kit.telemetry.buffer          // TelemetryBuffer (useSyncExternalStore compatible)
kit.telemetry.createSession(name)     // TelemetrySession
kit.telemetry.endSession(session)     // TelemetrySession
kit.telemetry.registerTransport(t)    // () => void  (deregister fn)
kit.telemetry.snapshot()      // TelemetryBufferSnapshot
kit.telemetry.serialize()     // JSON string
kit.telemetry.clear()         // empties buffer

// Replay subsystem
kit.replay.fromBuffer()                       // ReplaySession[]
kit.replay.fromEvents(events)                 // ReplaySession[]
kit.replay.fromSerialized(json)               // ReplaySession[]
kit.replay.engine(source, sessionId?)         // ReplayEngine

// Intelligence
kit.analyze()                               // IntelligenceReport (uses buffer)
kit.analyze({ type: 'events', events })     // IntelligenceReport

// Lifecycle
kit.destroy()                 // idempotent teardown
```

## Provider + context

```tsx
import { RenderKitProvider, useRenderKit } from '@sapanmozammel/render-kit';

function App() {
  return (
    <RenderKitProvider kit={kit}>
      <MyApp />
    </RenderKitProvider>
  );
}

function MyComponent() {
  const kit = useRenderKit(); // throws RenderKitError CONTEXT_MISSING outside provider
  const sessions = kit.replay.fromBuffer();
}
```

## Telemetry transports

```ts
import {
  createMemoryTransport,
  createLocalStorageTransport,
  createCustomTransport,
} from '@sapanmozammel/render-kit';

kit.telemetry.registerTransport(createMemoryTransport());
kit.telemetry.registerTransport(createLocalStorageTransport('rk-events'));
kit.telemetry.registerTransport(
  createCustomTransport('my-backend', async (events) => {
    await fetch('/api/telemetry', { method: 'POST', body: JSON.stringify(events) });
  })
);
```

## Disabled mode

```ts
const kit = createRenderKit({ enabled: false });
// kit.telemetry.buffer → DISABLED_BUFFER (shared frozen constant, zero allocation)
// kit.replay.fromBuffer() → []
// kit.analyze() → throws RenderKitError { code: 'DISABLED' }
// kit.destroy() → no-op
```

Safe to ship in production gated on `NODE_ENV`:

```ts
const kit = createRenderKit({ enabled: process.env.NODE_ENV !== 'production' });
```

## Plugin system

```ts
const plugin: RenderKitPlugin = {
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  onInit: (kit) => { /* called during createRenderKit() */ },
  onDestroy: (kit) => { /* called during kit.destroy() */ },
  analysisPlugin: {
    id: 'my-analysis',
    name: 'My Analysis',
    version: '1.0.0',
    analyze: (components) => ({ bottlenecks: [], rootCauses: [], recommendations: [], correlations: [] }),
  },
};

const kit = createRenderKit({ plugins: [plugin] });
```

## Error codes

| Code | Thrown by | Condition |
|---|---|---|
| `CONTEXT_MISSING` | `useRenderKit()` | No `RenderKitProvider` in ancestor tree |
| `DISABLED` | `kit.analyze()`, `kit.replay.engine()` | Kit created with `enabled: false` |
| `ANALYSIS_FAILED` | `kit.analyze()` | Empty source or internal analysis error |
| `REPLAY_FAILED` | `kit.replay.*` | Empty source, decode error |
| `INIT_FAILED` | `createRenderKit()` | Factory init failure |

## Re-exports

`@sapanmozammel/render-kit` re-exports the complete locked manifest from all 11 sibling packages. Every hook, factory, type, and constant is available from one import:

```ts
import {
  useWhyRender,
  useRenderFrequency,
  useTraceRender,
  useUnstablePropsDetector,
  useMemoEffectAnalyzer,
  useRenderInsights,
  useRenderPlayground,
  RenderPlaygroundPanel,
  createTelemetryBuffer,
  buildReplaySessions,
  analyzeRenders,
} from '@sapanmozammel/render-kit';
```
