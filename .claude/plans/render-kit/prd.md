# @sapanmozammel/render-kit — Production Contract Spec (v1.0.0)

---

## Feature

**Title:** `@sapanmozammel/render-kit`

**Summary:** A unified orchestration SDK that consolidates all 11 react-render-kit packages into a single install via `createRenderKit(config)` — a factory that allocates a telemetry buffer, wires the replay and intelligence subsystems, exposes a React context layer (`RenderKitProvider` / `useRenderKit`), and runs a lifecycle plugin protocol — while re-exporting a locked, explicitly versioned manifest of hooks, components, and types from each sibling package.

---

## Context

### Problem Statement

The react-render-kit ecosystem ships 11 individually published packages. Any application wanting comprehensive render observability must:

1. Install 11 packages with compatible version pins
2. Wire the pipeline manually: `createTelemetryBuffer` → `registerTransport` → `push events` → `buildReplaySessions` → `analyzeRenders`
3. Set `enabled: false` per hook (no shared toggle)
4. Understand the dependency graph: `render-playground` → `render-insights`; `render-intelligence` → `render-core-schema`; `render-replay-engine` → `render-telemetry-core`

`render-kit` solves this by absorbing all wiring. One install. One config. One lifecycle.

### Goals (v1 Scope — Frozen)

1. **Single install** — `npm install @sapanmozammel/render-kit` pulls the entire ecosystem
2. **Unified config** — one `RenderKitConfig` drives every subsystem
3. **Pre-wired pipeline** — `createRenderKit()` returns a live `RenderKit` instance with buffer, transports, replay factory, and analysis pre-connected
4. **React context** — `RenderKitProvider` / `useRenderKit()` for access without prop drilling
5. **Lifecycle plugins** — `RenderKitPlugin` with `onInit` / `onDestroy` + optional `AnalysisPlugin` delegation
6. **Zero overhead when disabled** — `enabled: false` → no buffer allocated, no transport registered, no listeners created
7. **Locked re-export manifest** — explicit set of hooks, components, and utilities from each sibling package; no wildcard re-exports; each addition is a deliberate change

### Non-Goals (Hard Constraints — No Exceptions)

- No new analysis algorithms — all analysis delegated to `render-intelligence`
- No new UI — all UI delegated to `render-playground`
- No CLI
- No CI/CD integration
- No dashboard
- No duplication of any individual package logic
- No runtime coupling to `render-core-schema` beyond `import type`

---

## Dependency Graph

### Package DAG (Directed Acyclic Graph)

```
render-core-schema          ← zero runtime deps (types + guards only)
    │
    ├─► render-telemetry-core   ← no runtime deps
    │       │
    │       └─► render-replay-engine
    │
    └─► render-intelligence     (peerDep: render-core-schema)

react (peer)
    ├─► why-render
    ├─► why-render-frequency
    ├─► render-trace
    ├─► unstable-props-detector
    ├─► memo-effect-analyzer
    └─► render-insights
            │
            └─► render-playground  (peerDep: render-insights)

render-kit (depends on ALL above as direct dependencies)
    peerDep: react >=18
```

### Circular Dependency Analysis

No circular dependencies exist:
- `render-kit` depends on all 11 packages; none depends on `render-kit`
- `render-playground` depends on `render-insights` (peerDep); `render-insights` does not depend on `render-playground`
- `render-intelligence` uses `import type` from `render-core-schema` only; no runtime call back
- `render-telemetry-core` has its own type definitions mirroring `render-core-schema` to avoid circular peering

**Rule for implementer:** If adding an import to any subsystem file that is not from this package or one of the 11 dependencies, stop and raise it as a risk.

### Publish Order (Sequential — Must Respect)

```
Step 1:  render-core-schema
Step 2:  render-telemetry-core
Step 3:  render-replay-engine
         why-render
         why-render-frequency
         render-trace
         unstable-props-detector
         memo-effect-analyzer        (Steps 3 are parallel — no deps between them)
Step 4:  render-insights
         render-intelligence          (Steps 4 are parallel — no deps between them)
Step 5:  render-playground
Step 6:  render-kit                  ← final publish; all above must be live on npm first
```

---

## API Stability Classification

The public surface of `render-kit` is split into two tiers. Both tiers are versioned by `render-kit`'s semver. A breaking change to a Tier 1 export triggers a render-kit major bump. A breaking change to a Tier 2 export triggers a minor bump (with deprecation notice where possible).

### Tier 1 — SDK Core (Fully Stable)

These are created and managed by this package. They will not change shape in v1.x.

| Export | Kind | Source |
|--------|------|--------|
| `createRenderKit` | function | `src/factory/kit-factory.ts` |
| `RenderKitProvider` | React component | `src/context/kit-context.ts` |
| `useRenderKit` | React hook | `src/context/kit-context.ts` |
| `RenderKitError` | class | `src/errors/kit-error.ts` |
| `createRenderKitError` | function | `src/errors/kit-error.ts` |
| All `RenderKit*` types | types | `src/types/index.ts` |

### Tier 2 — Locked Re-export Manifest

These are re-exported from sibling packages. The list below is the complete, frozen manifest for v1. Any addition or removal is a deliberate code change to `src/index.ts`, not an automatic side effect. **`export *` is prohibited.** Reason: wildcard re-exports cause uncontrolled surface growth and prevent tree-shaking analysis.

```
Package                         Exported runtime symbols
─────────────────────────────── ────────────────────────────────────────────────
why-render                      useWhyRender
why-render-frequency            useRenderFrequency
render-trace                    useTraceRender, createRenderTrace
unstable-props-detector         useUnstablePropsDetector
memo-effect-analyzer            useMemoEffectAnalyzer
render-insights                 useRenderInsights
render-playground               useRenderPlayground, useInsightCapture,
                                PlaygroundProvider, usePlaygroundStore,
                                createPlaygroundStore, RenderPlaygroundPanel
render-telemetry-core           createTelemetryBuffer, createTelemetrySession,
                                endTelemetrySession, createMemoryTransport,
                                createLocalStorageTransport, createCustomTransport,
                                serializeBuffer, deserializeBuffer, validateEvent,
                                CURRENT_SCHEMA_VERSION,
                                createRenderEvent, createPropChangeEvent,
                                createFrequencyEvent, createScoreEvent,
                                createRecommendationEvent
render-replay-engine            createReplayEngine, buildReplaySessions,
                                applyFilter, mergeFilters, withFilter,
                                applyPreset, createBookmarkStore, ReplayError
render-core-schema              (types only — no runtime re-exports)
render-intelligence             analyzeRenders, createPlugin, IntelligenceError
```

**Excluded from re-exports (with rationale):**

| Symbol | Package | Reason |
|--------|---------|--------|
| `createEngine`, `defaultTrace`, `logCycle` | render-trace | Internal implementation details; `createRenderTrace` is the public factory |
| `registerTransport`, `unregisterAllTransports`, `emitEvents` | render-telemetry-core | Operate on a module-level global singleton; dangerous in multi-kit scenarios; kit manages transport lifecycle internally |
| `createSessionStartEvent`, `createSessionEndEvent` | render-telemetry-core | Protocol-level events; not user-facing |
| `EVENT_SCHEMA_VERSIONS` | render-telemetry-core | Internal versioning map |
| `computeRecommendations`, `computeScoreBreakdown`, `computeSessionStats` | render-playground | Playground-internal engines; not SDK surface |
| `analyzeComponents`, `rankBottlenecks` | render-intelligence | Secondary pipeline entry points; `analyzeRenders` covers the primary use case |
| `createIntelligenceError`, `createReplayError` | render-intelligence, render-replay-engine | Internal factory helpers |
| All render-core-schema runtime symbols | render-core-schema | Schema utilities (guards, comparators) are niche; importing from `render-core-schema` directly is correct |
| `SCHEMA_VERSION` alias | render-core-schema | Conflicts with `CURRENT_SCHEMA_VERSION` from telemetry-core; removed to eliminate name collision |

---

## Architecture Contract

### Module Boundaries (Strict)

```
src/
  config/kit-config.ts          Pure function only. No imports from sibling packages at runtime.
  errors/kit-error.ts           Pure class. No external imports.
  types/index.ts                Type declarations only. Zero runtime code.
  subsystems/telemetry.ts       Wraps render-telemetry-core. No React. No replay. No intelligence.
  subsystems/replay.ts          Wraps render-replay-engine. No React. No telemetry (buffer passed in).
  subsystems/intelligence.ts    Wraps render-intelligence. No React. No telemetry (buffer passed in).
  factory/kit-factory.ts        Orchestrates subsystems. No React. Imports from all 3 subsystems + config + errors.
  context/kit-context.ts        React only. Imports from errors + types. Does NOT import subsystems.
  index.ts                      Re-exports only. No logic. No `export *`.
```

