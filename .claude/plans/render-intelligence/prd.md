# @sapanmozammel/render-intelligence — PRD

---

## Feature

**Title:** `@sapanmozammel/render-intelligence`

**Summary:** A framework-agnostic, post-hoc analysis engine that consumes standardized telemetry from `render-core-schema`-compatible sources and produces structured intelligence reports with multi-component root-cause analysis, bottleneck rankings, cross-component correlations, and application-level health scoring — the "analysis brain" of the react-render-kit ecosystem.

---

## Context

### Problem Statement

Existing packages in the react-render-kit ecosystem perform per-component, per-render analysis in real time:

- `render-insights` hooks into a single component and scores each render individually
- `render-playground` adds session-level statistics for a single component
- `render-replay-engine` replays recorded history for a single session

None of these answer application-level questions:

- **Which component is the biggest bottleneck across the whole application?**
- **Why is ComponentA slow — is it genuinely heavy, or is it being triggered by ComponentB?**
- **Across my 40 instrumented components, which ones should I fix first?**
- **Are ComponentA and ComponentC rendering in lockstep because of a shared parent?**
- **Has my application's render health degraded since last deployment?**

`render-intelligence` fills this gap. It operates on already-collected telemetry data (a `TelemetrySnapshot`, raw `TelemetryEvent[]`, or `ReplaySession[]`) and runs a full intelligence pipeline: partitioning → per-component analysis → correlation detection → bottleneck ranking → root-cause analysis → recommendation generation → report assembly.

### Who This Is For

1. **Application developer (primary):** "I've instrumented 20 components with render-telemetry-core. Show me what to fix first."
2. **Performance engineer (power user):** "Run this against our CI telemetry dump and produce a structured report."
3. **Tool builder (SDK consumer):** "I'm building a VSCode extension and need the intelligence layer API."

### Relation to Sibling Packages

| Package | Scope | React dep | Timing |
|---|---|---|---|
| `render-insights` | Single component, per-render | Yes (hook) | Real-time |
| `render-playground` | Single component, session | Yes (hook + UI) | Real-time |
| `render-replay-engine` | Single session, navigable history | No | Post-hoc |
| **`render-intelligence`** | **All components, all sessions** | **No** | **Post-hoc** |

Related PRDs:
- `.claude/plans/render-replay-engine/prd.md` — replay engine that produces `ReplaySession[]` consumed by `render-intelligence`'s `from-replay` adapter

---

## Adoption Brief

### Adopted
- `@sapanmozammel/render-core-schema` — **peerDependency** (types for TelemetryEvent, ReplaySession, HealthGrade, etc. appear in the public API surface; consumers must have it installed)
- `tsup` — build tooling (existing pattern: ESM + CJS + .d.ts)
- `vitest` — test runner (existing pattern)
- Project conventions: arrow functions only, `type` not `interface`, kebab-case files, strict TypeScript, `exactOptionalPropertyTypes: true`

### NOT Adopted
- **React** — no peer dependency; the engine is framework-agnostic
- **`render-telemetry-core`** — not imported; its events arrive as `TelemetryEvent[]` from `render-core-schema` types
- **`render-replay-engine`** — not imported; its `ReplaySession[]` is accepted as a data input type only
- **Any UI library** — no UI, no JSX, no DOM access

---

## Architecture Strategy

### Data Flow

```
IntelligenceSource (one of three)
  ├── { type: 'snapshot', snapshot: TelemetrySnapshot }
  ├── { type: 'events',   events: readonly TelemetryEvent[] }
  └── { type: 'replay',   sessions: readonly ReplaySession[] }
         │
         ▼
   [ Adapter ]  — normalizes all sources into ComponentSessionData[]
         │
         ▼
   [ Session Partitioner ]  — groups by (componentName, sessionId)
         │
         ▼
   [ Component Analyzer ]  — per-component aggregate stats from pre-scored events
         │
         ▼
   [ Application Scorer ]  — weighted app-level score + grade
         │
         ├──────────────────────────┐
         ▼                          ▼
   [ Correlation Engine ]   [ Bottleneck Ranker ]
   (cross-component          (impact score ranking)
    pattern detection)
         │                          │
         └──────────┬───────────────┘
                    ▼
          [ Root-Cause Analyzer ]
          (causal chain per component)
                    │
                    ▼
          [ Intelligence Recommender ]
          (15 deterministic rules)
                    │
                    ▼
          [ Report Assembler ]
          → IntelligenceReport
```

### Key Design Decisions

**D1 — Events already contain scores.** `render-telemetry-core` emits `ScoreEvent`, `FrequencyEvent`, `PropChangeEvent`, and `RecommendationEvent` alongside `RenderEvent`. The component analyzer reads pre-computed scores from these events — it does NOT re-run scoring logic. This keeps the package simple and deterministic.

**D2 — Pure functions throughout.** `analyzeRenders(source, options)` is the single entry point. No global state, no closures, no singletons. Every stage is a pure function; the pipeline is a composition.

**D3 — Adapters normalize to a common internal form.** All three source types (snapshot, events, replay) normalize to `readonly ComponentSessionData[]` before analysis. Downstream stages never know which source was used.

