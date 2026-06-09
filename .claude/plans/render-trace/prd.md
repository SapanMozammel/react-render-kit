# PRD: `render-trace` v1.1

**Package:** `@sapanmozammel/render-trace`
**Monorepo:** react-render-kit
**Status:** Draft v1.1 — Implementation Ready
**Companion packages:** `@sapanmozammel/why-render`, `@sapanmozammel/why-render-frequency`
**Replaces:** v1.0 (over-engineered, React 18 constraints not fully addressed)

---

## 1. Product Overview

### What it is

`render-trace` is a development-only React hook that records how a re-render propagates through a component tree. It groups renders into cycles, identifies the root trigger component, and logs the cascade tree to the browser console.

### What it is not

It is not a profiler. It is not a fiber inspector. It does not measure render duration, time-to-paint, or CPU usage. It does not integrate with React DevTools internals.

### Problem it solves

Developers using `why-render` and `why-render-frequency` can answer:
- *Why* did this component re-render?
- *How often* is it re-rendering?

They still cannot answer:
- Which component *started* this chain of re-renders?
- How many levels deep did the cascade go?
- Which components were dragged in as side-effects of a parent re-render?

`render-trace` answers these questions by tracking render propagation across instrumented components within a single render cycle.

### Positioning within the toolkit

| Package | Question | Output |
|---|---|---|
| `why-render` | Why did this component re-render? | Changed props |
| `why-render-frequency` | How often does this component re-render? | Count, rate, observation |
| `render-trace` | How did the re-render cascade through the tree? | Propagation chain, root trigger, depth |

---

## 2. Goals

1. Track which instrumented components rendered together within a single render batch and group them into a **render cycle**.
2. Identify the **root trigger** — the highest-depth traced component in the cycle with no traced ancestor that also rendered.
3. Record the **cascade depth** — how many levels deep the propagation went from root to the deepest descendant.
4. Log a readable **propagation tree** to the console.
5. Expose a **programmatic API** for test assertions and custom tooling.
6. Be a **complete no-op in production** with zero bundle impact.

---

## 3. Non-Goals

- No UI rendering. No DOM elements, overlays, or panels.
- No render timing or duration measurement.
- No React Profiler API integration.
- No fiber tree traversal or React internals access.
- No automatic component discovery. Instrumentation is explicit and opt-in.
- No cross-root tracing (portals, separate React roots).
- No deferred render tracking (`startTransition`, `Suspense`, server components).
- No render-core abstraction layer (deferred to v2+).
- No timeline or flame chart visualizations (deferred to v2+).
- No cross-package data sharing with `why-render` or `why-render-frequency`.

---

## 4. Core Concepts

### 4.1 Render Node

A single recorded render event for one instrumented component within one cycle.

```
RenderNode {
  id:            string    // "{cycleId}:{componentName}:{renderIndex}"
  componentName: string    // developer-provided label
  cycleId:       string
  depth:         number    // 0 = root; 1 = direct child of root; etc.
  parentName:    string | null
  renderIndex:   number    // registration order within the cycle, 0-based
  timestamp:     number    // Date.now()
}
```

**`depth` and `parentName` are heuristic values** derived from a module-level render stack (see §4.3). They are accurate under synchronous React rendering. They may be incorrect under Concurrent Mode or Strict Mode double-invocation. See §7 for full constraints.

### 4.2 Render Cycle

A grouping of `RenderNode`s that belong to a single React update batch. Cycles are detected heuristically via microtask scheduling — see §5.3 for the mechanism and its limitations.

```
RenderCycle {
  id:           string              // "cycle-{n}", monotonically increasing
  startTime:    number
  endTime:      number | null       // null while active; set on flush
  nodes:        RenderNode[]        // ordered by renderIndex
  rootTrigger:  string | null       // componentName of the depth-0 node
  maxDepth:     number              // deepest depth across all nodes
  totalRenders: number              // nodes.length
  status:       'active' | 'flushed'
}
```

**Cycle boundaries are a heuristic, not a guarantee.** Two state updates batched by React 18's automatic batching will produce one cycle. Two updates separated by an async boundary may produce one or two cycles depending on task scheduling. Do not write production logic that depends on exact cycle boundaries.

