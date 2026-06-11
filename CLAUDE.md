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