**Cross-import rules:**
- `context/` → must NOT import from `subsystems/` or `factory/`
- `subsystems/` → must NOT import from each other
- `config/` → must NOT import from any sibling package at runtime
- `types/` → must use `import type` exclusively; never `import` (runtime)

### Subsystem Input/Output Contracts

**Telemetry subsystem**

```
Input:   resolved.telemetry config
         pre-created TelemetryBuffer (passed from factory)
         deregFns: Array<() => void> (mutable, owned by factory)
Output:  RenderKitTelemetry (frozen object)
Side effects:
         — calls module-level registerTransport() for each config.transports entry
         — each call returns a deregistration fn pushed into deregFns
         — deregFns is mutated by telemetry subsystem (appended to)
         — deregFns is also mutated by factory.destroy() (cleared)
Guarantees:
         — does NOT call createTelemetryBuffer() (buffer is injected)
         — does NOT call unregisterAllTransports()
         — serializes by delegating to serializeBuffer(buffer)
```

**Replay subsystem**

```
Input:   resolved.replay config
         TelemetryBuffer (reference to telemetry buffer, passed from factory)
Output:  RenderKitReplay (frozen object)
Side effects:   none at construction time
Guarantees:
         — fromBuffer() on empty buffer returns [] (not an error)
         — fromBuffer()/fromEvents() ReplayError(EMPTY_SOURCE) → return []
         — all other ReplayError → rethrown as RenderKitError(REPLAY_FAILED)
         — engine() ReplayError → rethrown as RenderKitError(REPLAY_FAILED)
         — does NOT hold a reference to TelemetrySession objects
         — does NOT mutate the buffer
```

**Intelligence subsystem**

```
Input:   resolved.intelligence config
         TelemetryBuffer (reference, for default-source resolution)
Output:  { analyze: AnalyzeFn } (frozen object; analyze is the only method)
Side effects:   none at construction time
Guarantees:
         — analyze(undefined) resolves to { type: 'events', events: [...buffer.getSnapshot().events] }
         — analyze(undefined) on empty buffer → RenderKitError(ANALYSIS_FAILED)
         — analyze() merges config plugins BEFORE caller options plugins (kit plugins run first)
         — all IntelligenceError → rethrown as RenderKitError(ANALYSIS_FAILED)
         — does NOT mutate the buffer
```

### Initialization Execution Order (Normative)

The following order is a contract, not a guideline. Implementations that deviate are incorrect.

```
Step 1   resolveConfig(config)                  — pure, no side effects
Step 2   if (!resolved.enabled) return createDisabledKit(resolved)  — early exit, zero allocation
Step 3   createTelemetryBuffer({ maxEvents })    — first allocation
Step 4   forEach transport → registerTransport(t), push deregFn     — global side effect; tracked
Step 5   createTelemetrySubsystem(config, buffer, deregFns)          — facade construction
Step 6   createReplaySubsystem(config, buffer)                       — facade construction
Step 7   createIntelligenceSubsystem(config, buffer)                 — facade construction
Step 8   assemble kit object                    — all subsystems live at this point
Step 9   forEach plugin (forward order) → try { p.onInit(kit) } catch { log, continue }
Step 10  Object.freeze(kit)                     — kit is immutable from this point
Step 11  return kit
```

### Teardown Execution Order (Normative)

```
Step 1   Guard: if (destroyed) return           — idempotency
Step 2   destroyed = true                       — set flag before plugins run
Step 3   forEach plugin (REVERSE order) → try { p.onDestroy(kit) } catch { log, continue }
Step 4   forEach deregFn in deregFns → fn()     — per-transport deregistration only
Step 5   deregFns.length = 0                   — clear reference
Step 6   buffer.clear()                        — release event memory
```

**Note on destroy plugin order:** Plugins are initialized in forward order (0, 1, 2 …) and destroyed in reverse (… 2, 1, 0), matching the stack-based cleanup convention. A plugin that depends on another plugin's resources being alive can rely on the dependent being destroyed first.

### Transport Registry Contract

`render-telemetry-core` exposes a **module-level singleton** transport registry (`Set<TelemetryTransport>`). This has three consequences that render-kit must respect:

1. **`destroy()` must NOT call `unregisterAllTransports()`** — that removes all transports globally, including those registered by other kit instances or third-party code. Call only the individual deregistration fns stored in `deregFns`.

2. **`telemetry.unregisterAllTransports()` on the kit instance** removes only the transports registered *through that kit instance* (those tracked in `deregFns`). It does NOT touch transports registered externally.

3. **Two kit instances with the same transport object** — each registration is a separate `Set.add` call. `registry.add(sameTransport)` is idempotent for the set, but each `registerTransport` call returns a distinct deregistration fn that removes one entry. The implementer must NOT deduplicate transports across kit instances.

### Runtime Allocation Contract

| Condition | Buffer allocated | Listeners created | Transports registered |
|-----------|-----------------|-------------------|-----------------------|
| `enabled: false` | NO | NO | NO |
| `enabled: true`, `telemetry.enabled: false` | NO | NO | NO |
| `enabled: true` (all defaults) | YES (1 Set + snapshot) | Per subscriber | YES (if any configured) |

**`enabled: false` guarantee:** `createDisabledKit` must not call `createTelemetryBuffer`, `registerTransport`, `createReplayEngine`, or `analyzeRenders`. The disabled kit is a frozen plain object with no-op methods and an empty static snapshot.

**Disabled buffer shape:** The `RenderKitTelemetry.buffer` on a disabled kit is a static frozen object satisfying `TelemetryBuffer` with:
- `subscribe()` → returns a no-op function; does NOT add to any Set
- `push()` → no-op; no allocation
- `getSnapshot()` → returns a static frozen `{ events: [], sessions: {} }` constant
- All query methods → return `[]` or `undefined`

This object is defined as a `const DISABLED_BUFFER: TelemetryBuffer = Object.freeze(...)` at module scope in `subsystems/telemetry.ts` and reused across all disabled kit instances.

### Tree-Shaking Contract

All sibling packages are listed in tsup's `external` array. This means tsup does NOT inline them into `dist/index.mjs` / `dist/index.cjs`. At runtime, Node/bundlers resolve them from `node_modules` (where they were installed as `dependencies`).

**This is a hard requirement, not a risk mitigation.** See `tsup.config.ts` in Phase 1.

`sideEffects: false` is set in `package.json`. All sibling packages also carry `sideEffects: false`. This enables bundlers to tree-shake unused re-exports.

**Rule:** No runtime code executes at module import time. `src/index.ts` must contain only `export` and `export type` statements. No top-level `const`, `let`, or function calls.

---

## Config Resolution Contract

### Exact Default Values

```
Field                                   Default                                    Resolution
──────────────────────────────────────  ─────────────────────────────────────────  ──────────────
enabled                                 process.env.NODE_ENV !== 'production'      boolean
                                        fallback: true if process is undefined
telemetry.enabled                       inherits global enabled
telemetry.maxEvents                     1000
telemetry.transports                    []
replay.enabled                          inherits global enabled
replay.maxFrames                        100
replay.pruningStrategy                  'fifo'
intelligence.enabled                    inherits global enabled
intelligence.maxBottlenecks             10
intelligence.maxRecommendations         20
intelligence.confidenceThreshold        0.3
intelligence.correlationWindowMs        16
intelligence.includeWellOptimized       false
intelligence.plugins                    []
plugins                                 []
```

**Subsystem enabled inheritance:**
```
telemetryEnabled = config.telemetry?.enabled ?? globalEnabled
replayEnabled    = config.replay?.enabled    ?? globalEnabled
intellEnabled    = config.intelligence?.enabled ?? globalEnabled
```
A subsystem cannot be enabled when global `enabled` is `false` (the factory returns a disabled kit before subsystem construction).

### Config Validation Rules (Normative)

| Field | Invalid value | Behavior | Console output |
|-------|--------------|----------|----------------|
| `telemetry.maxEvents` | `< 1` (e.g., 0, -1) | Clamp to `1` | `console.warn('[render-kit] telemetry.maxEvents clamped to 1')` |
| `intelligence.maxBottlenecks` | `< 1` | Clamp to `1` | `console.warn('[render-kit] intelligence.maxBottlenecks clamped to 1')` |
| `intelligence.maxRecommendations` | `< 1` | Clamp to `1` | `console.warn('[render-kit] intelligence.maxRecommendations clamped to 1')` |
| `intelligence.confidenceThreshold` | `< 0` | Clamp to `0` | `console.warn('[render-kit] intelligence.confidenceThreshold clamped to 0')` |
| `intelligence.confidenceThreshold` | `> 1` | Clamp to `1` | `console.warn('[render-kit] intelligence.confidenceThreshold clamped to 1')` |
| `intelligence.correlationWindowMs` | `< 1` | Clamp to `1` | `console.warn('[render-kit] intelligence.correlationWindowMs clamped to 1')` |
| `replay.maxFrames` | `< 1` | Clamp to `1` | `console.warn('[render-kit] replay.maxFrames clamped to 1')` |
| `plugins[n].id` | empty string or whitespace-only | Skip plugin, no onInit | `console.warn('[render-kit] plugin at index N has empty id — skipped')` |
| `plugins[n].id` | duplicate of earlier plugin id | Include both; each runs independently | `console.warn('[render-kit] duplicate plugin id "X" at index N')` |

