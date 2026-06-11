# Feature: @sapanmozammel/render-telemetry-core

> **One-sentence summary:** A pure TypeScript event protocol and observability infrastructure package that defines the shared telemetry contracts, typed event models, session lifecycle, transport abstraction, and replay-compatible buffer enabling all current and future React Render Kit packages to emit, store, and exchange structured observability data without coupling to any specific visualization, logging, or analytics layer.

---

## Executive Summary

Every package in the React Render Kit today produces `InsightReport` objects but has no shared event protocol. `render-playground` maintains its own FIFO store with no session boundaries, no versioning, no cross-component correlation, and no replay capability. Future packages — `render-replay-engine`, `render-devtools-panel`, `vscode-render-kit`, `render-ci-reporter`, `render-team-dashboard` — would each invent their own event bus, recreating the same problems independently.

`render-telemetry-core` solves this once: it defines the canonical event envelope, typed event variants, session lifecycle, transport abstraction, and a replay-compatible buffer that any future package can build on top of. It ships zero React dependency, zero runtime deps, zero console output, and zero network I/O. It is the infrastructure layer, not the product.

---

## Vision

**React Render Kit becomes the first open-source React observability ecosystem with a stable, versioned, replay-compatible telemetry protocol** — where any tool (browser panel, VS Code extension, CI reporter, team dashboard) can consume structured render events without understanding the internals of each individual package.

Every future package in the ecosystem speaks the same language. A render session recorded today can be replayed in a tool that doesn't exist yet. Performance regressions that are invisible in the browser console become caught in CI before they ship.

`render-telemetry-core` is the single contract that makes this possible.

---

## Goals

