# PRD: `why-render-frequency` v1

**Package:** `@sapanmozammel/why-render-frequency`
**Monorepo:** react-render-kit
**Status:** Draft v1.0 — Implementation Ready
**Companion:** `@sapanmozammel/why-render`

---

## 1. Product Summary

`why-render-frequency` is a zero-configuration, development-only React hook that tells developers **how often** a component is re-rendering. It counts renders over time and logs the frequency to the browser console in a readable, grouped format.

It is the natural companion to `why-render`. Where `why-render` answers *"why did this render happen?"*, `why-render-frequency` answers *"is this component rendering more often than I expected?"*

Install it. Drop the hook into a component. Open the console. Done.

---

## 2. Positioning

`why-render-frequency` is a React render frequency diagnostics library.

Its purpose is not performance profiling, render timing analysis, flamegraphs, optimization recommendations, render tracing, or React DevTools replacement.

Its sole responsibility in v1 is to surface render frequency information in a human-readable way.

This focus keeps the API small, the bundle tiny, and the developer experience simple.

### What it does
- Counts how many times a component renders
- Reports cumulative render count
- Reports renders within a configurable time window
- Computes a render rate (renders/second) over the window
- Emits a human-readable observation about render activity level
- Logs to the browser console in development only
- Accepts an optional `enabled` flag for runtime toggling
- Samples logs at a configurable interval to prevent console spam