### 4.3 Render Stack

A module-level array that tracks which traced components are currently in their render phase. Used to resolve parent-child relationships and compute `depth` at registration time.

**Mechanism:**
- During a component's render phase, `useTraceRender` calls `push(componentName)`.
- After the component's subtree finishes rendering, `useLayoutEffect` cleanup calls `pop(componentName)`.
- Because React renders top-down and `useLayoutEffect` runs bottom-up, the stack correctly contains the ancestor chain when a child registers.

**This is a heuristic.** See §7 for known failure modes under Strict Mode and Concurrent Mode.

### 4.4 Root Trigger

The `RenderNode` in a cycle with `depth === 0` and the lowest `renderIndex`. This is the highest-instrumented ancestor — the component that started the cascade as far as `render-trace` can observe.

**Important limitation:** if the true root trigger is not instrumented with `useTraceRender`, `render-trace` reports the highest traced ancestor it can see, not the actual origin. The root trigger label is always relative to the instrumentation boundary.

### 4.5 Cascade Depth

`RenderCycle.maxDepth` — the maximum `depth` value across all nodes in a cycle. Represents how many instrumented levels the re-render propagated through.

- `maxDepth === 0`: only one traced component re-rendered with no traced descendants following.
- `maxDepth === 3`: the re-render passed through four levels of instrumented components.

Cascade depth counts instrumented levels only, not total React tree depth.

---

## 5. System Design

### 5.1 Module Architecture

v1.1 consolidates the v1.0 three-file engine into a single file to eliminate unnecessary abstraction boundaries.

```
src/
  engine/
    engine.ts            # TraceEngine: stack, cycle management, node registration
  hook/
    use-trace-render.ts
  logger/
    trace-logger.ts
  types/
    index.ts
  index.ts
```

No `context/` directory. No `cycle-detector.ts`. No `render-stack.ts`. All engine state lives in `engine.ts`.

### 5.2 TraceEngine (`engine/engine.ts`)

One class. No internal delegates.

```ts
class TraceEngine {
  // --- State ---
  private cycles:       RenderCycle[]       // flushed cycles, FIFO-evicted at maxCycles
  private activeCycle:  RenderCycle | null
  private cycleCounter: number
  private stack:        string[]            // component name stack (see §5.3)
  private flushPending: boolean             // microtask scheduled?
  private options:      Required<RenderTraceOptions>
  enabled:              boolean

  // --- Internal ---
  private getOrCreateCycle(): RenderCycle
  private flush(): void
  private scheduleFlush(): void

  // --- Public ---
  registerNode(componentName: string): void
  unregisterNode(componentName: string): void
  getRenderChains(): RenderCycle[]
  getRootCause(): string | null
  resetTrace(): void
  start(): void
  stop(): void
}
```

**`registerNode(componentName)`** — called during the render phase by `useTraceRender`. Executes synchronously:
1. Reads current stack top → resolves `parentName` and `depth`.
2. Pushes `componentName` onto the stack.
3. Calls `getOrCreateCycle()` to get or create the active cycle.
4. Creates a `RenderNode` and appends to `activeCycle.nodes`.
5. Calls `scheduleFlush()` if not already scheduled.

**`unregisterNode(componentName)`** — called by `useLayoutEffect` cleanup in `useTraceRender`. Pops `componentName` from the stack top. If the top frame doesn't match (Concurrent Mode artifact), the pop is skipped and a `console.warn` is emitted once per session.

**`scheduleFlush()`** — calls `queueMicrotask(() => this.flush())` and sets `flushPending = true`. Idempotent — multiple calls before the microtask fires have no effect.

**`flush()`** — finalises `activeCycle`: sets `endTime`, computes `maxDepth`, sets `rootTrigger`, sets `status: 'flushed'`, appends to `cycles`, evicts oldest if `cycles.length > maxCycles`, clears stack, calls `traceLogger.log()`. Sets `activeCycle = null` and `flushPending = false`.

**`start()` / `stop()`** — toggles `this.enabled`. When stopped, `registerNode` is a no-op. In-flight cycle is flushed on `stop()`.

### 5.3 Cycle Detection Heuristic

Cycles are detected by scheduling a microtask after the first node registers. The assumption is:

