# CLAUDE.md

## Commands

```bash
pnpm run test        # Vitest (run once)
pnpm run build       # tsup — ESM + CJS + .d.ts
tsc --noEmit         # Type check (strict)
pnpm publish --dry-run  # Verify tarball before publish
```

## Stack

TypeScript strict · React 18/19 peerDependency · Vitest + React Testing Library · tsup

## Project Structure

### `packages/why-render` (library)

```
src/
  diff/diff-props.ts   # pure diff algorithm
  hook/use-why-render.ts
  logger/console-logger.ts
  types/index.ts
  index.ts            # public re-export
tests/
dist/                 # build output (gitignored)
```

### `packages/why-render-frequency` (library)

```
src/
  hook/use-render-frequency.ts
  logger/frequency-logger.ts  # pure logger — rate + observation
  types/index.ts
  index.ts            # public re-export
tests/
dist/                 # build output (gitignored)
```

### `packages/render-trace` (library)

```
src/
  engine/engine.ts    # createEngine factory — stack, cycle, flush
  hook/use-trace-render.ts
  logger/trace-logger.ts  # tree + flat console output
  types/index.ts
  index.ts            # public re-export + createRenderTrace factory
tests/
dist/                 # build output (gitignored)
```

### `packages/unstable-props-detector` (library)

```
src/
  detector/detector.ts   # pure detection — no React dependency
  hook/use-unstable-props-detector.ts
  logger/unstable-logger.ts
  types/index.ts
  index.ts               # public re-export
tests/
dist/                    # build output (gitignored)
```

### `packages/memo-effect-analyzer` (library)

```
src/
  classifier/classifier.ts  # pure classifyRender + classifySession — no React dependency
  hook/use-memo-effect-analyzer.ts
  logger/memo-logger.ts
  types/index.ts
  index.ts               # public re-export
tests/
dist/                    # build output (gitignored)
```

### `packages/render-insights` (library)

```
src/
  aggregator/aggregator.ts      # correlates all signals into InsightReport
  classifier/classify-props.ts  # pure prop diff + unstable detection
  classifier/classify-signal.ts # PropChangeSummary → RenderSignal | null
  classifier/classify-session.ts # RenderSignal[] → MemoClassification
  classifier/classify-frequency.ts # windowCount + ms → FrequencyClass
  scoring/scorer.ts             # RHS formula → score + HealthGrade
  recommendations/recommender.ts # 5 deterministic rules → string[]
  hook/use-render-insights.ts
  logger/insights-logger.ts
  types/index.ts
  index.ts               # public re-export
tests/
dist/                    # build output (gitignored)
```

### `packages/render-playground` (library)

```
src/
  store/playground-store.ts        # FIFO InsightReport store (useSyncExternalStore-compatible)
  context/playground-context.ts    # PlaygroundContext + PlaygroundProvider + usePlaygroundStore
  hooks/use-render-playground.ts   # useRenderPlayground — calls useRenderInsights + pushes to store
  hooks/use-insight-capture.ts     # useInsightCapture — headless capture without provider
  engine/recommendation-engine.ts  # 10 deterministic rules → Recommendation[]
  engine/score-breakdown.ts        # reverses scorer formula → ScoreBreakdown
  engine/session-stats.ts          # window-based trend analysis → SessionStats
  components/render-playground-panel.tsx  # master panel (composes all sub-components)
  components/score-gauge.tsx        # SVG arc gauge
  components/render-timeline.tsx    # horizontal pill timeline
  components/prop-diff-table.tsx    # changed + unstable props table
  components/memo-badge.tsx         # MemoClassification badge
  components/frequency-meter.tsx    # frequency class + rate display
  components/recommendation-card.tsx  # expandable recommendation card
  components/recommendations-section.tsx  # top-3 recommendations with "+N more"
  components/score-breakdown-panel.tsx    # "Why NN?" toggle panel
  components/session-strip.tsx      # session trend strip (hidden when < 3 renders)
  styles/tokens.ts                  # design tokens + severity/grade/signal color maps
  types/index.ts                    # public types (PlaygroundStore, Recommendation, etc.)
  index.ts                          # public re-export
tests/
dist/                               # build output (gitignored)
```