**D4 — Plugin system is additive.** Plugins receive a read-only `AnalysisContext` and return optional arrays of bottlenecks/rootCauses/recommendations/correlations. They cannot mutate the core pipeline output. Core pipeline runs first; plugin results are merged after.

**D5 — Correlation uses timestamp proximity.** Two components "synchronize" if their render timestamps cluster within a configurable window (default: 16 ms, one animation frame). No runtime React tree knowledge required.

**D6 — Impact score is deterministic.** `impactScore = (100 - avgScore) * renderRatio + instabilityBonus + frequencyBonus`, all clamped to [0, 100]. Same inputs always produce the same output.

### Module Boundaries

```
src/
  types/index.ts                        — all public types (no logic)
  adapters/from-snapshot.ts             — TelemetrySnapshot → ComponentSessionData[]
  adapters/from-events.ts               — TelemetryEvent[] → ComponentSessionData[]
  adapters/from-replay.ts               — ReplaySession[] → ComponentSessionData[]
  partitioner/session-partitioner.ts    — group events by (componentName, sessionId)
  analyzer/component-analyzer.ts        — ComponentSessionData[] → ComponentAnalysis[]
  scorer/application-scorer.ts          — ComponentAnalysis[] → ApplicationHealth
  correlator/correlation-engine.ts      — ComponentSessionData[] → CorrelationGroup[]
  ranker/bottleneck-ranker.ts           — ComponentAnalysis[] + correlations → Bottleneck[]
  root-cause/root-cause-analyzer.ts     — ComponentAnalysis[] + correlations → RootCause[]
  recommender/intelligence-recommender.ts  — full context → IntelligenceRecommendation[]
  pipeline/pipeline.ts                  — orchestrates all stages → IntelligenceReport
  plugins/plugin-registry.ts            — register + execute plugins
  errors/intelligence-error.ts          — IntelligenceError + createIntelligenceError
  index.ts                              — public re-export
```

---

## Package API

### Primary Entry Point

```typescript
// Single factory function — the entire public API surface
export const analyzeRenders: (
  source: IntelligenceSource,
  options?: IntelligenceOptions
) => IntelligenceReport;
```

### Secondary Exports (advanced use)

```typescript
// Low-level pipeline stages (for tool builders who want partial output)
export const analyzeComponents: (
  source: IntelligenceSource,
  options?: Pick<IntelligenceOptions, 'confidenceThreshold'>
) => readonly ComponentAnalysis[];

export const rankBottlenecks: (
  components: readonly ComponentAnalysis[],
  options?: Pick<IntelligenceOptions, 'maxBottlenecks'>
) => readonly Bottleneck[];

// Plugin registration
export const createPlugin: (definition: AnalysisPluginDefinition) => AnalysisPlugin;

// Error class
export { IntelligenceError };

// All types (re-exported from src/types/index.ts)
export type { IntelligenceSource, IntelligenceOptions, IntelligenceReport, ... };
```

### No Breaking Changes
This is a new package; no existing exports are modified.

---

## Data & Types

All types use `type` (not `interface`), `readonly` on all fields, strict optionals.