> All synchronous renders triggered by a single React state update complete within the same JavaScript task. Therefore, a microtask scheduled during that task fires only after all renders have registered.

This holds for:
- Synchronous state updates inside React event handlers (React 18 automatic batching)
- `flushSync()` calls
- Initial mount renders

This **does not reliably hold** for:
- `startTransition` deferred renders (processed across multiple tasks)
- Renders triggered inside `setTimeout` or `setInterval` in React 17 (unbatched)
- `Suspense` fallback re-renders triggered by data resolution

For these cases, `render-trace` may produce multiple small cycles or combine unrelated renders into one cycle. This is expected and documented behaviour, not a bug.

**Practical consequence:** cycle boundaries are a debugging aid, not an exact measurement. Do not assert cycle counts in tests unless you control the rendering environment completely (synchronous test renderer).

### 5.4 Hook (`hook/use-trace-render.ts`)

```ts
export const useTraceRender = (
  componentName: string,
  options?: TraceRenderOptions,
): void => {
  const mountedRef = useRef(false);

  if (process.env.NODE_ENV !== 'development') return;

  const instance = options?.instance ?? defaultInstance;
  if (!instance.enabled || options?.enabled === false) return;

  instance.registerNode(componentName);

  // Pop the stack after this component's subtree finishes rendering.
  // useLayoutEffect runs bottom-up: children pop before parents.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      instance.unregisterNode(componentName);
    };
  });
};
```

**Rules of Hooks compliance:** The early-return path for production is reached after all hooks with unconditional call requirements. In this implementation there are no hooks before the early return except the initial `useRef` — which is unconditional. All other logic is guarded. Verify that no hooks are added above the production guard.

**`useLayoutEffect` with no dependency array:** The cleanup (stack pop) must run after *every* render, not just on unmount. An empty `[]` dep array would only pop on unmount, leaving the stack corrupted between renders. No deps means the cleanup and setup run after every render, which is the correct behaviour for stack management.

**Strict Mode interaction:** See §7.1 for the specific failure mode and its mitigation.

### 5.5 Logger (`logger/trace-logger.ts`)

Produces console output when `logMode !== 'silent'`. No external dependencies.

```ts
const traceLogger = {
  log(cycle: RenderCycle, logMode: 'tree' | 'flat' | 'silent'): void
};
```

Both `'tree'` and `'flat'` modes emit a single `console.groupCollapsed` entry per cycle. The group is collapsed by default in DevTools. No `console.table`, no DOM, no external formatting library.

---

## 6. API Design

Minimal. Stable. No APIs are exposed that are not necessary for v1 use cases.

### 6.1 `createRenderTrace(options?)`

```ts
type RenderTraceOptions = {
  enabled?:   boolean;                        // default: true
  maxCycles?: number;                         // default: 50; FIFO eviction
  logMode?:   'tree' | 'flat' | 'silent';    // default: 'tree'
};

const createRenderTrace: (options?: RenderTraceOptions) => TraceInstance;
```

Returns a `TraceInstance` — the object all other APIs are called on. A default module-level instance is created and exported as `defaultTrace` for apps that do not need isolation.

Use `createRenderTrace()` when you need multiple independent tracers (e.g., one per feature subtree in a large app). Use the default export when tracing the full app.

### 6.2 `useTraceRender(componentName, options?)`

```ts
type TraceRenderOptions = {
  enabled?:   boolean;        // default: true; false = complete no-op
  instance?:  TraceInstance;  // default: module singleton
};

const useTraceRender: (
  componentName: string,
  options?: TraceRenderOptions,
) => void;
```

Add to any component you want to instrument. No wrappers, no providers required.

```tsx
const UserCard = (props: UserCardProps) => {
  useTraceRender('UserCard');
  return <div>{props.user.name}</div>;
};
```

### 6.3 `getRenderChains()`

```ts
instance.getRenderChains(): RenderCycle[]
```

Returns a shallow copy of all flushed cycles, oldest-first. The caller may not mutate the returned array or its contents — do not rely on mutation being reflected in the engine state.

### 6.4 `getRootCause()`

```ts
instance.getRootCause(): string | null
```

