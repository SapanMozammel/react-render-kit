# render-telemetry-core Demo Page

## Feature

Add a demo page at `/render-telemetry-core` that shows the event protocol in live action — a component instrumented with all 7 event factories, a real-time event stream panel reading from `TelemetryBuffer` via `useSyncExternalStore`, and 4 scenarios that demonstrate different event-emission patterns.

---

## Context

Every prior tool in the suite (`why-render`, `render-insights`, etc.) has a demo page. `render-telemetry-core` is the 8th package and ships as an infrastructure layer (typed event protocol, session lifecycle, buffer, transport) with zero React dependency. The demo serves a different purpose than the others: it shows **how to wire the low-level protocol** — factories, session threading, buffer subscription — rather than showing a drop-in hook.

Related PRD: `.claude/plans/render-telemetry-core/prd.md` (the package itself).

---

## Adoption Brief

**Adopted:**
- Demo feature pattern from `demo/src/features/render-insights/` (ScenarioTabs, ScenarioInner, DemoTarget, panel, code hints)
- `useSyncExternalStore` for buffer subscription — no `useEffect` for state
- `useRef` for session and render-count initialization (first-render guard)
- `useEffect` for unmount-only cleanup (session-end emission) — the only valid use here per `no-use-effect` skill
- `@sapanmozammel/render-telemetry-core` package APIs

**Not adopted:**
- No new npm dependencies
- No custom transport in the demo (MemoryTransport is sufficient for display; LocalStorageTransport intentionally excluded — README warns against production use)
- No `useRenderInsights` or other `@sapanmozammel/*` packages — demo must show the raw protocol

---

## Architecture Strategy

### Hook: `useTelemetryCapture`

Demo-internal hook. Not exported from the package. Lives only in `demo/src/features/render-telemetry-core/index.tsx`.

Responsibilities:
1. Create `TelemetryBuffer` once on first render (via `useRef`)
2. Create `TelemetrySession` once on first render (via `useRef` init guard)
3. On first render: emit `session-start` event → push to buffer
4. On every render: emit `render` event; if props changed, emit `prop-change` event; compute and emit `frequency`, `score`, `recommendation` events
5. On unmount: emit `session-end` event (via `useEffect` cleanup returning a fn)
6. Subscribe to buffer via `useSyncExternalStore` — returns live snapshot
7. Expose `clear()` (calls `buffer.clear()`) and `snapshot`

### Session threading

Every factory call in `render-telemetry-core` follows the immutable pattern:
```ts
const { event, session: nextSession } = createRenderEvent(session, data);
```
The returned `session` (with incremented `sequenceCounter`) must be threaded into the next factory call in the same render cycle. Store the current session in a `useRef` that is updated synchronously (in render body, before effects).

### Props tracking

Keep previous props in a `useRef<Record<string, unknown> | null>`. On each render after the first, diff the props to produce `TelemetryPropChangeEntry[]` and `TelemetryPropInstability[]`. Inline simplified diff logic (no import from `@sapanmozammel/*`).

### Frequency

Keep a sliding window of timestamps in a `useRef<number[]>`. On each render, push `Date.now()`, prune entries older than `windowMs` (10 000ms default), derive `rate` and `classification`.

### Score (simplified, demo-only)

```
score = max(0, min(100, 100 − frequencyPenalty − instabilityPenalty − memoPenalty − mixedSignalPenalty))
frequencyPenalty  = freq === 'LOW' ? 0 : freq === 'MODERATE' ? 10 : 25
instabilityPenalty = min(unstableCount * 8, 30)
memoPenalty       = session === 'INEFFECTIVE' ? 30 : session === 'PARTIALLY_EFFECTIVE' ? 15 : 0
mixedSignalPenalty = min(mixedCount * 3, 15)
grade = score >= 90 ? 'EXCELLENT' : score >= 70 ? 'GOOD' : score >= 50 ? 'MODERATE' : 'POOR'
```