```typescript
// ── Sources ────────────────────────────────────────────────────────────────

type IntelligenceSource =
  | { readonly type: 'snapshot'; readonly snapshot: TelemetrySnapshot }
  | { readonly type: 'events';   readonly events:   readonly TelemetryEvent[] }
  | { readonly type: 'replay';   readonly sessions: readonly ReplaySession[] };

type IntelligenceOptions = {
  readonly maxBottlenecks?:      number;  // default: 10
  readonly maxRecommendations?:  number;  // default: 20
  readonly confidenceThreshold?: number;  // default: 0.3 (0–1)
  readonly correlationWindowMs?: number;  // default: 16 (one animation frame)
  readonly includeWellOptimized?: boolean; // default: false
  readonly plugins?: readonly AnalysisPlugin[];
};

// ── Internal normalized form (not exported) ────────────────────────────────

type ComponentSessionData = {
  readonly componentName: string;
  readonly sessionId: string;
  readonly events: readonly TelemetryEvent[];
  readonly frames: readonly ReplayFrame[] | null; // only for 'replay' source
};

// ── Per-component analysis ─────────────────────────────────────────────────

type ScoreTrend = 'improving' | 'degrading' | 'stable' | 'volatile' | 'insufficient-data';

type ComponentAnalysis = {
  readonly componentName: string;
  readonly sessionIds:    readonly string[];
  readonly totalRenders:  number;
  readonly totalSessions: number;
  readonly averageScore:  number;
  readonly minScore:      number | null;
  readonly maxScore:      number | null;
  readonly grade:         HealthGrade;
  readonly memoClassification: MemoClassification | null;
  readonly frequencyClass:     FrequencyClass | null;
  readonly unstablePropNames:  readonly string[];
  readonly unstablePropTypes:  readonly PropRefType[];
  readonly uniqueRecommendations: readonly string[];
  readonly scoreTrend:      ScoreTrend;
  readonly renderVelocity:  number; // renders / session-duration-sec, avg across sessions
  readonly ineffectiveRenderCount: number; // renders with reference-only signal
  readonly noChangeRenderCount:    number; // renders with no prop changes
};

// ── Application health ─────────────────────────────────────────────────────

type ApplicationHealth = {
  readonly score:          number;  // weighted avg — components with more renders weighted more
  readonly grade:          HealthGrade;
  readonly componentCount: number;
  readonly healthyCount:   number;  // avgScore ≥ 70
  readonly degradedCount:  number;  // 30 ≤ avgScore < 70
  readonly criticalCount:  number;  // avgScore < 30
  readonly totalRenders:   number;
  readonly analysisSource: 'snapshot' | 'events' | 'replay';
};

// ── Bottlenecks ────────────────────────────────────────────────────────────

type BottleneckCategory =
  | 'ineffective-memo'
  | 'reference-instability'
  | 'high-frequency'
  | 'score-degradation'
  | 'parent-cascade'
  | 'no-change-renders';

type BottleneckEvidence =
  | { readonly type: 'unstable-prop';    readonly propName: string; readonly refType: PropRefType; readonly occurrenceRate: number }
  | { readonly type: 'memo-defeat';      readonly sessionClass: MemoClassification; readonly ineffectiveRatio: number }
  | { readonly type: 'frequency';        readonly frequencyClass: FrequencyClass; readonly renderVelocity: number }
  | { readonly type: 'render-pattern';   readonly pattern: 'no-change' | 'reference-only'; readonly renderCount: number; readonly ratio: number }
  | { readonly type: 'score-component';  readonly label: string; readonly avgPenalty: number };

type Bottleneck = {
  readonly rank:          number;         // 1 = worst
  readonly componentName: string;
  readonly category:      BottleneckCategory;
  readonly impactScore:   number;         // 0–100 (contribution to app degradation)
  readonly description:   string;
  readonly evidence:      readonly BottleneckEvidence[];
};

// ── Root causes ────────────────────────────────────────────────────────────

type RootCauseKind =
  | 'reference-instability'
  | 'parent-cascade'
  | 'high-frequency-source'
  | 'memo-defeat'
  | 'excessive-renders';

type RootCause = {
  readonly componentName:       string;
  readonly kind:                RootCauseKind;
  readonly confidence:          number;         // 0–1
  readonly affectedComponents:  readonly string[];
  readonly description:         string;
  readonly causalChain:         readonly string[]; // human-readable steps
};

// ── Correlations ───────────────────────────────────────────────────────────

type CorrelationType =
  | 'synchronized-renders'
  | 'shared-render-spike'
  | 'probable-cascade';

type CorrelationEvidence =
  | { readonly type: 'timestamp-proximity'; readonly avgGapMs: number; readonly sampleCount: number }
  | { readonly type: 'simultaneous-spike';  readonly spikeCount: number; readonly windowMs: number }
  | { readonly type: 'render-sequence';     readonly sequenceCount: number; readonly maxGapMs: number };

type CorrelationGroup = {
  readonly type:        CorrelationType;
  readonly components:  readonly string[];
  readonly confidence:  number;
  readonly description: string;
  readonly evidence:    readonly CorrelationEvidence[];
};

// ── Recommendations ────────────────────────────────────────────────────────

type IntelligenceRecommendationCategory =
  | 'unstable-function'
  | 'unstable-object'
  | 'unstable-array'
  | 'ineffective-memo'
  | 'partially-effective-memo'
  | 'excessive-frequency'
  | 'parent-cascade'
  | 'synchronized-renders'
  | 'render-cascade'
  | 'application-health-critical'
  | 'dominant-bottleneck'
  | 'low-coverage'
  | 'well-optimized'
  | 'score-degradation';

type RecommendationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

type IntelligenceRecommendationEvidence =
  | { readonly type: 'component-analysis'; readonly componentName: string; readonly avgScore: number; readonly grade: HealthGrade }
  | { readonly type: 'unstable-prop';      readonly propName: string; readonly refType: PropRefType; readonly occurrenceRate: number }
  | { readonly type: 'correlation';        readonly components: readonly string[]; readonly confidence: number }
  | { readonly type: 'bottleneck';         readonly rank: number; readonly impactScore: number }
  | { readonly type: 'app-health';         readonly score: number; readonly criticalCount: number; readonly degradedCount: number };

type IntelligenceRecommendation = {
  readonly id:                  string;         // e.g. 'R-INTEL-FUNC-001'
  readonly componentName:       string | null;  // null = app-wide recommendation
  readonly category:            IntelligenceRecommendationCategory;
  readonly severity:            RecommendationSeverity;
  readonly title:               string;
  readonly explanation:         string;
  readonly fix:                 string;
  readonly expectedImpact:      string;
  readonly confidence:          number;         // 0–1
  readonly affectedComponents:  readonly string[];
  readonly evidence:            readonly IntelligenceRecommendationEvidence[];
};

// ── Plugin system ──────────────────────────────────────────────────────────

type AnalysisContext = {
  readonly source:     IntelligenceSource;
  readonly components: readonly ComponentAnalysis[];
  readonly health:     ApplicationHealth;
  readonly correlations: readonly CorrelationGroup[];
};

type PluginResult = {
  readonly bottlenecks?:      readonly Bottleneck[];
  readonly rootCauses?:       readonly RootCause[];
  readonly recommendations?:  readonly IntelligenceRecommendation[];
  readonly correlations?:     readonly CorrelationGroup[];
};

type AnalysisPluginDefinition = {
  readonly id:      string;
  readonly name:    string;
  readonly version: string;
  readonly analyze: (context: AnalysisContext) => PluginResult;
};

type AnalysisPlugin = AnalysisPluginDefinition; // alias, may gain internal fields later

// ── Report (primary output) ────────────────────────────────────────────────

type IntelligenceReport = {
  readonly schemaVersion:    SchemaVersion;       // CURRENT_SCHEMA_VERSION from render-core-schema
  readonly generatedAt:      number;              // Date.now()
  readonly applicationHealth: ApplicationHealth;
  readonly components:       readonly ComponentAnalysis[];
  readonly bottlenecks:      readonly Bottleneck[];
  readonly rootCauses:       readonly RootCause[];
  readonly correlations:     readonly CorrelationGroup[];
  readonly recommendations:  readonly IntelligenceRecommendation[];
};
```