Shorthand for the root trigger of the most recently flushed cycle. Returns `null` if no cycles have been recorded or if the last cycle had no depth-0 node.

### 6.5 `resetTrace()`

```ts
instance.resetTrace(): void
```

Clears all flushed cycles. Resets cycle counter to 0. Clears the render stack. Does not stop tracing.

### 6.6 `start()` / `stop()`

```ts
instance.start(): void
instance.stop():  void
```

Enable or disable tracing at runtime. Useful for scoped tracing sessions (e.g., start on button click, stop after 3 cycles). `stop()` flushes any in-flight cycle before disabling.

**Not to be confused with the `enabled` option on `createRenderTrace()` or `useTraceRender()`, which are static configuration, not runtime toggles.**

---

## 7. React 18 Limitations (Critical)

This section documents known failure modes. They are **not to be treated as bugs to fix in v1** — they are constraints of the explicit-instrumentation, module-level-stack approach. Each is a documented limitation.

### 7.1 Strict Mode double-invocation

**What happens:** React 18 Strict Mode intentionally invokes render functions twice in development. The second invocation is discarded before commit, but it still runs synchronous code in the render body — including `registerNode`.

**Effect on render-trace:** `registerNode` is called twice for one logical render. The stack receives two pushes for one pop (the `useLayoutEffect` cleanup). This inflates `depth` values for children rendered in the same cycle and may report phantom renders in the cycle node list.

**v1 mitigation:** `useTraceRender` uses a `mountedRef` to detect the first vs second invocation pattern. On the second invocation, if the same `componentName` is already on the stack top, the registration is skipped and marked as a Strict Mode duplicate. A one-time `console.warn('[render-trace] Strict Mode detected — depth values may be inaccurate')` is emitted per engine instance.

**Guarantee boundary:** Under React Strict Mode, `getRootCause()` identifies the correct root component name. `maxDepth` and individual `depth` values are **best-effort** and may be off by one level. `totalRenders` will reflect deduplicated counts.

### 7.2 Concurrent Mode render interruption

**What happens:** Under React 18 Concurrent Mode (features using `useTransition`, `useDeferredValue`, etc.), render functions may be interrupted and restarted. A component may push to the stack, have its render interrupted, and then push again before the corresponding pop fires.

**Effect on render-trace:** Stack corruption — `depth` values become incorrect, `parentName` relationships are wrong.

**v1 stance:** `render-trace` v1 does not support Concurrent Mode features. If `unregisterNode` detects a stack-top mismatch (the component being popped is not the current top), it clears the entire stack, emits a `console.warn('[render-trace] Concurrent render detected — cycle data discarded')`, and discards the in-flight cycle.

**This is a safe failure mode.** The engine does not crash. It loses one cycle of data and recovers for the next synchronous render. Developers using `startTransition` or `useDeferredValue` extensively will see frequent cycle discards — they should note this in their debugging workflow.

### 7.3 Cycle detection heuristic failures

**What happens:** The microtask-based cycle flush assumes all renders from one state update complete in one JavaScript task. This is true for synchronous React rendering. It is not true for:
- `startTransition` renders (deferred across tasks)
- `Suspense` content renders after promise resolution
- Renders triggered from inside `setTimeout` / `setInterval` in environments that don't use React event system wrapping

**Effect on render-trace:** A logical "one update → many renders" may be split across two cycle objects, or two unrelated updates may be merged into one cycle.

**v1 stance:** Document this clearly. Do not attempt to detect or work around it. The cycle grouping is labelled "best-effort" in all public-facing output.

### 7.4 Non-instrumented intermediaries

**What happens:** If a component in the middle of a render tree is not instrumented with `useTraceRender`, its children will see no parent on the stack when they render. They will be recorded with `depth === 0` and `parentName === null`.

**Effect on render-trace:** The propagation tree is split at every non-instrumented component. Multiple depth-0 nodes appear in the same cycle. The root trigger heuristic (lowest `renderIndex` at `depth === 0`) identifies the first-to-register among them, which may not be the true cascade origin.

**v1 stance:** This is a fundamental constraint of explicit instrumentation. The fix is to instrument all components in the chain of interest. The PRD does not attempt a workaround. The logger labels any cycle with multiple depth-0 nodes with a warning: `[partial instrumentation — multiple roots detected]`.

