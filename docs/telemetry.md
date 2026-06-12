---
title: "Telemetry — react-render-kit"
description: "TelemetryBuffer, event types, transports, and serialization in react-render-kit."
keywords: ["react telemetry", "render event buffer", "react observability events"]
canonical: "https://react-render-kit.vercel.app/docs/telemetry"
---

# Telemetry

`@sapanmozammel/render-telemetry-core` is the event protocol and observability infrastructure layer. It defines 7 structured event types, an in-memory ring buffer with `useSyncExternalStore` compatibility, three transport implementations, and buffer serialization. It has zero runtime dependencies and no React peer dependency.

## `createTelemetryBuffer(options?)`

```ts
const buffer = createTelemetryBuffer({ maxEvents: 1000 });
```

| Option | Type | Default | Description |
|---|---|---|---|
| `maxEvents` | `number` | `1000` | Ring size — oldest events are dropped when full |

## Buffer API

```ts
buffer.push(event)                              // add a single TelemetryEvent
buffer.pushSession(session)                     // add a SessionStartEvent
buffer.updateSession(sessionId, patch)          // update session fields
buffer.subscribe(listener)                      // returns unsubscribe fn — useSyncExternalStore compatible
buffer.getSnapshot()                            // TelemetryBufferSnapshot (stable ref when unchanged)
buffer.clear()                                  // empty all events and sessions

// Query helpers
buffer.getEventsBySession(sessionId)            // TelemetryEvent[]
buffer.getEventsByComponent(name)               // TelemetryEvent[]
buffer.getEventsByType(type)                    // TelemetryEvent[]
buffer.getSession(sessionId)                    // RenderSession | undefined
buffer.getSessionsByComponent(name)             // RenderSession[]
```

## Event types

| Event | Created by | Key fields |
|---|---|---|
| `SessionStartEvent` | `createSessionStartEvent` | `sessionId`, `componentName`, `timestamp` |
| `RenderEvent` | `createRenderEvent` | `renderNumber`, `triggeredBy`, `wallTimestamp` |
| `PropChangeEvent` | `createPropChangeEvent` | `changed[]`, `unstable[]` |
| `FrequencyEvent` | `createFrequencyEvent` | `windowCount`, `rate`, `classification` |
| `ScoreEvent` | `createScoreEvent` | `score`, `grade`, `memoClassification`, `penalties` |
| `RecommendationEvent` | `createRecommendationEvent` | `recommendations[]` |
| `SessionEndEvent` | `createSessionEndEvent` | `endTimestamp`, `totalRenders` |

All events share `EventBase` fields: `id`, `type`, `schemaVersion`, `sessionId`, `componentName`, `sequenceNumber`, `timestamp`.

## Transports

### `createMemoryTransport()`

In-memory transport for dev use and testing. Collects emitted events, never discards them.

```ts
const mem = createMemoryTransport();
registerTransport(mem);

mem.getEmitted()    // TelemetryEvent[] — all events received
mem.clearEmitted()  // reset the collected list
```

### `createLocalStorageTransport(key, options?)`

Persists events to `localStorage` between page reloads.

```ts
const ls = createLocalStorageTransport('rk-events', {
  maxBytes: 512_000,        // byte limit before pruning or dropping
  onExceed: 'prune',        // 'prune' (drop oldest) | 'drop' (drop new)
});
```

### `createCustomTransport(name, emitFn)`

Bring your own backend. `emitFn` receives a batch of events.

```ts
createCustomTransport('my-api', async (events: TelemetryEvent[]) => {
  await fetch('/api/telemetry', {
    method: 'POST',
    body: JSON.stringify(events),
  });
});
```

### Registry functions

```ts
registerTransport(transport)      // returns deregister fn
unregisterAllTransports()         // remove all transports globally
emitEvents(events)                // dispatch to all registered transports (called by buffer.push)
```

## Serialization

```ts
import {
  serializeBuffer,
  deserializeBuffer,
  serializeSession,
  deserializeSession,
} from '@sapanmozammel/render-telemetry-core';

const json = serializeBuffer(buffer);             // JSON string
const snapshot = deserializeBuffer(json);         // TelemetryBufferSnapshot

const sessionJson = serializeSession(session);    // JSON string
const session = deserializeSession(sessionJson);  // RenderSession
```

Serialized output is schema-versioned — the `schemaVersion` field on each event enables future migration.

## Session lifecycle

```ts
import { createTelemetrySession, endTelemetrySession } from '@sapanmozammel/render-telemetry-core';

const session = createTelemetrySession('MyComponent');
// session.sessionId, session.componentName, session.startTimestamp

const ended = endTelemetrySession(session);
// ended.status === 'ended', ended.endTimestamp set
```