### `packages/render-telemetry-core` (library)

```
src/
  types/index.ts                     # all public types (no logic)
  constants/schema-versions.ts       # CURRENT_SCHEMA_VERSION, EVENT_SCHEMA_VERSIONS
  utils/generate-id.ts               # generateId() — crypto.randomUUID with fallback
  session/session.ts                 # createTelemetrySession, endTelemetrySession
  events/event-base.ts               # createEventBase (internal, not exported)
  events/session-start-event.ts      # createSessionStartEvent
  events/render-event.ts             # createRenderEvent
  events/prop-change-event.ts        # createPropChangeEvent
  events/frequency-event.ts          # createFrequencyEvent
  events/score-event.ts              # createScoreEvent
  events/recommendation-event.ts     # createRecommendationEvent
  events/session-end-event.ts        # createSessionEndEvent
  buffer/buffer.ts                   # createTelemetryBuffer (useSyncExternalStore-compatible)
  transport/registry.ts              # registerTransport, unregisterAllTransports, emitEvents
  transport/memory-transport.ts      # createMemoryTransport
  transport/local-storage-transport.ts # createLocalStorageTransport
  transport/custom-transport.ts      # createCustomTransport
  serialization/serialize.ts         # serializeSession/Buffer, deserializeSession/Buffer
  validation/validate-event.ts       # validateEvent, isKnownEventType
  index.ts                           # public re-export
tests/
dist/                                # build output (gitignored)
```

### `packages/render-core-schema` (library — zero deps, types + guards only)

```
src/
  version/schema-version.ts        # SchemaVersion type + CURRENT_SCHEMA_VERSION constant
  identity/component-identity.ts   # ComponentId, SessionId, ComponentMeta
  lifecycle/render-lifecycle.ts    # RenderPhase, RenderTrigger, InferredTrigger
  props/prop-diff.ts               # PropRefType, PropChangeKind, PropChangeEntry, PropInstability, PropDiffSnapshot
  analysis/frequency.ts            # FrequencyClass, FrequencyMeasurement
  analysis/memo.ts                 # SignalKind, MemoClassification, RenderSignal, MemoSessionSummary
  analysis/scoring.ts              # HealthGrade, ScoreBreakdown
  events/event-types.ts            # EventType union
  events/event-base.ts             # EventBase — shared fields for all events
  events/event-variants.ts         # All event variants + TelemetryEvent union
  session/session.ts               # SessionStatus, RenderSession, TelemetrySnapshot
  transport/transport.ts           # TransportEmitFn, TelemetryTransport
  replay/replay-ids.ts             # ReplaySessionId, ReplayFrameId, ReplayBookmarkId (string brands)
  replay/replay-frame.ts           # ReplayFrame
  replay/replay-session.ts         # ReplaySession, ReplaySessionStats, ReplayPruningInfo, ReplayTimeline
  replay/replay-filter.ts          # ReplayFilter, ReplayFilterResult, ReplayFilterPreset, ReplaySource
  replay/replay-cursor.ts          # ReplayCursor
  replay/replay-bookmark.ts        # ReplayBookmark, ReplayBookmarkStore
  replay/replay-navigator.ts       # ReplayNavigator
  replay/replay-engine.ts          # ReplayEngine
  utils/compare-versions.ts        # compareSchemaVersions, isSchemaVersionAtLeast
  utils/type-guards.ts             # isSchemaVersion, isEventType, isHealthGrade, + 5 more guards
  index.ts                         # public re-export
tests/
dist/                              # build output (gitignored)
```

### `packages/render-replay-engine` (library)