**All clamping happens inside `resolveConfig()`**, before any subsystem is created. The `ResolvedRenderKitConfig` contains only valid values.

**Throw rule:** `createRenderKit` does NOT throw for any config value. All out-of-range values are clamped. Invalid plugin ids are skipped. The only runtime throw from `createRenderKit` is an unexpected internal error, wrapped as `RenderKitError('INIT_FAILED', ...)`.

---

## Plugin Lifecycle Contract

### Plugin Shape

```typescript
type RenderKitPlugin = {
  readonly id: string;           // must be non-empty, non-whitespace; duplicates allowed with warning
  readonly name: string;
  readonly version: string;
  onInit?: (kit: RenderKit) => void;
  onDestroy?: (kit: RenderKit) => void;
  analysisPlugin?: AnalysisPlugin;  // delegated to render-intelligence via intelligence config
};
```

### Execution Rules (Normative)

| Rule | Contract |
|------|----------|
| `onInit` execution order | Forward array order: index 0 first, index N last |
| `onDestroy` execution order | Reverse array order: index N first, index 0 last |
| `onInit` receives | The frozen `RenderKit` instance (all subsystems live) |
| `onDestroy` receives | The same frozen `RenderKit` instance (subsystems still live; buffer not yet cleared) |
| Plugin error during `onInit` | Caught, logged via `console.error('[render-kit] plugin "id" onInit threw:', e)`, next plugin continues |
| Plugin error during `onDestroy` | Caught, logged via `console.error('[render-kit] plugin "id" onDestroy threw:', e)`, next plugin continues |
| Plugin with skipped id | Never reaches `onInit` or `onDestroy` |
| `analysisPlugin` field | Appended to `intelligence.plugins` in `ResolvedRenderKitConfig` during `resolveConfig()`, BEFORE any caller-provided `intelligence.plugins` entries (kit plugins run first in analysis) |
| Mutating the kit inside `onInit` | The kit is `Object.freeze()`d after all `onInit` calls. Mutation attempts before freeze succeed; after freeze they silently fail in non-strict code. **The implementer must freeze the kit AFTER the onInit loop, not before.** |

### `analysisPlugin` Integration

During `resolveConfig`, the `analysisPlugin` fields from `plugins` are collected and prepended to `intelligence.plugins`:

```
resolvedIntelligencePlugins = [
  ...plugins.filter(p => p.analysisPlugin).map(p => p.analysisPlugin),  // kit-level plugins first
  ...(config.intelligence?.plugins ?? [])                                // caller-provided last
]
```

This order ensures kit-level analysis plugins run before user-provided analysis plugins.

---

## Error Isolation Model

| Error Code | Trigger | Behavior |
|------------|---------|----------|
| `INIT_FAILED` | Unexpected throw inside `createRenderKit` (not from a plugin) | Rethrown as `RenderKitError('INIT_FAILED', ...)` |
| `TELEMETRY_FAILED` | Buffer or transport operation throws unexpectedly | Rethrown as `RenderKitError('TELEMETRY_FAILED', ...)` |
| `REPLAY_FAILED` | `ReplayError` with code other than `EMPTY_SOURCE` | Rethrown as `RenderKitError('REPLAY_FAILED', e.message)` |
| `ANALYSIS_FAILED` | Any `IntelligenceError`, or empty source, or unexpected throw from `analyzeRenders` | Rethrown as `RenderKitError('ANALYSIS_FAILED', e.message)` |
| `PLUGIN_FAILED` | Plugin `onInit` / `onDestroy` throws | NOT rethrown; logged to `console.error`; execution continues |
| `CONTEXT_MISSING` | `useRenderKit()` called with no provider | Thrown synchronously |
| `DISABLED` | `analyze()` called on a disabled kit or disabled intelligence subsystem | Thrown synchronously |
| `INVALID_CONFIG` | Reserved; not currently thrown (all invalid config is clamped) | — |

**EMPTY_SOURCE handling:**
- `replay.fromBuffer()` / `replay.fromEvents([])` → `ReplayError(EMPTY_SOURCE)` is swallowed, return `[]`
- `kit.analyze()` / `kit.analyze({ type: 'events', events: [] })` → `IntelligenceError(EMPTY_SOURCE)` is rethrown as `RenderKitError('ANALYSIS_FAILED', ...)`

The distinction: empty replay is normal (buffer may not have data yet). Empty intelligence input is a caller error.

---

## Data & Types

All types live in `src/types/index.ts`. Pure type declarations. Zero runtime code. All imports are `import type`.

```typescript
import type { ReactNode } from 'react';
import type { TelemetryTransport, TelemetryBuffer, TelemetrySession, TelemetryBufferSnapshot, TelemetryEvent } from '@sapanmozammel/render-telemetry-core';
import type { ReplaySource, ReplaySession, ReplayEngine, ReplayEngineOptions, ReplayPruningStrategy } from '@sapanmozammel/render-replay-engine';
import type { IntelligenceSource, IntelligenceOptions, IntelligenceReport, AnalysisPlugin } from '@sapanmozammel/render-intelligence';

// ── Error ─────────────────────────────────────────────────────────────────────

export type RenderKitErrorCode =
  | 'INIT_FAILED'
  | 'TELEMETRY_FAILED'
  | 'REPLAY_FAILED'
  | 'ANALYSIS_FAILED'
  | 'PLUGIN_FAILED'
  | 'CONTEXT_MISSING'
  | 'DISABLED'
  | 'INVALID_CONFIG';

// ── Config ────────────────────────────────────────────────────────────────────

export type RenderKitTelemetryConfig = {
  enabled?: boolean;
  maxEvents?: number;
  transports?: readonly TelemetryTransport[];
};

export type RenderKitReplayConfig = {
  enabled?: boolean;
  maxFrames?: number;
  pruningStrategy?: ReplayPruningStrategy;
};

export type RenderKitIntelligenceConfig = {
  enabled?: boolean;
  maxBottlenecks?: number;
  maxRecommendations?: number;
  confidenceThreshold?: number;
  correlationWindowMs?: number;
  includeWellOptimized?: boolean;
  plugins?: readonly AnalysisPlugin[];
};

export type RenderKitPlugin = {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  onInit?: (kit: RenderKit) => void;
  onDestroy?: (kit: RenderKit) => void;
  analysisPlugin?: AnalysisPlugin;
};

export type RenderKitConfig = {
  enabled?: boolean;
  telemetry?: RenderKitTelemetryConfig;
  replay?: RenderKitReplayConfig;
  intelligence?: RenderKitIntelligenceConfig;
  plugins?: readonly RenderKitPlugin[];
};

// ResolvedRenderKitConfig — all optionals filled with validated defaults; immutable
export type ResolvedRenderKitConfig = {
  readonly enabled: boolean;
  readonly telemetry: {
    readonly enabled: boolean;
    readonly maxEvents: number;
    readonly transports: readonly TelemetryTransport[];
  };
  readonly replay: {
    readonly enabled: boolean;
    readonly maxFrames: number;
    readonly pruningStrategy: ReplayPruningStrategy;
  };
  readonly intelligence: {
    readonly enabled: boolean;
    readonly maxBottlenecks: number;
    readonly maxRecommendations: number;
    readonly confidenceThreshold: number;
    readonly correlationWindowMs: number;
    readonly includeWellOptimized: boolean;
    readonly plugins: readonly AnalysisPlugin[];
  };
  readonly plugins: readonly RenderKitPlugin[];
};

// ── Subsystem Types ───────────────────────────────────────────────────────────

export type RenderKitTelemetry = {
  readonly enabled: boolean;
  readonly buffer: TelemetryBuffer;
  readonly createSession: (componentName: string) => TelemetrySession;
  readonly endSession: (session: TelemetrySession) => TelemetrySession;
  readonly registerTransport: (transport: TelemetryTransport) => () => void;
  readonly unregisterAllTransports: () => void;
  readonly snapshot: () => TelemetryBufferSnapshot;
  readonly serialize: () => string;
  readonly clear: () => void;
};

export type RenderKitReplay = {
  readonly enabled: boolean;
  readonly fromBuffer: (options?: ReplayEngineOptions) => readonly ReplaySession[];
  readonly fromEvents: (events: readonly TelemetryEvent[], options?: ReplayEngineOptions) => readonly ReplaySession[];
  readonly fromSerialized: (json: string, options?: ReplayEngineOptions) => readonly ReplaySession[];
  readonly engine: (source: ReplaySource, sessionId?: string, options?: ReplayEngineOptions) => ReplayEngine;
};

// ── Kit Instance ──────────────────────────────────────────────────────────────

export type RenderKit = {
  readonly config: ResolvedRenderKitConfig;
  readonly enabled: boolean;
  readonly telemetry: RenderKitTelemetry;
  readonly replay: RenderKitReplay;
  readonly analyze: (source?: IntelligenceSource, options?: Partial<IntelligenceOptions>) => IntelligenceReport;
  readonly destroy: () => void;
};

// ── React Context ─────────────────────────────────────────────────────────────

export type RenderKitProviderProps = {
  kit: RenderKit;
  children: ReactNode;
};
```

