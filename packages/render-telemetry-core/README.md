# @sapanmozammel/render-telemetry-core

Event protocol and observability infrastructure for React Render Kit. Provides a typed event model, session lifecycle, transport abstraction, and a replay-compatible buffer — zero dependencies, no React peer dependency, no console output.

## Install

```bash
pnpm add @sapanmozammel/render-telemetry-core
# or
npm i @sapanmozammel/render-telemetry-core
```

> **No NODE_ENV guard.** This package contains no `process.env.NODE_ENV` check. It runs unconditionally wherever you import it. Only create sessions in the environments where you want telemetry — your component code or wrapper hook decides when to call `createTelemetrySession`.

---

## Quick start

```ts
import {
  createTelemetrySession,
  createSessionStartEvent,
  createRenderEvent,
  createTelemetryBuffer,
  registerTransport,
  createMemoryTransport,
  emitEvents,
  endTelemetrySession,
  createSessionEndEvent,
} from '@sapanmozammel/render-telemetry-core';

// 1. Register a transport
const transport = createMemoryTransport();
registerTransport(transport);

// 2. Create a session on mount
const buffer = createTelemetryBuffer();
let session = createTelemetrySession('UserCard');
const { event: startEv, session: s1 } = createSessionStartEvent(session);
session = s1;
buffer.push(startEv);
buffer.pushSession(session);
emitEvents([startEv]);

// 3. Emit a render event on each render
const { event: renderEv, session: s2 } = createRenderEvent(session, {
  renderNumber: 1,
  triggeredBy: 'props',
});
session = s2;
buffer.push(renderEv);
buffer.updateSession(session);
emitEvents([renderEv]);

// 4. Close the session on unmount
const endedSession = endTelemetrySession(session);
const { event: endEv } = createSessionEndEvent(endedSession, { totalRenders: 1 });
buffer.push(endEv);
buffer.updateSession(endedSession);
emitEvents([endEv]);

// 5. Inspect
console.log(transport.getEmitted()); // all events emitted so far
```

---

## API Reference

### Session Management

| Export | Signature | Description |
|---|---|---|
| `createTelemetrySession` | `(componentName: string) => TelemetrySession` | Opens a new session at component mount |
| `endTelemetrySession` | `(session: TelemetrySession) => TelemetrySession` | Closes a session at component unmount; returns new object |

### Event Factories

Each factory returns `{ event: T; session: TelemetrySession }` — immutable update pattern. Thread the returned session into the next factory call.

| Export | Emits |
|---|---|
| `createSessionStartEvent` | `SessionStartEvent` |
| `createRenderEvent` | `RenderEvent` |
| `createPropChangeEvent` | `PropChangeEvent` |
| `createFrequencyEvent` | `FrequencyEvent` |
| `createScoreEvent` | `ScoreEvent` |
| `createRecommendationEvent` | `RecommendationEvent` |
| `createSessionEndEvent` | `SessionEndEvent` |

### Buffer

| Export | Signature | Description |
|---|---|---|
| `createTelemetryBuffer` | `(options?: TelemetryBufferOptions) => TelemetryBuffer` | Creates a FIFO buffer. Implements `useSyncExternalStore` interface |

`TelemetryBuffer` methods: `subscribe`, `getSnapshot`, `getServerSnapshot`, `push`, `pushSession`, `updateSession`, `clear`, `getEventsBySession`, `getEventsByComponent`, `getEventsByType`, `getSession`, `getSessionsByComponent`.

### Transport Registry

| Export | Signature | Description |
|---|---|---|
| `registerTransport` | `(transport: TelemetryTransport) => () => void` | Register; returns unregister function |
| `unregisterAllTransports` | `() => void` | Clear all transports (use in test teardown) |
| `emitEvents` | `(events: ReadonlyArray<TelemetryEvent>) => void` | Dispatch events to all registered transports |

### Transport Factories

| Export | Description |
|---|---|
| `createMemoryTransport()` | In-memory accumulator with `getEmitted()` and `clearEmitted()` |
| `createLocalStorageTransport(storageKey, options?)` | Persist events to `localStorage` |
| `createCustomTransport(name, emitFn)` | Wrap any callback as a transport |

### Serialization

| Export | Signature |
|---|---|
| `serializeSession` | `(session) => string` |
| `deserializeSession` | `(json: string) => TelemetrySession \| null` |
| `serializeBuffer` | `(buffer) => string` |
| `deserializeBuffer` | `(json: string, options?) => TelemetryBuffer` — never throws |

### Validation

| Export | Signature |
|---|---|
| `validateEvent` | `(value: unknown) => value is TelemetryEvent` |
| `isKnownEventType` | `(type: unknown) => type is TelemetryEventType` |

### Constants

| Export | Value |
|---|---|
| `CURRENT_SCHEMA_VERSION` | `'1.0.0'` |
| `EVENT_SCHEMA_VERSIONS` | `Record<TelemetryEventType, SchemaVersion>` |

---

## Event type reference