---

## Recommendation Rules

The intelligence recommender implements 15 deterministic rules. Rules evaluate in order; results are deduplicated by `id`. Output is capped at `maxRecommendations` (default 20), sorted by priority score (severity weight × confidence × impactScore).

| ID | Category | Trigger |
|---|---|---|
| R-INTEL-FUNC-001 | `unstable-function` | Component has function unstable props in >30% of renders |
| R-INTEL-OBJ-001 | `unstable-object` | Component has object unstable props in >30% of renders |
| R-INTEL-ARR-001 | `unstable-array` | Component has array unstable props in >30% of renders |
| R-INTEL-MEMO-001 | `ineffective-memo` | averageScore < 50 AND memoClassification = INEFFECTIVE |
| R-INTEL-MEMO-002 | `partially-effective-memo` | memoClassification = PARTIALLY_EFFECTIVE |
| R-INTEL-FREQ-001 | `excessive-frequency` | frequencyClass = HIGH in majority of sessions |
| R-INTEL-PARENT-001 | `parent-cascade` | noChangeRenderCount / totalRenders > 0.6 |
| R-INTEL-TREND-001 | `score-degradation` | scoreTrend = 'degrading' AND maxScore - avgScore > 20 |
| R-INTEL-SYNC-001 | `synchronized-renders` | correlation.type = 'synchronized-renders' AND confidence ≥ 0.7 |
| R-INTEL-CASC-001 | `render-cascade` | correlation.type = 'probable-cascade' AND confidence ≥ 0.6 |
| R-INTEL-APP-001 | `application-health-critical` | criticalCount + degradedCount > componentCount × 0.3 |
| R-INTEL-APP-002 | `dominant-bottleneck` | bottleneck[0].impactScore > 60 |
| R-INTEL-COV-001 | `low-coverage` | componentCount < 2 (analysis limited) |
| R-INTEL-WELL-001 | `well-optimized` | No other rules fired AND applicationHealth.score ≥ 90 |
| R-INTEL-WELL-002 | `well-optimized` | No other rules fired AND applicationHealth.score ≥ 70 AND criticalCount = 0 |

---

## Bottleneck Impact Score Formula

```
impactScore(component) =
  (100 - component.averageScore)       // raw score deficit
  × renderRatio(component)             // weight by render volume (0–1)
  + instabilityBonus(component)        // 0–25 based on unstable prop ratio
  + frequencyBonus(component)          // 0–15 if frequencyClass = HIGH
  + memoBonus(component)               // 0–10 if INEFFECTIVE memo

Where:
  renderRatio(c) = c.totalRenders / max(totalRenders across all components)
  instabilityBonus(c) = min(25, c.unstablePropNames.length × 5)
  frequencyBonus(c) = c.frequencyClass === 'HIGH' ? 15 : 0
  memoBonus(c) = c.memoClassification === 'INEFFECTIVE' ? 10 : 0

All clamped to [0, 100].
```

---

## Correlation Algorithm

```
For every pair (A, B) of components in ComponentSessionData[]:
  1. Collect A.renderTimestamps = timestamps of RenderEvent.wallTimestamp
  2. Collect B.renderTimestamps = similarly
  3. For each t_A in A.renderTimestamps:
       Find the closest t_B in B.renderTimestamps
       If |t_A - t_B| ≤ correlationWindowMs (default 16ms):
         record as a proximate render pair
  4. proximityRatio = proximate pairs / min(|A.renders|, |B.renders|)
  5. If proximityRatio ≥ 0.5: emit CorrelationGroup(type='synchronized-renders', confidence=proximityRatio)
  6. If all A.renders in a 100ms window co-occur with B spikes: emit type='shared-render-spike'
  7. If A renders BEFORE B in >70% of proximate pairs (within 16ms): emit type='probable-cascade'

Pairs with < 5 co-renders are skipped (insufficient data).
O(N × M) per pair, where N/M are render counts. For 10k renders/component, use binary search on B's sorted timestamps → O(N log M).
```