### What it does not do
- Does not explain *why* renders happen (that is `why-render`'s job)
- Does not measure render duration or timing
- Does not produce flamegraphs or profiler traces
- Does not recommend optimizations (`React.memo`, `useCallback`, etc.)
- Does not track render ancestry or component trees
- Does not integrate with React DevTools
- Does not persist data between page reloads
- Does not batch or aggregate across multiple component instances
- Does not score performance or generate advice

---

## 3. Problem Statement

React developers regularly encounter components that render more often than expected. The symptoms are obvious — sluggish UI, janky animations, excessive network calls — but diagnosing the *frequency* of the problem requires opening React DevTools Profiler, recording a session, and interpreting a flamegraph. This is heavyweight tooling for a lightweight question.

Common scenarios where `why-render-frequency` helps:

- **Render storms** — a component renders dozens of times within a single second
- **Unexpected rendering bursts** — a user interaction triggers far more renders than expected
- **Excessive rerenders during user interaction** — typing into a search input causes the results list to re-render on every keystroke
- **Subscription-driven rerenders** — a Zustand or Redux selector is too broad, causing renders on every store update
- **Rapid parent update cascades** — a parent component's frequent state updates propagate unnecessarily to children
- After adding `React.memo`, a developer wants to confirm renders actually decreased

Developers need an answer in seconds, not minutes. They need something they can drop into a component without leaving their editor.

---

## 4. Goals (v1)

1. Provide a single hook: `useRenderFrequency(componentName, options?)`
2. Count every render from mount to present
3. Track renders within a rolling time window (default: 10 seconds)
4. Compute a render rate (renders/sec) from window data
5. Log count, window data, rate, and an observation to the console
6. Sample logs every N renders (default: every 10) to prevent console spam
7. Be completely inert when `NODE_ENV !== 'development'`
8. Support runtime `enabled` toggle
9. Match the code quality, bundle footprint, and API ergonomics of `why-render`
10. Ship as a standalone npm package with zero runtime dependencies

---

## 5. Non-Goals (v1)

- Render timing / duration measurement
- Performance profiling or scoring
- Optimization recommendations
- Render cause analysis (belongs to `why-render`)
- Flamegraph generation
- Cross-component render correlation
- Render ancestry or component tree tracing
- Persistent storage of render history
- Custom reporting targets (e.g., analytics endpoints)
- React Native support (web/DOM only for v1)
- Threshold-based warnings or alerts (the Observation field is descriptive only)
- Configurable log levels
- AI-generated advice or automated suggestions

---

## 6. User Stories

**US-1 — Render loop detection**
As a developer, I add `useRenderFrequency('UserCard')` to a component I suspect is in a render loop. Within seconds I see the rate climbing rapidly in the console and confirm the loop.

**US-2 — Excessive rendering during typing**
As a developer, I type into a search input and notice the results list feels sluggish. I add `useRenderFrequency('SearchResults')` and see a rate of 20+ renders/sec, confirming the component is re-rendering on every keystroke from a parent state update.

**US-3 — Subscription-driven rerenders**
As a developer, I suspect a Zustand or Redux selector is too broad and causing unnecessary renders. I add the hook and observe the rate climbing on every store update, confirming the selector needs narrowing.

**US-4 — Frequent parent updates**
As a developer, I have a parent component with a `setInterval` updating state. I add `useRenderFrequency('ChildComponent')` to confirm the child is rendering at the same frequency as the parent's interval.

**US-5 — Expected render verification**
As a developer, I add `React.memo` to a component and want to confirm it reduced renders. I add `useRenderFrequency` before and after the change and compare the rate in the console output.

**US-6 — Burst detection**
As a developer, I trigger a specific user interaction and want to know if it causes a render burst. I watch the window count and rate in the console to see how many renders occurred in the last 10 seconds.

---

## 7. API Design

### Primary hook

```ts
useRenderFrequency(componentName: string, options?: RenderFrequencyOptions): void
```

### Options type

```ts
type RenderFrequencyOptions = {
  enabled?: boolean;
  windowMs?: number;
  sampleEvery?: number;
};
```

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `true` | When `false`, the hook is a complete no-op. Does not count or log. Does not advance internal state. |
| `windowMs` | `number` | `10000` | Length of the rolling time window in milliseconds. Values less than 1 are clamped to 1. |
| `sampleEvery` | `number` | `10` | Log is emitted only when `renderCount % sampleEvery === 0`. Prevents console spam during rapid rerender scenarios. Set to `1` to log on every render. |

### Public exports

```ts
// src/index.ts
export { useRenderFrequency } from './hook/use-render-frequency';
export type { RenderFrequencyOptions } from './types';
```

### Usage examples

```tsx
// Minimal
useRenderFrequency('UserCard');

// With options
useRenderFrequency('UserCard', { windowMs: 5000 });

// Log on every render (disable sampling)
useRenderFrequency('UserCard', { sampleEvery: 1 });

// Conditionally enabled
useRenderFrequency('UserCard', { enabled: process.env.NEXT_PUBLIC_DEBUG === '1' });
```

### Design rationale

- The hook returns `void`. There is no return value to misuse.
- `componentName` is a required `string` — same pattern as `why-render`. Developers using both packages will feel immediate familiarity.
- `windowMs` is the primary time configuration. It directly maps to the single question the package answers: "how many renders in what time span?"
- `sampleEvery` prevents log flooding during rapid renders while keeping counting accurate.
- No `threshold` option in v1 — detecting "excessive" is a judgment call that belongs to the developer, not the library.

---

## 8. Functional Requirements

### FR-1 — Render counting
- The hook MUST increment a counter on every render from mount onward.
- The counter MUST be stored in a `useRef` (not `useState`) to avoid triggering additional renders.
- The counter starts at `0` before the first render and is `1` during the first render.
- The counter is local to each component instance. Multiple instances of the same component each maintain independent counters.
- The counter increments regardless of whether a log is emitted (counting is not gated by `sampleEvery`).

### FR-2 — Time window tracking
- The hook MUST maintain a list of render timestamps in a `useRef`.
- On every render, the current timestamp (`Date.now()`) is appended to the list.
- Before computing the window count, timestamps older than `windowMs` milliseconds are pruned from the list.
- The window count is the length of the pruned list (including the current render).
- Default `windowMs` is `10000` (10 seconds).
- Timestamps are appended on every render regardless of whether a log is emitted.

### FR-3 — Logging behavior
- The hook MUST call `console.groupCollapsed` and `console.groupEnd` to wrap each log entry, matching `why-render`'s pattern.
- The log MUST fire only when `renderCount % sampleEvery === 0` (default: every 10 renders).
- The log MUST include: component name, total render count, window render count, render rate, and observation.
- Logging MUST only occur when `NODE_ENV === 'development'`.

### FR-4 — Development-only guard
- The first statement after the `useRef` calls MUST be `if (process.env.NODE_ENV !== 'development') return`.
- This guard enables dead-code elimination in production bundlers (webpack, Vite, Rollup).
- In production: only the `useRef` calls execute (required by Rules of Hooks). All counting, timestamp tracking, rate calculation, and logging is eliminated.

### FR-5 — `enabled` option
- When `options.enabled === false`, the hook MUST return immediately after the NODE_ENV guard.
- The counters and timestamps MUST NOT be updated when disabled.
- This matches `why-render`'s `enabled` behavior exactly.
- When `enabled` transitions from `false` to `true`, counting resumes from where it left off. The hook does not reset.

### FR-6 — First render behavior
- The first render MUST be counted.
- The first render is logged only if `1 % sampleEvery === 0` (true when `sampleEvery === 1`).
- With the default `sampleEvery: 10`, the first log fires at render 10.

### FR-7 — Unmount behavior
- On unmount, the refs are garbage-collected naturally. No cleanup is required.
- Remount creates a fresh counter and timestamp list starting from zero.

### FR-8 — Rules of Hooks compliance
- The hook MUST call all `useRef` hooks unconditionally before any early returns.
- The NODE_ENV guard and enabled guard appear AFTER all `useRef` calls.

### FR-9 — `sampleEvery` behavior
- `sampleEvery` controls log emission frequency, not counting frequency.
- Counting and timestamp tracking occur on every render regardless of `sampleEvery`.
- `sampleEvery: 1` emits a log on every render.
- `sampleEvery: 10` (default) emits a log every 10 renders.
- Values less than 1 are treated as 1.

### FR-10 — Render rate calculation
- Rate is calculated as: `windowCount / (windowMs / 1000)` renders per second.
- Rate is derived from the current window data at log emission time.
- Rate is formatted to one decimal place (e.g., `0.7 renders/sec`, `12.0 renders/sec`).
- Rate represents the average over the configured window, not instantaneous throughput.

### FR-11 — Observation
- An observation string is derived from the computed rate at log emission time.
- Observation thresholds:
  - Rate > 10 renders/sec → `"High render frequency detected"`
  - Rate > 2 renders/sec → `"Moderate render activity"`
  - Rate ≤ 2 renders/sec → `"Low render activity"`
- The observation is descriptive only. It is NOT a recommendation or warning.

### FR-12 — `windowMs` validation
- `windowMs` values less than 1 are clamped to 1: `Math.max(windowMs, 1)`.
- No error is thrown for invalid values.
- Clamping occurs inside the hook before the value is used.

---

## 9. Console Output Design

### Format

```
▼ [why-render-frequency] <ComponentName>

  Total Renders
  -------------
  42

  Window (last 10s)
  -----------------
  7 renders

  Rate
  ----
  0.7 renders/sec

  Observation
  -----------
  Low render activity
```

### Collapsed by default

The group opens collapsed (`console.groupCollapsed`). Developers click to expand. This prevents noise when the component is rendering normally.

### Alignment

Keys are left-aligned with a fixed-width label column. Values are on the following line with 2-space indent.

### Window label

The window label dynamically reflects the configured `windowMs`:
- `windowMs: 10000` → `Window (last 10s)`
- `windowMs: 5000` → `Window (last 5s)`
- `windowMs: 60000` → `Window (last 60s)`

Duration is formatted as seconds (integer, no decimals) for readability.

### Rate

Rate is derived from `windowCount / (windowMs / 1000)` and formatted to one decimal place:
- `0.7 renders/sec`
- `12.0 renders/sec`

### Observation thresholds

| Rate | Observation |
|---|---|
| > 10 renders/sec | `High render frequency detected` |
| > 2 renders/sec | `Moderate render activity` |
| ≤ 2 renders/sec | `Low render activity` |

The observation is informational only — it describes what is happening, not what to do.

### Implementation notes

- Uses `console.groupCollapsed` / `console.log` / `console.groupEnd` — same stack as `why-render`
- No colors or `%c` formatting in v1 — keeps the implementation simple and cross-browser
- The header format `[why-render-frequency] <ComponentName>` makes the source package immediately identifiable in a busy console

---

## 10. Technical Architecture

### Package location

```
packages/why-render-frequency/
```

### File structure

```
packages/why-render-frequency/
├── src/
│   ├── index.ts                    # public re-exports only
│   ├── types/
│   │   └── index.ts                # RenderFrequencyOptions
│   ├── hook/
│   │   └── use-render-frequency.ts # main hook
│   └── logger/
│       └── frequency-logger.ts     # console output logic
├── tests/
│   ├── use-render-frequency.test.tsx
│   ├── use-render-frequency.prod.test.tsx
│   └── frequency-logger.test.ts
├── package.json
├── tsup.config.ts
├── vitest.config.ts
└── README.md
```

### Module responsibilities

| Module | Responsibility |
|---|---|
| `types/index.ts` | `RenderFrequencyOptions` type only |
| `hook/use-render-frequency.ts` | Refs, counting, timestamp management, guard logic, sampleEvery gating, calls logger |
| `logger/frequency-logger.ts` | Pure function: receives count + windowCount + windowMs, computes rate + observation, produces console output |
| `index.ts` | Re-exports `useRenderFrequency` and `RenderFrequencyOptions` |

### Separation principle

The logger is a pure function with no React dependency. This mirrors `why-render`'s `diffProps` / `logChanges` separation and makes the logger trivially testable without a React environment.

### `package.json` shape

```json
{
  "name": "@sapanmozammel/why-render-frequency",
  "version": "1.0.0",
  "description": "Debug how often your React component re-renders",
  "license": "MIT",
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
  "sideEffects": false,
  "publishConfig": { "access": "public" },
  "peerDependencies": { "react": ">=18" },
  "scripts": {
    "build": "tsup",
    "prepublishOnly": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Build (tsup)

Identical configuration to `why-render`: ESM + CJS + `.d.ts` + `.d.mts`, target `esnext`, uses root `tsconfig.json`.

### Workspace registration

`pnpm-workspace.yaml` already includes `packages/*` — no change needed.

---

## 11. Edge Cases

### React Strict Mode
React Strict Mode may invoke component logic multiple times during development. Render counts and frequency metrics may appear inflated relative to production behavior. This is acceptable for v1 and must be documented in the README. The package must remain safe and deterministic under Strict Mode — refs and timestamp arrays will simply contain more entries than they would under a single invocation.

### SSR (Server-Side Rendering)
- `process.env.NODE_ENV !== 'development'` catches most cases
- `useRef` is safe in SSR environments (React 18)
- `Date.now()` is available in all JS environments including Node.js
- No `window` or `document` references exist in the hook or logger
- The package is SSR-safe by construction

### Fast Refresh (Vite / Next.js HMR)
On Fast Refresh, React re-mounts components. The refs are re-initialized to zero. Counters reset. This is correct behavior — the developer is modifying the component and the count from before the edit is no longer meaningful.

### Production builds
The `process.env.NODE_ENV !== 'development'` guard is evaluated at the top of the function (after `useRef` calls). Production bundlers statically replace `process.env.NODE_ENV` with `"production"`, making the condition always `true`. All code after the guard is dead-code eliminated. The only overhead in production is the `useRef` calls per render — identical to `why-render`.

### Rapid render bursts
If a component renders 100 times in 50ms, the timestamp array grows by 100 entries instantly. The pruning logic runs on every render before computing the window count, so the array stays bounded to renders within `windowMs`. The `sampleEvery` option prevents log flooding: with the default `sampleEvery: 10`, only 10 logs would emit for 100 renders.

### Unmount / remount cycles
Each mount creates fresh refs. There is no persistent state. A component that mounts, unmounts, and remounts will show a count starting from 1 on the second mount. This is correct — the developer is observing a new lifecycle.

### Multiple instances
Two instances of `UserCard` rendered simultaneously maintain entirely independent counters. Each instance's hook invocation has its own closure over its own `useRef` values. No shared state exists at the module level.

### `windowMs: 0` or negative values
`windowMs` values less than 1 are clamped to `Math.max(windowMs, 1)` before use. No error is thrown. Clamping prevents divide-by-zero in rate calculation and nonsensical window behavior.

### `sampleEvery: 0` or negative values
Values less than 1 are treated as 1 (log on every render). No error is thrown.

---

## 12. Testing Strategy

### Test environment
Vitest + React Testing Library (`renderHook`), jsdom. Mirrors `why-render` test setup exactly.

### Test file: `use-render-frequency.test.tsx`

| Test | Description |
|---|---|
| Count increments on every render | Counter advances regardless of sampleEvery setting |
| Timestamps recorded on every render | Timestamp array grows on every render regardless of sampleEvery |
| Log emitted at sampleEvery boundary | Default sampleEvery=10: log fires at render 10, 20, 30 |
| Log not emitted between boundaries | No console output at renders 1–9, 11–19 (default sampleEvery) |
| sampleEvery: 1 logs every render | Every render produces console output |
| Window count accuracy | Renders within windowMs are counted; renders before windowMs are excluded |
| Default windowMs is 10000 | Window label reflects 10s default |
| Custom windowMs respected | `windowMs: 5000` reflected in output label |
| Rate calculation correct | 7 renders in 10s → `0.7 renders/sec` |
| Observation: high | Rate > 10/sec → `"High render frequency detected"` |
| Observation: moderate | Rate > 2/sec and ≤ 10/sec → `"Moderate render activity"` |
| Observation: low | Rate ≤ 2/sec → `"Low render activity"` |
| `enabled: false` suppresses log | No console output when disabled |
| `enabled: false` does not increment count | Counter stays at zero while disabled |
| Re-enabling resumes from prior count | Disabling then re-enabling does not reset counter |
| windowMs clamped to 1 | `windowMs: 0` and `windowMs: -5` both clamp to 1 |
| sampleEvery clamped to 1 | `sampleEvery: 0` treated as sampleEvery 1 |

### Test file: `use-render-frequency.prod.test.tsx`

| Test | Description |
|---|---|
| No-op in production | `vi.stubEnv('NODE_ENV', 'production')` — hook does not log |
| Refs still called in production | Hook does not violate Rules of Hooks (no conditional hook calls) |

### Test file: `frequency-logger.test.ts`

| Test | Description |
|---|---|
| Calls groupCollapsed with correct header | Header format: `[why-render-frequency] <ComponentName>` |
| Logs total count | Output includes total render count |
| Logs window count | Output includes window count |
| Logs window duration label | Label reflects windowMs in seconds |
| Logs rate | Output includes rate formatted to 1 decimal place |
| Logs observation | Output includes observation string |
| Rate boundary: high | Rate > 10 → `"High render frequency detected"` |
| Rate boundary: moderate | Rate > 2 → `"Moderate render activity"` |
| Rate boundary: low | Rate ≤ 2 → `"Low render activity"` |
| Calls groupEnd | Console group is always closed |

### Coverage targets
- Statements: ≥ 95%
- Branches: ≥ 90%
- Functions: 100%

---

## 13. Success Criteria

| Criterion | Measurement |
|---|---|
| Single hook API | `useRenderFrequency(name, options?)` — no other public exports except types |
| Zero production overhead | Bundle analysis: no logger or counter code present in production build |
| Bundle size | ESM bundle < 1 KB minified+gzipped |
| Zero runtime dependencies | `package.json` has no `dependencies` field |
| TypeScript strict compliance | `tsc --noEmit` passes with `strict: true` and `exactOptionalPropertyTypes: true` |
| All tests green | 100% of Vitest tests pass |
| Abnormal frequency identifiable in 5 seconds | Developer can open the console and determine if render rate is high/moderate/low within 5 seconds |
| Console noise prevention | `sampleEvery: 10` default — 100 rapid renders produce 10 log entries, not 100 |
| Rate clearly displayed | Every log entry includes a `renders/sec` value |
| Sibling feel | A developer familiar with `why-render` can use `why-render-frequency` without reading the docs |
| npm publish succeeds | `pnpm publish --dry-run` produces correct tarball; live publish returns HTTP 200 |
| SSR safe | No errors when rendering in a Node.js environment |
| Strict Mode safe | No errors or violations under React Strict Mode |

---

## 14. Implementation Plan

### Phase 1 — Scaffold [✅]
- Create `packages/why-render-frequency/` directory
- Create `package.json` with correct name, version, exports, peerDependencies, publishConfig
- Create `tsup.config.ts` (copy and adapt from `why-render`)
- Create `vitest.config.ts` (copy and adapt from `why-render`)
- Register in `pnpm-workspace.yaml` (already covered by `packages/*`)
- Run `pnpm install` to link workspace

### Phase 2 — Types [✅]
- Create `src/types/index.ts`
- Define `RenderFrequencyOptions` with `enabled?`, `windowMs?`, and `sampleEvery?`

### Phase 3 — Logger [✅]
- Create `src/logger/frequency-logger.ts`
- Implement pure function: `logFrequency(componentName, count, windowCount, windowMs)`
- Compute rate: `windowCount / (windowMs / 1000)`, format to 1 decimal place
- Derive observation from rate thresholds (> 10 → High, > 2 → Moderate, ≤ 2 → Low)
- Format window duration label (ms → seconds)
- Use `console.groupCollapsed` / `console.log` / `console.groupEnd`
- Write `tests/frequency-logger.test.ts`

### Phase 4 — Hook [✅]
- Create `src/hook/use-render-frequency.ts`
- Implement `useRef` for count and timestamps array
- Implement NODE_ENV guard
- Implement `enabled` guard
- Implement `windowMs` clamping: `Math.max(windowMs ?? 10000, 1)`
- Implement `sampleEvery` clamping: `Math.max(sampleEvery ?? 10, 1)`
- Implement timestamp pruning and window count calculation
- Gate log emission: `if (count % sampleEvery === 0)`
- Call `logFrequency`
- Write `tests/use-render-frequency.test.tsx`
- Write `tests/use-render-frequency.prod.test.tsx`

### Phase 5 — Public API [✅]
- Create `src/index.ts` with named exports

### Phase 6 — Quality gate [✅]
- `pnpm run test` — all green
- `tsc --noEmit` — clean
- `pnpm run build` — verify dist artifacts
- `pnpm publish --dry-run` — verify tarball contents

### Phase 7 — README [✅]
- Write `README.md` consistent with `why-render`'s README structure
- Install section, usage section, API section, production safety section
- Document Strict Mode behavior: counts may appear inflated relative to production
- Include live demo link when demo page exists

### Phase 8 — Demo Integration [✅]

**Goal:** Integrate `@sapanmozammel/why-render-frequency` into the demo app with interactive, observable scenarios that clearly explain React render frequency behavior within 30 seconds.

#### Setup
- Add `@sapanmozammel/why-render-frequency` to `demo/package.json`
- Register in `demo/src/lib/registry/index.ts`
- Create feature module at `demo/src/features/why-render-frequency/`

#### Scenario requirements (apply to every scenario)
- Render count per component visible in the UI in real time
- Visual highlight on each render (flash, glow, or border pulse)
- Clear indication of what triggered the render
- Independent reset button per scenario

---

**Scenario 1 — Typing Stress Test**

*Purpose:* Show excessive re-renders caused by uncontrolled state updates.

- Text input whose `onChange` lifts state to parent
- Child component receives typed value as prop and re-renders on every keystroke
- Render counter increases visibly in real time

*Expected insight:* Demonstrates frequent unnecessary renders during user input.

---

**Scenario 2 — Render Loop Simulator**

*Purpose:* Demonstrate high-frequency re-render pressure.

- `setInterval` updates state every N ms
- Start / Stop controls
- UI shows warning state when observation is `"High render frequency detected"`

*Expected insight:* Shows how uncontrolled timers degrade render performance.

---

**Scenario 3 — Parent State Storm**

*Purpose:* Show cascading re-renders from parent to child.

- Parent holds counter state (manual button increment or auto-increment toggle)
- Child receives a prop derived from parent state
- Parent and child render counts displayed side-by-side

*Expected insight:* Demonstrates prop-driven cascading renders even when the child's own data hasn't changed meaningfully.

---

**Scenario 4 — Memoized vs Non-Memoized**

*Purpose:* Demonstrate the effectiveness of `React.memo` in reducing renders.

- Two sibling components: Component A (plain), Component B (`React.memo`)
- Both call `useRenderFrequency`
- Trigger parent updates via button or input
- Render counts compared in real time

*Expected insight:* Immediate visual proof of memoization benefits.

---

#### UX / quality requirements
- Render changes MUST be visually obvious (flash, glow, or border pulse)
- Render count MUST update in real time
- Each scenario MUST be independently resettable
- UI must remain minimal and developer-focused
- No console-only debugging — everything visible in the UI
- Each scenario must communicate its value in under 30 seconds

#### Success criteria
- Developer understands render frequency behavior without reading docs
- Memoized vs non-memoized difference is immediately obvious
- Scenarios feel interactive, not static
- Demo can stand alone as a marketing landing experience

---

*End of PRD — `why-render-frequency` v1.0*