---

## Package API

### `src/index.ts` — Complete Export List

This file contains only `export` and `export type` statements. No logic. No top-level side effects.

```typescript
// ── SDK Core (Tier 1) ──────────────────────────────────────────────────────
export { createRenderKit } from './factory/kit-factory.js';
export { RenderKitProvider, useRenderKit } from './context/kit-context.js';
export { RenderKitError, createRenderKitError } from './errors/kit-error.js';
export type {
  RenderKitConfig,
  RenderKitTelemetryConfig,
  RenderKitReplayConfig,
  RenderKitIntelligenceConfig,
  RenderKitPlugin,
  ResolvedRenderKitConfig,
  RenderKit,
  RenderKitTelemetry,
  RenderKitReplay,
  RenderKitProviderProps,
  RenderKitErrorCode,
} from './types/index.js';

// ── Ecosystem Re-exports (Tier 2 — Locked Manifest) ───────────────────────
// why-render
export { useWhyRender } from '@sapanmozammel/why-render';
export type { WhyRenderOptions } from '@sapanmozammel/why-render';

// why-render-frequency
export { useRenderFrequency } from '@sapanmozammel/why-render-frequency';
export type { RenderFrequencyOptions } from '@sapanmozammel/why-render-frequency';

// render-trace
export { useTraceRender, createRenderTrace } from '@sapanmozammel/render-trace';
export type { LogMode, RenderCycle, RenderNode, RenderTraceOptions, TraceInstance, TraceRenderOptions } from '@sapanmozammel/render-trace';

// unstable-props-detector
export { useUnstablePropsDetector } from '@sapanmozammel/unstable-props-detector';
export type { PropInstability, PropType, UnstablePropsOptions } from '@sapanmozammel/unstable-props-detector';

// memo-effect-analyzer
export { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';
export type { MemoClassification, MemoEffectOptions, RenderSignal, SignalKind } from '@sapanmozammel/memo-effect-analyzer';

// render-insights
export { useRenderInsights } from '@sapanmozammel/render-insights';
export type { FrequencyClass, HealthGrade, InferredTrigger, InsightReport, RenderInsightsOptions } from '@sapanmozammel/render-insights';

// render-playground
export {
  useRenderPlayground,
  useInsightCapture,
  PlaygroundProvider,
  usePlaygroundStore,
  createPlaygroundStore,
  RenderPlaygroundPanel,
} from '@sapanmozammel/render-playground';
export type {
  PlaygroundStore,
  RenderPlaygroundOptions,
  CaptureOptions,
  PlaygroundProviderProps,
  RenderPlaygroundPanelProps,
  RecommendationCategory,
  RecommendationSeverity,
  Recommendation,
  ScoreBreakdown,
  ScoreTrend,
  SessionStats,
} from '@sapanmozammel/render-playground';

// render-telemetry-core
export {
  createTelemetryBuffer,
  createTelemetrySession,
  endTelemetrySession,
  createMemoryTransport,
  createLocalStorageTransport,
  createCustomTransport,
  serializeBuffer,
  deserializeBuffer,
  validateEvent,
  CURRENT_SCHEMA_VERSION,
  createRenderEvent,
  createPropChangeEvent,
  createFrequencyEvent,
  createScoreEvent,
  createRecommendationEvent,
} from '@sapanmozammel/render-telemetry-core';
export type {
  SchemaVersion,
  TelemetryEventType,
  TelemetryEventBase,
  RenderEvent,
  PropChangeEvent,
  FrequencyEvent,
  ScoreEvent,
  RecommendationEvent,
  SessionEndEvent,
  TelemetryEvent,
  TelemetrySession,
  TelemetryBufferSnapshot,
  TelemetryBuffer,
  TelemetryBufferOptions,
  TelemetryTransport,
  TransportEmitFn,
  MemoryTransport,
} from '@sapanmozammel/render-telemetry-core';

// render-replay-engine
export {
  createReplayEngine,
  buildReplaySessions,
  applyFilter,
  mergeFilters,
  withFilter,
  applyPreset,
  createBookmarkStore,
  ReplayError,
} from '@sapanmozammel/render-replay-engine';
export type {
  ReplaySessionId,
  ReplayFrameId,
  ReplayFrame,
  ReplaySession,
  ReplaySessionStats,
  ReplayCursor,
  ReplayFilter,
  ReplayFilterResult,
  ReplayFilterPreset,
  ReplayBookmark,
  ReplayBookmarkStore,
  ReplayNavigator,
  ReplayEngine,
  ReplayEngineOptions,
  ReplayPruningStrategy,
  ReplaySource,
  ReplayErrorCode,
} from '@sapanmozammel/render-replay-engine';

// render-intelligence
export { analyzeRenders, createPlugin, IntelligenceError } from '@sapanmozammel/render-intelligence';
export type {
  IntelligenceSource,
  IntelligenceOptions,
  IntelligenceReport,
  ApplicationHealth,
  ComponentAnalysis,
  Bottleneck,
  BottleneckCategory,
  RootCause,
  RootCauseKind,
  CorrelationGroup,
  CorrelationType,
  IntelligenceRecommendation,
  AnalysisPlugin,
  AnalysisContext,
  PluginResult,
  IntelligenceErrorCode,
} from '@sapanmozammel/render-intelligence';
```

---

## Testing Contract

### Environment

`vitest` with `jsdom`. All tests in `tests/` (outside `src/`). Tests verify **runtime behavior and guarantees**, not structural shape.

### Test Files, Cases, and Runtime Guarantees

**`tests/kit-config.test.ts`** — `resolveConfig` (15 cases)
- No-arg call returns all defaults
- `enabled: true` explicit — all subsystems resolve to `true`
- `enabled: false` explicit — all subsystems resolve to `false`; no subsystem can override
- `NODE_ENV === 'production'` → `enabled` defaults to `false`
- `NODE_ENV === 'development'` → `enabled` defaults to `true`
- Subsystem `enabled: false` with parent `enabled: true` — subsystem respects own flag
- `maxEvents: 0` → clamped to `1`; warn logged
- `maxEvents: -5` → clamped to `1`; warn logged
- `confidenceThreshold: -0.1` → clamped to `0`; warn logged
- `confidenceThreshold: 1.5` → clamped to `1`; warn logged
- `maxBottlenecks: 0` → clamped to `1`; warn logged
- `maxFrames: 0` → clamped to `1`; warn logged
- Plugin with empty id → skipped (not in resolved.plugins); warn logged
- Plugin with whitespace-only id → skipped; warn logged
- `analysisPlugin` on RenderKitPlugin → appears in resolved `intelligence.plugins` BEFORE caller plugins

**`tests/kit-error.test.ts`** — `RenderKitError` (6 cases)
- `instanceof Error` is `true`
- `instanceof RenderKitError` is `true`
- `.code` matches constructor argument
- `.message` matches constructor argument
- All 8 error codes construct without throw
- `createRenderKitError(code, msg)` produces result identical to `new RenderKitError(code, msg)`

**`tests/kit-factory.test.ts`** — `createRenderKit` (18 cases)
- Returns frozen object (`Object.isFrozen` is `true`)
- `enabled: false` → `kit.enabled === false`
- `enabled: false` → `kit.analyze()` throws `RenderKitError` with `.code === 'DISABLED'`
- `enabled: false` → `kit.replay.fromBuffer()` returns `[]`
- `enabled: false` → `kit.telemetry.buffer.push()` is a no-op (snapshot unchanged)
- `enabled: false` → `createTelemetryBuffer` is NOT called (verify via spy on the import)
- `enabled: true` → `kit.telemetry.buffer` is live (push → snapshot grows)
- `createSession` returns session with `status: 'active'` and matching `componentName`
- `endSession` returns session with `status: 'ended'`
- `registerTransport` returns a deregistration function
- `destroy()` is idempotent — second call is a no-op, does not throw
- `destroy()` calls `onDestroy` on each plugin in REVERSE order
- `onInit` called on each plugin in FORWARD order during `createRenderKit`
- Plugin `onInit` error → logged, does not abort factory, subsequent plugins still run
- Plugin `onDestroy` error → logged, does not abort teardown, subsequent plugins still run
- Two kit instances do not share buffers — push to kit1, kit2 snapshot is empty
- Two kit instances with same transport: `kit1.destroy()` does NOT remove transport registered by kit2
- `destroy()` after `analyze()` and `replay.fromBuffer()` — no error; subsequent calls to those methods still behave correctly (replay returns `[]` after buffer cleared)

