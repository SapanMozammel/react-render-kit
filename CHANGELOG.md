# Changelog

All published releases for the react-render-kit monorepo. Reverse-chronological order.

---

## 2026-06-12

### `@sapanmozammel/render-kit@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/render-intelligence@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/render-replay-engine@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/render-telemetry-core@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/render-core-schema@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/render-playground@1.0.2`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/render-insights@1.0.2`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/why-render@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/why-render-frequency@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/render-trace@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/unstable-props-detector@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

### `@sapanmozammel/memo-effect-analyzer@1.0.1`

Nested NodeNext-compatible exports map — improves type resolution under `moduleResolution: NodeNext/Node16`. No API changes.

---

### `@sapanmozammel/render-kit@1.0.0`

Initial release of the unified SDK. Wraps all 11 sibling packages behind a single `createRenderKit()` factory with pre-wired telemetry, replay, and intelligence subsystems. Includes `RenderKitProvider`, `useRenderKit` context hook, and full re-export manifest.

---

## 2026-06-11

### `@sapanmozammel/render-intelligence@1.0.0`

Initial release. Cross-component post-hoc analysis: bottleneck ranking, correlation detection, root cause classification (4 detectors), and 15 deterministic recommendations. `analyzeRenders()` accepts events, snapshots, or replay sessions. Plugin system via `createPlugin()`.

### `@sapanmozammel/render-core-schema@1.0.0`

Initial release. Canonical TypeScript type definitions and protocol contracts for the ecosystem. Zero runtime code — pure types, type guards, and `CURRENT_SCHEMA_VERSION`. Shared vocabulary for all 12 packages.

### `@sapanmozammel/render-replay-engine@1.0.0`

Initial release. Pure TypeScript time-travel replay engine. `buildReplaySessions()` groups telemetry events into navigable `ReplaySession[]`. `createReplayEngine()` produces immutable cursor navigation, 7 filter presets, and an in-memory bookmark store.

### `@sapanmozammel/render-telemetry-core@1.0.0`

Initial release. Typed event protocol: 7 event factories, `createTelemetryBuffer()` ring buffer (useSyncExternalStore-compatible), 3 transport implementations (memory, localStorage, custom), and buffer serialization/deserialization.

---

## 2026-06-10

### `@sapanmozammel/render-playground@1.0.1`

Added README. No API changes.

### `@sapanmozammel/render-insights@1.0.1`

Added README. No API changes.

### `@sapanmozammel/render-playground@1.0.0`

Initial release. Visual in-app render observatory: `RenderPlaygroundPanel` component with score gauge, prop diff table, render timeline, memo classification badge, frequency meter, and recommendations. `useRenderPlayground()` hook and `PlaygroundProvider`. `useInsightCapture()` headless variant.

### `@sapanmozammel/render-insights@1.0.0`

Initial release. Unified per-component diagnostics hook: correlates prop changes, render frequency, unstable reference detection, and memo effectiveness into a single scored `InsightReport`. Score formula produces a 0–100 health score with letter grade.

---

## 2026-06-09

### `@sapanmozammel/memo-effect-analyzer@1.0.0`

Initial release. Classifies `React.memo` effectiveness over a render session: `EFFECTIVE`, `INEFFECTIVE`, `PARTIALLY_EFFECTIVE`, `NOT_APPLICABLE`. Per-render `RenderSignal` with `SignalKind` (`genuine`, `reference-only`, `mixed`).

### `@sapanmozammel/unstable-props-detector@1.0.0`

Initial release. Detects props whose reference identity changes every render (functions, objects, arrays) while value remains equivalent — silently defeating `React.memo`. Reports `PropInstability[]` with type classification.

### `@sapanmozammel/render-trace@1.0.0`

Initial release. Traces React render cascade propagation. `createRenderTrace()` factory produces a shared `TraceInstance`. `useTraceRender()` registers components. Reports root-trigger component, cascade depth, and total renders per cycle.

### `@sapanmozammel/why-render-frequency@1.0.0`

Initial release. Tracks per-component render frequency with rolling-window rate calculation. Classifies observation as `Low`, `Moderate`, or `High`. Dev-only, zero production cost.

---

## 2026-06-08

### `@sapanmozammel/why-render@1.0.0`

Initial release. Development hook that logs why a React component re-rendered by diffing previous vs. current props. Detects primitive value changes, object/array/function reference churn, added props, and removed props. Grouped console output.