---

## Testing Strategy

All tests in `tests/` (not `__tests__/`). Pure function tests — no React, no DOM. Use `vitest` directly (`describe`, `it`, `expect`). No `renderHook` needed (no hooks in this package).

### Coverage Requirements

| File | Test file | Coverage targets |
|---|---|---|
| `adapters/from-snapshot.ts` | `tests/adapters.test.ts` | empty snapshot, single component, multi-component, missing events |
| `adapters/from-events.ts` | `tests/adapters.test.ts` | empty array, single session, multiple sessions, missing score events |
| `adapters/from-replay.ts` | `tests/adapters.test.ts` | empty sessions, single session with frames, multiple sessions |
| `partitioner/session-partitioner.ts` | `tests/partitioner.test.ts` | single component, multi-component, multi-session same component, interleaved events |
| `analyzer/component-analyzer.ts` | `tests/component-analyzer.test.ts` | no score events, all score events, trend up, trend down, volatile, single render |
| `scorer/application-scorer.ts` | `tests/application-scorer.test.ts` | single component, all critical, all excellent, mixed grades, zero components |
| `correlator/correlation-engine.ts` | `tests/correlator.test.ts` | no correlations, synchronized pair, probable cascade, below-threshold pair, < 5 co-renders |
| `ranker/bottleneck-ranker.ts` | `tests/ranker.test.ts` | single bottleneck, top-N cap, tie-breaking, zero renders edge case |
| `root-cause/root-cause-analyzer.ts` | `tests/root-cause.test.ts` | reference-instability, parent-cascade, high-frequency-source, multiple causes |
| `recommender/intelligence-recommender.ts` | `tests/recommender.test.ts` | all 15 rules fire/do-not-fire, deduplication, cap at maxRecommendations, priority sort |
| `plugins/plugin-registry.ts` | `tests/plugin-registry.test.ts` | no plugins, single plugin, multiple plugins, plugin throws (handled), empty result |
| `pipeline/pipeline.ts` | `tests/pipeline.test.ts` | integration: snapshot source, events source, replay source, with plugins, empty source error |
| `errors/intelligence-error.ts` | `tests/pipeline.test.ts` | EMPTY_SOURCE, INVALID_SOURCE thrown correctly |

Minimum: **100+ test cases** across all files.

---

## Affected Files

| File | Change |
|---|---|
| `demo/src/lib/registry/index.ts` | Add 11th entry for `render-intelligence` |
| `demo/package.json` | Add `"@sapanmozammel/render-intelligence": "workspace:*"` |
| `CLAUDE.md` | Add `packages/render-intelligence` structure block + `/implement render-intelligence` slash command |

---

## New Files

### Package

| File | Purpose |
|---|---|
| `packages/render-intelligence/package.json` | Package manifest — name, version, scripts, peerDeps |
| `packages/render-intelligence/tsconfig.json` | TypeScript config (matches existing packages exactly) |
| `packages/render-intelligence/tsup.config.ts` | Build config — ESM + CJS + .d.ts |
| `packages/render-intelligence/src/types/index.ts` | All public types (no logic) |
| `packages/render-intelligence/src/errors/intelligence-error.ts` | `IntelligenceError` class + `createIntelligenceError` factory |
| `packages/render-intelligence/src/adapters/from-snapshot.ts` | `TelemetrySnapshot → ComponentSessionData[]` |
| `packages/render-intelligence/src/adapters/from-events.ts` | `TelemetryEvent[] → ComponentSessionData[]` |
| `packages/render-intelligence/src/adapters/from-replay.ts` | `ReplaySession[] → ComponentSessionData[]` |
| `packages/render-intelligence/src/partitioner/session-partitioner.ts` | Groups normalized events by (componentName, sessionId) |
| `packages/render-intelligence/src/analyzer/component-analyzer.ts` | Reads pre-scored events → `ComponentAnalysis[]` |
| `packages/render-intelligence/src/scorer/application-scorer.ts` | Weighted aggregate app score + `ApplicationHealth` |
| `packages/render-intelligence/src/correlator/correlation-engine.ts` | Timestamp-proximity correlation detection |
| `packages/render-intelligence/src/ranker/bottleneck-ranker.ts` | Impact-scored bottleneck ranking |
| `packages/render-intelligence/src/root-cause/root-cause-analyzer.ts` | Causal chain detection |
| `packages/render-intelligence/src/recommender/intelligence-recommender.ts` | 15 deterministic recommendation rules |
| `packages/render-intelligence/src/plugins/plugin-registry.ts` | Plugin validation + execution + result merging |
| `packages/render-intelligence/src/pipeline/pipeline.ts` | Orchestrates all stages → `IntelligenceReport` |
| `packages/render-intelligence/src/index.ts` | Public barrel re-export |

### Tests