**`tests/kit-context.test.ts`** — `RenderKitProvider` + `useRenderKit` (6 cases)
- `useRenderKit()` outside provider throws `RenderKitError` with `.code === 'CONTEXT_MISSING'`
- `useRenderKit()` inside provider returns the kit passed to `RenderKitProvider`
- Kit reference is stable across re-renders (referential equality)
- Nested providers: `useRenderKit()` returns the inner kit, not the outer
- `RenderKitProvider` renders `children`
- `RenderKitProvider` with disabled kit — `useRenderKit()` returns disabled kit; `kit.enabled === false`

**`tests/telemetry-subsystem.test.ts`** — `createTelemetrySubsystem` / disabled telemetry (12 cases)
- Returns object with all required fields present
- `snapshot()` returns `buffer.getSnapshot()`
- `clear()` empties the snapshot
- `registerTransport` returns a deregistration fn; calling it removes the transport
- `unregisterAllTransports()` calls all tracked deregFns; subsequent push does not emit
- `createSession(name)` returns `status: 'active'`, `componentName === name`
- `endSession(session)` returns `status: 'ended'`
- `serialize()` returns non-empty JSON string after events pushed to buffer
- Disabled: `buffer.push()` does NOT grow `getSnapshot().events`
- Disabled: `buffer.subscribe()` returns a function; calling it does not throw
- Disabled: `snapshot()` returns `{ events: [], sessions: {} }`
- Disabled: `createSession(name)` returns session with `status: 'active'`; does NOT call `createTelemetrySession` from render-telemetry-core

**`tests/replay-subsystem.test.ts`** — `createReplaySubsystem` / disabled replay (10 cases)
- `fromBuffer()` on empty buffer returns `[]` (not an error)
- `fromBuffer()` with events in buffer returns `ReplaySession[]`
- `fromEvents([])` returns `[]`
- `fromEvents(events)` returns `ReplaySession[]`
- `fromSerialized('')` throws `RenderKitError` with `.code === 'REPLAY_FAILED'`
- `fromSerialized(validJson)` returns `ReplaySession[]`
- `engine(source)` returns `ReplayEngine`
- `engine({ type: 'events', events: [] })` throws `RenderKitError` with `.code === 'REPLAY_FAILED'`
- Disabled: `fromBuffer()` returns `[]`
- Disabled: `engine()` throws `RenderKitError` with `.code === 'DISABLED'`

**`tests/intelligence-subsystem.test.ts`** — `createIntelligenceSubsystem` / disabled intelligence (10 cases)
- `analyze(source)` delegates to `analyzeRenders` (integration: report has `applicationHealth`)
- `analyze(source, { maxBottlenecks: 3 })` — caller option overrides kit default
- `analyze(source)` uses kit-default `maxBottlenecks` when caller doesn't specify
- Kit `analysisPlugin` is active in `analyze()` (plugin's `analyze` fn is called)
- `analyze()` without source uses buffer snapshot
- `analyze()` without source on empty buffer throws `RenderKitError` with `.code === 'ANALYSIS_FAILED'`
- `analyze({ type: 'events', events: [] })` throws `RenderKitError` with `.code === 'ANALYSIS_FAILED'`
- Kit plugins run BEFORE caller-provided plugins (ordering verified by call order spy)
- Disabled: `analyze()` throws `RenderKitError` with `.code === 'DISABLED'`
- Disabled: does NOT call `analyzeRenders`

**`tests/re-exports.test.ts`** — Locked manifest verification (11 cases, one per package)
- `useWhyRender` is a function
- `useRenderFrequency` is a function
- `useTraceRender` is a function
- `useUnstablePropsDetector` is a function
- `useMemoEffectAnalyzer` is a function
- `useRenderInsights` is a function
- `useRenderPlayground` is a function
- `RenderPlaygroundPanel` is truthy
- `createTelemetryBuffer` is a function
- `createReplayEngine` is a function
- `analyzeRenders` is a function

---

## Affected Files

| File | Change |
|------|--------|
| `demo/package.json` | Add `"@sapanmozammel/render-kit": "workspace:*"` to dependencies |
| `demo/src/lib/registry/index.ts` | Add 12th entry for render-kit |
| `CLAUDE.md` | Add `packages/render-kit` structure block + `/implement render-kit` row |

---

## New Files

```
packages/render-kit/
  src/
    config/kit-config.ts               resolveConfig() + clamp guards; no sibling package imports
    errors/kit-error.ts                RenderKitError class + createRenderKitError factory
    subsystems/telemetry.ts            createTelemetrySubsystem + DISABLED_BUFFER constant + createDisabledTelemetry
    subsystems/replay.ts               createReplaySubsystem + createDisabledReplay
    subsystems/intelligence.ts         createIntelligenceSubsystem + createDisabledIntelligence
    factory/kit-factory.ts             createRenderKit + createDisabledKit
    context/kit-context.ts             RenderKitContext, RenderKitProvider, useRenderKit
    types/index.ts                     all public types; pure declarations; zero runtime code
    index.ts                           locked manifest re-exports; no logic
  tests/
    setup.ts                           @testing-library/jest-dom import
    helpers.ts                         makeKit, makeDisabledKit, makePlugin, makeRenderEvent, makeScoreEvent
    kit-config.test.ts
    kit-error.test.ts
    kit-factory.test.ts
    kit-context.test.ts
    telemetry-subsystem.test.ts
    replay-subsystem.test.ts
    intelligence-subsystem.test.ts
    re-exports.test.ts
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  README.md

demo/src/features/render-kit/
  index.tsx                            RenderKitDemo — minimal integration proof (no scenarios.ts)
```

---

## Implementation Steps

### Phase 1 — Package Scaffolding

**[✅] Step 1.1: Create `packages/render-kit/package.json`**

```json
{
  "name": "@sapanmozammel/render-kit",
  "version": "1.0.0",
  "description": "Unified React render observability SDK — orchestrates all react-render-kit packages in a single install",
  "license": "MIT",
  "keywords": ["react", "performance", "devtools", "hooks", "render", "observability", "sdk"],
  "homepage": "https://react-render-kit.vercel.app/render-kit",
  "bugs": { "url": "https://github.com/SapanMozammel/react-render-kit/issues" },
  "repository": {
    "type": "git",
    "url": "https://github.com/SapanMozammel/react-render-kit.git",
    "directory": "packages/render-kit"
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist", "README.md"],
  "publishConfig": { "access": "public" },
  "sideEffects": false,
  "scripts": {
    "prepublishOnly": "tsup",
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "type:check": "tsc --noEmit"
  },
  "engines": { "node": ">=18" },
  "peerDependencies": { "react": ">=18" },
  "dependencies": {
    "@sapanmozammel/why-render": "workspace:*",
    "@sapanmozammel/why-render-frequency": "workspace:*",
    "@sapanmozammel/render-trace": "workspace:*",
    "@sapanmozammel/unstable-props-detector": "workspace:*",
    "@sapanmozammel/memo-effect-analyzer": "workspace:*",
    "@sapanmozammel/render-insights": "workspace:*",
    "@sapanmozammel/render-playground": "workspace:*",
    "@sapanmozammel/render-telemetry-core": "workspace:*",
    "@sapanmozammel/render-replay-engine": "workspace:*",
    "@sapanmozammel/render-core-schema": "workspace:*",
    "@sapanmozammel/render-intelligence": "workspace:*"
  },
  "devDependencies": {
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitest/coverage-v8": "^4.1.8",
    "jsdom": "^25.0.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "vitest": "^2.1.8"
  }
}
```

**[✅] Step 1.2: Create `packages/render-kit/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "declaration": true,
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "ignoreDeprecations": "6.0",
    "outDir": "dist",
    "jsx": "react-jsx"
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`"jsx": "react-jsx"` is required for `kit-context.ts`.

**[✅] Step 1.3: Create `packages/render-kit/tsup.config.ts`**

All sibling packages listed as `external` — this is a **hard requirement**, not a risk mitigation. tsup must NOT bundle any sibling package. The runtime bundle is only the orchestration glue code.

```typescript
import { defineConfig } from 'tsup';

const SIBLING_PACKAGES = [
  '@sapanmozammel/why-render',
  '@sapanmozammel/why-render-frequency',
  '@sapanmozammel/render-trace',
  '@sapanmozammel/unstable-props-detector',
  '@sapanmozammel/memo-effect-analyzer',
  '@sapanmozammel/render-insights',
  '@sapanmozammel/render-playground',
  '@sapanmozammel/render-telemetry-core',
  '@sapanmozammel/render-replay-engine',
  '@sapanmozammel/render-core-schema',
  '@sapanmozammel/render-intelligence',
];

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  external: ['react', ...SIBLING_PACKAGES],
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.mjs' };
  },
});
```

**[✅] Step 1.4: Create `packages/render-kit/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    env: { NODE_ENV: 'development' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
    },
  },
});
```

**[✅] Step 1.5: Create `packages/render-kit/README.md`**

Single-line stub required by `publishConfig.files`:
```
# @sapanmozammel/render-kit
```

**[✅] Step 1.6: Install workspace dependencies**

```bash
pnpm install
```

Run from the monorepo root. This links all `workspace:*` dependencies without leaving the monorepo root.

---

### Phase 2 — Error System

**[✅] Step 2.1: Create `src/errors/kit-error.ts`**

```typescript
import type { RenderKitErrorCode } from '../types/index.js';

