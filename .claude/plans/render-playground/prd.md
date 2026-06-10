# Feature: render-playground

**One-sentence summary:** A zero-dependency visual observatory package that wraps any React component with a real-time diagnostics panel — showing render health score, signal timeline, prop diffs, memo effectiveness, and recommendations — without console logs or browser extensions.

---

## §A. Planning Analysis (required before PRD sections)

### §A.1 Product Positioning — Challenged Assumptions

**Assumption challenged: "paste React code, run it"**

Live arbitrary code execution requires browser-side Babel transpilation (~2 MB), a sandboxed iframe, a code editor (Monaco ~2 MB), and a non-trivial security model. These are appropriate for a hosted web app, not for an npm library. An npm package that bundles Babel and Monaco would be 4+ MB and would violate the ecosystem's zero-runtime-dependency philosophy.

**Resolution:** The "playground" metaphor is preserved through interactive scenario-driven demos in the demo site and a flexible `<PlaygroundProvider>` + `useRenderPlayground` API that wraps any existing component. The code-editor path is explicitly scoped to Phase 3 as a separate opt-in package.

**Competitive positioning:**

| Tool | What it does better | What render-playground uniquely provides |
|---|---|---|
| React DevTools | Fiber tree, state inspection, Profiler flamechart | No browser extension needed; works in CI preview; quantified score; recommendations |
| Storybook | Component isolation, args/knobs, addons ecosystem | Render-behavior focused (not documentation); zero config for render diagnostics |
| React Scan | Whole-tree visual flash on re-render, zero config | WHY and HOW OFTEN (not just WHERE); health score; memo effectiveness; actionable recs |
| Replay.io | Time-travel, recording, collaborative debugging | Zero infrastructure; fully local; no recording overhead; npm-only |
| Redux DevTools | State diff over time, action history | React render-specific; no Redux dependency; prop-level causality |

**Unique value proposition:** The only npm package that unifies WHY a component rendered + HOW OFTEN + IS REACT.MEMO HELPING + WHAT TO DO, in a visual panel that installs in two lines of code with zero browser extension and zero backend.

---

### §A.2 User Personas

**Persona A — Junior React Developer ("Alex")**
- Goals: Stop seeing "too many re-renders" warnings; understand what `React.memo` actually does; get actionable advice without reading docs
- Frustrations: Console logs are unreadable; React DevTools Profiler requires understanding fiber trees; doesn't know what "reference instability" means
- Success: Sees the red "INEFFECTIVE" memo badge and immediately understands the problem; follows a recommendation link; fixes it

**Persona B — Mid-Level Frontend Engineer ("Bea")**
- Goals: Diagnose a slow dashboard component during a sprint; prove to the team that inline callbacks are the problem; share evidence
- Frustrations: Spends hours adding `console.log` and `performance.mark`; DevTools Profiler doesn't show WHY props changed; can't easily export findings
- Success: Wraps the component with `useRenderPlayground`, triggers the slow path, screenshots the panel, pastes it in the PR

**Persona C — Senior React Performance Engineer ("Carlos")**
- Goals: Audit a large component tree; verify that memoization refactors actually worked; track render health score before/after PRs
- Frustrations: Existing tools are qualitative; no score to track over time; no way to see frequency + memo effectiveness simultaneously
- Success: Uses `onReport` callback to write render health data to localStorage; compares scores pre/post refactor

**Persona D — Tech Lead ("Dana")**
- Goals: Establish team-wide standards for render health; make render performance visible in PR reviews; reduce performance regressions
- Frustrations: Render quality is invisible until complaints arrive; no shared language for "this component renders too much"
- Success: Points team to `render-playground` docs as the standard debugging workflow; the health score becomes a shared vocabulary

---

### §A.3 User Journeys

**Journey 1: Investigating unnecessary renders**
1. Dana sees a slow dashboard; suspects unnecessary re-renders
2. Adds `useRenderPlayground('Dashboard', props)` inside the component and `<PlaygroundPanel />` in the parent layout
3. Clicks around the app; sees orange pills in the render timeline (reference-only signals)
4. Panel shows: `config` and `onClick` are unstable; memo is INEFFECTIVE; score: 42 / 100
5. Reads recommendation: "Stabilize config with useMemo and onClick with useCallback"
6. Applies fix; score rises to 94 / 100; all pills turn green

**Journey 2: Investigating unstable props**
1. Bea's `UserCard` re-renders every parent tick even though data hasn't changed
2. Wraps with playground; sees every render is `reference-only`; Unstable Props section shows `onAction: function`
3. Understands the problem without reading docs

**Journey 3: Evaluating React.memo effectiveness**
1. Carlos added `React.memo` two weeks ago; wants to verify it's working
2. Adds playground; triggers renders; memo badge shows `PARTIALLY_EFFECTIVE`
3. Timeline shows some genuine renders (green) + some reference-only (orange) → mixed signals
4. Identifies the remaining unstable prop; stabilizes it; badge flips to `EFFECTIVE`

**Journey 4: Analyzing render frequency**
1. A live ticker component renders 20 times/second; Alex notices HIGH frequency badge
2. Score: 65 / 100 — frequency penalty is visible
3. Recommendation: "High render frequency with no reference instability. Investigate parent state updates or context subscription breadth."

---

### §A.4 Competitive Advantage Analysis

**What existing tools do better:**
- React DevTools: Raw fiber inspection, component tree navigation, stateful re-render marking
- React Scan: Zero-config, wraps entire tree, visual highlighting overlay
- Storybook: Rich ecosystem, story format, visual regression testing, addons

**What render-playground uniquely provides:**
1. **Quantified health score** — converts qualitative observations into a 0–100 number; enables before/after comparisons
2. **Causal attribution** — shows not just that a render happened, but which specific props caused it and whether those props were genuinely changed or reference-unstable
3. **Memo effectiveness over time** — a session-level classification (EFFECTIVE / INEFFECTIVE / PARTIALLY_EFFECTIVE) across the last 20 renders, not just the most recent one
4. **Actionable recommendations** — deterministic rules that produce specific, actionable strings (not "your component re-rendered too many times")
5. **Zero infrastructure** — npm install, two lines of code; works in local dev, CI preview, staging; no extension, no recorder, no server
6. **Ecosystem composability** — panel can be embedded in Storybook stories, next-auth preview, Vercel preview deployments

---

### §A.5 Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| `setState` called during render (onReport → store mutation) | HIGH | Use `useSyncExternalStore` pattern — store is external, mutations via subscriber notification, no setState during render |
| StrictMode double-invoke corrupts report history | MEDIUM | Store tracks renders by renderNumber; double invocation increments then re-invokes; FIFO window of 50 absorbs extra entries gracefully |
| Inline styles specificity conflicts with user CSS | LOW | All inline styles use specific properties; no class-based styles to conflict with |
| Bundle size too large (SVG gauge, complex components) | MEDIUM | Keep all components minimal; gauge is pure SVG math (~30 lines); no external icon libs |
| `useSyncExternalStore` SSR compatibility | LOW | Provide `getServerSnapshot` returning empty state; panel renders empty on server (dev-only tool) |
| React 18 vs React 19 behavior differences | LOW | Peer dep is `>=18`; use only stable APIs; `useSyncExternalStore` is stable in React 18+ |
| Multiple playground instances sharing state | LOW | Each `<PlaygroundProvider>` creates an independent store; explicit `store` prop for advanced multi-component monitoring |
| `@sapanmozammel/render-insights` version drift | MEDIUM | Pin peer dep to `>=1.0.0`; document that `InsightReport` type is the contract; version it with breaking changes |

---

### §A.6 MVP Scope

**Must Have (Phase 1 — this PRD):**
- `createPlaygroundStore()` — pure factory, no React, external store
- `<PlaygroundProvider>` — context provider, creates/holds store
- `useRenderPlayground(name, props, options?)` — replaces `useRenderInsights` inside a monitored component; pushes reports to context store
- `<RenderPlaygroundPanel className? maxEntries?>` — self-contained visual panel reading from context store
- `useInsightCapture(options?)` — standalone hook for headless capture without context (returns `onReport` + `reports` + `clearReports`)
- Render timeline: horizontal strip of colored render pills (last 50)
- Score gauge: SVG arc colored by grade
- Latest report detail: render #, trigger, frequency class, memo class, changed props, unstable props
- Recommendations section
- Clear button
- Inline styles only (zero CSS dependencies)
- Dev-only (NODE_ENV guard in hook, panel renders null in production)
- 7th demo tool in the demo site

**Should Have (Phase 1.5):**
- Click a timeline pill to inspect that specific render's data
- Export current reports as JSON
- Collapsed/expanded toggle for the panel

**Nice to Have (Phase 2):**
- `maxEntries` prop limits the visible history
- Animate score gauge transitions
- Diff highlighting between consecutive renders