### 7.5 Component name collisions

**What happens:** Two different component instances using the same `componentName` string in `useTraceRender` are indistinguishable in the trace output.

**Effect on render-trace:** For components rendered in lists (e.g., `useTraceRender('ListItem')` in a mapped list), all instances share the same name. The propagation tree collapses them into one apparent node per render, when in reality there may be many.

**v1 stance:** Developers must append unique identifiers for list components: `useTraceRender(\`ListItem-\${item.id}\`)`. The API does not enforce this — it is a usage guideline documented in the README.

---

## 8. Performance Model

### 8.1 Production cost

Zero. `useTraceRender` exits before any engine interaction when `process.env.NODE_ENV !== 'development'`. Bundlers eliminate the conditional branch and all downstream code.

```ts
// What survives in production per instrumented component:
const mountedRef = useRef(false); // 1 hook call, negligible
```

### 8.2 Development cost

Per render, per instrumented component:
- 1 array push (render stack)
- 1 object allocation (RenderNode)
- 1 array push (cycle.nodes)
- 1 `useLayoutEffect` registration (cleanup only)

This is O(1) per render, with no iteration over existing nodes. For trees with up to ~500 instrumented components, this is not measurable in profiling.

### 8.3 Memory

- `maxCycles` (default 50) limits retained cycle data. Each cycle holds `n` `RenderNode` objects where `n` is the number of instrumented components that rendered. For typical trees, this is under 50 nodes per cycle.
- Nodes hold no closures, no DOM references, no React fibers. They are plain objects and GC freely when the cycle is evicted.
- The render stack holds at most as many frames as the current rendering component's ancestor depth. Cleared on every cycle flush.

---

## 9. Output Format

### 9.1 Tree log (default: `logMode: 'tree'`)

```
▼ [render-trace] Cycle #3 — root: <Dashboard> | depth: 2 | renders: 6 | 14ms

  Propagation Tree
  ────────────────
  <Dashboard>              [depth: 0 | root trigger]
  ├── <UserList>           [depth: 1]
  │   ├── <UserCard-1>     [depth: 2]
  │   └── <UserCard-2>     [depth: 2]
  └── <Sidebar>            [depth: 1]
      └── <NavItem>        [depth: 2]

  Root Trigger   <Dashboard>
  Cascade Depth  2
  Total Renders  6
  Duration       14ms
```

When multiple depth-0 nodes exist (partial instrumentation): the header appends `[partial instrumentation — multiple roots detected]` and all root-level nodes are listed without tree indentation.

### 9.2 Flat log (`logMode: 'flat'`)

```
[render-trace] #3 | root: <Dashboard> | 6 renders | depth: 2 | 14ms
  0  <Dashboard>     root
  1  <UserList>      parent: <Dashboard>
  2  <UserCard-1>    parent: <UserList>
  3  <UserCard-2>    parent: <UserList>
  4  <Sidebar>       parent: <Dashboard>
  5  <NavItem>       parent: <Sidebar>
```

### 9.3 Silent (`logMode: 'silent'`)

No console output. Engine still records cycles. Use `getRenderChains()` for programmatic access.

---

## 10. Integration Model

### 10.1 With `why-render` and `why-render-frequency`

The three hooks are compositional. A developer can use all three in the same component simultaneously:

```tsx
const UserCard = (props: UserCardProps) => {
  useWhyRender('UserCard', props);         // @sapanmozammel/why-render
  useRenderFrequency('UserCard');           // @sapanmozammel/why-render-frequency
  useTraceRender('UserCard');              // @sapanmozammel/render-trace
  return <div>{props.user.name}</div>;
};
```

**No shared state.** Each package is fully independent. They do not import from each other. They do not share console groups.

**Console output coordination:** All three packages use `[package-name]` prefixes in console group headers. `render-trace` groups by cycle rather than by component — this is intentional and distinguishes its output from the per-component groups of the other two packages.

### 10.2 No `render-core` dependency in v1

v1 does not depend on or define a shared `render-core` abstraction. If `render-core` is introduced in a future version of the toolkit, `render-trace` will migrate its type primitives to that shared layer. That migration will not change the public API surface of `render-trace`.