Signal window: last 20 signals stored in `useRef<TelemetrySignalKind[]>`. Push only when a `prop-change` event is emitted.

### Memoization

`TelemetryHealthGrade` in `render-telemetry-core` has 5 values: `EXCELLENT`, `GOOD`, `MODERATE`, `POOR`, `CRITICAL`. `CRITICAL` is reserved for future use; the scoring function above never produces it.

### Buffer subscription

```tsx
const snapshot = useSyncExternalStore(
  buffer.subscribe,
  buffer.getSnapshot,
  buffer.getServerSnapshot,
);
```

All event display reads from `snapshot.events` — no `useState` needed.

### StrictMode double-invoke guard

React 18 StrictMode invokes function bodies and `useEffect` setup twice in development. Guard against double session-start emission by checking `sessionRef.current.sequenceCounter > 0` before emitting `session-start`. Guard against double unmount emission by using a `unmountedRef` boolean.

---

## Data & Types

All types are local to the demo file. No new exported types.

```ts
// In demo component file — local only
type DemoProps = {
  title: string;
  count: number;
  tags?: string[];
  onAction?: () => void;
};

type CaptureOptions = {
  ignoreProps?: string[];
  frequencyWindowMs?: number;
};
```

Reuse `TelemetryEventType` and all event types from `@sapanmozammel/render-telemetry-core` for display logic.

---

## Scenarios

### `ScenarioId` union
```ts
type ScenarioId = 'basic-lifecycle' | 'prop-changes' | 'reference-instability' | 'full-pipeline';
```