| Type | Emitted when | Key payload fields |
|---|---|---|
| `session-start` | Component mounts | — |
| `render` | Each render | `renderNumber`, `triggeredBy` |
| `prop-change` | Props changed | `renderNumber`, `changed[]`, `unstable[]`, `inferredTrigger`, `signalKind` |
| `frequency` | Frequency window computed | `renderNumber`, `windowMs`, `windowCount`, `rate`, `classification`, `totalRenders` |
| `score` | Health score computed | `renderNumber`, `score`, `grade`, penalties, `memoClassification`, `signalKind` |
| `recommendation` | Recommendations generated | `renderNumber`, `recommendations[]` |
| `session-end` | Component unmounts | `totalRenders`, `durationMs`, `finalScore` |

---

## Session lifecycle

```
createTelemetrySession('UserCard')
    ↓
createSessionStartEvent(session)
    ↓
[each render] createRenderEvent / createPropChangeEvent / etc.
    ↓
endTelemetrySession(session)
    ↓
createSessionEndEvent(endedSession, { totalRenders, finalScore })
```

Every event carries `sessionId`, `componentName`, `sequenceNumber` (monotonic within session), `timestamp` (`performance.now()`), and `wallTimestamp` (`Date.now()`).

---

## InferredTrigger → triggeredBy mapping

When integrating with `@sapanmozammel/render-insights`, map `InferredTrigger` → `TelemetryRenderTrigger`:

| `InferredTrigger` (render-insights) | `TelemetryRenderTrigger` (this package) |
|---|---|
| `'no-prop-change'` | `'parent'` |
| `'genuine-prop-change'` | `'props'` |
| `'reference-instability'` | `'props'` |
| `'mixed'` | `'props'` |

---

## Transport guide

| Transport | Use when |
|---|---|
| `createMemoryTransport()` | Tests, custom panels, in-process inspection |
| `createLocalStorageTransport(key)` | Dev browser sessions that survive page refresh |
| `createCustomTransport(name, fn)` | Storybook, CI reporters, custom dashboards |

### LocalStorage security warning

`LocalStorageTransport` persists all prop values (`prev`/`next`) to browser storage in plaintext. **Do not use in production.** Do not instrument components that receive sensitive props (passwords, tokens, PII).

---

## Serialization example

```ts
import { serializeBuffer, deserializeBuffer } from '@sapanmozammel/render-telemetry-core';
import { writeFileSync, readFileSync } from 'fs';

// Export
const json = serializeBuffer(buffer);
writeFileSync('render-session.json', json);

// Import
const json2 = readFileSync('render-session.json', 'utf8');
const restored = deserializeBuffer(json2); // never throws
const sessions = restored.getSessionsByComponent('UserCard');
```

---

## Production safety

This package has **no built-in production guard**. There is no `process.env.NODE_ENV !== 'development'` check anywhere in the source. You decide when to instrument:

```ts
// Option A: guard in your hook
if (process.env.NODE_ENV !== 'development') return;
const session = createTelemetrySession(name);

// Option B: use the package in dev-only code paths
```

---

## React integration (useSyncExternalStore)

`TelemetryBuffer` implements the `subscribe / getSnapshot / getServerSnapshot` interface directly, so you can pass it to React's `useSyncExternalStore` without any adapter:

```tsx
import { useSyncExternalStore } from 'react';

const snapshot = useSyncExternalStore(
  buffer.subscribe,
  buffer.getSnapshot,
  buffer.getServerSnapshot,
);
// snapshot.events — all events; snapshot.sessions — all sessions
```

---

## TypeScript exports

```ts
import type {
  TelemetryEvent,
  TelemetryEventType,
  TelemetryEventBase,
  TelemetrySession,
  TelemetryBuffer,
  TelemetryBufferSnapshot,
  TelemetryBufferOptions,
  TelemetryTransport,
  MemoryTransport,
  TransportEmitFn,
  LocalStorageTransportOptions,
  SessionStartEvent,
  RenderEvent,
  PropChangeEvent,
  FrequencyEvent,
  ScoreEvent,
  RecommendationEvent,
  SessionEndEvent,
  TelemetryRenderTrigger,
  TelemetryInferredTrigger,
  TelemetryFrequencyClass,
  TelemetryHealthGrade,
  TelemetryMemoClassification,
  TelemetrySignalKind,
  TelemetryPropChangeEntry,
  TelemetryPropInstability,
  SchemaVersion,
} from '@sapanmozammel/render-telemetry-core';
```

---

## Relation to other packages

```
@sapanmozammel/render-insights       — data computation layer (prop diff, score, frequency)
@sapanmozammel/render-playground     — visual panel layer (built on InsightReport)
@sapanmozammel/render-telemetry-core — event protocol + infrastructure layer (this package)

Future:
  render-replay-engine  — time-travel debugger (builds on TelemetryBuffer + deserializeBuffer)
  render-devtools-panel — browser extension (builds on registerTransport)
  render-ci-reporter    — CI integration (builds on serializeBuffer)
```

---

## License

MIT