**Future Versions (separate packages — out of scope):**
- `render-playground-sandbox` — Monaco Editor + in-browser Babel + iframe sandbox (the "paste code" capability)
- `render-telemetry-core` — structured telemetry export adapter
- `render-replay-engine` — recording + replay
- `render-devtools-panel` — browser DevTools panel integration
- `vscode-render-kit` — VS Code extension

---

### §A.7 Demo Strategy

**Demo layout:** Side-by-side: component preview on left, `<RenderPlaygroundPanel>` on right. Below: scenario tabs (same pattern as existing demos). Trigger buttons below the grid.

**7 demo scenarios:**
1. **Perfectly Optimized** — all genuine renders; score 95+; green timeline
2. **Inline Callback Hell** — all reference-only; score 42; orange timeline; INEFFECTIVE memo
3. **Object Instability** — config/items inline; orange timeline; useMemo recommendation
4. **Memo Defeated** — mixed reference props; score 35
5. **Partial Memo** — genuine + reference renders; PARTIALLY_EFFECTIVE; yellow/green mix
6. **High Frequency** — rapid renders; HIGH frequency badge; score penalty visible
7. **Score Recovery** — before/after: fixes applied live by toggling "fix mode"; score rises visibly

Social media screenshot: The panel on scenario "Memo Defeated" — score 35 / 100 in red, `INEFFECTIVE` badge, 3 unstable props listed, recommendation visible. Shows the full picture at a glance.

---

## 1. Executive Summary

`@sapanmozammel/render-playground` is the visual layer of the React Render Kit ecosystem. It wraps any React component with a real-time observatory panel: a render timeline, a health score gauge, prop change attribution, memo effectiveness classification, and deterministic recommendations — all driven by the existing `render-insights` aggregation engine. It ships as a zero-runtime-dependency npm package that developers install in two minutes and use without configuring a browser extension or remote server.

---

## 2. Vision

React render diagnostics should be as immediate and visual as a linter underline. A developer who adds `useRenderPlayground` to a component should see, at a glance, whether that component is healthy — and exactly what to fix if it isn't. The panel should be so clear that a junior engineer can understand the problem without reading documentation.

---

## 3. Goals

1. Provide a visual panel that surfaces the full `InsightReport` without console log literacy
2. Bridge the existing `render-insights` hook to a visual UI with zero config
3. Ship as a standalone npm package with zero runtime dependencies beyond React + render-insights
4. Establish the architectural primitives (PlaygroundStore, PlaygroundProvider) that future packages can build on
5. Achieve a 7th demo on the site that becomes the primary "first package to install" recommendation

---

## 4. Non-Goals

- Live in-browser code editing or arbitrary code execution (Phase 3, separate package)
- Browser DevTools panel integration (future `render-devtools-panel`)
- Recording/replay (future `render-replay-engine`)
- Network telemetry or remote dashboard (future `render-telemetry-core`)
- Light-mode theming (out of scope; all panels are dark)
- Replacing React DevTools for tree/state inspection

---

## 5. User Personas

See §A.2. Four personas: Alex (junior), Bea (mid-level), Carlos (senior perf engineer), Dana (tech lead).

---

## 6. User Stories

- As Alex, I want to wrap my component and immediately see a red/green indicator so I know if it's healthy without reading console logs.
- As Alex, I want a human-readable recommendation that tells me exactly what to do.
- As Bea, I want to trigger a specific scenario and screenshot the panel to include in my PR description.
- As Bea, I want to see which specific prop caused the last render, not just that "a render happened."
- As Carlos, I want access to the raw `InsightReport[]` data so I can write custom assertions in my tests.
- As Carlos, I want to see memo effectiveness over a session (20+ renders), not just the latest render.
- As Dana, I want the health score to give my team a shared vocabulary for render quality.

---

## 7. Functional Requirements

### FR-01: PlaygroundStore
- Pure factory (no React imports): `createPlaygroundStore(maxEntries?: number): PlaygroundStore`
- Implements the subscribe/getSnapshot/push/clear protocol for `useSyncExternalStore`
- Keeps last `maxEntries` reports (default 50) — FIFO
- Is fully synchronous; no async behavior

### FR-02: PlaygroundProvider
- `<PlaygroundProvider maxEntries? store?>` — creates a store if none provided; shares it via context
- Must be a parent of both `useRenderPlayground` and `<RenderPlaygroundPanel>`
- Renders null in production (`NODE_ENV !== 'development'`)
- Accepts an optional pre-created `store` for advanced multi-component scenarios

### FR-03: useRenderPlayground
- `useRenderPlayground(componentName: string, props: Record<string, unknown>, options?: RenderPlaygroundOptions): void`
- Internally calls `useRenderInsights(componentName, props, { ...options, onReport: store.push })`
- Reads store from `PlaygroundContext`; throws if no provider found (dev-only error message)
- No-ops in production (passes through to `useRenderInsights` which no-ops)