export class RenderKitError extends Error {
  readonly code: RenderKitErrorCode;

  constructor(code: RenderKitErrorCode, message: string) {
    super(message);
    this.name = 'RenderKitError';
    this.code = code;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RenderKitError);
    }
  }
}

export const createRenderKitError = (code: RenderKitErrorCode, message: string): RenderKitError =>
  new RenderKitError(code, message);
```

---

### Phase 3 — Types

**[✅] Step 3.1: Create `src/types/index.ts`**

Implement the full type block from the **Data & Types** section above. Rules:
- All imports are `import type`
- No runtime code (`const`, `let`, `function`, class definitions, expressions)
- All types are exported (`export type`)

---

### Phase 4 — Config System

**[✅] Step 4.1: Create `src/config/kit-config.ts`**

Implement `resolveConfig(config: RenderKitConfig): ResolvedRenderKitConfig`.

Rules:
- No imports from sibling packages at runtime (types only)
- All clamp/warn logic per the **Config Validation Rules** table
- `analysisPlugin` fields from `plugins` are collected and prepended to `intelligence.plugins` (see Plugin Lifecycle Contract)

```typescript
// Exact enabled resolution (process-safe):
const globalEnabled = config.enabled ?? (
  typeof process !== 'undefined'
    ? process.env?.NODE_ENV !== 'production'
    : true
);
```

Each clamped field emits exactly one `console.warn` with the message format from the Config Validation Rules table.

---

### Phase 5 — Telemetry Subsystem

**[✅] Step 5.1: Create `src/subsystems/telemetry.ts`**

Implement `createTelemetrySubsystem`, `createDisabledTelemetry`, and the `DISABLED_BUFFER` constant.

**`DISABLED_BUFFER` — module-scope constant:**

```typescript
const DISABLED_SNAPSHOT: TelemetryBufferSnapshot = Object.freeze({
  events: Object.freeze([]) as readonly TelemetryEvent[],
  sessions: Object.freeze({}) as Readonly<Record<string, TelemetrySession>>,
});

const DISABLED_BUFFER: TelemetryBuffer = Object.freeze({
  subscribe: () => () => undefined,
  getSnapshot: () => DISABLED_SNAPSHOT,
  getServerSnapshot: () => DISABLED_SNAPSHOT,
  push: () => undefined,
  pushSession: () => undefined,
  updateSession: () => undefined,
  clear: () => undefined,
  getEventsBySession: () => Object.freeze([]),
  getEventsByComponent: () => Object.freeze([]),
  getEventsByType: () => Object.freeze([]) as never,
  getSession: () => undefined,
  getSessionsByComponent: () => Object.freeze([]),
});
```

`DISABLED_BUFFER` is defined once and shared across all disabled kit instances (no allocation per disabled kit).

**`createTelemetrySubsystem(config, buffer, deregFns)` — subsystem contract:**
- `createSession(componentName)` → `createTelemetrySession(componentName)` from render-telemetry-core
- `endSession(session)` → `endTelemetrySession(session)` from render-telemetry-core
- `registerTransport(t)` → module-level `registerTransport(t)`; push returned fn to `deregFns`; return same fn
- `unregisterAllTransports()` → call each fn in `deregFns`; `deregFns.length = 0`
- `snapshot()` → `buffer.getSnapshot()`
- `serialize()` → `serializeBuffer(buffer)`
- `clear()` → `buffer.clear()`

**`createDisabledTelemetry(componentName?)` — disabled path:**
- Returns `RenderKitTelemetry` with `enabled: false`
- `buffer` → `DISABLED_BUFFER` (shared constant)
- `createSession(name)` → returns a frozen object with `id: 'disabled'`, `componentName: name`, `status: 'active'`, `startTimestamp: 0`, `startWallTimestamp: 0`, `endTimestamp: null`, `endWallTimestamp: null`, `sequenceCounter: 0`. Does NOT call `createTelemetrySession` from render-telemetry-core.
- All other methods → `() => undefined` (typed as returning the correct types where needed)

---

### Phase 6 — Replay Subsystem

**[✅] Step 6.1: Create `src/subsystems/replay.ts`**

Implement `createReplaySubsystem` and `createDisabledReplay`.

**`createReplaySubsystem(config, buffer)` — error handling contract:**

```typescript
// Kit-level options — merged with caller options at call time, not construction time
const kitOptions: ReplayEngineOptions = {
  maxFrames: config.maxFrames,
  pruningStrategy: config.pruningStrategy,
};

const handleReplayError = (e: unknown, allowEmptySource: boolean): never | readonly ReplaySession[] => {
  if (e instanceof ReplayError) {
    if (allowEmptySource && e.code === 'EMPTY_SOURCE') return Object.freeze([]);
    throw new RenderKitError('REPLAY_FAILED', e.message);
  }
  throw new RenderKitError('REPLAY_FAILED', e instanceof Error ? e.message : String(e));
};
```

- `fromBuffer(options?)` → `buildReplaySessions({ type: 'buffer', buffer }, { ...kitOptions, ...options })`, `allowEmptySource: true`
- `fromEvents(events, options?)` → `buildReplaySessions({ type: 'events', events }, { ...kitOptions, ...options })`, `allowEmptySource: true`
- `fromSerialized(json, options?)` → `buildReplaySessions({ type: 'serialized', json }, { ...kitOptions, ...options })`, `allowEmptySource: false`
- `engine(source, sessionId?, options?)` → `createReplayEngine(source, sessionId as ReplaySessionId | undefined, { ...kitOptions, ...options })`, `allowEmptySource: false`

**`createDisabledReplay()` contract:**
- `enabled: false`
- `fromBuffer()` → `Object.freeze([])`
- `fromEvents()` → `Object.freeze([])`
- `fromSerialized()` → `Object.freeze([])`
- `engine()` → throws `RenderKitError('DISABLED', 'render-kit replay subsystem is disabled')`

---

### Phase 7 — Intelligence Subsystem

**[✅] Step 7.1: Create `src/subsystems/intelligence.ts`**

Implement `createIntelligenceSubsystem` and `createDisabledIntelligence`.

**`createIntelligenceSubsystem(config, buffer)` — analyze function:**

```typescript
const kitOptions: IntelligenceOptions = {
  maxBottlenecks: config.maxBottlenecks,
  maxRecommendations: config.maxRecommendations,
  confidenceThreshold: config.confidenceThreshold,
  correlationWindowMs: config.correlationWindowMs,
  includeWellOptimized: config.includeWellOptimized,
  plugins: [...config.plugins],  // snapshot at construction time
};