```
src/
  builder/frame-builder.ts     # buildFrames — groups events by renderNumber into frozen ReplayFrames
  builder/session-builder.ts   # buildSessions — partitions by sessionId, pruning, stats, timeline
  stats/session-stats.ts       # buildSessionStats — pure stats over frames
  timeline/timeline-builder.ts # buildTimeline — entries + trend segments
  sources/from-events.ts       # fromEvents source adapter
  sources/from-buffer.ts       # fromBuffer source adapter (lazy snapshot)
  sources/from-serialized.ts   # fromSerialized source adapter
  navigation/cursor.ts         # createCursor — immutable ReplayCursor
  navigation/navigator.ts      # createNavigator — O(1) navigation + binary search jumpToTimestamp
  filter/filter.ts             # applyFilter, mergeFilters, withFilter, frameMatchesFilter
  filter/filter-presets.ts     # applyPreset — 7 deterministic presets (issues-only uses OR semantics)
  bookmarks/bookmark-store.ts  # createBookmarkStore — in-memory with exportBookmarks/importBookmarks
  engine/replay-engine.ts      # createReplayEngine + buildReplaySessions factories
  errors/replay-error.ts       # ReplayError class + createReplayError
  types/index.ts               # all public types
  index.ts                     # public re-export
tests/
dist/                          # build output (gitignored)
```

### `packages/render-intelligence` (library)

```
src/
  adapters/from-events.ts        # TelemetryEvent[] → ComponentSessionData[]
  adapters/from-snapshot.ts      # TelemetrySnapshot → ComponentSessionData[]
  adapters/from-replay.ts        # ReplaySession[] → ComponentSessionData[]
  partitioner/session-partitioner.ts  # merges duplicate (sessionId, componentName) pairs
  analyzer/component-analyzer.ts     # per-component signal aggregation
  scorer/application-scorer.ts       # weighted average → ApplicationHealth
  correlator/correlation-engine.ts   # O(N log M) binary search correlation detection
  ranker/bottleneck-ranker.ts         # impact formula → ranked Bottleneck[]
  root-cause/root-cause-analyzer.ts  # 4 detectors → highest-confidence RootCause per component
  recommender/intelligence-recommender.ts  # 15 deterministic rules → IntelligenceRecommendation[]
  plugins/plugin-registry.ts          # executePlugins + createPlugin factory
  pipeline/pipeline.ts                # analyzeRenders 9-stage orchestration
  errors/intelligence-error.ts        # IntelligenceError class + createIntelligenceError
  types/index.ts                      # all public types (no logic)
  index.ts                            # public re-export
tests/
dist/                                 # build output (gitignored)
```

### `demo` (Next.js demo site — `src/` layout)

```
app/                  # routing only
components/           # shared UI (console-panel, tool-card)
features/             # tool demo modules (one folder per tool)
  why-render/
    index.tsx         # demo component
    scenarios.ts      # scenario data
hooks/                # custom React hooks (use-prop-log)
lib/                  # data / config (registry)
  registry/
types/                # TS declarations
```

## Code Conventions

- Arrow functions only — never `function foo() {}`
- `type` only — never `interface`
- kebab-case for all file names
- No `any`, no `@ts-nocheck`
- TypeScript strict mode (`strict: true`, `exactOptionalPropertyTypes: true`)

## Slash Commands

| Command                              | Purpose                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `/implement why-render`              | Execute the PRD at `.claude/plans/why-render/prd.md` step by step              |
| `/implement why-render-frequency`    | Execute the PRD at `.claude/plans/why-render-frequency/prd.md` step by step    |
| `/implement render-trace`            | Execute the PRD at `.claude/plans/render-trace/prd.md` step by step            |
| `/implement unstable-props-detector` | Execute the PRD at `.claude/plans/unstable-props-detector/prd.md` step by step |
| `/implement memo-effect-analyzer`    | Execute the PRD at `.claude/plans/memo-effect-analyzer/prd.md` step by step    |
| `/implement render-insights`         | Execute the PRD at `.claude/plans/render-insights/prd.md` step by step         |
| `/implement render-playground`       | Execute the PRD at `.claude/plans/render-playground/prd.md` step by step       |
| `/implement render-telemetry-core`   | Execute the PRD at `.claude/plans/render-telemetry-core/prd.md` step by step   |
| `/implement render-replay-engine`    | Execute the PRD at `.claude/plans/render-replay-engine/prd.md` step by step    |
| `/implement render-core-schema`      | Execute the PRD at `.claude/plans/render-core-schema/prd.md` step by step      |
| `/implement render-intelligence`     | Execute the PRD at `.claude/plans/render-intelligence/prd.md` step by step     |