1. Define a canonical, versioned event envelope that all current and future ecosystem packages can emit
2. Provide a session lifecycle model (mount → unmount) with unique IDs and monotonic sequence numbers enabling deterministic replay
3. Ship a `TelemetryBuffer` implementing the `useSyncExternalStore` interface without importing React
4. Provide three transport implementations (Memory, LocalStorage, Custom) covering the primary dev-time use cases
5. Provide full JSON serialization/deserialization enabling session export, CI diffing, and offline replay
6. Maintain zero runtime dependencies and zero React peer dependency
7. Produce no console output (this is infrastructure; logging stays in each package's `logger/` module)
8. Ship with ≥ 90% test coverage across 10 test files

---

## Non-Goals

This package must **not** become:

1. **A logging library** — no `console.*` calls anywhere in `src/`. Logging stays in each package's `logger/` module
2. **An analytics SDK** — no user identification, no session attribution, no funnel tracking
3. **A backend service** — no HTTP client, no WebSocket, no network I/O in v1.0.0
4. **A vendor-specific integration** — no Datadog, no Sentry, no OpenTelemetry OTLP wire format
5. **A React-specific package** — no `peerDependencies: react`, no hooks, no components
6. **A production monitoring tool** — no `NODE_ENV` guards; consumers decide when to use it
7. **A replacement for `render-insights`** — this is the infrastructure layer; `render-insights` remains the data computation layer

---

## Context

### What

A new `packages/render-telemetry-core/` workspace package with a standalone, zero-dependency TypeScript library providing:

- A discriminated-union event model with schema versioning
- Session lifecycle management (component mount → unmount)
- A `TelemetryBuffer` — `useSyncExternalStore`-compatible without importing React
- Three transport implementations: Memory, LocalStorage, Custom
- JSON serialization/deserialization for replay and export
- Type-safe event factory functions

### Why

Without a shared telemetry contract:
1. Future tools (`render-replay-engine`) cannot time-travel because events have no timestamps or causality chain
2. Future CI reporters cannot export sessions because there is no serializable format
3. Future DevTools panels cannot correlate cross-component events because there is no session/correlation ID
4. `render-playground` would need to be redesigned from scratch to support replay (breaking change)
5. Every future package duplicates transport and buffering logic

With `render-telemetry-core`:
- The contract is defined once and versioned
- `render-playground` can migrate its store to `TelemetryBuffer` in a future non-breaking upgrade
- `render-replay-engine` can be built immediately on top of the serialized session format
- CI reporters can consume `serializeBuffer()` output directly

### Who

This package is consumed by **tooling developers** (internal, building future ecosystem packages) and **library authors** who want to integrate React Render Kit telemetry into their own tools. End-users of `render-insights` and `render-playground` never import this directly in v1.

### Related PRDs

- `.claude/plans/render-playground-stable/prd.md` — stabilized the visual layer on top of `InsightReport`; this PRD provides the infrastructure that the visual layer will eventually migrate to

---

## Challenge Assumptions — Pre-PRD Analysis

### Assumption 1: "We need telemetry because render-playground needs it"

**Challenge:** `render-playground` 1.0.1 works fine today. It does not need telemetry to function.

**Resolution:** The need is not `render-playground` today — it is every package that comes after. `render-replay-engine` needs timestamped, serializable events. `render-ci-reporter` needs session export. `render-devtools-panel` needs cross-component correlation. Without a shared foundation, those packages start from scratch with incompatible data models. The value is in the future, not the present.

### Assumption 2: "This could just be a logging library"

**Challenge:** Why not just add console output to a shared logger?

**Resolution:** Logging is write-only and ephemeral. Telemetry is queryable, serializable, and replay-compatible. A logging library solves a different problem. This package must NOT emit console output — that stays in each package's `logger/` module.

### Assumption 3: "OpenTelemetry already does this"

**Challenge:** Should we just use OTel OTLP format?

**Resolution:** OpenTelemetry is designed for distributed systems: network spans, traces across services, OTLP wire protocol. Our domain is entirely different — React component render behavior in a single browser session, dev-only, zero network I/O. OTel adds ~50KB to a bundle, requires backend infrastructure, and models the wrong domain. We take inspiration from OTel's event envelope (id, type, timestamp, schemaVersion) but build a React-render-specific model that's self-contained.

### Assumption 4: "render-playground's PlaygroundStore is already the right abstraction"

**Challenge:** Can't we just enhance PlaygroundStore?

**Resolution:** `PlaygroundStore` has five methods (subscribe, getSnapshot, getServerSnapshot, push, clear) and stores `InsightReport[]` — a flat array of reports with no session boundaries, no event types, no correlation IDs, no query API, and no serialization. Enhancing it would mean either breaking the public API (a semver-major change) or accumulating workarounds. `TelemetryBuffer` is a clean design that `PlaygroundStore` can migrate toward in a non-breaking future upgrade.

### Assumption 5: "The package name should reflect what it does, not where it sits"

**Challenge:** Is `render-telemetry-core` the right name?

**Resolution:** Yes. `render-` scopes it to the ecosystem. `telemetry` signals observability infrastructure (not a user-facing feature). `core` signals foundational (not a utility or a plugin). Alternatives considered: `render-event-bus` (too narrow — it's also a buffer, transport, session), `render-infra` (too vague), `render-sdk-core` (implies user-facing SDK). `render-telemetry-core` is precise.

### Assumption 6: "This should have a React hook for use in components"

**Challenge:** Adding a `useTelemetry` hook would make it more convenient.

**Resolution:** No. This package is pure TypeScript with no React peer dependency. This is critical for:
- Node.js usage (CI reporters, test utilities)
- Keeping the package independent of React's release cycle
- Avoiding the hook calling-order constraints in consumer packages

React-specific integration hooks (`useTelemetrySession`, etc.) belong in `render-playground` or a dedicated `render-telemetry-react` package (future).

---

## Product Positioning

| Product | Similarity | Difference | Our unique angle |
|---|---|---|---|
| **OpenTelemetry** | Typed events, schema versioning, transport abstraction | Distributed systems, OTLP wire format, 50KB runtime, backend infra | React-render-specific domain, dev-only, zero network, ~4KB |
| **Redux DevTools** | Time-travel, state snapshots, action stream | State-machine-centric, tied to Redux, browser extension | Render-performance-centric, framework-agnostic transport |
| **Replay.io** | Session recording, causality reconstruction | Captures entire browser at browser-engine level | Structured semantic events (why rendered, not what happened in DOM) |
| **Datadog RUM** | Events with resource attribution, sessions | Production monitoring, network overhead, paid service | Dev-only, zero network, zero cost, open source |
| **Sentry Performance** | Event envelopes, transactions | Error-first model, requires Sentry account | Performance-first model, no account, self-contained |
| **React DevTools Profiler** | Component render trees with timing | No semantic context (why rendered), no export, browser-only | Rich semantic context (trigger, props, score, recommendations), exportable |

**Unique value proposition:** The only React-specific, zero-dependency telemetry protocol that models render performance semantics (not just timing) with full replay compatibility, session boundaries, and no network I/O.

---

## User Personas

### 1. React Library Author (primary consumer of this package)

**Goals:** Build tools on top of React Render Kit without reinventing the event bus. Publish a `render-devtools-panel` or CI reporter that can consume telemetry data from any user's app.

**Frustrations:** Each package in the ecosystem has its own data model. Connecting `render-insights` output to a custom DevTools panel requires understanding every type in every package.

**Success criteria:** Import `TelemetryBuffer` and `TelemetryEvent`, register a transport, receive structured events. Zero learning curve for the event model — it's self-documenting.

### 2. Senior Frontend Engineer (indirect consumer, via render-playground)

**Goals:** Debug re-render issues in large production codebases. Needs session export to share with teammates.

**Frustrations:** `render-playground` shows live data but clears on refresh. Cannot export session data for async review.

**Success criteria:** After `render-playground` migrates to `TelemetryBuffer`, `serializeBuffer()` output can be saved and replayed. Zero additional API to learn.

### 3. Performance Engineer (indirect consumer, via CI integration)

**Goals:** Prevent render performance regressions from shipping to production. Needs render session data in CI output.

**Frustrations:** `render-insights` diagnostics only show in browser DevTools console — invisible in CI.

**Success criteria:** `render-ci-reporter` (future) consumes `TelemetryBuffer` serialized output and fails CI builds on score degradation. This package defines the contract `render-ci-reporter` builds on.

### 4. Tooling Developer (direct consumer)

**Goals:** Build `render-replay-engine` — a time-travel debugger for React renders. Needs serializable, timestamped events with session boundaries and causality chains.

**Frustrations:** No existing package in the ecosystem provides this. Would have to fork `render-playground`'s store and redesign it.

**Success criteria:** Import `TelemetryBuffer`, `serializeBuffer`, `deserializeBuffer`. Session boundaries + `sequenceNumber` enable deterministic replay without guessing event order.

### 5. Tech Lead (indirect consumer)

**Goals:** Establish a single observability standard for the frontend team. Wants third-party tooling to integrate cleanly.

**Frustrations:** Every React performance tool has its own data model. No common protocol means every tool is an island.

**Success criteria:** `render-telemetry-core` becomes the protocol that all tools in the React Render Kit ecosystem speak. One mental model for all current and future packages.

---

## User Stories

1. As a **library author**, I want to register a transport so that my custom DevTools panel receives all render events from instrumented components.
2. As a **tooling developer**, I want to serialize a `TelemetryBuffer` to JSON so that I can persist a recording to a file and replay it later.
3. As a **tooling developer**, I want events to carry a `sessionId` and `sequenceNumber` so that I can reconstruct event causality without ambiguity.
4. As a **performance engineer**, I want `TelemetrySession` to carry `startWallTimestamp` and `endWallTimestamp` so that I can correlate render sessions with calendar time in CI logs.
5. As a **senior frontend engineer**, I want `ScoreEvent` to carry all penalty components AND memo effectiveness so that I can reproduce the full health picture without re-implementing any formula.
6. As a **library author**, I want event types to carry a `schemaVersion` so that my consumer code can handle schema evolution gracefully.
7. As a **React library author**, I want `TelemetryBuffer` to implement `useSyncExternalStore`'s interface so that React consumers don't need any adapter layer.
8. As a **tech lead**, I want zero runtime dependencies so that `render-telemetry-core` doesn't add to my bundle size.
9. As a **tooling developer**, I want `PropChangeEvent` to carry `signalKind` so that I can determine per-render memo effectiveness without cross-referencing other events.
10. As a **performance engineer**, I want `deserializeBuffer` to never throw on any input so that a corrupt export file cannot crash my CI pipeline.

---

## Domain Model

### Core Entities

```
TelemetrySession
  ├── id: string (UUID)
  ├── componentName: string
  ├── startTimestamp: number (performance.now relative — high precision)
  ├── startWallTimestamp: number (Date.now absolute — calendar time)
  ├── endTimestamp: number | null
  ├── endWallTimestamp: number | null
  ├── status: 'active' | 'ended'
  └── sequenceCounter: number (monotonic, incremented on each event factory call)

TelemetryEvent (base)
  ├── id: string (UUID)
  ├── type: TelemetryEventType (discriminant)
  ├── schemaVersion: SchemaVersion ('1.0.0')
  ├── sessionId: string → TelemetrySession.id
  ├── componentName: string
  ├── sequenceNumber: number (= session.sequenceCounter before increment)
  ├── timestamp: number (performance.now — relative, high precision)
  └── wallTimestamp: number (Date.now — absolute, calendar time)

TelemetryBuffer
  ├── events: readonly TelemetryEvent[] (FIFO, max bounded, module-level SERVER_SNAPSHOT)
  ├── sessions: Readonly<Record<string, TelemetrySession>>
  ├── subscribe/getSnapshot/getServerSnapshot (useSyncExternalStore interface)
  ├── push(event) / pushSession(session) / updateSession(session) / clear()
  └── getEventsBySession / getEventsByComponent / getEventsByType / getSession / getSessionsByComponent

TelemetryTransport
  ├── name: string
  ├── emit(events: ReadonlyArray<TelemetryEvent>): void
  ├── flush?(): void  (for future network transports — flush before page unload)
  └── dispose?(): void
```

### Event Variants

| Event Type | Purpose | Key Payload Fields |
|---|---|---|
| `session-start` | Component mounted, session opened | — |
| `render` | Component rendered (every render) | renderNumber, triggeredBy |
| `prop-change` | Props changed in this render | renderNumber, changed[], unstable[], inferredTrigger, **signalKind** |
| `frequency` | Frequency window computed | renderNumber, windowMs, windowCount, rate, classification, totalRenders |
| `score` | Health score + memo effectiveness | renderNumber, score, grade, penalties, **memoClassification**, **signalKind** |
| `recommendation` | Recommendations generated | renderNumber, recommendations[] |
| `session-end` | Component unmounted, session closed | totalRenders, durationMs, finalScore |

### Event Type Taxonomy

```
TelemetryEvent (discriminated union)
  ├── SessionStartEvent   (type: 'session-start')
  ├── RenderEvent         (type: 'render')
  ├── PropChangeEvent     (type: 'prop-change')  ← includes signalKind
  ├── FrequencyEvent      (type: 'frequency')
  ├── ScoreEvent          (type: 'score')         ← includes memoClassification + signalKind
  ├── RecommendationEvent (type: 'recommendation')
  └── SessionEndEvent     (type: 'session-end')
```

---

## Adoption Brief

### Adopted

- **tsup** — build tooling (mirrors existing packages exactly)
- **vitest** — test runner (mirrors existing packages)
- **TypeScript strict + exactOptionalPropertyTypes** — mandatory project-wide
- **Arrow functions only, `type` only** — mandatory project conventions
- **kebab-case file names** — mandatory project conventions
- `useSyncExternalStore` interface pattern — taken from `render-playground`'s `PlaygroundStore` (no import of React)

### NOT Adopted

- **React peer dependency** — this package is pure TypeScript; React binding is the consumer's responsibility. Rationale: CI reporters and Node.js tools must not pay React's overhead.
- **Dependencies on any `@sapanmozammel/*` package** — to prevent circular deps as the ecosystem matures. Types that mirror `render-insights` types are intentionally duplicated (telemetry domain owns its own type definitions).
- **`zod` / `ajv` for schema validation** — zero-dependency goal; runtime type guards are hand-written.
- **`uuid` package** — `crypto.randomUUID()` with a `Math.random()` fallback is sufficient.
- **`LocalStorage` as the default transport** — the default is `MemoryTransport`; LocalStorage is opt-in. Rationale: localStorage has privacy implications and is not available in all environments.
- **Console output** — this package produces no console output whatsoever. That stays in each package's `logger/` module. Exception: `deserializeBuffer` may emit a single `console.warn` in dev when encountering an unknown schema version.
- **`NODE_ENV` guards in library code** — this package deliberately has NO `process.env.NODE_ENV` guard. Consumers (render-insights, render-playground) decide when to create sessions. This is intentional: CI reporters run in `NODE_ENV=test`, VS Code extensions run in production — all are valid consumers. **Document prominently in README.**

---

## Architecture Strategy

### A. Data Structures

**TelemetryBuffer** uses an append-only array with a sliding window:
- Internal `events` array is replaced (not mutated) on each `push` to maintain referential equality guarantees for `useSyncExternalStore`
- `snapshot` is a cached `TelemetryBufferSnapshot` object; replaced only on mutations — `getSnapshot()` is O(1)
- `sessions` is a `Readonly<Record<string, TelemetrySession>>` within the snapshot — replaced on `pushSession`/`updateSession`
- Max events enforced by `slice(-maxEvents)` on push (same pattern as `createPlaygroundStore`)
- Server snapshot is a stable module-level constant (same pattern as `PlaygroundStore`)

**TelemetrySession** is immutable after construction; `endTelemetrySession` returns a new object.

**Event objects** are plain, JSON-serializable objects (no functions, no Symbols, no class instances). `TelemetryPropChangeEntry` carries `prev`/`next` values which may be `unknown` — consumers must not rely on round-trip fidelity of non-JSON-serializable prop values.

### B. Event Creation — Immutable Update Pattern

Every event factory follows this exact pattern:

```
factory(session: TelemetrySession, data?: T) → { event: E; session: TelemetrySession }
```

Internally, each factory:
1. Calls `createEventBase(session, type)` which returns `{ base: TelemetryEventBase & { type: T }; session: updatedSession }`
2. `updatedSession` has `sequenceCounter = session.sequenceCounter + 1` (input session is not mutated)
3. `base.sequenceNumber = session.sequenceCounter + 1` (i.e., the new value)
4. Spreads `base` plus event-specific fields into the returned `event`
5. Returns `{ event, session: updatedSession }`

The caller receives both the new event and the updated session. The input session is never mutated.

### C. Transport Layer

Transports are registered globally via `registerTransport(transport: TelemetryTransport): () => void` which returns an unregister function. The global registry is a module-level `Set<TelemetryTransport>`.

`emitEvents(events: ReadonlyArray<TelemetryEvent>): void` iterates the registry and calls `transport.emit(events)` for each. Errors in transport emit are caught and silently discarded per-transport (telemetry must never crash the app).

**Important:** The global registry is intentional. Multiple buffers in an app feed the same set of transports. Transports receive all events from all components and filter by `componentName` or `sessionId` if needed.

### D. TypeScript Types

All types are in `src/types/index.ts`. No types are defined in implementation files. No `interface` keywords anywhere. Types mirror but do not import from `@sapanmozammel/render-insights` — duplication is intentional to preserve independence.

The `TelemetryEventType` discriminant is a string literal union (not an enum) for tree-shaking.

### E. Testing

- Environment: `node` (not `jsdom`) — this is pure TypeScript with no DOM dependency except LocalStorage transport tests which mock `globalThis.localStorage`
- Tests live in `tests/` outside `src/`, never in `__tests__/` next to source
- All factory functions: verify field values, verify sequenceNumber increment, verify new session returned
- `TelemetryBuffer`: verify push/clear/snapshot referential equality, verify max eviction, verify query methods, verify useSyncExternalStore contract
- Transports: Memory (emit called with correct events), LocalStorage (mocked, write/read), Custom (callback invoked)
- Serialization: round-trip test (serialize → deserialize → deep equal original) for all 7 event types
- Schema validation: `validateEvent` accepts valid events, rejects missing fields, rejects wrong types

---

## Package API

**All public exports from `src/index.ts`:**

### Types

```ts
// Event types
export type { TelemetryEventType }
export type { TelemetryEventBase }
export type { SessionStartEvent }
export type { RenderEvent }
export type { PropChangeEvent }
export type { FrequencyEvent }
export type { ScoreEvent }
export type { RecommendationEvent }
export type { SessionEndEvent }
export type { TelemetryEvent }

// Session
export type { SessionStatus }
export type { TelemetrySession }

// Buffer
export type { TelemetryBufferSnapshot }
export type { TelemetryBuffer }
export type { TelemetryBufferOptions }

// Transport
export type { TelemetryTransport }
export type { TransportEmitFn }
export type { MemoryTransport }           // TelemetryTransport & { getEmitted; clearEmitted }

// Domain value types (self-contained, not imported from render-insights)
export type { TelemetryPropChangeKind }
export type { TelemetryPropRefType }
export type { TelemetryPropChangeEntry }
export type { TelemetryPropInstability }
export type { TelemetryInferredTrigger }
export type { TelemetryRenderTrigger }
export type { TelemetryFrequencyClass }
export type { TelemetryHealthGrade }
export type { TelemetryMemoClassification }
export type { TelemetrySignalKind }
export type { SchemaVersion }

// Event factory input types
export type { RenderEventData }
export type { PropChangeEventData }
export type { FrequencyEventData }
export type { ScoreEventData }
export type { RecommendationEventData }
export type { SessionEndEventData }
export type { LocalStorageTransportOptions }
```

### Constants

```ts
export { CURRENT_SCHEMA_VERSION }   // '1.0.0'
export { EVENT_SCHEMA_VERSIONS }    // Record<TelemetryEventType, SchemaVersion>
```

### Session Management

```ts
export { createTelemetrySession }   // (componentName: string) => TelemetrySession
export { endTelemetrySession }      // (session: TelemetrySession) => TelemetrySession
```

### Event Factories

Each factory returns `{ event: T; session: TelemetrySession }` — immutable update pattern.

```ts
export { createSessionStartEvent }     // (session: TelemetrySession) => { event: SessionStartEvent; session: TelemetrySession }
export { createRenderEvent }           // (session: TelemetrySession, data: RenderEventData) => { event: RenderEvent; session: TelemetrySession }
export { createPropChangeEvent }       // (session: TelemetrySession, data: PropChangeEventData) => { event: PropChangeEvent; session: TelemetrySession }
export { createFrequencyEvent }        // (session: TelemetrySession, data: FrequencyEventData) => { event: FrequencyEvent; session: TelemetrySession }
export { createScoreEvent }            // (session: TelemetrySession, data: ScoreEventData) => { event: ScoreEvent; session: TelemetrySession }
export { createRecommendationEvent }   // (session: TelemetrySession, data: RecommendationEventData) => { event: RecommendationEvent; session: TelemetrySession }
export { createSessionEndEvent }       // (session: TelemetrySession, data: SessionEndEventData) => { event: SessionEndEvent; session: TelemetrySession }
```

### Buffer

```ts
export { createTelemetryBuffer }    // (options?: TelemetryBufferOptions) => TelemetryBuffer
```

### Transport Registry

```ts
export { registerTransport }        // (transport: TelemetryTransport) => () => void  (returns unregister fn)
export { unregisterAllTransports }  // () => void  (for testing / teardown)
export { emitEvents }               // (events: ReadonlyArray<TelemetryEvent>) => void
```

### Transport Factories

```ts
export { createMemoryTransport }         // () => MemoryTransport
export { createLocalStorageTransport }   // (storageKey: string, options?: LocalStorageTransportOptions) => TelemetryTransport
export { createCustomTransport }         // (name: string, emit: TransportEmitFn) => TelemetryTransport
```

### Serialization

```ts
export { serializeSession }     // (session: TelemetrySession) => string
export { deserializeSession }   // (json: string) => TelemetrySession | null
export { serializeBuffer }      // (buffer: TelemetryBuffer) => string
export { deserializeBuffer }    // (json: string, options?: TelemetryBufferOptions) => TelemetryBuffer
```

### Validation

```ts
export { validateEvent }        // (value: unknown) => value is TelemetryEvent
export { isKnownEventType }     // (type: unknown) => type is TelemetryEventType
```

---

## Data & Types

Complete TypeScript definitions for `src/types/index.ts`. This is the authoritative specification — write these verbatim.

```ts
// ── Schema Versioning ────────────────────────────────────────────────────────

type SchemaVersion = `${number}.${number}.${number}`;

// ── Event Types ──────────────────────────────────────────────────────────────

type TelemetryEventType =
  | 'session-start'
  | 'render'
  | 'prop-change'
  | 'frequency'
  | 'score'
  | 'recommendation'
  | 'session-end';

// ── Domain Value Types ────────────────────────────────────────────────────────
// Self-contained — intentionally NOT imported from @sapanmozammel/render-insights
// to prevent circular dependencies as the ecosystem matures.

type TelemetryPropChangeKind = 'value-changed' | 'reference-changed' | 'added' | 'removed';
type TelemetryPropRefType = 'function' | 'array' | 'object';

// Maps from render-insights InferredTrigger:
//   'no-prop-change'         → 'parent'   (parent re-render, no prop changes)
//   'genuine-prop-change'    → 'props'
//   'reference-instability'  → 'props'
//   'mixed'                  → 'props'
// 'state' and 'context' are reserved for future use by other consumers.
type TelemetryRenderTrigger = 'props' | 'state' | 'context' | 'parent' | 'unknown';

type TelemetryInferredTrigger = 'no-prop-change' | 'genuine-prop-change' | 'reference-instability' | 'mixed';
type TelemetryFrequencyClass = 'LOW' | 'MODERATE' | 'HIGH' | 'NOT_ENOUGH_DATA';
type TelemetryHealthGrade = 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL';
type TelemetryMemoClassification = 'NOT_APPLICABLE' | 'EFFECTIVE' | 'INEFFECTIVE' | 'PARTIALLY_EFFECTIVE';
type TelemetrySignalKind = 'genuine' | 'reference-only' | 'mixed';

type TelemetryPropChangeEntry =
  | { kind: 'value-changed'; key: string; prev: unknown; next: unknown }
  | { kind: 'reference-changed'; key: string; refType: TelemetryPropRefType }
  | { kind: 'added'; key: string; next: unknown }
  | { kind: 'removed'; key: string; prev: unknown };

type TelemetryPropInstability = {
  name: string;
  type: TelemetryPropRefType;
};

// ── Base Event ────────────────────────────────────────────────────────────────

type TelemetryEventBase = {
  readonly id: string;
  readonly type: TelemetryEventType;
  readonly schemaVersion: SchemaVersion;
  readonly sessionId: string;
  readonly componentName: string;
  readonly sequenceNumber: number;   // monotonic within a session
  readonly timestamp: number;        // performance.now() — high precision, relative to navigation start
  readonly wallTimestamp: number;    // Date.now() — absolute calendar time (ms since epoch)
};

// ── Event Variants ────────────────────────────────────────────────────────────

type SessionStartEvent = TelemetryEventBase & {
  readonly type: 'session-start';
};

type RenderEvent = TelemetryEventBase & {
  readonly type: 'render';
  readonly renderNumber: number;
  readonly triggeredBy: TelemetryRenderTrigger;
};

type PropChangeEvent = TelemetryEventBase & {
  readonly type: 'prop-change';
  readonly renderNumber: number;
  readonly changed: readonly TelemetryPropChangeEntry[];
  readonly unstable: readonly TelemetryPropInstability[];
  readonly inferredTrigger: TelemetryInferredTrigger;
  readonly signalKind: TelemetrySignalKind;  // per-render memo effectiveness signal
};

type FrequencyEvent = TelemetryEventBase & {
  readonly type: 'frequency';
  readonly renderNumber: number;
  readonly windowMs: number;
  readonly windowCount: number;
  readonly rate: number;
  readonly classification: TelemetryFrequencyClass;
  readonly totalRenders: number;
};

type ScoreEvent = TelemetryEventBase & {
  readonly type: 'score';
  readonly renderNumber: number;
  readonly score: number;
  readonly grade: TelemetryHealthGrade;
  readonly frequencyPenalty: number;
  readonly instabilityPenalty: number;
  readonly memoPenalty: number;
  readonly mixedSignalPenalty: number;
  readonly memoClassification: TelemetryMemoClassification;  // session-level memo effectiveness
  readonly signalKind: TelemetrySignalKind | null;           // this render's signal (null = no prop change)
};

type RecommendationEvent = TelemetryEventBase & {
  readonly type: 'recommendation';
  readonly renderNumber: number;
  readonly recommendations: readonly string[];
};

type SessionEndEvent = TelemetryEventBase & {
  readonly type: 'session-end';
  readonly totalRenders: number;
  readonly durationMs: number;
  readonly finalScore: number | null;
};

type TelemetryEvent =
  | SessionStartEvent
  | RenderEvent
  | PropChangeEvent
  | FrequencyEvent
  | ScoreEvent
  | RecommendationEvent
  | SessionEndEvent;

// ── Session ───────────────────────────────────────────────────────────────────

type SessionStatus = 'active' | 'ended';

type TelemetrySession = {
  readonly id: string;
  readonly componentName: string;
  readonly startTimestamp: number;       // performance.now() at mount
  readonly startWallTimestamp: number;   // Date.now() at mount
  readonly endTimestamp: number | null;  // performance.now() at unmount (null if still active)
  readonly endWallTimestamp: number | null;
  readonly status: SessionStatus;
  readonly sequenceCounter: number;      // incremented by each event factory; readonly externally
};

// ── Buffer ────────────────────────────────────────────────────────────────────

type TelemetryBufferOptions = {
  maxEvents?: number;  // default: 1000; clamped to min 1
};

type TelemetryBufferSnapshot = {
  readonly events: readonly TelemetryEvent[];
  readonly sessions: Readonly<Record<string, TelemetrySession>>;
};

type TelemetryBuffer = {
  // useSyncExternalStore interface (React-compatible without importing React)
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => TelemetryBufferSnapshot;
  getServerSnapshot: () => TelemetryBufferSnapshot;  // always returns SERVER_SNAPSHOT

  // Mutations — each replaces snapshot and notifies all listeners
  push: (event: TelemetryEvent) => void;
  pushSession: (session: TelemetrySession) => void;
  updateSession: (session: TelemetrySession) => void;  // upsert by session.id
  clear: () => void;                                    // resets to SERVER_SNAPSHOT

  // Queries — O(n) on current snapshot; safe to call inside useSyncExternalStore
  getEventsBySession: (sessionId: string) => readonly TelemetryEvent[];
  getEventsByComponent: (componentName: string) => readonly TelemetryEvent[];
  getEventsByType: <T extends TelemetryEventType>(type: T) => readonly Extract<TelemetryEvent, { type: T }>[];
  getSession: (sessionId: string) => TelemetrySession | undefined;
  getSessionsByComponent: (componentName: string) => readonly TelemetrySession[];
};

// ── Transport ─────────────────────────────────────────────────────────────────

type TransportEmitFn = (events: ReadonlyArray<TelemetryEvent>) => void;

type TelemetryTransport = {
  name: string;
  emit: TransportEmitFn;
  flush?: () => void;     // called before page unload; for network transports (future)
  dispose?: () => void;   // cleanup on teardown
};

// MemoryTransport is a TelemetryTransport with extra inspection methods
type MemoryTransport = TelemetryTransport & {
  getEmitted: () => readonly TelemetryEvent[];
  clearEmitted: () => void;
};

// ── Event Factory Input Types ─────────────────────────────────────────────────

type RenderEventData = {
  renderNumber: number;
  triggeredBy?: TelemetryRenderTrigger;  // defaults to 'unknown' if omitted
};

type PropChangeEventData = {
  renderNumber: number;
  changed: readonly TelemetryPropChangeEntry[];
  unstable: readonly TelemetryPropInstability[];
  inferredTrigger: TelemetryInferredTrigger;
  signalKind: TelemetrySignalKind;
};

type FrequencyEventData = {
  renderNumber: number;
  windowMs: number;
  windowCount: number;
  rate: number;
  classification: TelemetryFrequencyClass;
  totalRenders: number;
};

type ScoreEventData = {
  renderNumber: number;
  score: number;
  grade: TelemetryHealthGrade;
  frequencyPenalty: number;
  instabilityPenalty: number;
  memoPenalty: number;
  mixedSignalPenalty: number;
  memoClassification: TelemetryMemoClassification;
  signalKind: TelemetrySignalKind | null;
};

type RecommendationEventData = {
  renderNumber: number;
  recommendations: readonly string[];
};

type SessionEndEventData = {
  totalRenders: number;
  finalScore?: number | null;  // defaults to null if omitted
};

// ── Transport Options ─────────────────────────────────────────────────────────

type LocalStorageTransportOptions = {
  maxBytes?: number;                        // default: 2_000_000 (2MB)
  onExceed?: 'prune' | 'clear' | 'skip';   // default: 'prune' (remove oldest events first)
};
```

---

## Data Flow

### Event Lifecycle — ASCII Diagram

```
Consumer (e.g. render-playground, render-insights, custom hook)
    │
    ▼
createTelemetrySession('UserCard')
    → TelemetrySession { id: 'abc-123', status: 'active', sequenceCounter: 0 }
    │
    ├── createSessionStartEvent(session)
    │       → { event: SessionStartEvent { sequenceNumber: 1, ... },
    │             session: { sequenceCounter: 1 } }
    │
    ├── buffer.push(event)          ← stored in TelemetryBuffer
    ├── buffer.pushSession(session) ← session registered
    └── emitEvents([event])         ← dispatched to all registered transports

    [on each render]
    ├── createRenderEvent(session, { renderNumber: 2, triggeredBy: 'props' })
    │       → { event: RenderEvent { sequenceNumber: 2 }, session: { ...counter: 2 } }
    ├── buffer.push(event); buffer.updateSession(session); emitEvents([event])
    │
    [on prop change — emit 4 events as a single batch]
    ├── createPropChangeEvent(session, data)   → seq 3
    ├── createFrequencyEvent(session, data)    → seq 4
    ├── createScoreEvent(session, data)        → seq 5
    ├── createRecommendationEvent(session, data) → seq 6
    └── emitEvents([propChange, frequency, score, recommendation])
        (all 4 pushed to buffer and dispatched to transports atomically)

    [on unmount]
    ├── endTelemetrySession(session, finalScore)
    │       → TelemetrySession { status: 'ended', endTimestamp: ..., endWallTimestamp: ... }
    ├── createSessionEndEvent(endedSession, { totalRenders: 5, finalScore: 84 })
    │       → { event: SessionEndEvent { sequenceNumber: 7 }, ... }
    └── buffer.push(event); buffer.updateSession(endedSession); emitEvents([event])


TelemetryBuffer (useSyncExternalStore-compatible)
    ├── subscribe/getSnapshot/getServerSnapshot → used by React via useSyncExternalStore
    └── getEventsBySession / getEventsByType / getSession → used by replay engine / DevTools


Registered TelemetryTransports (global registry)
    ├── MemoryTransport.emit(events)
    │       → accumulates in getEmitted() array; used by tests and custom panels
    ├── LocalStorageTransport.emit(events)
    │       → serializes to localStorage[key]; survives page refresh
    └── CustomTransport.emit(events)
            → user-provided callback; connects to Storybook, CI, dashboards


React consumer (render-playground panel, after v2.0.0 migration):
    useSyncExternalStore(buffer.subscribe, buffer.getSnapshot, buffer.getServerSnapshot)
    → TelemetryBufferSnapshot { events: [...], sessions: { 'abc-123': TelemetrySession } }
    → component re-renders only when buffer mutates
```

### Key invariants of the flow

1. **Immutable update chain:** Each event factory call returns a new session with `sequenceCounter + 1`. The caller threads the updated session into the next factory call. Input sessions are never mutated.
2. **Batch emit:** Multiple events produced from a single render (prop-change + frequency + score + recommendation) are pushed to the buffer individually but dispatched to transports as a single `emitEvents([...])` call — transports receive them atomically.
3. **Transport isolation:** If one transport's `emit()` throws, the error is caught and discarded; the remaining transports still receive the events.
4. **No NODE_ENV guard in this package:** The consumer decides when to create sessions. The factories run unconditionally.

---

## Configuration

All user-configurable options, their types, defaults, and effects:

### `TelemetryBufferOptions`

| Option | Type | Default | Effect |
|---|---|---|---|
| `maxEvents` | `number` | `1000` | Maximum events retained in the buffer. Oldest events are evicted FIFO. Clamped to minimum 1. Values < 1 emit `console.warn` in dev and are clamped to 1. |

### `LocalStorageTransportOptions`

| Option | Type | Default | Effect |
|---|---|---|---|
| `maxBytes` | `number` | `2_000_000` | Maximum localStorage value size in bytes (2MB). Checked after serialization, before write. |
| `onExceed` | `'prune' \| 'clear' \| 'skip'` | `'prune'` | Strategy when serialized size exceeds `maxBytes`. `prune` removes oldest events until under budget. `clear` wipes the key and starts fresh. `skip` does not write the batch. |

### `RenderEventData`

| Field | Type | Default | Notes |
|---|---|---|---|
| `renderNumber` | `number` | required | Total renders since session start |
| `triggeredBy` | `TelemetryRenderTrigger` | `'unknown'` | Omit to use default. Map `InferredTrigger` values per the table in Data & Types. |

### `SessionEndEventData`

| Field | Type | Default | Notes |
|---|---|---|---|
| `totalRenders` | `number` | required | Total renders over the session lifetime |
| `finalScore` | `number \| null` | `null` | Last computed health score, or null if none was computed |

---

## Event Versioning Strategy

### Principles

1. Every event type has its own schema version tracked in `EVENT_SCHEMA_VERSIONS`
2. Schema versions follow semver: `MAJOR.MINOR.PATCH`
3. **Breaking changes** (remove required field, change field type, remove event type) → increment MAJOR for that event type
4. **Additive changes** (add optional field, add new event type) → increment MINOR
5. **Documentation/constraint fixes** → increment PATCH
6. `CURRENT_SCHEMA_VERSION` reflects the package epoch (increments with any event type change)

### Initial Constants (`src/constants/schema-versions.ts`)

```ts
const CURRENT_SCHEMA_VERSION: SchemaVersion = '1.0.0';

const EVENT_SCHEMA_VERSIONS: Record<TelemetryEventType, SchemaVersion> = {
  'session-start':   '1.0.0',
  'render':          '1.0.0',
  'prop-change':     '1.0.0',
  'frequency':       '1.0.0',
  'score':           '1.0.0',
  'recommendation':  '1.0.0',
  'session-end':     '1.0.0',
};
```

### Forward Compatibility Strategy

- `validateEvent(value: unknown): value is TelemetryEvent` performs structural validation using type guards — no external validator
- An event passes validation if all **required** fields are present and correctly typed
- Unknown additional fields are **preserved** (not stripped) — forward compatibility for consumers reading older events
- `deserializeBuffer` emits a single `console.warn` when `parsed.schemaVersion !== CURRENT_SCHEMA_VERSION` but still attempts to hydrate any events that pass `validateEvent`
- Future backward compatibility migration: `migrateEvent(rawEvent: unknown): TelemetryEvent | null` — not in v1.0.0 scope

---

## Telemetry Store Architecture

### TelemetryBuffer Internal Design

```
createTelemetryBuffer(options?)
  maxEvents = Math.max(1, options?.maxEvents ?? 1000)
  internal: let snapshot = SERVER_SNAPSHOT  (module-level constant)
  internal: listeners = new Set<() => void>()

  notify() → listeners.forEach(l => l())

  push(event)
    → snapshot = {
        events: [...snapshot.events, event].slice(-maxEvents),
        sessions: snapshot.sessions
      }
    → notify()

  pushSession(session)
    → snapshot = {
        events: snapshot.events,
        sessions: { ...snapshot.sessions, [session.id]: session }
      }
    → notify()

  updateSession(session)
    → same as pushSession (upsert by session.id)

  clear()
    → snapshot = SERVER_SNAPSHOT   ← same stable reference every time
    → notify()

  getSnapshot()  → snapshot   (O(1) — cached reference)
  getServerSnapshot()  → SERVER_SNAPSHOT   (O(1) — module-level constant)

  subscribe(listener)
    → listeners.add(listener)
    → returns () => listeners.delete(listener)

  Queries (O(n) on snapshot.events / Object.values(snapshot.sessions)):
    getEventsBySession(sessionId)    → snapshot.events.filter(e => e.sessionId === sessionId)
    getEventsByComponent(name)       → snapshot.events.filter(e => e.componentName === name)
    getEventsByType<T>(type)         → snapshot.events.filter(e => e.type === type) as Extract<...>[]
    getSession(sessionId)            → snapshot.sessions[sessionId]
    getSessionsByComponent(name)     → Object.values(snapshot.sessions).filter(s => s.componentName === name)
```

**`SERVER_SNAPSHOT`** is a module-level constant `{ events: [], sessions: {} }`. It is the same object reference on every `getServerSnapshot()` call and on every `clear()` call. This satisfies React's referential equality check for `useSyncExternalStore` with SSR.

**Snapshot referential equality rule:** `getSnapshot()` must return the same object reference if no mutations have occurred since the last call. This is guaranteed because `snapshot` is only replaced (never mutated in place) and `getSnapshot()` returns the current `snapshot` variable directly.

---

## Transport Architecture

### Module-Level Global Registry (`src/transport/registry.ts`)

```
const registry = new Set<TelemetryTransport>()   // module-level singleton

registerTransport(transport)
  → registry.add(transport)
  → returns () => registry.delete(transport)    (unregister function)

unregisterAllTransports()
  → registry.clear()
  (used in afterEach / afterAll in tests)

emitEvents(events: ReadonlyArray<TelemetryEvent>)
  → for each transport in registry:
       try { transport.emit(events) }
       catch (e) { /* silently discard; log dev warning */ }
  (errors are isolated per-transport; all transports run regardless)
```

### MemoryTransport (`src/transport/memory-transport.ts`)

```ts
createMemoryTransport(): MemoryTransport
```

Internal state: `let emitted: readonly TelemetryEvent[] = []`

- `emit(events)` → `emitted = [...emitted, ...events]` (new reference on each call)
- `getEmitted()` → returns current `emitted` (stable reference between emits)
- `clearEmitted()` → `emitted = []`
- `name = 'memory'`

### LocalStorageTransport (`src/transport/local-storage-transport.ts`)

```ts
createLocalStorageTransport(storageKey: string, options?: LocalStorageTransportOptions): TelemetryTransport
```

`emit(events)` implementation:

```
1. Guard: if (typeof localStorage === 'undefined') return;   // Node.js / SSR
2. existing = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
   (catch parse error → treat as empty array)
3. merged = [...existing, ...events]
4. serialized = JSON.stringify(merged)
5. if (serialized.length > maxBytes):
     onExceed === 'prune':
       while (serialized.length > maxBytes && merged.length > 0) { merged.shift(); serialized = JSON.stringify(merged) }
       if (merged.length === 0) return;  // nothing fits
     onExceed === 'clear':
       merged = [...events]
       serialized = JSON.stringify(merged)
     onExceed === 'skip':
       return;
6. localStorage.setItem(storageKey, serialized)
   (catch quota exceeded error → silently discard)
```

`dispose()` — does NOT clear storage (caller's responsibility).

### CustomTransport (`src/transport/custom-transport.ts`)

```ts
createCustomTransport(name: string, emit: TransportEmitFn): TelemetryTransport
```

Returns `{ name, emit }`. No buffering, no error handling — the consumer owns that. The transport registry's `emitEvents` wraps each transport's `emit` in try/catch regardless.

### Future Network Transport (NOT in v1.0.0)

The `flush?()` method on `TelemetryTransport` is reserved for a future `createNetworkTransport` that batches events and flushes before page unload (`addEventListener('visibilitychange', ...)`).

---

## Recording Architecture

### Session Lifecycle (Canonical Usage Pattern)

```ts
// Step 1: Component mounts
let session = createTelemetrySession('UserCard');
const { event: startEv, session: s1 } = createSessionStartEvent(session);
session = s1;
buffer.push(startEv);
buffer.pushSession(session);
emitEvents([startEv]);

// Step 2: Component renders (every render)
const { event: renderEv, session: s2 } = createRenderEvent(session, {
  renderNumber: 1,
  triggeredBy: 'props',   // map from InferredTrigger: 'genuine-prop-change' → 'props'
});
session = s2;
buffer.push(renderEv);
buffer.updateSession(session);
emitEvents([renderEv]);

// Step 3: Prop change detected — batch all 4 events, emit together
const { event: propEv,   session: s3 } = createPropChangeEvent(session, { ... });
const { event: freqEv,   session: s4 } = createFrequencyEvent(s3, { ... });
const { event: scoreEv,  session: s5 } = createScoreEvent(s4, { ... });
const { event: recEv,    session: s6 } = createRecommendationEvent(s5, { ... });
session = s6;
[propEv, freqEv, scoreEv, recEv].forEach(e => buffer.push(e));
buffer.updateSession(session);
emitEvents([propEv, freqEv, scoreEv, recEv]);  // single batch dispatch

// Step 4: Component unmounts
const endedSession = endTelemetrySession(session);
const { event: endEv } = createSessionEndEvent(endedSession, {
  totalRenders: session.sequenceCounter,
  finalScore: 84,
});
buffer.push(endEv);
buffer.updateSession(endedSession);
emitEvents([endEv]);
```

### Memory Limits

- **Default maxEvents:** 1000 events per buffer
- **Estimated event size:** ~700 bytes avg (base fields + payload) = ~700KB for 1000 events
- **Hard cap recommendation:** Do not exceed `maxEvents: 5000` (~3.5MB)
- Events are evicted oldest-first when `maxEvents` is reached (FIFO via `slice(-maxEvents)`)
- Sessions are **never evicted** — retained for the buffer's lifetime. Session count is bounded by component mount count (typically < 100 per page, ~200 bytes each = ~20KB max)

### Retention Policy

- Events: FIFO eviction at `maxEvents` boundary
- Sessions: retained for the buffer lifetime (negligible cost)
- `clear()` wipes both events and sessions (resets to `SERVER_SNAPSHOT`)

---

## Replay Compatibility Design

### Replay Requirements Met by v1.0.0

| Requirement | How Met |
|---|---|
| Deterministic event ordering | `sequenceNumber` (monotonic within session) + `timestamp` (tie-breaker across sessions) |
| Session boundaries | `session-start` and `session-end` events mark mount/unmount |
| Calendar time correlation | `wallTimestamp` on every event + `startWallTimestamp` on session |
| Event filtering | `getEventsByType(type)` for filtering `prop-change` or `score` events |
| Causality reconstruction | `sequenceNumber` + `sessionId` links events to specific component instances |
| JSON serialization | `serializeBuffer` / `deserializeBuffer` — full round-trip fidelity |
| Replay stepping | Events ordered by `sequenceNumber`; replay engine steps through them |
| Recommendation replay | `RecommendationEvent` carries final `recommendations[]` — no re-computation needed |
| Memo effectiveness replay | `ScoreEvent.memoClassification` + `PropChangeEvent.signalKind` — per-render and session-level data preserved |

### Serialized Format (Wire Contract)

`serializeBuffer(buffer)` produces exactly this shape:

```json
{
  "schemaVersion": "1.0.0",
  "exportedAt": 1749587600000,
  "events": [
    {
      "id": "abc-123",
      "type": "session-start",
      "schemaVersion": "1.0.0",
      "sessionId": "sess-abc",
      "componentName": "UserCard",
      "sequenceNumber": 1,
      "timestamp": 12345.67,
      "wallTimestamp": 1749587600000
    },
    ...
  ],
  "sessions": {
    "sess-abc": {
      "id": "sess-abc",
      "componentName": "UserCard",
      "startTimestamp": 12340.0,
      "startWallTimestamp": 1749587595000,
      "endTimestamp": null,
      "endWallTimestamp": null,
      "status": "active",
      "sequenceCounter": 7
    }
  }
}
```

`deserializeBuffer(json, options?)`:
1. Parse JSON — on failure: return empty buffer, emit dev `console.warn`
2. Validate top-level shape (`schemaVersion`, `events` array, `sessions` object)
3. If `parsed.schemaVersion !== CURRENT_SCHEMA_VERSION`: emit dev `console.warn`, continue
4. Filter `events` through `validateEvent` — invalid events are skipped
5. Filter `sessions` through `isValidSession` — invalid session objects are skipped
6. Create new buffer with `options`, push valid events and sessions
7. Return buffer (never throw)

---

## Performance Requirements

| Metric | Target | How to Verify |
|---|---|---|
| `createTelemetrySession()` | < 0.05ms | `performance.now()` before/after in test |
| Any event factory | < 0.05ms | `performance.now()` before/after in test |
| `buffer.push(event)` (maxEvents=1000) | < 0.1ms | Manual timing in test |
| `buffer.getSnapshot()` | O(1), < 0.01ms | Returns cached reference, no computation |
| `buffer.getEventsBySession()` (n=1000) | < 1ms | `Array.filter` over 1000 events |
| `serializeBuffer(buffer)` (n=1000 events) | < 10ms | `JSON.stringify` on flat array |
| `deserializeBuffer(json)` (n=1000 events) | < 20ms | `JSON.parse` + validation loop |
| Memory (1000 events, avg payload) | < 1MB | Manual heap size estimate |
| `emitEvents([1 event])` with 3 transports | < 0.3ms | `performance.now()` before/after |
| Transport emit error → recovery | 0ms added | Error caught per-transport synchronously |

No allocations in `getSnapshot()` hot path — returns a pre-computed cached reference.

---

## Security Considerations

1. **Prop value leakage:** `PropChangeEvent.changed[].prev` and `.next` can contain any value including passwords, tokens, PII. LocalStorage transport stores these in plaintext. README must prominently warn: _"LocalStorage transport persists all prop values to browser storage in plaintext. Do not use in production. Do not instrument components that receive sensitive props (passwords, tokens, PII)."_

2. **`deserializeBuffer` injection:** `validateEvent` is called on every parsed event — invalid events are skipped. `isValidSession` is called on every parsed session — invalid sessions are skipped. No `eval()`, no `Function()`, no dynamic imports.

3. **Transport error isolation:** Each transport's `emit()` is wrapped in try/catch. A faulty custom transport cannot crash the instrumented app.

4. **No network I/O in v1.0.0:** `createNetworkTransport` is not implemented. The `TelemetryTransport` interface is designed for future network transports but v1.0.0 ships no network code.

5. **`localStorage` key namespacing:** `storageKey` is user-specified. README must document: use app-specific prefixes (e.g. `'myapp:render-telemetry'`) to avoid collisions with other storage users.

6. **`prev`/`next` prop values are not sanitized:** They are stored verbatim. Non-JSON-serializable values (functions, circular refs) will produce `null` after a JSON round-trip. This is documented — telemetry round-trips may lose non-serializable prop values.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| `createTelemetryBuffer({ maxEvents: 0 })` | Clamp to 1; emit `console.warn` in dev |
| `createTelemetryBuffer({ maxEvents: -5 })` | Clamp to 1; emit `console.warn` in dev |
| `buffer.push(event)` | Accept all events (no validation — consumers use `validateEvent` explicitly) |
| Transport `emit()` throws | Caught per-transport; remaining transports still called; dev `console.warn` |
| `deserializeSession(invalidJson)` | Return `null`; never throw |
| `deserializeSession(validJsonBadShape)` | Return `null`; never throw |
| `deserializeBuffer(invalidJson)` | Return empty buffer; never throw; dev `console.warn` |
| `deserializeBuffer` — event fails `validateEvent` | Skip that event; continue with rest |
| `deserializeBuffer` — session fails `isValidSession` | Skip that session; continue with rest |
| `createLocalStorageTransport` in Node.js | Guard: `typeof localStorage === 'undefined'` → no-op silently |
| `localStorage.setItem` throws quota error | Caught silently; nothing written |
| `localStorage.getItem` returns invalid JSON | Treat as empty array; continue |
| `endTelemetrySession` on already-ended session | Return session unchanged; emit dev `console.warn` |
| Event factory receives `renderNumber: 0` | Accept; no guard (consumer responsibility) |

---

## Testing Strategy

Tests live in `packages/render-telemetry-core/tests/`. Environment: `node`. No `jsdom` except LocalStorage tests mock `globalThis.localStorage` directly.

### Test Files

| File | Coverage |
|---|---|
| `tests/types.test.ts` | `CURRENT_SCHEMA_VERSION === '1.0.0'`; `EVENT_SCHEMA_VERSIONS` has all 7 types; `isKnownEventType` true/false for all cases |
| `tests/session.test.ts` | `createTelemetrySession` all fields; `endTelemetrySession` immutability + new reference; double-end warning + unchanged session returned |
| `tests/events.test.ts` | All 7 factories: correct `type`, `sessionId`, `componentName`, `sequenceNumber = counter+1`, input session unchanged, `session.sequenceCounter` incremented, event-specific fields match data |
| `tests/buffer.test.ts` | Empty state; push + eviction at maxEvents; `getSnapshot()` referential stability; `getServerSnapshot()` always same reference; notify on all mutations; unsubscribe stops notifications; all 5 query methods |
| `tests/transport-memory.test.ts` | emit accumulates; `getEmitted()` reference stability; `clearEmitted()`; multi-event batches |
| `tests/transport-local-storage.test.ts` | Mock `globalThis.localStorage`; emit writes + accumulates; prune strategy; clear strategy; skip strategy; localStorage parse error recovery; Node.js no-op |
| `tests/transport-custom.test.ts` | Callback invoked with correct events; `transport.name` correct |
| `tests/transport-registry.test.ts` | registerTransport → unregister fn; emitEvents calls all registered; error isolation (one throws, others continue); `unregisterAllTransports` in `afterEach` |
| `tests/serialization.test.ts` | `serializeSession`/`deserializeSession` round-trip; null on invalid JSON; null on wrong shape; `serializeBuffer`/`deserializeBuffer` round-trip (all 7 event types); unknown schemaVersion warns; invalid events skipped; invalid sessions skipped; empty buffer |
| `tests/validation.test.ts` | `validateEvent` true for all 7 event shapes; false for null/undefined/non-object; false for missing base fields; false for wrong discriminant; false for missing event-specific required fields (`changed` in PropChangeEvent, `signalKind` in ScoreEvent, etc.); `isKnownEventType` true/false |

### Coverage Requirements

- All event factories: 100% line coverage
- `TelemetryBuffer`: all mutation paths + query paths + edge case (empty buffer, maxEvents=1)
- Transport registry: error isolation verified (one transport throws; both before and after it still run)
- Serialization: round-trip for every event type including `ScoreEvent.memoClassification` and `PropChangeEvent.signalKind`
- Validation: every required field tested for absence; every type-specific discriminant path tested

---

## Documentation Strategy

### README.md

The `README.md` at `packages/render-telemetry-core/README.md` must include:

1. **One-sentence description** + npm install command (pnpm + npm variants)
2. **No NODE_ENV guard warning** — prominent callout: this package has no `NODE_ENV` guard; consume it only when needed
3. **Quick start** — 15-line example: createSession → createRenderEvent → buffer → emitEvents
4. **API reference table** — all exports grouped by category
5. **Event type reference** — table of all 7 event types with key payload fields
6. **TelemetrySession lifecycle** — mount/render/unmount ASCII diagram
7. **InferredTrigger → triggeredBy mapping table** — for consumers mapping render-insights output
8. **Transport guide** — when to use Memory vs LocalStorage vs Custom
9. **Serialization example** — serializeBuffer → JSON.stringify → file write; deserializeBuffer → file read → JSON.parse
10. **Security warning** — prop value leakage via LocalStorage transport
11. **Production safety note** — package has no built-in prod guard; consumer must decide
12. **TypeScript exports** — import type block showing all exported types
13. **Relation to other packages** — where this fits in the ecosystem layer diagram

---

## Affected Files

None — this is a new standalone package. No existing files are modified.

_(After this package ships, a follow-up PRD will cover: migrating `render-playground`'s `PlaygroundStore` to use `TelemetryBuffer`. That is out of scope here.)_

---

## New Files

```
packages/render-telemetry-core/
  package.json                                   — package manifest
  tsup.config.ts                                 — mirrors render-insights tsup config exactly
  vitest.config.ts                               — environment: node, include: tests/**/*.test.ts
  README.md                                      — full API docs (see Documentation Strategy)
  src/
    types/index.ts                               — all public types (no logic)
    constants/schema-versions.ts                 — CURRENT_SCHEMA_VERSION, EVENT_SCHEMA_VERSIONS
    utils/generate-id.ts                         — generateId(): string (crypto.randomUUID with fallback)
    session/session.ts                           — createTelemetrySession, endTelemetrySession
    events/event-base.ts                         — createEventBase (internal, NOT exported from index.ts)
    events/session-start-event.ts                — createSessionStartEvent
    events/render-event.ts                       — createRenderEvent
    events/prop-change-event.ts                  — createPropChangeEvent
    events/frequency-event.ts                    — createFrequencyEvent
    events/score-event.ts                        — createScoreEvent
    events/recommendation-event.ts               — createRecommendationEvent
    events/session-end-event.ts                  — createSessionEndEvent
    buffer/buffer.ts                             — createTelemetryBuffer
    transport/registry.ts                        — registerTransport, unregisterAllTransports, emitEvents
    transport/memory-transport.ts                — createMemoryTransport
    transport/local-storage-transport.ts         — createLocalStorageTransport
    transport/custom-transport.ts                — createCustomTransport
    serialization/serialize.ts                   — serializeSession, deserializeSession, serializeBuffer,
                                                   deserializeBuffer, isValidSession (internal helper)
    validation/validate-event.ts                 — validateEvent, isKnownEventType
    index.ts                                     — public re-exports (all types + all functions)
  tests/
    types.test.ts
    session.test.ts
    events.test.ts
    buffer.test.ts
    transport-memory.test.ts
    transport-local-storage.test.ts
    transport-custom.test.ts
    transport-registry.test.ts
    serialization.test.ts
    validation.test.ts
```

### Internal Helpers (NOT exported from `index.ts`)

| File | Symbol | Purpose |
|---|---|---|
| `src/utils/generate-id.ts` | `generateId()` | `crypto.randomUUID()` with `Math.random` fallback |
| `src/events/event-base.ts` | `createEventBase<T>(session, type)` | Returns `{ base: TelemetryEventBase & { type: T }; session: TelemetrySession }` — increments counter |
| `src/serialization/serialize.ts` | `isValidSession(value)` | Structural check: verifies id/componentName/status/sequenceCounter fields; returns `boolean` |

---

## Implementation Steps

### Phase 1: Package Scaffold

- [✅] Step 1: Create `packages/render-telemetry-core/` and `package.json`
  - `name`: `@sapanmozammel/render-telemetry-core`
  - `version`: `1.0.0`
  - `description`: `Event protocol and observability infrastructure for React Render Kit`
  - `peerDependencies`: `{}` (empty — no React, no other packages)
  - `devDependencies`: same set as `render-insights` (vitest, @vitest/coverage-v8, tsup, TypeScript types)
  - `scripts`: `build`, `dev`, `test`, `test:watch`, `test:coverage`, `prepublishOnly: tsup`
  - `main`, `module`, `types`, `exports` — exact same structure as render-insights
  - `files`: `["dist", "README.md"]`
  - `publishConfig.access`: `"public"`
  - `sideEffects`: `false`
  - `keywords`: `["react", "telemetry", "observability", "events", "replay", "devtools", "performance"]`

- [✅] Step 2: Create `tsup.config.ts` — copy exactly from `packages/render-insights/tsup.config.ts`

- [✅] Step 3: Create `vitest.config.ts`
  - `environment: 'node'` (NOT jsdom — this package has no DOM dependency)
  - `include: ['tests/**/*.{test,spec}.{ts,tsx}']`
  - `env: { NODE_ENV: 'development' }`
  - coverage config matching render-insights pattern

- [✅] Step 4: Verify `pnpm-workspace.yaml` contains `packages/*` — if it already does, **no change needed**. Only add an explicit entry for `packages/render-telemetry-core` if the glob pattern is absent.

### Phase 2: Core Types and Constants

- [✅] Step 5: Write `src/types/index.ts` — implement the complete type specification from the Data & Types section verbatim, including:
  - All domain value types (including the new `TelemetryRenderTrigger`)
  - The trigger mapping comment block explaining `InferredTrigger → TelemetryRenderTrigger`
  - All event variants with `readonly` modifiers on all fields
  - `PropChangeEvent` with `signalKind: TelemetrySignalKind`
  - `ScoreEvent` with `memoClassification: TelemetryMemoClassification` and `signalKind: TelemetrySignalKind | null`
  - `MemoryTransport` type (extends `TelemetryTransport` with `getEmitted` + `clearEmitted`)
  - All EventData input types

- [✅] Step 6: Write `src/constants/schema-versions.ts`
  - `export const CURRENT_SCHEMA_VERSION: SchemaVersion = '1.0.0'`
  - `export const EVENT_SCHEMA_VERSIONS: Record<TelemetryEventType, SchemaVersion>` with all 7 types

- [✅] Step 7: Write `src/utils/generate-id.ts`
  - `const generateId = (): string => { ... }`
  - Try `crypto.randomUUID()` first — available in Node.js 14.17+ and all modern browsers
  - Fallback: `Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)`

### Phase 3: Session Management

- [✅] Step 8: Write `src/session/session.ts`
  - `createTelemetrySession(componentName: string): TelemetrySession`
    - `id = generateId()`
    - `startTimestamp = globalThis.performance?.now() ?? Date.now()`
    - `startWallTimestamp = Date.now()`
    - `endTimestamp: null`, `endWallTimestamp: null`, `status: 'active'`, `sequenceCounter: 0`
  - `endTelemetrySession(session: TelemetrySession): TelemetrySession`
    - If `session.status === 'ended'`: emit `console.warn('[render-telemetry-core] endTelemetrySession called on already-ended session')`, return session unchanged
    - Otherwise: return new object with `status: 'ended'`, `endTimestamp: globalThis.performance?.now() ?? Date.now()`, `endWallTimestamp: Date.now()`
    - Note: final score is NOT stored in `TelemetrySession` — pass it to `createSessionEndEvent` via `SessionEndEventData.finalScore` instead

### Phase 4: Event Base + Factories

- [✅] Step 9: Write `src/events/event-base.ts` (internal — NOT exported from index.ts)
  - `type EventBaseResult<T extends TelemetryEventType> = { base: TelemetryEventBase & { type: T }; session: TelemetrySession }`
  - `const createEventBase = <T extends TelemetryEventType>(session: TelemetrySession, type: T): EventBaseResult<T> => { ... }`
    - `const newCounter = session.sequenceCounter + 1`
    - `base = { id: generateId(), type, schemaVersion: EVENT_SCHEMA_VERSIONS[type], sessionId: session.id, componentName: session.componentName, sequenceNumber: newCounter, timestamp: globalThis.performance?.now() ?? Date.now(), wallTimestamp: Date.now() }`
    - `updatedSession = { ...session, sequenceCounter: newCounter }`
    - Returns `{ base: base as TelemetryEventBase & { type: T }, session: updatedSession }`

- [✅] Step 10: Write `src/events/session-start-event.ts`
  - `createSessionStartEvent(session)` → calls `createEventBase(session, 'session-start')`, returns `{ event: { ...base }, session }`

- [✅] Step 11: Write `src/events/render-event.ts`
  - `createRenderEvent(session, data: RenderEventData)` → merges `base` with `{ renderNumber: data.renderNumber, triggeredBy: data.triggeredBy ?? 'unknown' }`

- [✅] Step 12: Write `src/events/prop-change-event.ts`
  - `createPropChangeEvent(session, data: PropChangeEventData)` → merges `base` with all `data` fields including `signalKind`

- [✅] Step 13: Write `src/events/frequency-event.ts`
  - `createFrequencyEvent(session, data: FrequencyEventData)` → merges `base` with all `data` fields

- [✅] Step 14: Write `src/events/score-event.ts`
  - `createScoreEvent(session, data: ScoreEventData)` → merges `base` with all `data` fields including `memoClassification` and `signalKind`

- [✅] Step 15: Write `src/events/recommendation-event.ts`
  - `createRecommendationEvent(session, data: RecommendationEventData)` → merges `base` with `renderNumber` and `recommendations`

- [✅] Step 16: Write `src/events/session-end-event.ts`
  - `createSessionEndEvent(session, data: SessionEndEventData)` → merges `base` with `totalRenders`, `finalScore: data.finalScore ?? null`
  - `durationMs = (session.endTimestamp ?? (globalThis.performance?.now() ?? Date.now())) - session.startTimestamp`

### Phase 5: TelemetryBuffer

- [✅] Step 17: Write `src/buffer/buffer.ts`
  - Module-level: `const SERVER_SNAPSHOT: TelemetryBufferSnapshot = Object.freeze({ events: Object.freeze([]) as readonly TelemetryEvent[], sessions: Object.freeze({}) as Readonly<Record<string, TelemetrySession>> })`
  - `createTelemetryBuffer(options?: TelemetryBufferOptions): TelemetryBuffer`
    - `const maxEvents = Math.max(1, options?.maxEvents ?? 1000)`
    - If `options?.maxEvents !== undefined && options.maxEvents < 1`: `console.warn('[render-telemetry-core] maxEvents clamped to 1')`
    - Implement all methods per the Telemetry Store Architecture section exactly

### Phase 6: Transport Layer

- [✅] Step 18: Write `src/transport/registry.ts`
  - Module-level `const registry = new Set<TelemetryTransport>()`
  - `registerTransport`, `unregisterAllTransports`, `emitEvents` per Transport Architecture section

- [✅] Step 19: Write `src/transport/memory-transport.ts`
  - Per Transport Architecture section
  - Return type: `MemoryTransport` (not just `TelemetryTransport`)

- [✅] Step 20: Write `src/transport/local-storage-transport.ts`
  - Per Transport Architecture section, including full prune loop implementation
  - `name = 'local-storage'`

- [✅] Step 21: Write `src/transport/custom-transport.ts`
  - `createCustomTransport(name: string, emit: TransportEmitFn): TelemetryTransport`
  - Returns `{ name, emit }` only (no flush/dispose — consumer provides those via a custom object if needed)

### Phase 7: Serialization + Internal `isValidSession`

- [✅] Step 22: Write `src/serialization/serialize.ts`

  - **`isValidSession(value: unknown): value is TelemetrySession`** (internal, NOT exported from index.ts)
    - Check: non-null object
    - Check: `typeof value.id === 'string'` and `value.id.length > 0`
    - Check: `typeof value.componentName === 'string'`
    - Check: `value.status === 'active' || value.status === 'ended'`
    - Check: `typeof value.sequenceCounter === 'number'`
    - Check: `typeof value.startTimestamp === 'number'`
    - Check: `typeof value.startWallTimestamp === 'number'`
    - Return false on any failure (no throw)

  - **`serializeSession(session: TelemetrySession): string`** → `JSON.stringify(session)`

  - **`deserializeSession(json: string): TelemetrySession | null`**
    - try/catch: `JSON.parse(json)`
    - If parse fails or `!isValidSession(parsed)`: return `null`
    - Return `parsed as TelemetrySession`

  - **`serializeBuffer(buffer: TelemetryBuffer): string`**
    - `const snap = buffer.getSnapshot()` ← single call, used for both events and sessions
    - Returns `JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: Date.now(), events: [...snap.events], sessions: snap.sessions })`

  - **`deserializeBuffer(json: string, options?: TelemetryBufferOptions): TelemetryBuffer`**
    - try/catch outer: if anything throws, return `createTelemetryBuffer(options)`, emit `console.warn`
    - `JSON.parse(json)` → `parsed`
    - Validate: `parsed` is object, has `events` array, has `sessions` object
    - If `parsed.schemaVersion !== CURRENT_SCHEMA_VERSION`: `console.warn('[render-telemetry-core] deserializeBuffer: unknown schemaVersion:', parsed.schemaVersion)`
    - `validEvents = parsed.events.filter(validateEvent)`
    - `validSessions = Object.values(parsed.sessions).filter(isValidSession) as TelemetrySession[]`
    - `buffer = createTelemetryBuffer(options)`
    - `validEvents.forEach(e => buffer.push(e))`
    - `validSessions.forEach(s => buffer.pushSession(s))`
    - Return buffer (note: events are pushed in order, preserving FIFO)

### Phase 8: Validation

- [✅] Step 23: Write `src/validation/validate-event.ts`
  - `isKnownEventType(type: unknown): type is TelemetryEventType`
    - `typeof type === 'string' && type in EVENT_SCHEMA_VERSIONS`
  - `validateEvent(value: unknown): value is TelemetryEvent`
    - Check: non-null object
    - Check: `isKnownEventType(value.type)` → false if unknown
    - Check base fields: `id` (string), `schemaVersion` (string), `sessionId` (string), `componentName` (string), `sequenceNumber` (number ≥ 1), `timestamp` (number), `wallTimestamp` (number)
    - Check type-specific required fields:
      - `'render'`: `renderNumber` (number), `triggeredBy` (string)
      - `'prop-change'`: `renderNumber` (number), `changed` (array), `unstable` (array), `inferredTrigger` (string), `signalKind` (string)
      - `'frequency'`: `renderNumber`, `windowMs`, `windowCount`, `rate`, `classification`, `totalRenders` (all numbers/string)
      - `'score'`: `renderNumber`, `score`, `grade` (string), all four penalties (numbers), `memoClassification` (string), `signalKind` (string or null)
      - `'recommendation'`: `renderNumber` (number), `recommendations` (array)
      - `'session-end'`: `totalRenders` (number), `durationMs` (number), `finalScore` (number or null)
      - `'session-start'`: no additional required fields
    - Return false (not throw) on any failure

### Phase 9: Public `index.ts`

- [✅] Step 24: Write `src/index.ts` — re-export everything per the Package API section
  - Export all types and type aliases from `./types/index.js`
  - Export `CURRENT_SCHEMA_VERSION`, `EVENT_SCHEMA_VERSIONS` from `./constants/schema-versions.js`
  - Export `createTelemetrySession`, `endTelemetrySession` from `./session/session.js`
  - Export all 7 event factories from their respective `./events/*.js` files
  - Export `createTelemetryBuffer` from `./buffer/buffer.js`
  - Export `registerTransport`, `unregisterAllTransports`, `emitEvents` from `./transport/registry.js`
  - Export `createMemoryTransport` from `./transport/memory-transport.js`
  - Export `createLocalStorageTransport` from `./transport/local-storage-transport.js`
  - Export `createCustomTransport` from `./transport/custom-transport.js`
  - Export `serializeSession`, `deserializeSession`, `serializeBuffer`, `deserializeBuffer` from `./serialization/serialize.js`
  - Export `validateEvent`, `isKnownEventType` from `./validation/validate-event.js`
  - **Do NOT export** `createEventBase`, `generateId`, `isValidSession` (internal helpers)

### Phase 10: Tests

- [✅] Step 25: Write `tests/types.test.ts`
  - `CURRENT_SCHEMA_VERSION` equals `'1.0.0'`
  - `EVENT_SCHEMA_VERSIONS` has exactly 7 keys matching all `TelemetryEventType` values
  - `isKnownEventType` returns true for all 7 types, false for `'unknown-type'`, false for `123`

- [✅] Step 26: Write `tests/session.test.ts`
  - `createTelemetrySession('UserCard')`: id is string, componentName = 'UserCard', status = 'active', sequenceCounter = 0, endTimestamp = null, endWallTimestamp = null, startTimestamp is number, startWallTimestamp is number
  - `endTelemetrySession(session)`: returns new object (not same reference), status = 'ended', endTimestamp is number, endWallTimestamp is number, id/componentName/sequenceCounter unchanged
  - `endTelemetrySession` on already-ended session: spy `console.warn`, verify it's called once, returned value is the same session reference (not a new object)

- [✅] Step 27: Write `tests/events.test.ts`
  - For **each** of the 7 factory functions, verify:
    - `event.type` matches expected discriminant
    - `event.sessionId === session.id`
    - `event.componentName === session.componentName`
    - `event.sequenceNumber === originalSession.sequenceCounter + 1`
    - `returnedSession.sequenceCounter === originalSession.sequenceCounter + 1`
    - Input session object is NOT the same reference as returned session (`!Object.is(inputSession, returnedSession)`)
    - Input session.sequenceCounter is unchanged after the call
    - Event-specific fields are present and match input data
  - For `createRenderEvent` with no `triggeredBy`: verify `event.triggeredBy === 'unknown'`
  - For `createSessionEndEvent`: verify `durationMs` is a non-negative number
  - For `createPropChangeEvent`: verify `event.signalKind` is set from input data
  - For `createScoreEvent`: verify `event.memoClassification` and `event.signalKind` are set from input data
  - Sequential factory calls: feed returned session into next call, verify sequenceNumbers are 1, 2, 3…

- [✅] Step 28: Write `tests/buffer.test.ts`
  - Empty buffer: `getSnapshot()` returns `{ events: [], sessions: {} }`
  - `getServerSnapshot()` returns same reference on repeated calls (module-level constant)
  - `getSnapshot()` returns same reference on repeated calls with no mutation (cached)
  - After `push(event)`: `getSnapshot().events` has the event; reference changed
  - After `push` × (maxEvents + 1): `getSnapshot().events.length === maxEvents`; first event evicted
  - `pushSession(session)`: `getSnapshot().sessions[session.id]` exists
  - `updateSession(modifiedSession)`: `getSnapshot().sessions[session.id]` updated
  - `clear()`: `getSnapshot().events.length === 0`; `getSnapshot().sessions` empty; snapshot is SERVER_SNAPSHOT
  - Subscribe/notify: listener called on push, pushSession, updateSession, clear
  - Unsubscribe: unsubscribe fn returned; listener NOT called after calling it
  - All 5 query methods: verify correct filtering with 3+ events across 2 components/sessions/types
  - `createTelemetryBuffer({ maxEvents: 0 })`: spy `console.warn`; push 2 events → only 1 retained (clamped to 1)

- [✅] Step 29: Write `tests/transport-memory.test.ts`
  - `createMemoryTransport()` returns object with `name === 'memory'`
  - `emit([event])`: `getEmitted()` returns `[event]`
  - `emit([a, b])` then `emit([c])`: `getEmitted()` returns `[a, b, c]`
  - `getEmitted()` stable reference when called twice between emits
  - `clearEmitted()`: `getEmitted()` returns `[]`
  - Verify `MemoryTransport` type compatibility (has all `TelemetryTransport` fields + `getEmitted` + `clearEmitted`)

- [✅] Step 30: Write `tests/transport-local-storage.test.ts`
  - Before each: set up Map-backed `globalThis.localStorage` mock `{ getItem, setItem, removeItem }`
  - `emit([event])`: localStorage key contains JSON array with the event
  - `emit` called twice: both events accumulated in key
  - `onExceed: 'prune'` with `maxBytes: 1`: oldest event removed, new event written
  - `onExceed: 'clear'` with `maxBytes: 1`: key set to array containing only new events
  - `onExceed: 'skip'` with `maxBytes: 1`: key unchanged after emit
  - Parse error recovery: set localStorage key to invalid JSON → emit doesn't throw; treats as empty
  - Node.js no-op: `delete (globalThis as any).localStorage` → emit doesn't throw
  - After each: restore `globalThis.localStorage`

- [✅] Step 31: Write `tests/transport-custom.test.ts`
  - Emitted events array matches what was passed
  - `transport.name` equals provided name
  - Calling `emit` multiple times: each call gets that batch only (no accumulation)

- [✅] Step 32: Write `tests/transport-registry.test.ts`
  - `afterEach(() => unregisterAllTransports())` for cleanup
  - `registerTransport(t)` returns fn; calling fn removes t; `emitEvents([e])` no longer calls t
  - Two transports registered: `emitEvents([e])` calls both
  - One transport throws in `emit`: second transport is still called; no uncaught error
  - `unregisterAllTransports()` empties registry

- [✅] Step 33: Write `tests/serialization.test.ts`
  - `serializeSession` / `deserializeSession` round-trip: deep equal original
  - `deserializeSession('not json')` → null
  - `deserializeSession('{"no":"required-fields"}')` → null
  - `serializeBuffer` / `deserializeBuffer` round-trip with all 7 event types: events and sessions arrays deep equal (use `vi.spyOn(Date, 'now')` if needed for timestamps)
  - `deserializeBuffer('{}')` → empty buffer (no throw)
  - `deserializeBuffer('not json')` → empty buffer (no throw)
  - `deserializeBuffer` with `schemaVersion: '0.9.0'` → `console.warn` called once; valid events still hydrated
  - `deserializeBuffer` with one invalid event in array → that event skipped; others hydrated
  - `deserializeBuffer` with one invalid session in sessions object → skipped; others hydrated

- [✅] Step 34: Write `tests/validation.test.ts`
  - `validateEvent` true for a minimal valid `SessionStartEvent`
  - `validateEvent` true for all 7 event types with all required fields
  - `validateEvent` false for `null`, `undefined`, `123`, `'string'`
  - `validateEvent` false for `{}` (missing all fields)
  - `validateEvent` false for object with valid base but unknown `type`
  - `validateEvent` false for `PropChangeEvent` missing `signalKind`
  - `validateEvent` false for `ScoreEvent` missing `memoClassification`
  - `validateEvent` false for `PropChangeEvent` missing `changed`
  - `isKnownEventType` true for all 7; false for `'unknown'`; false for `null`

### Phase 11: README

- [✅] Step 35: Write `README.md` covering all 13 sections from the Documentation Strategy section

### Phase 12: Quality Gate

- [✅] Step 36: Run `pnpm run test` from `packages/render-telemetry-core/` — all tests green, ≥ 90 tests
- [✅] Step 37: Run `tsc --noEmit` from workspace root — zero type errors (strict + exactOptionalPropertyTypes)
- [✅] Step 38: Run `pnpm run build` from `packages/render-telemetry-core/` — `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` all present
- [✅] Step 39: Run `pnpm publish --dry-run` from `packages/render-telemetry-core/` — tarball contains `dist/` and `README.md`; no unexpected files

### Phase 13: CLAUDE.md Update

- [✅] Step 40: Add `packages/render-telemetry-core` section to `CLAUDE.md` under package structure
- [✅] Step 41: Add `/implement render-telemetry-core` row to the Slash Commands table

---

## Verification

Self-review every item before declaring done:

- [✅] `pnpm run test` in `packages/render-telemetry-core/` → 0 failures, ≥ 90 tests
- [✅] `tsc --noEmit` (workspace root) → 0 errors (strict mode + exactOptionalPropertyTypes)
- [✅] `pnpm run build` → `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` all present
- [✅] `grep -r "from 'react'" src/` → empty (no React imports)
- [✅] `grep -r "@sapanmozammel" src/` → empty (no ecosystem peer imports)
- [✅] `grep -rE "^interface|\binterface " src/` → empty (no `interface` keywords)
- [✅] `grep -rE "^function |\bfunction " src/` → empty (no function declarations)
- [✅] `grep -rE ": any\b|<any>" src/` → empty (no `any` types)
- [✅] `ScoreEvent` type has `memoClassification` and `signalKind` fields
- [✅] `PropChangeEvent` type has `signalKind` field
- [✅] `MemoryTransport` type includes both `getEmitted` and `clearEmitted`
- [✅] All event factories return `{ event, session }` with `event.sequenceNumber === input.sequenceCounter + 1`
- [✅] Input session is never mutated by any factory (verified in tests/events.test.ts)
- [✅] `getSnapshot()` returns stable reference between mutations (verified in tests/buffer.test.ts)
- [✅] `getServerSnapshot()` always returns the same `SERVER_SNAPSHOT` reference (verified)
- [✅] `createEventBase` is NOT exported from `src/index.ts`
- [✅] `generateId` is NOT exported from `src/index.ts`
- [✅] `isValidSession` is NOT exported from `src/index.ts`
- [✅] `serializeBuffer` calls `getSnapshot()` exactly once and uses that snapshot for both `events` and `sessions`
- [✅] `deserializeBuffer` never throws on any input (fuzz-equivalent: invalid JSON, empty string, null-like JSON, valid JSON wrong shape)
- [✅] Transport error isolation: one transport throwing does not prevent other transports from receiving events
- [✅] `pnpm publish --dry-run` shows no unexpected files

---

## Risks & Open Questions

### Risk 1: Type duplication with render-insights may drift

**Risk:** `TelemetryPropChangeEntry` in this package and `PropChangeEntry` in `render-insights` are separately maintained. If `render-insights` adds a new `PropChangeKind`, the telemetry type won't be updated automatically.

**Mitigation:** Duplication is intentional and documented (see Adoption Brief). When `render-insights` types change, a follow-up PR must update the telemetry domain types. A future migration of `render-insights` to emit telemetry events directly (v2.0.0) will unify these.

### Risk 2: Global transport registry state leaks between tests

**Risk:** The module-level `registry = new Set<TelemetryTransport>()` persists across test files in Vitest's default mode.

**Mitigation:** `unregisterAllTransports()` is exported specifically for test teardown. Every test file that registers transports must call it in `afterEach` or `afterAll`. This is specified in `tests/transport-registry.test.ts`.

### Risk 3: `performance.now()` unavailable in some environments

**Risk:** Very old Node.js versions or restricted environments may not expose `performance` globally.

**Mitigation:** Use `globalThis.performance?.now() ?? Date.now()` throughout. Node.js ≥ 16 (project minimum) always has `globalThis.performance`. The fallback to `Date.now()` handles edge cases.

### Risk 4: React Strict Mode double-invocation and `useSyncExternalStore` tearing

**Risk:** React Strict Mode double-invokes renders. `getSnapshot()` must return a referentially equal value if state hasn't changed — otherwise React throws a "tearing" warning.

**Mitigation:** `getSnapshot()` returns the same `snapshot` variable reference until the next mutation. Mutations always replace `snapshot` atomically (never mutate in place). Verified in `tests/buffer.test.ts`.

### Risk 5: LocalStorage transport with large prop value payloads

**Risk:** Storing `PropChangeEvent.changed[].prev/next` (potentially large objects) in localStorage may cause slow serialization or quota errors.

**Mitigation:** Document clearly. `LocalStorageTransport` is opt-in. The default `onExceed: 'prune'` strategy prevents quota crashes. A future `filter: (event: TelemetryEvent) => boolean` option could skip events with large payloads.

### Risk 6: Non-JSON-serializable prop values lose fidelity after round-trip

**Risk:** `PropChangeEvent.changed[].prev` and `.next` are `unknown` — could be functions, class instances, circular references. `JSON.stringify` will produce `null` for these.

**Mitigation:** Document in README under Serialization and Security sections. The telemetry layer does not sanitize prop values; the consumer is responsible for this at instrumentation time.

### Open Question 1: Should `TelemetryRenderTrigger` be called `TelemetryRenderTrigger` or `TelemetryTriggeredBy`?

Current choice: `TelemetryRenderTrigger`. This name is cleaner as a standalone type name and matches "triggered by a render". Decision: **keep `TelemetryRenderTrigger`** — but the field on `RenderEvent` remains `triggeredBy` to match idiomatic English.

### Open Question 2: Should event factories accept a `TelemetryBuffer` and auto-push?

A convenience API like `createRenderEvent(session, data, buffer)` would auto-push. Decision: **No in v1.0.0** — factories are pure. Auto-push belongs in a future `render-telemetry-react` package or consumer wrapper.

### Open Question 3: Should pnpm-workspace.yaml be verified or modified?

The existing workspace already has `packages/*` which covers all packages automatically. Decision: **verify-only in Step 4**, no modification.

---

## Release Plan

### v1.0.0 — Initial Release

- Complete all 41 implementation steps
- New package — no breaking changes to existing packages
- Publish to npm: `pnpm publish --access public`
- Add `/render-telemetry-core` demo page to the Next.js demo site

### v1.1.0 — Post-initial Enhancements

- `createNetworkTransport(endpoint, options)` — batches events and flushes on page unload
- `filter: (event: TelemetryEvent) => boolean` option on `TelemetryBuffer` and `LocalStorageTransport`
- `migrateEvent(rawEvent: unknown): TelemetryEvent | null` — schema evolution helper

### v2.0.0 — Ecosystem Migration

- `render-playground` migrates `PlaygroundStore` → `TelemetryBuffer` (non-breaking: `TelemetryBuffer` is a superset)
- `render-insights` optionally emits telemetry events via `emitEvents()` (opt-in via new option `emitTelemetry?: TelemetryBuffer`)
- `render-replay-engine` first release built on top of `TelemetryBuffer` + `deserializeBuffer`

---

## Future Integration Strategy

### render-playground migration (v2.0.0) — Before / After

**Before (current `packages/render-playground/src/store/playground-store.ts`):**
```ts
export const createPlaygroundStore = (maxEntries = 50): PlaygroundStore => {
  let snapshot: readonly InsightReport[] = [];
  const listeners = new Set<() => void>();
  // ... InsightReport[] FIFO store
};
```

**After (migration to TelemetryBuffer):**
```ts
import { createTelemetryBuffer } from '@sapanmozammel/render-telemetry-core';

// PlaygroundStore type becomes a type alias:
export type PlaygroundStore = TelemetryBuffer;

export const createPlaygroundStore = (maxEntries = 50): PlaygroundStore =>
  createTelemetryBuffer({ maxEvents: maxEntries });
```

The `PlaygroundProvider` then uses `buffer.getSnapshot().events` filtered to `ScoreEvent[]` and `PropChangeEvent[]` to drive the panel. Session boundaries (`session-start`/`session-end`) replace the current "Clear" button's flat reset.

### render-devtools-panel

```ts
import { registerTransport, createMemoryTransport } from '@sapanmozammel/render-telemetry-core';

const transport = createMemoryTransport();
registerTransport(transport);
// panel reads transport.getEmitted() or subscribes via a TelemetryBuffer
```

### render-ci-reporter

```ts
import { createTelemetryBuffer, serializeBuffer } from '@sapanmozammel/render-telemetry-core';

const buffer = createTelemetryBuffer();
// ... instrument via custom hook, populate buffer ...
const json = serializeBuffer(buffer);
fs.writeFileSync('render-telemetry-report.json', json);
// CI script reads JSON, checks ScoreEvent[].score, fails build if < threshold
```

### render-replay-engine

```ts
import { deserializeBuffer } from '@sapanmozammel/render-telemetry-core';

const json = fs.readFileSync('render-telemetry-report.json', 'utf8');
const buffer = deserializeBuffer(json);
const sessions = buffer.getSessionsByComponent('UserCard');
// Step through sessions[0] events by sequenceNumber for time-travel replay
```

### vscode-render-kit

Uses `createLocalStorageTransport('vscode-render-kit:telemetry')` to persist session data. The VS Code extension reads from localStorage via the DevTools Protocol and deserializes with `deserializeBuffer`.

### render-team-dashboard

```ts
const buffers = sessionFiles.map(f => deserializeBuffer(fs.readFileSync(f, 'utf8')));
const allScoreEvents = buffers.flatMap(b => b.getEventsByType('score'));
// Aggregate scores across components and sessions for team-level health metrics
```

---

## Success Metrics

| Metric | Target |
|---|---|
| Zero runtime dependencies (`dependencies` + `peerDependencies` both empty) | ✅ verified by `package.json` |
| Bundle size (`dist/index.mjs` minified) | < 5KB |
| Test count | ≥ 90 tests across 10 files |
| Test coverage | ≥ 90% (all branches) |
| TypeScript strict + exactOptionalPropertyTypes | 0 errors |
| All 7 event types round-trip through serialize/deserialize | ✅ |
| `ScoreEvent` carries complete memo effectiveness data | ✅ (`memoClassification` + `signalKind`) |
| `PropChangeEvent` carries per-render signal kind | ✅ (`signalKind`) |
| `render-playground` can migrate without breaking public API | ✅ (TelemetryBuffer is superset of PlaygroundStore) |
| `render-replay-engine` can be built without redesigning this protocol | ✅ (session boundaries + sequenceNumber) |
| Time-to-first-event for a consumer | < 15 lines of code |
| `deserializeBuffer` never throws on any input | ✅ |