const analyze = (source?: IntelligenceSource, options?: Partial<IntelligenceOptions>): IntelligenceReport => {
  const effectiveSource: IntelligenceSource = source ?? {
    type: 'events',
    events: [...buffer.getSnapshot().events],
  };
  const mergedOptions: IntelligenceOptions = {
    ...kitOptions,
    ...options,
    // kit plugins (from config) run BEFORE caller-provided plugins
    plugins: [...kitOptions.plugins, ...(options?.plugins ?? [])],
  };
  try {
    return analyzeRenders(effectiveSource, mergedOptions);
  } catch (e) {
    throw new RenderKitError('ANALYSIS_FAILED', e instanceof Error ? e.message : String(e));
  }
};
```

**`createDisabledIntelligence()` contract:**
- `analyze()` → throws `RenderKitError('DISABLED', 'render-kit intelligence subsystem is disabled')`

---

### Phase 8 — Kit Factory

**[✅] Step 8.1: Create `src/factory/kit-factory.ts`**

Implements `createRenderKit(config?)` per the Initialization and Teardown orders defined in the Architecture Contract. Full algorithm:

```typescript
export const createRenderKit = (config: RenderKitConfig = {}): RenderKit => {
  const resolved = resolveConfig(config);

  if (!resolved.enabled) {
    return createDisabledKit(resolved);
  }

  const buffer = createTelemetryBuffer({ maxEvents: resolved.telemetry.maxEvents });
  const deregFns: Array<() => void> = [];
  resolved.telemetry.transports.forEach((t) => {
    deregFns.push(registerTransport(t));
  });

  const telemetry = createTelemetrySubsystem(resolved.telemetry, buffer, deregFns);
  const replay = createReplaySubsystem(resolved.replay, buffer);
  const intelligence = createIntelligenceSubsystem(resolved.intelligence, buffer);

  let destroyed = false;

  const destroy = (): void => {
    if (destroyed) return;
    destroyed = true;
    // Reverse order teardown
    for (let i = resolved.plugins.length - 1; i >= 0; i--) {
      const p = resolved.plugins[i]!;
      try {
        p.onDestroy?.(kit);
      } catch (e) {
        console.error(`[render-kit] plugin "${p.id}" onDestroy threw:`, e);
      }
    }
    deregFns.forEach((fn) => fn());
    deregFns.length = 0;
    buffer.clear();
  };

  const kit: RenderKit = {
    config: resolved,
    enabled: true,
    telemetry,
    replay,
    analyze: intelligence.analyze,
    destroy,
  };

  // Forward order init, then freeze
  resolved.plugins.forEach((p) => {
    try {
      p.onInit?.(kit);
    } catch (e) {
      console.error(`[render-kit] plugin "${p.id}" onInit threw:`, e);
    }
  });

  return Object.freeze(kit);
};
```

**`createDisabledKit(resolved)` — private helper:**

```typescript
const createDisabledKit = (resolved: ResolvedRenderKitConfig): RenderKit =>
  Object.freeze({
    config: resolved,
    enabled: false,
    telemetry: createDisabledTelemetry(),
    replay: createDisabledReplay(),
    analyze: (): never => {
      throw new RenderKitError('DISABLED', 'render-kit is disabled');
    },
    destroy: (): void => undefined,
  });
```

---

### Phase 9 — React Context

**[✅] Step 9.1: Create `src/context/kit-context.ts`**

File extension: `.ts` (not `.tsx`). Uses `React.createElement`, not JSX.

```typescript
import React from 'react';
import { RenderKitError } from '../errors/kit-error.js';
import type { RenderKit, RenderKitProviderProps } from '../types/index.js';

const RenderKitContext = React.createContext<RenderKit | null>(null);

export const RenderKitProvider = ({ kit, children }: RenderKitProviderProps): React.ReactElement =>
  React.createElement(RenderKitContext.Provider, { value: kit }, children);

export const useRenderKit = (): RenderKit => {
  const kit = React.useContext(RenderKitContext);
  if (kit === null) {
    throw new RenderKitError('CONTEXT_MISSING', 'useRenderKit() must be called inside <RenderKitProvider>');
  }
  return kit;
};
```

If `import React from 'react'` fails type check with `Module '"react"' has no default export`, add `"allowSyntheticDefaultImports": true` to `tsconfig.json` compilerOptions.

`RenderKitProvider` does NOT carry `'use client'` directive. It is framework-neutral. Next.js App Router consumers add `'use client'` to their own wrapper.

---

### Phase 10 — Public Index

**[✅] Step 10.1: Create `src/index.ts`**

Implement the exact export list from the **Package API** section above.

**Mandatory rules for this file:**
1. `export *` is prohibited — every export must be named explicitly
2. No logic, no `const`, no `let`, no function declarations
3. No top-level side effects
4. `export type` blocks are separate from `export { }` blocks (required for correct CJS type stripping)
5. All internal imports use `.js` extensions (TypeScript Bundler resolution)

---

### Phase 11 — Tests

**[✅] Step 11.1: Create `tests/setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

**[✅] Step 11.2: Create `tests/helpers.ts`**

Implement the following factories. Mirror the pattern from `packages/render-intelligence/tests/helpers.ts`:

- `makeKit(config?: RenderKitConfig): RenderKit` — calls `createRenderKit(config)`
- `makeDisabledKit(): RenderKit` — calls `createRenderKit({ enabled: false })`
- `makePlugin(overrides?: Partial<RenderKitPlugin>): RenderKitPlugin` — returns plugin with `vi.fn()` for `onInit` and `onDestroy`
- `makeRenderEvent(overrides?: Partial<RenderEvent>): RenderEvent` — minimal `type: 'render'` event with all required fields
- `makeScoreEvent(overrides?: Partial<ScoreEvent>): ScoreEvent` — minimal `type: 'score'` event
- `seq()` — monotonic sequence counter for `sequenceNumber` field; reset between tests via `beforeEach`

**[✅] Step 11.3: Create `tests/kit-config.test.ts`** — 15 cases per Testing Contract

**[✅] Step 11.4: Create `tests/kit-error.test.ts`** — 6 cases per Testing Contract

**[⬜] Step 11.5: Create `tests/kit-factory.test.ts`** — 18 cases per Testing Contract

The two isolation cases require a spy on `createTelemetryBuffer`:
```typescript
import * as telemetryCore from '@sapanmozammel/render-telemetry-core';
const spy = vi.spyOn(telemetryCore, 'createTelemetryBuffer');
// ... verify NOT called for disabled kit
```

The multi-kit transport isolation case:
```typescript
const transport = createMemoryTransport();
const kit1 = createRenderKit({ telemetry: { transports: [transport] } });
const kit2 = createRenderKit({ telemetry: { transports: [transport] } });
kit1.destroy();
// Push to kit2 buffer and verify transport still emits
kit2.telemetry.buffer.push(makeRenderEvent());
// emit check: not applicable here — transports are triggered by emitEvents, not buffer.push directly
// Instead, verify kit2 can still registerTransport after kit1 destroy
const deregFn = kit2.telemetry.registerTransport(createMemoryTransport());
expect(typeof deregFn).toBe('function');
```

**[⬜] Step 11.6: Create `tests/kit-context.test.ts`** — 6 cases per Testing Contract

**[⬜] Step 11.7: Create `tests/telemetry-subsystem.test.ts`** — 12 cases per Testing Contract

**[⬜] Step 11.8: Create `tests/replay-subsystem.test.ts`** — 10 cases per Testing Contract

**[⬜] Step 11.9: Create `tests/intelligence-subsystem.test.ts`** — 10 cases per Testing Contract

**[⬜] Step 11.10: Create `tests/re-exports.test.ts`** — 11 cases per Testing Contract

---

### Phase 12 — Demo

**[✅] Step 12.1: Create `demo/src/features/render-kit/index.tsx`**

Implement `RenderKitDemo` (named export + default export). No `scenarios.ts` — single component showing the minimum viable integration proof.

The demo must show exactly four things in sequence:
1. **Install** — display the install command as inline code
2. **Init** — show the resolved config (`kit.config.enabled`, `kit.config.telemetry.maxEvents`) as formatted JSON
3. **Event** — push one synthetic render event to `kit.telemetry.buffer`; display the buffer's event count
4. **Analyze** — call `kit.analyze()`; display `report.applicationHealth.grade` and `report.bottlenecks.length`

The kit is created once per component lifecycle with `useRef`:
```typescript
const kitRef = useRef<RenderKit | null>(null);
if (kitRef.current === null) {
  kitRef.current = createRenderKit();
}
const kit = kitRef.current;
```

Use `'use client'` directive (Next.js App Router requirement). Import from `@sapanmozammel/render-kit`.

The component is NOT interactive (no tabs, no scenario selector, no buttons). It computes and displays results on mount via `useMemo`. If `kit.analyze()` throws (empty buffer before events are pushed), catch and display `'—'` for the analysis section.

**[✅] Step 12.2: Update `demo/package.json`**

Add `"@sapanmozammel/render-kit": "workspace:*"` to `dependencies`.

**[✅] Step 12.3: Update `demo/src/lib/registry/index.ts`**

Add as the 12th entry:
```typescript
{
  name: 'render-kit',
  slug: 'render-kit',
  description:
    'Unified orchestration SDK — one install for all react-render-kit packages with a single config, pre-wired telemetry, replay, and intelligence pipeline.',
  packageName: '@sapanmozammel/render-kit',
  version: '1.0.0',
  tags: ['sdk', 'orchestration', 'infrastructure', 'unified'],
  status: 'stable',
  demoImport: () =>
    import('@/features/render-kit').then((m) => ({ default: m.RenderKitDemo })),
},
```

---

### Phase 13 — CLAUDE.md + Quality Gate

**[✅] Step 13.1: Update `CLAUDE.md`**

Add package structure block after `packages/render-intelligence`:

```
### `packages/render-kit` (library)

src/
  config/kit-config.ts        # resolveConfig() + clamp guards — no sibling package runtime imports
  errors/kit-error.ts         # RenderKitError class + createRenderKitError
  subsystems/telemetry.ts     # createTelemetrySubsystem + DISABLED_BUFFER + createDisabledTelemetry
  subsystems/replay.ts        # createReplaySubsystem + createDisabledReplay
  subsystems/intelligence.ts  # createIntelligenceSubsystem + createDisabledIntelligence
  factory/kit-factory.ts      # createRenderKit + createDisabledKit
  context/kit-context.ts      # RenderKitContext, RenderKitProvider, useRenderKit
  types/index.ts              # all public types; zero runtime code
  index.ts                    # locked manifest re-exports; no logic; no export *
tests/
dist/                         # build output (gitignored)
```