| File | Purpose |
|---|---|
| `packages/render-intelligence/tests/adapters.test.ts` | Tests for all three adapters |
| `packages/render-intelligence/tests/partitioner.test.ts` | Session partitioner edge cases |
| `packages/render-intelligence/tests/component-analyzer.test.ts` | Component analysis + trend detection |
| `packages/render-intelligence/tests/application-scorer.test.ts` | App-level scoring formula |
| `packages/render-intelligence/tests/correlator.test.ts` | Correlation algorithm with controlled timestamps |
| `packages/render-intelligence/tests/ranker.test.ts` | Bottleneck ranking + cap |
| `packages/render-intelligence/tests/root-cause.test.ts` | Root-cause pattern detection |
| `packages/render-intelligence/tests/recommender.test.ts` | All 15 rules + deduplication + priority |
| `packages/render-intelligence/tests/plugin-registry.test.ts` | Plugin execution + merging + error isolation |
| `packages/render-intelligence/tests/pipeline.test.ts` | Integration: full analyzeRenders flow |

### Demo

| File | Purpose |
|---|---|
| `demo/src/features/render-intelligence/scenarios.ts` | 4 scenario datasets (synthetic telemetry) |
| `demo/src/features/render-intelligence/index.tsx` | Demo component — 4 panels |

---

## Implementation Steps

### Phase 1 — Package Scaffolding

- [✅] **Step 1:** Create `packages/render-intelligence/package.json` with name `@sapanmozammel/render-intelligence`, version `1.0.0`, peerDependency `@sapanmozammel/render-core-schema: ^1.0.0`, devDependency `@sapanmozammel/render-core-schema: workspace:*`, scripts matching existing packages
- [✅] **Step 2:** Create `packages/render-intelligence/tsconfig.json` (exact copy of `render-core-schema/tsconfig.json`)
- [✅] **Step 3:** Create `packages/render-intelligence/tsup.config.ts` (exact copy of `render-core-schema/tsup.config.ts`)
- [✅] **Step 4:** Create `packages/render-intelligence/src/types/index.ts` with all types from the Data & Types section above

### Phase 2 — Error Handling

- [✅] **Step 5:** Create `src/errors/intelligence-error.ts` — `IntelligenceError extends Error` with a `code: IntelligenceErrorCode` field. Codes: `'EMPTY_SOURCE' | 'INVALID_SOURCE' | 'PLUGIN_ERROR'`. Export `createIntelligenceError(code, message)` factory.

### Phase 3 — Adapters

- [✅] **Step 6:** Create `src/adapters/from-snapshot.ts` — `fromSnapshot(snapshot: TelemetrySnapshot): readonly ComponentSessionData[]`. Reads `snapshot.events`, delegates to `fromEvents` after extracting the array.
- [✅] **Step 7:** Create `src/adapters/from-events.ts` — `fromEvents(events: readonly TelemetryEvent[]): readonly ComponentSessionData[]`. Groups `TelemetryEvent[]` by `(sessionId, componentName)` into `ComponentSessionData[]`. Preserves event order within each group.
- [✅] **Step 8:** Create `src/adapters/from-replay.ts` — `fromReplay(sessions: readonly ReplaySession[]): readonly ComponentSessionData[]`. For each session, collects events from `session.frames[*].renderEvent` + `propChangeEvent` + `frequencyEvent` + `scoreEvent` + `recommendationEvent` (non-null only), reconstructs event array, packages into `ComponentSessionData` with `frames` populated.
- [✅] **Step 9:** Create `src/partitioner/session-partitioner.ts` — `partitionSessions(data: readonly ComponentSessionData[]): readonly ComponentSessionData[]`. Returns the data as-is (partitioning is already done by adapters). Validates uniqueness of (componentName, sessionId) pairs; merges duplicates by concatenating events in timestamp order.

### Phase 4 — Analysis Pipeline Core