### Scenario 1 — Basic Lifecycle (`ok`)
- Component receives only stable primitive props
- Parent re-renders do NOT change any props
- Events emitted: `session-start`, `render` (each click), `frequency`, `score`, `recommendation`
- No `prop-change` event (title/count don't change)
- Trigger label: `"Re-render parent"`
- Shows: session threading, sequence numbers incrementing, frequency building up

### Scenario 2 — Prop Changes (`ok`)
- Each trigger changes `count` (primitive), producing a `genuine-prop-change` signal
- Events emitted: `session-start`, `render`, `prop-change` (kind: `value-changed`), `frequency`, `score`, `recommendation`
- Score stays high (genuine data changes = EFFECTIVE memo session)
- Trigger label: `"Change data"`

### Scenario 3 — Reference Instability (`warn`)
- Each trigger bumps a parent tick, causing `tags` (array) and `onAction` (function) to get new references
- Events emitted: `session-start`, `render`, `prop-change` (kind: `reference-changed`), `frequency`, `score`, `recommendation`
- Score drops (INEFFECTIVE session, instability penalty)
- Trigger label: `"Re-render parent"`

### Scenario 4 — Full Pipeline (`warn`)
- Combines rapid triggers (HIGH frequency) + mixed prop changes (genuine + reference-only)
- `count` changes (genuine) + `tags`/`onAction` new references (reference-only) on same render
- Events emitted: all 7 types per trigger cycle
- Score tanks from multiple penalties
- Trigger label: `"Cascade trigger"`

---

## Affected Files

- `demo/package.json` — add `@sapanmozammel/render-telemetry-core: "workspace:*"` dependency
- `demo/src/lib/registry/index.ts` — add 8th entry

---

## New Files

- `demo/src/features/render-telemetry-core/scenarios.ts` — scenario data (ScenarioId union, Scenario type, SCENARIOS array)
- `demo/src/features/render-telemetry-core/index.tsx` — `RenderTelemetryCoreDemo` named export; contains `useTelemetryCapture`, `EventStreamPanel`, `DemoTarget`, `ScenarioTabs`, `ScenarioInner`

---

## Implementation Steps

### Phase 1: Scenarios data

- [✅] **Step 1** — Create `demo/src/features/render-telemetry-core/scenarios.ts`
  - Define `ScenarioId` type union (4 IDs)
  - Define `ScenarioBadge` type (`'ok' | 'warn'`)
  - Define `Scenario` type with fields: `id`, `label`, `description`, `badge`, `triggerLabel`, `triggerBothTicks` (boolean — both parentTick and dataTick on same trigger), `canFix`, `fixDescription`, `codeBreaking`, `codeFixed`
  - Export `SCENARIOS: readonly Scenario[]` with all 4 entries (see Scenarios section above)

### Phase 2: Demo component

- [✅] **Step 2** — Create `demo/src/features/render-telemetry-core/index.tsx`
  - `'use client';` directive at top
  - Import all needed factories + types from `@sapanmozammel/render-telemetry-core`
  - Import `useSyncExternalStore` from `react`

- [✅] **Step 3** — Implement `useTelemetryCapture(componentName, props, options)` hook
  - `bufferRef`: `useRef(createTelemetryBuffer({ maxEvents: 200 }))` — stable reference
  - `sessionRef`: `useRef<TelemetrySession | null>(null)` — mutable session state
  - `renderCountRef`: `useRef(0)` — monotonic render counter
  - `prevPropsRef`: `useRef<Record<string, unknown> | null>(null)` — for diff
  - `timestampsRef`: `useRef<number[]>([])` — frequency window
  - `signalWindowRef`: `useRef<TelemetrySignalKind[]>([])` — last 20 signals
  - `hasStartedRef`: `useRef(false)` — StrictMode guard for session-start
  - `unmountedRef`: `useRef(false)` — StrictMode guard for session-end

- [✅] **Step 4** — Session initialization and `session-start` event in render body
  - If `sessionRef.current === null`: create session, assign to ref
  - If `!hasStartedRef.current`: emit `session-start`, push to buffer, push session to buffer, set `hasStartedRef.current = true`
  - Thread returned session back into `sessionRef.current`

- [✅] **Step 5** — Per-render emission in render body (synchronous, before effects)
  - Increment `renderCountRef.current`
  - Push `Date.now()` to timestamps window, prune stale entries
  - Diff `prevPropsRef.current` against current `props` to produce `changed[]` and `unstable[]`
  - Thread session through each factory call:
    1. `createRenderEvent(session, { renderNumber, triggeredBy })` — `triggeredBy` is `'props'` if any prop changed, else `'parent'`
    2. If `changed.length > 0`: `createPropChangeEvent(session, { renderNumber, changed, unstable, inferredTrigger, signalKind })`
    3. `createFrequencyEvent(session, { renderNumber, windowMs, windowCount, rate, classification, totalRenders })`
    4. `createScoreEvent(session, { renderNumber, score, grade, ...penalties, memoClassification, signalKind })`
    5. `createRecommendationEvent(session, { renderNumber, recommendations })`
  - Push all events to buffer via `buffer.push(event)` in order
  - Update `sessionRef.current` to the final threaded session
  - Update `buffer.updateSession(sessionRef.current)`
  - Update `prevPropsRef.current = props`

- [✅] **Step 6** — Unmount cleanup via `useEffect`
  ```ts
  useEffect(() => {
    return () => {
      if (unmountedRef.current) return;
      unmountedRef.current = true;
      const session = sessionRef.current;
      if (!session) return;
      const ended = endTelemetrySession(session);
      const { event: endEv } = createSessionEndEvent(ended, {
        totalRenders: renderCountRef.current,
        finalScore: null, // demo doesn't compute final score
      });
      bufferRef.current.push(endEv);
      bufferRef.current.updateSession(ended);
    };
  }, []); // empty deps — runs cleanup only on unmount
  ```

- [✅] **Step 7** — Subscribe to buffer and return from hook
  ```ts
  const snapshot = useSyncExternalStore(
    bufferRef.current.subscribe,
    bufferRef.current.getSnapshot,
    bufferRef.current.getServerSnapshot,
  );
  const clear = useCallback(() => bufferRef.current.clear(), []);
  return { snapshot, clear };
  ```

- [✅] **Step 8** — Implement `DemoTarget` component
  - Accepts `DemoProps & { ignoreProps: string[] }` + `buffer: TelemetryBuffer` (passed from parent — the capture hook's buffer ref is held in parent, but simpler: have `DemoTarget` call `useTelemetryCapture` internally and receive `onClear` / `snapshot` back via render props or pass buffer up via ref... Actually: **easier pattern** — `ScenarioInner` calls `useTelemetryCapture` itself and passes `snapshot` down to the panel; `DemoTarget` just displays current prop values and its own render count)
  - Actually: `useTelemetryCapture` is called at the `DemoTarget` level, and it returns `{ snapshot, clear }`. But then the `EventStreamPanel` also needs the snapshot. Solution: hoist `useTelemetryCapture` into `ScenarioInner`, pass `snapshot` and `clear` as props to `EventStreamPanel`, and pass only the "capture" side (emit events) as a prop to `DemoTarget`... but that requires a ref callback pattern.
  - **Correct approach**: Create a shared buffer in `ScenarioInner` via `useRef(createTelemetryBuffer())`. Pass the buffer down to `DemoTarget` as a prop. `DemoTarget` calls `useTelemetryCapture(componentName, props, { buffer })`. `ScenarioInner` subscribes to the buffer via `useSyncExternalStore`. This way the buffer is shared between the capture hook and the display panel.
  - Revise `useTelemetryCapture` signature to accept an external buffer: `useTelemetryCapture(componentName: string, props: Record<string, unknown>, buffer: TelemetryBuffer, options?: CaptureOptions): void` — returns nothing (side-effect only hook).
  - `ScenarioInner` subscribes to the buffer and passes `snapshot` to `EventStreamPanel`.

- [✅] **Step 9** — Implement `EventStreamPanel` component
  - Props: `{ snapshot: TelemetryBufferSnapshot; onClear: () => void }`
  - Displays `snapshot.events` in reverse order (latest first, up to 50)
  - Each event row: type badge (colored by event type), sequence number, component name, key payload fields
  - Empty state: "Trigger an action above. No output = no events yet."
  - Event type colors:
    - `session-start` / `session-end`: info/neutral (`console-entry__badge--ok`)
    - `render`: neutral
    - `prop-change`: warn if unstable, ok if no unstable (`console-entry__badge--warn` / `--ok`)
    - `frequency`: warn if `HIGH`, ok otherwise
    - `score`: map grade to ok/warn (`EXCELLENT`/`GOOD` → ok, `MODERATE`/`POOR`/`CRITICAL` → warn)
    - `recommendation`: neutral

- [✅] **Step 10** — Implement `ScenarioTabs`, `ScenarioInner`, `RenderTelemetryCoreDemo`
  - `ScenarioTabs`: same pattern as `render-insights` demo — role="tablist", aria-selected, scenario badge color
  - `ScenarioInner`:
    - `parentTick` and `dataTick` state (same pattern as render-insights)
    - `bufferRef = useRef(createTelemetryBuffer({ maxEvents: 200 }))` — stable across re-renders of `ScenarioInner`
    - `snapshot = useSyncExternalStore(bufferRef.current.subscribe, bufferRef.current.getSnapshot, bufferRef.current.getServerSnapshot)`
    - `clear = useCallback(() => bufferRef.current.clear(), [])`
    - Derives `DemoProps` from scenario + ticks (see Scenarios section)
    - Renders `<DemoTarget>` + `<EventStreamPanel snapshot={snapshot} onClear={clear} />`
    - Trigger button + code hint
    - `key={activeId}` on `ScenarioInner` (same as render-insights — resets state on scenario switch)
  - `RenderTelemetryCoreDemo`: manages `activeId` state, renders `<ScenarioTabs>` + `<ScenarioInner key={activeId}>` + "How to add this" code hint

### Phase 3: Registry and dependency

- [✅] **Step 11** — Add `@sapanmozammel/render-telemetry-core: "workspace:*"` to `demo/package.json` dependencies (alongside `render-insights` and `render-playground`). Run `pnpm install` to link it in the workspace.

- [✅] **Step 12** — Add entry to `demo/src/lib/registry/index.ts`
  ```ts
  {
    name: 'render-telemetry-core',
    slug: 'render-telemetry-core',
    description:
      'Typed event protocol and observability infrastructure — emit structured telemetry events from any React component, buffer them with useSyncExternalStore, and pipe them to custom transports. Zero dependencies, no React peer dep.',
    packageName: '@sapanmozammel/render-telemetry-core',
    version: '1.0.0',
    tags: ['debugging', 'performance', 'infrastructure', 'protocol'],
    status: 'beta',
    demoImport: () =>
      import('@/features/render-telemetry-core').then((m) => ({ default: m.RenderTelemetryCoreDemo })),
  },
  ```

---

## Verification

- [ ] `pnpm run test` — all green (no test regressions; this feature adds no new tests — demo code is not unit-tested per project convention)
- [ ] `tsc --noEmit` — no type errors in demo code
- [ ] `pnpm run build` — all packages build (render-telemetry-core must already be built: `pnpm --filter @sapanmozammel/render-telemetry-core run build`)
- [ ] `/render-telemetry-core` route loads without hydration errors
- [ ] All 4 scenarios switch without console errors
- [ ] Triggering each scenario emits visible events in the EventStreamPanel
- [ ] Clear button empties the stream
- [ ] Switching scenarios resets the event stream (key-based reset on `ScenarioInner`)
- [ ] Scenario 1 (basic-lifecycle): events are `session-start`, `render`, `frequency`, `score`, `recommendation` — no `prop-change`
- [ ] Scenario 2 (prop-changes): `prop-change` events show `kind: value-changed` for `count`
- [ ] Scenario 3 (reference-instability): `prop-change` events show `kind: reference-changed` for `tags` and `onAction`
- [ ] Scenario 4 (full-pipeline): all 7 event types appear within a few triggers
- [ ] `sequenceNumber` increments monotonically within the stream (visible in panel)
- [ ] Session entry visible in `snapshot.sessions` (no need to display in panel, but log check)
- [ ] TOOLS.length on homepage is 8

---

## Risks & Open Questions

1. **StrictMode double-invoke**: React 18 StrictMode fires `useEffect` twice in dev (mount, unmount, re-mount). The `hasStartedRef` + `unmountedRef` guards must handle this correctly — the session-start should only emit once, and session-end only on the final unmount. The buffer `clear()` on scenario switch (via key-based reset) also triggers the cleanup effect.

2. **`useSyncExternalStore` + `bufferRef`**: The buffer ref must be stable across re-renders of `ScenarioInner`. Using `useRef(createTelemetryBuffer())` is correct — the factory runs once. If `ScenarioInner` re-renders, the ref is unchanged. The `subscribe` / `getSnapshot` / `getServerSnapshot` functions are methods on the buffer object and are already stable (no need to wrap in `useCallback`).

3. **`session-end` timing**: The `useEffect` cleanup fires on unmount AND on StrictMode's intermediate unmount. The `unmountedRef` boolean prevents double emission but means the StrictMode re-mount will start a fresh session (correct behavior).

4. **`TelemetryHealthGrade` mismatch**: The score helper above maps to `EXCELLENT`/`GOOD`/`MODERATE`/`POOR` — confirm these match the `TelemetryHealthGrade` type in `render-telemetry-core` types. (From inspection: the type has `EXCELLENT | GOOD | MODERATE | POOR | CRITICAL` — the `MODERATE` here matches.)

5. **Import resolution**: `@sapanmozammel/render-telemetry-core` must be built before the demo dev server runs. Check that `demo/package.json` lists it as a dependency and that pnpm workspace links it correctly.

6. **No tests for demo code**: Per project convention, demo features (`demo/src/features/**`) have no Vitest tests. This is intentional.