Add slash command row:
```
| `/implement render-kit` | Execute the PRD at `.claude/plans/render-kit/prd.md` step by step |
```

**[✅] Step 13.2: Run quality gate**

```bash
cd packages/render-kit
pnpm run test
pnpm run type:check
pnpm run build
pnpm publish --dry-run
```

All four must exit 0. Then run:
```bash
cd ../../demo
pnpm run build
```

Demo build must also exit 0.

---

## Verification Checklist

Self-review each item before declaring implementation done:

**Core SDK**
- [ ] `pnpm run test` passes — all ≥ 77 test cases green
- [ ] `tsc --noEmit` — zero errors under `strict: true` + `exactOptionalPropertyTypes: true`
- [ ] `pnpm run build` produces `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts`
- [ ] `pnpm publish --dry-run` tarball contains `dist/` and `README.md`
- [ ] `dist/index.mjs` does NOT contain inlined code from any sibling package (check file size < 50KB and grep for no sibling package source)

**Disabled Kit**
- [ ] `createRenderKit({ enabled: false })` — `createTelemetryBuffer` spy is NOT called
- [ ] Disabled `kit.telemetry.buffer` is `DISABLED_BUFFER` (same object reference)
- [ ] Disabled `kit.analyze()` throws `RenderKitError` with `.code === 'DISABLED'`
- [ ] Disabled `kit.replay.fromBuffer()` returns `[]`
- [ ] Disabled `kit.destroy()` does not throw

**Enabled Kit**
- [ ] `createRenderKit()` (no args, `NODE_ENV=development`) — `kit.enabled === true`
- [ ] Buffer push → `kit.telemetry.snapshot().events` grows
- [ ] `kit.telemetry.registerTransport(t)` → returns deregistration fn
- [ ] `kit.analyze()` with buffer events returns `IntelligenceReport` with `applicationHealth`
- [ ] `kit.replay.fromBuffer()` with buffer events returns `ReplaySession[]`
- [ ] `kit.destroy()` is idempotent — second call silent

**Plugins**
- [ ] `onInit` called in forward order
- [ ] `onDestroy` called in reverse order
- [ ] Plugin `onInit` error does not abort factory
- [ ] Plugin `onDestroy` error does not abort teardown

**Context**
- [ ] `useRenderKit()` outside provider throws `RenderKitError` with `.code === 'CONTEXT_MISSING'`
- [ ] `useRenderKit()` inside provider returns correct kit

**Re-exports (Locked Manifest)**
- [ ] All 11 hook/factory symbols verified as functions by `re-exports.test.ts`
- [ ] `export *` does NOT appear in `src/index.ts`

**Multi-instance isolation**
- [ ] Two kit instances with separate buffers — verified by test
- [ ] `kit1.destroy()` does not deregister kit2's transports — verified by test

**Config**
- [ ] `maxEvents: 0` → `resolvedConfig.telemetry.maxEvents === 1` + warn
- [ ] `confidenceThreshold: 2` → `resolvedConfig.intelligence.confidenceThreshold === 1` + warn
- [ ] Plugin with empty id → not in `resolved.plugins` + warn

**Demo**
- [ ] `cd demo && pnpm run build` exits 0
- [ ] `/render-kit` route renders in the registry

**CLAUDE.md**
- [ ] Structure block added
- [ ] Slash command row added

---

## v1 Release Freeze Checklist

These conditions must ALL be true before `pnpm publish` is run on `render-kit`:

- [ ] All 11 sibling packages are published and live on npm with their listed versions
- [ ] `render-kit` `package.json` `version` is `1.0.0`
- [ ] All `workspace:*` dependencies resolve to published semver ranges (verify with `pnpm publish --dry-run` output)
- [ ] `dist/index.mjs` does NOT inline any sibling package code (tsup external verification)
- [ ] `sideEffects: false` is present in `package.json`
- [ ] No `export *` in `src/index.ts` (verified by `grep -r 'export \*' src/`)
- [ ] `pnpm run test` exits 0 with ≥ 77 cases
- [ ] `pnpm run type:check` exits 0
- [ ] `pnpm run build` exits 0
- [ ] `pnpm publish --dry-run` tarball includes `dist/` and `README.md`; no `.env` files; no source files
- [ ] `demo/pnpm run build` exits 0 (proves re-exports resolve correctly in a real Next.js build)
- [ ] Two-kit isolation test passes (confirms no shared buffer state)
- [ ] Plugin reverse-order destroy test passes
- [ ] `enabled: false` no-allocation test passes

---

## Risk Table

### Critical

| Risk | Description | Mitigation |
|------|-------------|------------|
| **tsup bundles sibling packages** | If `external` is missing or incomplete, tsup inlines all 11 packages into a single file (potentially 500KB+). Users would get duplicate React/hook instances. | `SIBLING_PACKAGES` array in `tsup.config.ts` must be exhaustive. After build, `wc -c dist/index.mjs` must be < 50KB. Gate in Verification step 13.2. |
| **Multiple kit instances corrupt shared transport registry** | `registerTransport` / `unregisterAllTransports` operate on a module-level singleton. Calling `unregisterAllTransports()` on kit1 removes kit2's transports. | `destroy()` calls only individual deregistration fns from `deregFns`. `unregisterAllTransports()` on the public telemetry facade also only calls fns in `deregFns`. Covered by multi-kit isolation test. |
| **`workspace:*` → unpublished package at publish time** | If any sibling package is not yet on npm, `pnpm publish` succeeds locally but the tarball references a non-existent version. Consumers get install errors. | v1 Release Freeze Checklist item: all 11 packages published first. |
| **`enabled: false` allocates buffer** | If `createTelemetryBuffer` is called on the disabled path, the zero-overhead guarantee is violated. In React strict mode + concurrent features, this could create O(N) buffers. | `enabled: false` returns `createDisabledKit` at Step 2, before Step 3 (buffer allocation). Test with `vi.spyOn` on `createTelemetryBuffer` — must not be called. |

### Medium

| Risk | Description | Mitigation |
|------|-------------|------------|
| **`CURRENT_SCHEMA_VERSION` name collision** | Both `render-telemetry-core` and `render-core-schema` export `CURRENT_SCHEMA_VERSION`. Exporting both from `index.ts` causes a compile error. | The locked manifest exports `CURRENT_SCHEMA_VERSION` only from `render-telemetry-core`. `render-core-schema` provides no runtime re-exports. Verify during `tsc --noEmit`. |
| **React default import in `kit-context.ts`** | `import React from 'react'` may fail under strict `moduleResolution: Bundler` without `esModuleInterop`. | `tsconfig.json` includes `"esModuleInterop": true`. If the default import still fails, add `"allowSyntheticDefaultImports": true`. |
| **Plugin receives unfrozen kit during `onInit`** | If `Object.freeze` is called before the `onInit` loop, plugins can read but not mutate. If called after, a plugin can add properties. Current spec: freeze AFTER the loop. Mutation in onInit is a code smell but not a hard error. | Document this in `kit-factory.ts` with a comment. The spec is clear: freeze after all `onInit` calls. |
| **`analyze()` called after `destroy()`** | After `destroy()`, `buffer.clear()` has run. `analyze()` without a source arg produces `ANALYSIS_FAILED` (empty buffer). This is correct behavior but may surprise users. | Document in README. No code change required. |
| **jsdom vs Node.js environment mismatch** | `performance.now()` behavior differs. `createTelemetrySession` uses `globalThis.performance?.now() ?? Date.now()`. | Covered by jsdom in vitest config. No additional action needed. |

### Low

| Risk | Description | Mitigation |
|------|-------------|------------|
| **`exactOptionalPropertyTypes` breaks `RenderKitPlugin.onInit`** | Optional method `onInit?: (kit: RenderKit) => void` combined with `exactOptionalPropertyTypes` may reject `onInit: undefined`. | Type is `onInit?: (kit: RenderKit) => void` — the `?` makes it omittable. Assigning `undefined` is rejected, which is correct. No issue. |
| **Demo recreates kit on every render** | Without `useRef`, `createRenderKit` called each render allocates a new buffer and registers transports. | Step 12.1 specifies `useRef` pattern. Kit is created once per component mount. |
| **pnpm hoisting causes wrong version resolution** | In the monorepo, `pnpm` may hoist a sibling package's `node_modules` to the root, causing `workspace:*` to resolve to a different version than expected. | `pnpm-workspace.yaml` is authoritative. `pnpm install` from root is the canonical install command. No code change needed. |

---

*PRD version: 2.0.0 — production contract spec — ready for `/implement render-kit`*