- [⬜] **Step 10:** Create `src/analyzer/component-analyzer.ts` — `analyzeComponents(data: readonly ComponentSessionData[]): readonly ComponentAnalysis[]`. For each component (grouped by componentName across sessions):
  - Extract `ScoreEvent` values → compute averageScore, minScore, maxScore, grade
  - Extract `PropChangeEvent.unstable` → build `unstablePropNames` + `unstablePropTypes` frequency maps
  - Extract `FrequencyEvent.classification` → pick worst-case `frequencyClass`
  - Count renders with `triggeredBy === 'parent'` or no prop changes → `noChangeRenderCount`
  - Count reference-only signals → `ineffectiveRenderCount`
  - Compute `scoreTrend` via half-split analysis (same algorithm as render-playground's `computeTrend`)
  - Compute `renderVelocity` from session start/end timestamps
  - Derive `memoClassification` from majority vote across ScoreEvent.memoClassification values

- [⬜] **Step 11:** Create `src/scorer/application-scorer.ts` — `scoreApplication(components: readonly ComponentAnalysis[], source: IntelligenceSource['type']): ApplicationHealth`. Weight each component's `averageScore` by `component.totalRenders / totalRenders`. `healthyCount` = components with avgScore ≥ 70. `degradedCount` = 30–69. `criticalCount` < 30. Grade from weighted average using existing grade thresholds.

- [⬜] **Step 12:** Create `src/correlator/correlation-engine.ts` — `detectCorrelations(data: readonly ComponentSessionData[], windowMs: number): readonly CorrelationGroup[]`. Implements the timestamp-proximity algorithm from the Architecture section. Only evaluates pairs; skips self. Returns groups with confidence ≥ 0.3.

- [⬜] **Step 13:** Create `src/ranker/bottleneck-ranker.ts` — `rankBottlenecks(components: readonly ComponentAnalysis[], correlations: readonly CorrelationGroup[], maxBottlenecks: number): readonly Bottleneck[]`. Implements the impact score formula from above. One `Bottleneck` per component (uses the dominant category — worst-scoring dimension). Sorted descending by impactScore, capped at maxBottlenecks.

- [⬜] **Step 14:** Create `src/root-cause/root-cause-analyzer.ts` — `analyzeRootCauses(components: readonly ComponentAnalysis[], correlations: readonly CorrelationGroup[], confidenceThreshold: number): readonly RootCause[]`. Emits at most one `RootCause` per component. Evaluates 4 patterns (reference-instability, parent-cascade, high-frequency-source, memo-defeat). Confidence formula: proportional to severity of evidence (e.g., reference-instability confidence = unstablePropNames.length > 0 AND memoClassification === 'INEFFECTIVE' → 0.9). Only emits when confidence ≥ confidenceThreshold.

### Phase 5 — Recommendation Engine

- [⬜] **Step 15:** Create `src/recommender/intelligence-recommender.ts` — `generateRecommendations(components, bottlenecks, rootCauses, correlations, health, options): readonly IntelligenceRecommendation[]`. Implements all 15 rules from the Recommendation Rules table. Priority sort: `SEVERITY_WEIGHTS[severity] × 10 + confidence × 10 + impactScore`. Cap at `maxRecommendations`. Deduplication: skip if same `id` already in results. INFO-only cap: max 2 INFO recommendations total.

### Phase 6 — Plugin System

- [⬜] **Step 16:** Create `src/plugins/plugin-registry.ts` — `executePlugins(plugins: readonly AnalysisPlugin[], context: AnalysisContext): PluginResult`. Calls each plugin's `analyze(context)` in sequence. Catches errors per-plugin (wraps in `IntelligenceError('PLUGIN_ERROR', ...)`); logs to `console.error` in development, silently skips in production. Merges all `PluginResult` arrays via concatenation. Validates plugin `id` is non-empty string before execution.

### Phase 7 — Pipeline Orchestration

- [⬜] **Step 17:** Create `src/pipeline/pipeline.ts` — `analyzeRenders(source, options): IntelligenceReport`. Implements the full pipeline:
  1. Validate source (throw `IntelligenceError('EMPTY_SOURCE', ...)` if no events/sessions)
  2. Run adapter based on source.type
  3. Run partitioner
  4. Run component analyzer
  5. Run application scorer
  6. Run correlation engine (with options.correlationWindowMs)
  7. Run bottleneck ranker (with options.maxBottlenecks)
  8. Run root-cause analyzer (with options.confidenceThreshold)
  9. Run recommendation engine (with options.maxRecommendations, options.includeWellOptimized)
  10. Execute plugins (with AnalysisContext)
  11. Merge plugin results into core results
  12. Assemble and return `IntelligenceReport`

- [⬜] **Step 18:** Create `src/index.ts` — flat barrel re-export of all public APIs.

Also export secondary entry points `analyzeComponents` and `rankBottlenecks` (wrappers over the pipeline stages).

### Phase 8 — Tests

- [⬜] **Step 19:** Create `tests/adapters.test.ts` — tests for fromSnapshot, fromEvents, fromReplay
- [⬜] **Step 20:** Create `tests/partitioner.test.ts` — partitioner edge cases + duplicate merging
- [⬜] **Step 21:** Create `tests/component-analyzer.test.ts` — score extraction, trend computation, unstable prop aggregation, all ScoreTrend variants
- [⬜] **Step 22:** Create `tests/application-scorer.test.ts` — weighted average, grade thresholds, zero-component edge
- [⬜] **Step 23:** Create `tests/correlator.test.ts` — controlled timestamps, synchronized pair, cascade, below-threshold, < 5 renders
- [⬜] **Step 24:** Create `tests/ranker.test.ts` — impact formula, top-N cap, category assignment
- [⬜] **Step 25:** Create `tests/root-cause.test.ts` — all 4 patterns, confidence floor, confidenceThreshold opt
- [⬜] **Step 26:** Create `tests/recommender.test.ts` — all 15 rules (fire + no-fire), priority sort, INFO cap, maxRecommendations cap
- [⬜] **Step 27:** Create `tests/plugin-registry.test.ts` — plugin merge, plugin error isolation, empty plugin array
- [⬜] **Step 28:** Create `tests/pipeline.test.ts` — integration: all three source types end-to-end, EMPTY_SOURCE throw, with plugins, options propagation

### Phase 9 — Demo

- [⬜] **Step 29:** Create `demo/src/features/render-intelligence/scenarios.ts` — 4 synthetic scenarios:
  - `scenario-healthy`: 3 components, all EXCELLENT, app score ≥ 90
  - `scenario-bottleneck`: 5 components, one CRITICAL with INEFFECTIVE memo + unstable props, others GOOD
  - `scenario-cascade`: 3 components with synchronized render timestamps (probable cascade)
  - `scenario-mixed`: 8 components, mixed grades, demonstrates full report with recommendations

- [⬜] **Step 30:** Create `demo/src/features/render-intelligence/index.tsx` — `RenderIntelligenceDemo` with 4 panels:
  1. **Analysis Report panel** — scenario selector, displays `IntelligenceReport.applicationHealth` (score gauge, grade badge, component count breakdown)
  2. **Bottleneck Rankings panel** — ranked list of `Bottleneck[]` with impact score bar, category badge, evidence detail
  3. **Root-Cause & Correlations panel** — `RootCause[]` with causal chain display; `CorrelationGroup[]` with component pair chips
  4. **JSON Explorer panel** — full `IntelligenceReport` as formatted JSON in a scrollable code block; copy-to-clipboard button

- [⬜] **Step 31:** Wire `demo/src/lib/registry/index.ts` — add 11th entry `render-intelligence`
- [⬜] **Step 32:** Wire `demo/package.json` — add `"@sapanmozammel/render-intelligence": "workspace:*"`

### Phase 10 — Finalization

- [⬜] **Step 33:** Update `CLAUDE.md` — add `packages/render-intelligence` structure block, add `/implement render-intelligence` slash command row
- [⬜] **Step 34:** Quality gate — `pnpm run test` (all green), `tsc --noEmit` (clean), `pnpm run build` (verify dist artifacts)

---

## Verification

Before declaring done, verify each item:

- [ ] `pnpm run test` — all tests pass (expect ≥ 100 new tests)
- [ ] `tsc --noEmit` — zero type errors across the monorepo
- [ ] `pnpm run build` — `dist/index.cjs`, `dist/index.mjs`, `dist/index.d.ts` all emit
- [ ] `pnpm publish --dry-run` from `packages/render-intelligence/` — tarball includes only `dist/` and `README.md`
- [ ] `analyzeRenders({ type: 'events', events: [] })` throws `IntelligenceError` with code `'EMPTY_SOURCE'`
- [ ] `analyzeRenders({ type: 'snapshot', snapshot: ... })` with 3 components produces a report where `applicationHealth.componentCount === 3`
- [ ] `analyzeRenders({ type: 'replay', sessions: [...] })` produces the same result as `{ type: 'events', events: extractedEvents }`
- [ ] Bottleneck ranks are deterministic: same input always produces same ranks
- [ ] All 15 recommendation rules have at least one test that fires them and one that does not
- [ ] Plugin with a throwing `analyze()` does NOT crash the pipeline; error is caught per-plugin
- [ ] Demo page `/render-intelligence` renders without errors; scenario-bottleneck shows ≥ 1 CRITICAL bottleneck; scenario-healthy shows ≥ 1 INFO/well-optimized recommendation
- [ ] `packages/render-intelligence/package.json` has zero `dependencies` (only `peerDependencies` and `devDependencies`)
- [ ] No `any` types, no `interface` keywords, no `function foo(){}` declarations in any new file
- [ ] `import type` used for all render-core-schema imports (no runtime coupling)

---

## Risks & Open Questions

**R1 — Timestamp availability.** `fromReplay` relies on `ReplayFrame.wallTimestamp` for correlation. If a `ReplaySession` was built from events without wallTimestamp (e.g., all zero), correlation detection degrades to zero results. The adapter should detect all-zero timestamps and skip correlation for that source → mark `CorrelationGroup[]` as empty with a note. Not a blocker.

**R2 — Score-event availability.** Some telemetry pipelines may emit only `RenderEvent` without score/frequency/memo events. The component analyzer must handle sessions that have zero `ScoreEvent` — `averageScore` becomes `null`, grade becomes `null`, bottleneck impact score is lower-bounded by render count alone.

**R3 — render-core-schema peerDependency version.** The package will declare `"@sapanmozammel/render-core-schema": "^1.0.0"`. If render-core-schema adds breaking types in a future major, render-intelligence will need a corresponding major bump. The schema package is designed for backward compatibility, so this risk is low.

**R4 — Correlation false-positives on single-session apps.** If all components are in one session, many pairs will be "synchronized" simply because they all render in the same React tree cycle. The correlation threshold (≥50% proximity) mitigates this, but tool builders should be aware. Out of scope to solve here.

**R5 — Performance on large inputs.** The correlation engine is O(N × M) per pair for N, M render counts. For 10 components each with 10k renders, this is 100M × 10² = manageable with binary search. The implementation must use binary search on sorted timestamps, not a nested loop.

**Scope-out (do not implement now):**
- Cross-session drift detection (requires comparing IntelligenceReport across time — needs a store/history)
- CI reporter integration (separate package: `render-ci-reporter`)
- VSCode extension adapter (separate package)
- Persistence / serialization of IntelligenceReport (trivial: it's a plain object — consumers can JSON.stringify)