---

## 11. Future Vision (Controlled)

Two future directions, explicitly deferred. Neither is a v1 concern.

**`render-core` (v2+):** A shared event bus and type primitives package that all toolkit packages depend on. Enables cross-package coordination (e.g., correlating a `why-render` prop change with the `render-trace` cycle that contained it).

**`render-trace-ui` (v2+):** A UI package that consumes `getRenderChains()` to display an interactive propagation tree in the browser. No changes to `render-trace` core are required for this — `getRenderChains()` returns a fully serializable data structure.

No other future directions are in scope or should be referenced in implementation discussions.

---

## 12. Success Criteria

| Criterion | How to verify |
|---|---|
| Root trigger correctly identified (synchronous renders, fully instrumented tree) | Integration test: `renderHook` tree, state update at root, assert `getRootCause() === 'RootComponent'` |
| Cascade depth matches actual tree depth (3-level tree) | Integration test: assert `getRenderChains().at(-1).maxDepth === 2` |
| Sibling nodes captured in the same cycle | Integration test: two siblings, parent state update, assert both in one `RenderCycle` |
| Partial instrumentation emits multi-root warning | Unit test: two non-adjacent traced components, assert cycle has 2 depth-0 nodes and logger emits warning |
| Complete no-op in production | Unit test: `vi.stubEnv('NODE_ENV', 'production')`, verify no engine calls, no output, no throws |
| Strict Mode warning emitted and no crash | Integration test: wrap in `<StrictMode>`, assert `console.warn` called once, no infinite loop |
| Concurrent Mode stack mismatch: cycle discarded, engine recovers | Unit test: manually simulate push/pop mismatch, assert cycle is discarded, next cycle records correctly |
| `resetTrace()` clears all data | Unit test: assert `getRenderChains().length === 0` and `getRootCause() === null` post-reset |
| `maxCycles` eviction | Unit test: `maxCycles: 2`, record 3 cycles, assert only 2 retained (oldest evicted) |
| Zero production bundle impact | Build test: production bundle grep for `[render-trace]` string returns no matches |

---

## 13. Package Structure

```
packages/render-trace/
  package.json
  tsup.config.ts
  vitest.config.ts
  README.md
  src/
    engine/
      engine.ts            # TraceEngine (stack + cycle + flush — one class)
    hook/
      use-trace-render.ts
    logger/
      trace-logger.ts
    types/
      index.ts
    index.ts
  tests/
    engine.test.ts
    trace-logger.test.ts
    use-trace-render.test.tsx
    use-trace-render.prod.test.tsx
```

Demo integration (separate phase, after library ships):
```
demo/src/features/render-trace/
  index.tsx
  scenarios.ts
demo/src/lib/registry/index.ts
demo/package.json
demo/vercel.json
```

---

## 14. Implementation Phases

### Phase 1 — Types + Engine [✅]
`types/index.ts`, `engine/engine.ts`. Pure TypeScript, no React. Cover: node registration, stack push/pop, cycle creation, microtask flush, FIFO eviction, start/stop, reset. Full unit tests in `engine.test.ts`.

### Phase 2 — Hook [✅]
`hook/use-trace-render.ts`. Rules of Hooks compliance. Production guard. Strict Mode deduplication. Concurrent Mode stack-mismatch detection. Integration tests in `use-trace-render.test.tsx` and `use-trace-render.prod.test.tsx`.

### Phase 3 — Logger [✅]
`logger/trace-logger.ts`. Tree format, flat format, silent. Multi-root warning. Unit tests for output shape in `trace-logger.test.ts`.

### Phase 4 — Public API + Package Config [✅]
`src/index.ts`. `createRenderTrace()` factory. Default singleton export. `package.json`, `tsup.config.ts`, `vitest.config.ts`, `README.md`. Dry-run publish check.

### Phase 5 — Quality Gate [✅]
All tests green. `tsc --noEmit` clean. `pnpm run build` clean. Production bundle contains no engine code.

### Phase 6 — Demo Integration [✅]
Feature module, registry entry, Vercel build step. Scenarios TBD in a separate demo PRD.

---

*End of PRD — `render-trace` v1.1*