### FR-04: RenderPlaygroundPanel
- `<RenderPlaygroundPanel className? maxVisible? onClear?>` — reads reports from context store via `useSyncExternalStore`
- Renders null in production
- Sub-sections (see UI spec §10):
  - Header (component name + latest grade badge + clear button)
  - Render Timeline (pills strip)
  - Score Gauge (SVG arc)
  - Latest Report detail (render #, trigger, freq class, memo class)
  - Changed Props list
  - Unstable Props list
  - Recommendations list
  - Footer (report count)
- When no reports: shows empty state "Trigger a render to see diagnostics."

### FR-05: useInsightCapture (standalone, no context)
- `useInsightCapture(options?: CaptureOptions): { onReport: (r: InsightReport) => void; reports: readonly InsightReport[]; clearReports: () => void }`
- Creates its own internal store (via `useRef`) without needing a provider
- Uses `useSyncExternalStore` to read from the internal store
- Stable `onReport` reference (does not change on re-renders)
- Intended for headless usage: collect data, render your own UI

### FR-06: Production guard
- All hooks and the panel component are strict no-ops / null-renders in `NODE_ENV !== 'development'`

### FR-07: Timeline pill colors
- `genuine` → green (`#4ade80`)
- `reference-only` → orange (`#fb923c`)
- `mixed` → yellow (`#eab308`)
- `no-prop-change` (null trigger) → gray (`#3a3a3a`)

### FR-08: Score gauge colors
- EXCELLENT (90–100) → green
- GOOD (70–89) → blue
- MODERATE (50–69) → yellow
- POOR (30–49) → orange
- CRITICAL (0–29) → red

### FR-09: Recommendation Engine
- Pure function: `computeRecommendations(report: InsightReport, history: readonly InsightReport[]): Recommendation[]`
- Returns at most 5 `Recommendation` objects, ranked by priority score (see §9.8)
- Panel displays the top 3; ecosystem consumers receive all 5
- `Recommendation` is a structured record: `id`, `category`, `severity`, `title`, `explanation`, `fix`, `expectedImpact`, `confidence`, `evidence[]` — never a raw string
- The engine **replaces** `InsightReport.recommendations: string[]` as the panel's authoritative source; the `string[]` field from render-insights is ignored by render-playground (kept for backward compatibility in the render-insights package only)
- All 10 rules are deterministic — given the same `InsightReport` + history, the same recommendations are always produced

### FR-10: Score Explainability
- Panel exposes a "Why this score?" toggle below the score gauge
- `computeScoreBreakdown(report: InsightReport): ScoreBreakdown` — reverses the scorer.ts formula from render-insights; all inputs are available on `InsightReport`
- Breakdown exposes four named penalty components: frequency, instability, memo, mixed-signals
- Toggle uses local `useState<boolean>` (expand/collapse) — no store involvement

### FR-11: Session Intelligence
- `computeSessionStats(history: readonly InsightReport[], windowSize?: number): SessionStats`
- Analyzes last `windowSize` (default 20) reports for: most frequent trigger, most unstable prop, score trend, memo trend, avg/worst/best score
- Panel shows session summary strip below the header when `history.length >= 3`
- `scoreTrend` and `memoTrend` displayed as directional indicators (↑ improving / ↓ degrading / → stable)

---

## 8. Technical Requirements

### TR-01: Zero runtime dependencies
- `peerDependencies`: `react >= 18`, `@sapanmozammel/render-insights >= 1.0.0`
- No Babel, Monaco, Tailwind, or external icon libraries in the bundle
- All styles are inline `style` objects on JSX elements

### TR-02: TypeScript strict
- `strict: true`, `exactOptionalPropertyTypes: true`
- Arrow functions only; `type` only; kebab-case filenames
- No `any`, no `@ts-nocheck`

### TR-03: React constraints
- `useSyncExternalStore` for all store subscriptions — no manual subscription effects
- No `useEffect` in any component; use `useMountEffect` (wrapping `useEffect(fn, [])`) only for true mount-time DOM setup if needed (expected: 0 uses)
- `useMemo` / `useCallback` for derived values and stable callbacks

### TR-04: Build
- tsup: ESM + CJS + `.d.ts`, same config as siblings
- Entry: `src/index.ts` (imports `.tsx` component files)
- `jsx: 'automatic'` via root tsconfig (`"jsx": "react-jsx"` is already set)
- `sideEffects: false`
- `external: ['react', 'react-dom', '@sapanmozammel/render-insights']`

### TR-05: SSR compatibility
- `useSyncExternalStore` requires a `getServerSnapshot` returning `[]`
- Panel renders empty state on server (no hydration mismatch)

### TR-06: StrictMode compatibility
- Store FIFO absorbs double-invoke (extra entries simply scroll off at maxEntries limit)
- No mount-only logic that breaks with double mount

### TR-07: No CSS file in the package
- All visual styling via inline `style` objects
- Uses the same CSS custom-property palette as the demo site (`#0a0a0a`, `#4ade80`, etc.) but as static hex values since custom properties are not available in library consumers

---

## 9. Architecture

### 9.1 Layer diagram

```
┌─────────────────────────────────────────────────────┐
│  Consumer App                                        │
│                                                      │
│  <PlaygroundProvider>                                │
│    <YourComponent>          <RenderPlaygroundPanel>  │
│      useRenderPlayground()   useSyncExternalStore()  │
│        useRenderInsights()  ───────reads──────────── │
│          onReport ─────push──► PlaygroundStore       │
│    </YourComponent>                                  │
│  </PlaygroundProvider>                               │
└─────────────────────────────────────────────────────┘
```

### 9.2 PlaygroundStore (pure, `src/store/playground-store.ts`)

```
PlaygroundStore {
  subscribe(listener: () => void): () => void
  getSnapshot(): readonly InsightReport[]
  getServerSnapshot(): readonly InsightReport[]
  push(report: InsightReport): void
  clear(): void
}
```

- Internally: `let snapshot: readonly InsightReport[] = []`; a `Set<() => void>` of listeners
- `push` creates a new array (`[...snapshot, report].slice(-maxEntries)`); notifies listeners
- `clear` sets snapshot to `[]`; notifies
- Referential stability: `getSnapshot()` returns the same array reference until mutated (required by `useSyncExternalStore`)

### 9.3 PlaygroundContext (`src/context/playground-context.ts`)

- `PlaygroundContext = createContext<PlaygroundStore | null>(null)`
- `<PlaygroundProvider>` calls `createPlaygroundStore(maxEntries)` once (via `useRef`) and provides it
- `usePlaygroundStore(): PlaygroundStore` — reads context, throws in dev if null

### 9.4 useRenderPlayground (`src/hooks/use-render-playground.ts`)

```
useRenderPlayground(name, props, options?) {
  if (NODE_ENV !== 'development') return
  store = usePlaygroundStore()
  onReport = useCallback((r) => store.push(r), [store])
  useRenderInsights(name, props, { ...options, onReport })
}
```

The `onReport` callback is stable (store reference never changes). This satisfies `useRenderInsights`'s expectation.

### 9.5 RenderPlaygroundPanel (`src/components/render-playground-panel.tsx`)

```
RenderPlaygroundPanel() {
  if (NODE_ENV !== 'development') return null
  store = usePlaygroundStore()
  reports = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  latestReport = reports.at(-1) ?? null
  ...render sections...
}
```

Sub-components (all in `src/components/`):
- `score-gauge.tsx` — SVG arc, receives `score: number, grade: HealthGrade`
- `render-timeline.tsx` — horizontal strip, receives `reports: readonly InsightReport[]`
- `prop-diff-table.tsx` — changed props list, receives `report: InsightReport`
- `memo-badge.tsx` — memo classification badge, receives `classification: MemoClassification`
- `frequency-meter.tsx` — frequency class + rate, receives `frequency: FrequencySummary`
- `recommendations-list.tsx` — bulleted recommendations, receives `recommendations: string[]`

### 9.6 useInsightCapture (`src/hooks/use-insight-capture.ts`)

```
useInsightCapture() {
  storeRef = useRef(null)
  if (storeRef.current === null) storeRef.current = createPlaygroundStore()
  store = storeRef.current
  reports = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)
  onReport = useCallback((r) => store.push(r), [store])
  clearReports = useCallback(() => store.clear(), [store])
  return { onReport, reports, clearReports }
}
```

### 9.7 Future extensibility hooks

The `PlaygroundStore` shape is the integration contract for:
- `render-telemetry-core`: replaces `store.push` with a telemetry-emitting variant
- `render-replay-engine`: records the full `InsightReport[]` array for replay
- `render-devtools-panel`: reads from a shared store exposed via `window.__RENDER_KIT_STORE__`

`PlaygroundProvider` accepts a `store` prop so consumers can pass in a custom store implementation.

### 9.8 Recommendation Engine

Three pure modules under `src/engine/` (no React, no hooks). All are deterministic pure functions; zero side effects.

**`src/engine/session-stats.ts`**

```
computeSessionStats(history: readonly InsightReport[], windowSize?: number): SessionStats
```

Window = `history.slice(-windowSize)` (default `windowSize = 20`).

- `mostFrequentTrigger`: mode of `inferredTrigger` across the window
- `mostUnstableProp` / `mostUnstablePropOccurrences`: prop name with highest total count in `props.unstable` entries summed across window
- `scoreTrend`: compare `avg(firstHalf)` vs `avg(secondHalf)` of the window; improving if Δ > 5, degrading if Δ < −5, stable otherwise
- `memoTrend`: proportion of INEFFECTIVE/PARTIALLY_EFFECTIVE in first half vs second half; same threshold
- `averageScore`, `worstScore`, `bestScore`: single-pass reduce over the window

**`src/engine/score-breakdown.ts`**

```
computeScoreBreakdown(report: InsightReport): ScoreBreakdown
```

Reverses the `scorer.ts` formula from `render-insights`. All inputs are present on `InsightReport`:

| Component | Formula |
|---|---|
| `frequencyPenalty` | `{ LOW: 0, NOT_ENOUGH_DATA: 0, MODERATE: 10, HIGH: 25 }[frequency.classification]` |
| `instabilityPenalty` | `Math.min(props.unstable.length * 8, 30)` |
| `memoPenalty` | `{ NOT_APPLICABLE: 0, EFFECTIVE: 0, PARTIALLY_EFFECTIVE: 15, INEFFECTIVE: 30 }[memo.sessionClass]` |
| `mixedSignalPenalty` | `Math.min(memo.mixedCount * 3, 15)` |
| `total` | `Math.max(0, 100 − frequencyPenalty − instabilityPenalty − memoPenalty − mixedSignalPenalty)` |

Each component is accompanied by a human-readable `explanation` string (e.g. `"2 unstable props × 8 = −16 pts"`).

**`src/engine/recommendation-engine.ts`**

```
computeRecommendations(report: InsightReport, history: readonly InsightReport[]): Recommendation[]
```

Internal processing:
1. Call `computeSessionStats(history)` → `SessionStats`
2. Build `RuleContext = { report, history, sessionStats }`
3. Evaluate all 10 rules; collect matching `Recommendation[]`
4. Rank by `priorityScore = severityWeight + confidence * 10 + min(evidenceOccurrences, 10)`
5. Return top 5 (INFO-only results capped at 1 if no higher-severity items; R-CLEAR-001 fires only when no other rules matched)

Severity weights: `CRITICAL = 50, HIGH = 40, MEDIUM = 30, LOW = 20, INFO = 10`

**Rule catalogue:**

| Rule ID | Category | Fires when | Severity |
|---|---|---|---|
| R-FUNC-001 | `unstable-function` | `props.unstable` contains `type=function` AND `memo.sessionClass ≠ NOT_APPLICABLE` | `CRITICAL` if INEFFECTIVE + funcCount ≥ 2; `HIGH` otherwise |
| R-OBJ-001 | `unstable-object` | `props.unstable` contains `type=object` | `HIGH` if INEFFECTIVE; `MEDIUM` otherwise |
| R-ARR-001 | `unstable-array` | `props.unstable` contains `type=array` | `HIGH` if INEFFECTIVE; `MEDIUM` otherwise |
| R-MEMO-001 | `ineffective-memo` | `memo.sessionClass === 'INEFFECTIVE'` AND `memo.referenceOnlyCount ≥ 3` | `CRITICAL` |
| R-MEMO-002 | `partially-effective-memo` | `memo.sessionClass === 'PARTIALLY_EFFECTIVE'` AND `memo.mixedCount ≥ 2` | `MEDIUM` |
| R-FREQ-001 | `excessive-frequency` | `frequency.classification === 'HIGH'` | `HIGH` |
| R-PARENT-001 | `parent-triggered` | last 5 history items all have `inferredTrigger === 'no-prop-change'` | `MEDIUM` |
| R-MEMO-003 | `over-memoization` | `memo.sessionClass === 'EFFECTIVE'` AND `score ≥ 90` AND `props.unstable.length === 0` AND `memo.genuineCount ≥ 5` | `INFO` |
| R-SCORE-001 | `score-degrading` | `sessionStats.scoreTrend === 'degrading'` AND `sessionStats.averageScore − report.score ≥ 20` | `HIGH` |
| R-CLEAR-001 | `well-optimized` | `score ≥ 90` AND `props.unstable.length === 0` AND `frequency.classification ≠ 'HIGH'` AND no other rules matched | `INFO` |

**Confidence formula per rule:**

| Rule | Formula |
|---|---|
| R-FUNC/OBJ/ARR-001 | `min(1, occurrences / 10)` — occurrences = count of renders where prop appeared in `props.unstable` |
| R-MEMO-001 | `min(1, referenceOnlyCount / 10)` |
| R-MEMO-002 | `min(1, mixedCount / 5)` |
| R-FREQ-001 | `1.0` (frequency classification is already a window aggregate) |
| R-PARENT-001 | `min(1, matchingHistoryCount / 10)` |
| R-SCORE-001 | `min(1, (averageScore − score) / 30)` |
| R-MEMO-003, R-CLEAR-001 | `1.0` (condition is unambiguous) |

**Text templates** (all fields built deterministically from `RuleContext` — no hardcoded filler strings):

*R-FUNC-001:*
- `title`: `"Unstable function prop: ${propName}"` (pluralized if multiple)
- `explanation`: `"${propName} recreates on every parent render (${occurrences}× observed). React.memo receives a new reference and re-renders despite no data change."`
- `fix`: `"Wrap ${propName} in useCallback at the call site."`
- `expectedImpact`: `"Eliminates reference-only renders from ${propName}. Memo class improves from ${sessionClass} toward EFFECTIVE."`

*R-MEMO-001:*
- `title`: `"React.memo fully defeated"`
- `explanation`: `"All ${referenceOnlyCount} observed renders are caused by reference-unstable props. The memo optimization provides zero benefit."`
- `fix`: `"Stabilize all props in Unstable Props — useCallback for functions, useMemo for objects and arrays."`
- `expectedImpact`: `"Memo class becomes EFFECTIVE. Score recovers up to ${memoPenalty + instabilityPenalty} pts."`

*R-FREQ-001:*
- `title`: `"High render frequency: ${rate.toFixed(1)}/s"`
- `explanation`: `"${rate} renders/second over a ${windowMs / 1000}s window — ${frequencyPenalty} pt frequency penalty."`
- `fix`: `"Investigate parent state updates or context subscription breadth driving this component."`
- `expectedImpact`: `"Dropping to MODERATE frequency recovers ${frequencyPenalty − 10} pts; dropping to LOW recovers all ${frequencyPenalty} pts."`

*R-PARENT-001:*
- `title`: `"Renders without prop changes"`
- `explanation`: `"The last ${count} renders had no prop changes. This component re-renders because its parent does, not because its own data changed."`
- `fix`: `"Wrap in React.memo, or move state/context subscriptions closer to where they're consumed."`
- `expectedImpact`: `"Eliminates no-prop-change renders. Frequency class may improve."`

*R-SCORE-001:*
- `title`: `"Render health declining"`
- `explanation`: `"Score has dropped ${delta} pts below the session average of ${averageScore}. Recent renders are less healthy than earlier ones."`
- `fix`: `"Check what changed in recent interactions — new unstable props or increased frequency are common causes."`
- `expectedImpact`: `"Restoring earlier patterns should bring score back toward ${averageScore}."`

*R-MEMO-003:*
- `title`: `"React.memo overhead may be unnecessary"`
- `explanation`: `"All ${genuineCount} observed renders are driven by genuine prop changes. Memo is working correctly but adds overhead if this component renders cheaply."`
- `fix`: `"Profile render cost. If under 0.1ms, removing React.memo reduces reconciler overhead."`
- `expectedImpact`: `"Minor overhead reduction; health score unaffected."`

*R-CLEAR-001:*
- `title`: `"Component is well-optimized"`
- `explanation`: `"No unstable props, frequency issues, or memo problems detected across ${windowSize} renders."`
- `fix`: `"No action required."`
- `expectedImpact`: `"Continue monitoring as the component evolves."`

---

## 10. UI/UX Design

### 10.1 Panel anatomy

```
╔══════════════════════════════════════════════════════╗
║  [render-playground] <ComponentName>          [Clear] ║
╠══════════════════════════════════════════════════════╣
║  Session  5 renders · ↓ degrading · avg 61           ║  ← FR-11 session strip (hidden if < 3 reports)
╠══════════════════════════════════════════════════════╣
║  Render Timeline                                      ║
║  ▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌▐▌ → (newest)  ║
╠════════════════╦═════════════════════════════════════╣
║  Score         ║  Latest Render                       ║
║                ║  Render #N  ·  trigger               ║
║   ┌───────┐   ║  Frequency   HIGH  ·  8.2 /s         ║
║   │  42   │   ║  Memo        INEFFECTIVE              ║
║   └───────┘   ║                                       ║
║    POOR        ║  Changed Props                       ║
║                ║  › onClick   new reference           ║
║  [Why 42?]     ║  › config    new reference           ║  ← FR-10 toggle
║  ▼ Freq    − 0 ║                                       ║
║  ▼ Instab  −30 ║  Unstable Props                      ║
║  ▼ Memo    −30 ║  › onClick   function                ║
║  ▼ Mixed   − 0 ║  › config    object                  ║
╠════════════════╩═════════════════════════════════════╣
║  Recommendations                                      ║
║                                                       ║
║  ● CRITICAL  React.memo fully defeated                ║  ← severity badge + title
║  All 8 observed renders are caused by reference-     ║  ← explanation (2 lines max)
║  unstable props. Memo provides zero benefit.         ║
║  Fix: Stabilize all Unstable Props.                  ║  ← fix (1 line)
║  Impact: Score recovers up to 60 pts → EXCELLENT.    ║  ← expectedImpact (1 line)
║  Evidence: onClick (function · 8×) config (obj · 8×) ║  ← evidence chips
║                                                       ║
║  ● HIGH  Unstable function prop: onClick              ║
║  onClick recreates on every parent render (8×).      ║
║  Fix: Wrap onClick in useCallback.                   ║
║  Impact: Memo class improves toward EFFECTIVE.       ║
║  Evidence: onClick (function · 8 renders)             ║
╠══════════════════════════════════════════════════════╣
║  [report 5 / 10 — score:v1]                          ║
╚══════════════════════════════════════════════════════╝
```

**Recommendation card spec:**
- Severity badge: colored dot (●) + severity label (`CRITICAL`, `HIGH`, etc.)
- Severity colors: CRITICAL `#f87171`, HIGH `#fb923c`, MEDIUM `#eab308`, LOW `#5a9cf8`, INFO `#888888`
- `title`: one line, bold
- `explanation`: max 2 lines, muted text
- `fix:` prefix in accent color, fix text in normal weight
- `impact:` prefix in muted, impact text in normal weight
- `evidence:` chips — each chip is `propName (type · Nx)` in a small rounded tag
- Cards separated by a subtle `#2a2a2a` divider
- Panel shows **top 3 cards** from the engine's ranked output; if >3 recommendations exist, footer appends "N more — see full report"
- INFO-only recommendations rendered in collapsed style (title + severity only; expand on click via `useState`)

**Session strip spec (FR-11):**
- Renders only when `history.length >= 3`
- Shows: `${totalRenders} renders · ${trendArrow} ${scoreTrend} · avg ${averageScore}`
- `scoreTrend` arrows: `↑` (improving), `↓` (degrading), `→` (stable)
- Background: `#1c1c1c`, border-bottom: `1px solid #2a2a2a`

**Score breakdown spec (FR-10):**
- Collapsed by default; toggle button text `[Why ${score}?]` in accent color
- Expanded: shows a 4-row table, each row: label (padded) + penalty value + explanation string
- Uses `useState<boolean>` for expand/collapse — local component state, no store involvement

### 10.2 Score Gauge (SVG)

- Circle radius: 40px, stroke-width: 8px
- Full arc = 270°, starts at 135° (bottom-left), sweeps clockwise
- Filled arc = `(score / 100) × 270°` via `stroke-dasharray` + `stroke-dashoffset`
- Background arc: `#2a2a2a`
- Filled arc color: grade-mapped (see FR-08)
- Center text: score number (18px mono bold) + grade (10px mono, below)
- Total SVG size: 100×100px

### 10.3 Render Timeline Pills

- Each pill: 8px wide × 14px tall, 2px gap, 2px border-radius
- Color: signal-kind mapped (see FR-07)
- Container: horizontal flex, `overflow-x: auto`, max 50 pills visible
- Latest render on the right
- Tooltip on hover: `render #N · <signalKind> · score: NN`

### 10.4 Inline Style Palette

```
bg:           #0f0f0f
surface:      #161616
surface2:     #1c1c1c
border:       #2a2a2a
text:         #ededed
textMuted:    #888888
accent:       #5a9cf8
green:        #4ade80
orange:       #fb923c
yellow:       #eab308
red:          #f87171
purple:       #a78bfa
fontMono:     ui-monospace, SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, monospace
```

These are defined as a const object in `src/styles/tokens.ts` and imported by all components.

### 10.5 Panel sizing

- Default width: 360px
- Max height: `maxHeight` prop (default undefined — full content height)
- Position: controlled by the consumer (no absolute positioning in the library)
- Border: 1px solid `#2a2a2a`, border-radius 8px

### 10.6 Empty state

When `reports.length === 0`:
```
[render-playground] <ComponentName>
─────────────────────────────────
  Trigger a render to see diagnostics.
  No reports yet.
```

### 10.7 Production state

`<RenderPlaygroundPanel>` returns `null` when `NODE_ENV !== 'development'`. No DOM nodes, no overhead.

---

## 11. Data Flow

```
Render cycle of monitored component
  → useRenderPlayground(name, props, opts)
    → useRenderInsights(name, props, { onReport: store.push })
      → aggregate() → InsightReport
        → onReport(report)
          → store.push(report)
            → snapshot updated
              → listeners notified
                → useSyncExternalStore re-renders PlaygroundPanel
                  → reports = store.getSnapshot()
                  → latestReport = reports.at(-1)
                  → recommendations = computeRecommendations(latestReport, reports.slice(0, -1))
                  → breakdown = computeScoreBreakdown(latestReport)
                  → sessionStats = computeSessionStats(reports)
                    → all sub-components re-render with new data
```

Key invariants:
- The data path from `useRenderInsights` to the panel has NO `useEffect`. The store is external to React; mutations trigger re-renders via the subscription protocol.
- `computeRecommendations`, `computeScoreBreakdown`, and `computeSessionStats` are called **during render** (pure derivations) — no effects, no async.
- These three derivations are inexpensive (O(n) over ≤ 50 reports); no `useMemo` needed for correctness, though the implementer may add it as an optimization if profiling warrants it.

---

## 12. Public APIs

### Exports from `src/index.ts`

```typescript
// Core
export { createPlaygroundStore } from './store/playground-store.js';
export { PlaygroundProvider } from './context/playground-context.js';

// Hooks
export { useRenderPlayground } from './hooks/use-render-playground.js';
export { useInsightCapture } from './hooks/use-insight-capture.js';

// Panel
export { RenderPlaygroundPanel } from './components/render-playground-panel.js';

// Engine (pure functions — usable headlessly)
export { computeRecommendations } from './engine/recommendation-engine.js';
export { computeScoreBreakdown } from './engine/score-breakdown.js';
export { computeSessionStats } from './engine/session-stats.js';

// Types
export type {
  PlaygroundStore,
  RenderPlaygroundOptions,
  CaptureOptions,
  // Recommendation engine
  Recommendation,
  RecommendationCategory,
  RecommendationSeverity,
  RecommendationEvidence,
  // Score explainability
  ScoreBreakdown,
  ScoreComponent,
  // Session intelligence
  SessionStats,
  ScoreTrend,
} from './types/index.js';
```

Re-exports from `render-insights` for consumer convenience:
```typescript
export type {
  InsightReport,
  HealthGrade,
  FrequencyClass,
  MemoClassification,
  InferredTrigger,
} from '@sapanmozammel/render-insights';
```

### Type: RenderPlaygroundOptions

```typescript
type RenderPlaygroundOptions = RenderInsightsOptions; // identical options, passed through
```

### Type: CaptureOptions

```typescript
type CaptureOptions = {
  maxEntries?: number; // default 50
};
```

### Type: PlaygroundStore

```typescript
type PlaygroundStore = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => readonly InsightReport[];
  getServerSnapshot: () => readonly InsightReport[];
  push: (report: InsightReport) => void;
  clear: () => void;
};
```

### Types: Recommendation Engine

```typescript
type RecommendationCategory =
  | 'unstable-function'
  | 'unstable-object'
  | 'unstable-array'
  | 'ineffective-memo'
  | 'partially-effective-memo'
  | 'excessive-frequency'
  | 'parent-triggered'
  | 'over-memoization'
  | 'score-degrading'
  | 'well-optimized';

type RecommendationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

type RecommendationEvidence =
  | { type: 'unstable-prop'; propName: string; refType: 'function' | 'object' | 'array'; occurrences: number }
  | { type: 'render-pattern'; pattern: 'all-reference-only' | 'all-no-change' | 'mixed'; renderCount: number }
  | { type: 'frequency-measurement'; ratePerSecond: number; classification: FrequencyClass; windowMs: number }
  | { type: 'memo-session'; sessionClass: MemoClassification; genuineCount: number; referenceOnlyCount: number; mixedCount: number }
  | { type: 'score-component'; label: string; penalty: number };

type Recommendation = {
  id: string;                        // e.g. 'R-FUNC-001'
  category: RecommendationCategory;
  severity: RecommendationSeverity;
  title: string;                     // ≤ 8 words; deterministically built from context
  explanation: string;               // ≤ 2 sentences; cites specific prop names and counts
  fix: string;                       // ≤ 1 sentence; the concrete action
  expectedImpact: string;            // ≤ 1 sentence; quantified where possible
  confidence: number;                // 0–1; derived from evidence weight (see §9.8)
  evidence: RecommendationEvidence[];
};
```

### Types: Score Explainability

```typescript
type ScoreComponent = {
  label: string;       // e.g. 'Prop Instability'
  penalty: number;     // ≥ 0
  explanation: string; // e.g. '2 unstable props × 8 = −16 pts'
};

type ScoreBreakdown = {
  total: number;
  frequencyPenalty: number;
  instabilityPenalty: number;
  memoPenalty: number;
  mixedSignalPenalty: number;
  components: ScoreComponent[];
};
```

### Types: Session Intelligence

```typescript
type ScoreTrend = 'improving' | 'degrading' | 'stable';

type SessionStats = {
  windowSize: number;
  mostFrequentTrigger: InferredTrigger;
  mostUnstableProp: string | null;
  mostUnstablePropOccurrences: number;
  scoreTrend: ScoreTrend;
  memoTrend: ScoreTrend;
  averageScore: number;
  worstScore: number;
  bestScore: number;
};
```

### Component Props

```typescript
type PlaygroundProviderProps = {
  children: React.ReactNode;
  maxEntries?: number;      // default 50
  store?: PlaygroundStore;  // optional pre-created store
};

type RenderPlaygroundPanelProps = {
  className?: string;       // wrapper div className
  maxVisible?: number;      // max pills in timeline (default 50)
  onClear?: () => void;     // called after clear (optional side effect)
};
```

---

## 13. Configuration

All configuration is via `RenderPlaygroundOptions` (passthrough to `useRenderInsights`):
- `enabled?: boolean` — default true
- `ignoreProps?: string[]` — props to exclude from diff
- `maxReports?: number` — max reports to push to store (default 10)
- `logOnEveryRender?: boolean` — also log to console (default false)
- `frequencyWindowMs?: number` — frequency calculation window (default 10000)
- `frequencyLogEvery?: number` — log one-liner every N renders (default 0)

The `onReport` option is **reserved** — if the user passes it, it is merged (both the store.push and the user's callback are called).

---

## 14. Extensibility

**Custom store:** Pass a `store` prop to `<PlaygroundProvider>` with your own implementation of `PlaygroundStore`. Use this to:
- Persist reports to localStorage
- Send reports to a telemetry endpoint
- Filter or transform reports before visualization

**Headless mode:** Use `useInsightCapture` to collect `InsightReport[]` and build any custom visualization. The store protocol (`subscribe`/`getSnapshot`) is public.

**Multiple components:** Create multiple `<PlaygroundProvider>` trees, or pass a shared `store` to two `<PlaygroundProvider>` instances.

**Future telemetry hook point:** `render-telemetry-core` (Phase 3) will define a `createTelemetryStore()` that satisfies `PlaygroundStore` and transparently forwards reports to a remote endpoint.

---

## 15. Performance Requirements

- Panel re-render: < 16ms per `InsightReport` push (well within budget given the simplicity of the SVG + inline elements)
- Store subscription overhead: O(1) notify; O(n) listeners where n ≤ 1 in typical usage
- Memory: `maxEntries = 50` × avg `InsightReport` ≈ 50 × ~2 KB = ~100 KB max
- Timeline pill render: 50 DOM nodes × 8px = trivial
- `useSyncExternalStore` tearing safety: guaranteed by React 18's concurrent mode semantics
- Production: zero overhead (all guards return immediately)

---

## 16. Accessibility Requirements

- All interactive elements (`<button>`) have `aria-label`
- Clear button: `aria-label="Clear render history"`
- Timeline pills: `role="list"`, each pill `role="listitem"` with `aria-label="Render #N: <signalKind>"`
- Score gauge SVG: `role="img"` + `aria-label="Render health score: NN out of 100 — GOOD"`
- Panel container: `role="region"` + `aria-label="Render diagnostics for <ComponentName>"`
- Color is never the sole indicator: text labels accompany all color-coded elements

---

## 17. Error Handling

- `useRenderPlayground` called outside `<PlaygroundProvider>`: throws `Error('[render-playground] useRenderPlayground must be used inside <PlaygroundProvider>')` in development only; no-ops in production
- `onReport` (user-provided override) throwing: caught via try/catch, logged to `console.error`; does not surface in component
- Empty `reports` array: panel shows empty state — never crashes
- `InsightReport` with unexpected shape: defensive `?.` access in all sub-components; renders `-` for missing fields

---

## 18. Security Considerations

- No code execution — prop values are displayed as formatted strings, never eval'd
- `prev`/`next` prop values in `PropChangeEntry` are stringified via JSON-safe formatter (same as existing `render-insights` logger); circular references are caught with try/catch and displayed as `[circular]`
- No network requests; fully local
- No localStorage access in the package itself

---

## 19. Demo Requirements

### Demo component: `demo/src/features/render-playground/index.tsx`

Uses the same 7 scenarios from `render-insights/scenarios.ts` as a base (re-export or copy adjusted for the playground context). The key difference: instead of the `InsightsPanel` visual mock, the demo embeds the real `<RenderPlaygroundPanel>` from `@sapanmozammel/render-playground`.

```tsx
// Wraps a Dashboard component with useRenderPlayground
// Shows the live panel driven by real hook data
// 7 scenario tabs
```

### Demo DemoTarget component

```tsx
const DemoTarget = (props) => {
  useRenderPlayground('Dashboard', props);
  // renders component preview
};

// Wrapped in:
<PlaygroundProvider>
  <DemoTarget {...scenarioCfg} />
  <RenderPlaygroundPanel />
</PlaygroundProvider>
```

This demo is the definitive showcase: it shows the package working end-to-end with real data, not a visual mock.

### Registry entry (8th tool)

```typescript
{
  name: 'render-playground',
  slug: 'render-playground',
  description: 'Visual render observatory — wraps any component with a real-time diagnostics panel showing health score, render timeline, prop changes, and memo effectiveness. No console logs needed.',
  packageName: '@sapanmozammel/render-playground',
  version: '1.0.0',
  tags: ['visual', 'debugging', 'performance', 'hooks'],
  status: 'beta',
  demoImport: () => import('@/features/render-playground').then(m => ({ default: m.RenderPlaygroundDemo })),
}
```

---

## 20. Testing Strategy

All tests in `tests/` (outside `src/`). `NODE_ENV=development` for hook tests, `NODE_ENV=production` for production guard tests.

### 20.1 Store tests (`tests/store.test.ts`) — ≥ 15 tests

- `createPlaygroundStore()` returns object with all 5 methods
- `push` adds to snapshot; `getSnapshot` returns new reference
- `push` with `maxEntries=3`: 4th push evicts oldest (FIFO)
- `subscribe` returns unsubscribe; unsubscribed listener not called
- `push` notifies all subscribers
- `clear` resets snapshot to `[]`; notifies subscribers
- Multiple simultaneous subscribers all notified
- `getServerSnapshot` always returns `[]`
- `getSnapshot` returns identical reference between mutations (no spurious new arrays)

### 20.2 useInsightCapture tests (`tests/use-insight-capture.test.ts`) — ≥ 12 tests

- Initially returns `reports: []`
- `onReport` stable reference across re-renders (`Object.is`)
- `onReport(report)` causes `reports` to include the report
- `clearReports()` resets `reports` to `[]`
- Production: `onReport` no-ops, `reports` stays `[]`
- Works in StrictMode (double-invoke doesn't break snapshot stability)

### 20.3 useRenderPlayground tests (`tests/use-render-playground.test.tsx`) — ≥ 15 tests

- Called without provider: throws with message `[render-playground]`
- Primitive prop change: store receives report with `inferredTrigger: 'genuine-prop-change'`
- Reference prop change: report with `inferredTrigger: 'reference-instability'`
- No prop change: store NOT updated (Path 4 of `useRenderInsights`)
- First render: store NOT updated (baseline)
- Production: store NOT updated even with prop change
- StrictMode: store receives exactly 1 report per prop change (not 2)
- `enabled: false`: no report emitted
- `maxReports: 2`, 5 renders: store receives exactly 2 reports
- User-provided `onReport` in options: both store.push and user callback called

### 20.4 RenderPlaygroundPanel tests (`tests/render-playground-panel.test.tsx`) — ≥ 20 tests

All tests wrap in `<PlaygroundProvider>` and inject reports via a mock store.

- Empty state: "Trigger a render to see diagnostics." visible
- With 1 report: no empty state; component name in header
- Score displayed as "NN / 100"
- EXCELLENT grade text visible
- Timeline pill count = reports.length
- Clear button: clicking calls store.clear
- Renders null in production
- Changed props section present when `props.changed.length > 0`
- Changed props section absent when `props.changed.length === 0`
- Unstable props section present when `props.unstable.length > 0`
- Recommendations section: shows `Recommendation.title` from engine output (not raw string)
- Recommendation card shows severity badge text (e.g. "CRITICAL")
- Recommendation card shows fix text
- Frequency class visible in latest report section
- Memo classification visible
- Render number visible
- Multiple reports: latest report shown (last in array)
- `maxVisible` prop: timeline renders at most `maxVisible` pills
- `aria-label` on clear button: "Clear render history"
- Panel `role="region"` present
- Session strip absent when `reports.length < 3`; present when `reports.length >= 3`
- "Why NN?" score breakdown toggle: hidden by default; visible after click

### 20.5 ScoreGauge tests (`tests/score-gauge.test.tsx`) — ≥ 8 tests

- Score 100: filled arc stroke-dashoffset reflects full arc
- Score 0: zero-length arc (dashoffset = full circumference)
- Score 72: arc length proportional to 72/100
- Grade EXCELLENT: fill color is green
- Grade POOR: fill color is orange
- `aria-label` contains score and grade
- `role="img"` present

### 20.6 RenderTimeline tests (`tests/render-timeline.test.tsx`) — ≥ 8 tests

- 3 reports: 3 pills rendered
- Genuine signal: green background color on pill
- Reference-only signal: orange background color
- Mixed signal: yellow background color
- `role="list"` on container
- Each pill `role="listitem"`
- Empty reports: no pills rendered

### 20.7 Production tests (`tests/render-playground.prod.test.tsx`) — ≥ 3 tests

- `<RenderPlaygroundPanel>` renders null in production
- `useRenderPlayground` does not push to store in production
- `useInsightCapture` returns empty reports in production

### 20.8 Recommendation engine tests (`tests/recommendation-engine.test.ts`) — ≥ 20 tests

All tests call `computeRecommendations(report, history)` directly — no React, no rendering.

- Empty history: returns at most 1 INFO recommendation (R-CLEAR-001 when score ≥ 90)
- Unstable function prop + INEFFECTIVE memo: R-FUNC-001 fires at CRITICAL severity
- Unstable function prop + NOT_APPLICABLE memo: R-FUNC-001 fires at HIGH (not CRITICAL)
- Two unstable function props + INEFFECTIVE: severity is CRITICAL (funcCount ≥ 2)
- Unstable object prop: R-OBJ-001 fires
- Unstable array prop: R-ARR-001 fires
- `memo.sessionClass === 'INEFFECTIVE'` + `referenceOnlyCount >= 3`: R-MEMO-001 fires
- `referenceOnlyCount < 3`: R-MEMO-001 does NOT fire
- HIGH frequency: R-FREQ-001 fires with correct title containing rate value
- Last 5 history all `no-prop-change` trigger: R-PARENT-001 fires
- Less than 5 history items all `no-prop-change`: R-PARENT-001 does NOT fire
- EFFECTIVE memo + score ≥ 90 + genuineCount ≥ 5: R-MEMO-003 fires at INFO
- Degrading score trend + Δ ≥ 20: R-SCORE-001 fires at HIGH
- Score ≥ 90 + no other rules: R-CLEAR-001 fires (well-optimized)
- Score ≥ 90 + unstable props present: R-CLEAR-001 does NOT fire (other rules matched)
- Results sorted by priority: CRITICAL before HIGH before MEDIUM before LOW before INFO
- Returns at most 5 recommendations regardless of how many rules match
- INFO-only set capped at 1
- `Recommendation.confidence` is between 0 and 1 (inclusive)
- `Recommendation.evidence` is non-empty for all non-INFO recommendations
- Each `Recommendation.id` is unique in the returned array

### 20.9 Score breakdown tests (`tests/score-breakdown.test.ts`) — ≥ 10 tests

All tests call `computeScoreBreakdown(report)` directly.

- LOW frequency: `frequencyPenalty === 0`
- MODERATE frequency: `frequencyPenalty === 10`
- HIGH frequency: `frequencyPenalty === 25`
- 0 unstable props: `instabilityPenalty === 0`
- 2 unstable props: `instabilityPenalty === 16`
- 4+ unstable props: `instabilityPenalty === 30` (cap)
- INEFFECTIVE memo: `memoPenalty === 30`
- PARTIALLY_EFFECTIVE memo: `memoPenalty === 15`
- EFFECTIVE memo: `memoPenalty === 0`
- `total === score` — breakdown total matches `report.score` exactly
- `components.length === 4` always (all four penalty components present)
- Each component `explanation` is a non-empty string

### 20.10 Session stats tests (`tests/session-stats.test.ts`) — ≥ 10 tests

All tests call `computeSessionStats(history, windowSize?)` directly.

- Empty history: returns safe defaults (`windowSize: 0`, `mostUnstableProp: null`, `scoreTrend: 'stable'`, etc.)
- Single report: `averageScore === report.score`, `worstScore === bestScore === report.score`
- `windowSize` defaults to 20 and slices history accordingly
- `mostFrequentTrigger`: returns mode of `inferredTrigger` across window
- `mostUnstableProp`: returns prop name with highest total occurrences; `null` if none
- Improving score trend: first-half avg < second-half avg by > 5 → `scoreTrend: 'improving'`
- Degrading score trend: first-half avg > second-half avg by > 5 → `scoreTrend: 'degrading'`
- Stable score trend: halves within 5 pts → `scoreTrend: 'stable'`
- `averageScore` is rounded to nearest integer
- History larger than `windowSize`: only the last `windowSize` items are analyzed

**Total: ≥ 119 tests**

---

## 21. Documentation Strategy

No README generated during implementation (CLAUDE.md convention). PRD is authoritative.

CLAUDE.md update: add `packages/render-playground` structure block and `/implement render-playground` slash command.

---

## 22. Release Plan

1. Implement on `feature/render-playground` branch
2. Quality gate: 119+ tests, zero type errors, demo build
3. PR → `main` → squash merge
4. `pnpm publish` from `packages/render-playground/`
5. `npm install @sapanmozammel/render-playground` on the demo site verifies the published artifact

---

## 23. Future Integration Strategy

| Future package | Integration point |
|---|---|
| `render-telemetry-core` | Custom `PlaygroundStore` passed via `<PlaygroundProvider store={telemetryStore}>` |
| `render-replay-engine` | Reads `InsightReport[]` from `store.getSnapshot()` at session end |
| `render-devtools-panel` | Exposes shared store via `window.__RENDER_KIT_DEV__` (opt-in); panel reads from it |
| `vscode-render-kit` | VSCode webview embeds `<RenderPlaygroundPanel>` via an iframe, reads via `postMessage` |
| `render-playground-sandbox` | Uses `<PlaygroundProvider>` + `useRenderPlayground` inside the iframe sandbox; same API |

The invariant: every future package consumes `PlaygroundStore`, not the React component tree. The store is the stable integration boundary.

---

## 24. Success Metrics

- ≥ 119 tests passing, zero type errors, demo build clean (launch gate)
- PRD-specified API shipped exactly (no scope creep)
- Demo score-recovery scenario produces a visible score change of ≥ 30 points when fix is toggled
- Panel renders in < 16ms on Chrome mid-tier device after a report is pushed
- Zero `useEffect` calls in any `src/` file (verified by grep)
- R-CLEAR-001 fires ONLY when no other rules matched — verified by test
- `computeRecommendations` is a pure function: same inputs always produce identical output (verified by determinism tests in 20.8)
- `ScoreBreakdown.total` always equals `InsightReport.score` for the same report (verified by 20.9)
- Panel recommendation cards show structured `Recommendation.title` + `fix` — never the raw `InsightReport.recommendations` string array

---

## 25. Risks & Open Questions

**Risk R1: StrictMode double-invoke of the monitored component**
In StrictMode, React mounts → unmounts → remounts every component. `useRenderInsights` (called via `useRenderPlayground`) will execute twice on mount. On the second mount it starts fresh (refs are reset). This means the first "baseline" render is consumed in the first mount; on remount it establishes a new baseline. The panel may show reports from both mounts in the store. **Mitigation:** Store's FIFO behavior absorbs this; users see it as expected in StrictMode. Test cases cover it.

**Risk R2: `useRenderInsights` calling `onReport` during React render phase**
`onReport` → `store.push()` → notifies listeners → `useSyncExternalStore` schedules a re-render of the panel. In React 18 concurrent mode, calling a state-mutation from another component's render is handled via interleaved rendering — React will process the notification after the current render commits. `useSyncExternalStore` is designed exactly for this. **Mitigation:** Architecture is correct; no special handling needed.

**Risk R3: `render-insights` version drift**
If `render-insights` changes `InsightReport` shape in a future major version, `render-playground` will break. **Mitigation:** Peer dep is `>=1.0.0 <2.0.0`; render-playground and render-insights should be versioned together on breaking changes.

**Open Question Q1:** Should `useRenderPlayground` also expose a ref to the current `InsightReport[]` for use in tests (without needing `useInsightCapture`)? Current answer: no — `useInsightCapture` handles the headless case. Keep separation clean.

**Open Question Q2:** Should the panel be a floating overlay (position: fixed) by default? Current answer: no — consumer controls positioning. Library doesn't dictate layout.

**Open Question Q3:** Should `render-playground` re-export all of `render-insights`' hooks? Current answer: no — explicit boundary; consumers install `render-insights` separately if they want `useRenderInsights` directly.

---

## 26. Implementation Phases

### Phase 1 — Package scaffold

- [✅] Step 1.1: Create `packages/render-playground/package.json` — name `@sapanmozammel/render-playground`, version `1.0.0`, peerDeps `react>=18` + `@sapanmozammel/render-insights>=1.0.0`
- [✅] Step 1.2: Create `packages/render-playground/tsup.config.ts` — identical to siblings; entry `src/index.ts`
- [✅] Step 1.3: Create `packages/render-playground/vitest.config.ts` — identical to siblings

### Phase 2 — Types and store

- [✅] Step 2.1: Create `src/types/index.ts` — `PlaygroundStore`, `RenderPlaygroundOptions`, `CaptureOptions`, `PanelProps`, `ProviderProps`
- [✅] Step 2.2: Create `src/styles/tokens.ts` — CSS-in-JS color/font constants (all hex, no CSS custom props)
- [✅] Step 2.3: Create `src/store/playground-store.ts` — `createPlaygroundStore(maxEntries?: number): PlaygroundStore`

### Phase 2.5 — Recommendation Engine (pure modules, no React)

- [✅] Step 2.4: Create `src/engine/session-stats.ts` — `computeSessionStats(history, windowSize?): SessionStats`; computes trend, mode trigger, most unstable prop, avg/worst/best score
- [✅] Step 2.5: Create `src/engine/score-breakdown.ts` — `computeScoreBreakdown(report): ScoreBreakdown`; reverses scorer.ts formula; all four penalty components with explanation strings
- [✅] Step 2.6: Create `src/engine/recommendation-engine.ts` — 10 rules (R-FUNC-001 through R-CLEAR-001); deterministic priority ranking; returns `Recommendation[]` capped at 5

### Phase 3 — Context

- [✅] Step 3.1: Create `src/context/playground-context.ts` — `PlaygroundContext`, `PlaygroundProvider`, `usePlaygroundStore`

### Phase 4 — Hooks

- [✅] Step 4.1: Create `src/hooks/use-insight-capture.ts` — standalone capture hook (no context)
- [✅] Step 4.2: Create `src/hooks/use-render-playground.ts` — wraps `useRenderInsights`; reads context store

### Phase 5 — Visual components

- [⬜] Step 5.1: Create `src/components/score-gauge.tsx` — SVG arc gauge; inline styles; a11y attrs
- [⬜] Step 5.2: Create `src/components/render-timeline.tsx` — pill strip; FIFO display; list role
- [⬜] Step 5.3: Create `src/components/prop-diff-table.tsx` — changed + unstable props list
- [⬜] Step 5.4: Create `src/components/memo-badge.tsx` — memo classification badge
- [⬜] Step 5.5: Create `src/components/frequency-meter.tsx` — rate + class display
- [⬜] Step 5.6: Create `src/components/recommendation-card.tsx` — single structured `Recommendation` card; severity badge + title + explanation + fix + expectedImpact + evidence chips; INFO cards collapsed by default (`useState<boolean>`)
- [⬜] Step 5.7: Create `src/components/recommendations-section.tsx` — renders top 3 `Recommendation[]` as cards; shows "+ N more" footer if engine returned > 3
- [⬜] Step 5.8: Create `src/components/score-breakdown-panel.tsx` — "Why NN?" toggle (`useState<boolean>`); 4-row penalty table; renders `ScoreBreakdown`
- [⬜] Step 5.9: Create `src/components/session-strip.tsx` — session summary bar; renders `SessionStats`; hidden when `windowSize < 3`
- [⬜] Step 5.10: Create `src/components/render-playground-panel.tsx` — master panel; composes all sub-components; calls `computeRecommendations`, `computeScoreBreakdown`, `computeSessionStats` during render; reads from context via `useSyncExternalStore`

### Phase 6 — Public entry

- [⬜] Step 6.1: Create `src/index.ts` — named exports per §12; re-export InsightReport types from render-insights

### Phase 7 — Tests (≥ 119)

- [⬜] Step 7.1: Write `tests/store.test.ts` — ≥ 15 tests (§20.1)
- [⬜] Step 7.2: Write `tests/use-insight-capture.test.ts` — ≥ 12 tests (§20.2)
- [⬜] Step 7.3: Write `tests/use-render-playground.test.tsx` — ≥ 15 tests (§20.3)
- [⬜] Step 7.4: Write `tests/render-playground-panel.test.tsx` — ≥ 22 tests (§20.4)
- [⬜] Step 7.5: Write `tests/score-gauge.test.tsx` — ≥ 8 tests (§20.5)
- [⬜] Step 7.6: Write `tests/render-timeline.test.tsx` — ≥ 8 tests (§20.6)
- [⬜] Step 7.7: Write `tests/render-playground.prod.test.tsx` — ≥ 3 tests (§20.7)
- [⬜] Step 7.8: Write `tests/recommendation-engine.test.ts` — ≥ 20 tests (§20.8)
- [⬜] Step 7.9: Write `tests/score-breakdown.test.ts` — ≥ 10 tests (§20.9)
- [⬜] Step 7.10: Write `tests/session-stats.test.ts` — ≥ 10 tests (§20.10)
- [⬜] Step 7.11: Run `pnpm run test` — all green (≥ 119 pass)
- [⬜] Step 7.12: Run `pnpm exec tsc --noEmit` — zero errors
- [⬜] Step 7.13: Run `pnpm run build` — ESM + CJS + `.d.ts` artifacts produced

### Phase 8 — Demo integration

- [⬜] Step 8.1: Create `demo/src/features/render-playground/scenarios.ts` — reuse/adapt `render-insights` scenarios; keep the 7-scenario structure
- [⬜] Step 8.2: Create `demo/src/features/render-playground/index.tsx` — `RenderPlaygroundDemo`; wraps `DemoTarget` in `<PlaygroundProvider>` + renders `<RenderPlaygroundPanel>`; does NOT use the visual mock panel (uses the real package panel)
- [⬜] Step 8.3: Add `'@sapanmozammel/render-playground'` to `demo/next.config.ts` `transpilePackages`
- [⬜] Step 8.4: Add `"@sapanmozammel/render-playground": "workspace:*"` to `demo/package.json`
- [⬜] Step 8.5: Add 8th tool entry to `demo/src/lib/registry/index.ts` (see §19)
- [⬜] Step 8.6: Update `CLAUDE.md` — add `packages/render-playground` structure block + `/implement render-playground` slash command
- [⬜] Step 8.7: Run demo type check: `cd demo && pnpm exec tsc --noEmit`
- [⬜] Step 8.8: Run demo build: `pnpm run build` (from demo/ or root)

---

## Affected Files

- `demo/next.config.ts` — add `@sapanmozammel/render-playground` to `transpilePackages`
- `demo/package.json` — add `"@sapanmozammel/render-playground": "workspace:*"`
- `demo/src/lib/registry/index.ts` — add 8th tool entry
- `CLAUDE.md` — add package structure block + slash command
- `pnpm-lock.yaml` — updated by `pnpm install`

## New Files

```
packages/render-playground/
  package.json                              — package manifest; peer deps render-insights + react
  tsup.config.ts                            — identical to siblings; entry src/index.ts
  vitest.config.ts                          — identical to siblings
  src/
    types/index.ts                          — all public + internal types (PlaygroundStore, Recommendation, ScoreBreakdown, SessionStats, etc.)
    styles/tokens.ts                        — CSS-in-JS color/typography constants (all hex)
    store/playground-store.ts               — createPlaygroundStore pure factory
    context/playground-context.ts          — PlaygroundContext + PlaygroundProvider + usePlaygroundStore
    hooks/use-insight-capture.ts            — standalone headless capture hook (no context)
    hooks/use-render-playground.ts          — main hook; wraps useRenderInsights; pushes to context store
    engine/session-stats.ts                 — computeSessionStats pure function (FR-11)
    engine/score-breakdown.ts              — computeScoreBreakdown pure function (FR-10)
    engine/recommendation-engine.ts        — computeRecommendations; 10 deterministic rules (FR-09)
    components/score-gauge.tsx              — SVG arc health score gauge
    components/render-timeline.tsx          — horizontal pill timeline
    components/prop-diff-table.tsx          — changed + unstable props display
    components/memo-badge.tsx               — memo classification badge
    components/frequency-meter.tsx          — frequency class + rate display
    components/recommendation-card.tsx      — single Recommendation card with severity badge + evidence chips
    components/recommendations-section.tsx  — renders top 3 Recommendation[] as cards; "+ N more" footer
    components/score-breakdown-panel.tsx    — "Why NN?" expandable penalty breakdown
    components/session-strip.tsx            — session summary bar (trend indicators; hidden < 3 reports)
    components/render-playground-panel.tsx  — master panel; derives recommendations/breakdown/session during render
    index.ts                                — public re-exports (components, hooks, engine functions, types)
  tests/
    store.test.ts                           — PlaygroundStore unit tests (≥15)
    use-insight-capture.test.ts             — headless capture hook tests (≥12)
    use-render-playground.test.tsx          — main hook tests in provider (≥15)
    render-playground-panel.test.tsx        — panel RTL tests (≥22)
    score-gauge.test.tsx                    — SVG gauge tests (≥8)
    render-timeline.test.tsx                — timeline pill tests (≥8)
    render-playground.prod.test.tsx         — production guard tests (≥3)
    recommendation-engine.test.ts           — pure engine tests; all 10 rules (≥20)
    score-breakdown.test.ts                 — ScoreBreakdown accuracy tests (≥10)
    session-stats.test.ts                   — SessionStats derivation tests (≥10)

demo/src/features/render-playground/
  scenarios.ts                              — 7 demo scenarios
  index.tsx                                 — RenderPlaygroundDemo component
```

---

## Verification

Before declaring done, the implementer self-reviews each item:

- [ ] `pnpm run test` — ≥ 119 tests green in `packages/render-playground/`
- [ ] `pnpm run test` — all packages still green (no regressions)
- [ ] `pnpm exec tsc --noEmit` — zero errors (run from repo root)
- [ ] `pnpm run build` — `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` produced
- [ ] `pnpm publish --dry-run` — tarball preview succeeds
- [ ] Demo type check: `cd demo && pnpm exec tsc --noEmit`
- [ ] Demo build: `pnpm run build` shows 8 routes (including `/render-playground`)
- [ ] Zero `useEffect` calls in any `src/` file (run `grep -r "useEffect" packages/render-playground/src/` — must be empty)
- [ ] Zero `interface` keywords in any `src/` file
- [ ] Zero `function ` declarations (arrow functions only)
- [ ] All component and engine files are kebab-case
- [ ] `<RenderPlaygroundPanel>` returns null in production (verified by prod test)
- [ ] Panel recommendation cards show `Recommendation.title` + `Recommendation.fix` — NOT raw `InsightReport.recommendations` strings
- [ ] R-CLEAR-001 fires only when no other rules matched (verified by recommendation-engine.test.ts)
- [ ] `computeScoreBreakdown(report).total === report.score` for all test reports (verified by score-breakdown.test.ts)
- [ ] Panel displays real `InsightReport` data from the demo (manual: open `/render-playground`, trigger a scenario, verify score/timeline/recommendations update)
- [ ] "Why NN?" toggle: hidden by default; shows 4-row penalty breakdown on click; hides on second click
- [ ] Score gauge arc fills correctly for score 0, 50, 100 (manual visual check)
- [ ] Clear button resets timeline, session strip, and recommendations to empty state
- [ ] `PlaygroundProvider` required — calling `useRenderPlayground` without it throws (verified by test)
- [ ] `computeRecommendations`, `computeScoreBreakdown`, `computeSessionStats` are exported from `src/index.ts` and callable directly by consumers
