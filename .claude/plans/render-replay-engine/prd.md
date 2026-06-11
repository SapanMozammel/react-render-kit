# @sapanmozammel/render-replay-engine — PRD

---

## 1. Executive Summary

`render-replay-engine` is the time-travel debugging engine for React Render Kit. It transforms raw telemetry events from `render-telemetry-core` into a navigable, queryable, annotatable render history — without requiring a browser extension, backend service, or React runtime access.

The engine is a **pure data layer**. It holds no UI, no rendering, no DevTools API dependencies. Every downstream consumer — `render-devtools-panel`, `vscode-render-kit`, `render-ci-reporter`, future team dashboards — builds on top of this engine's stable public API.

---

## 2. Vision

A developer should be able to pause at render #1, advance to render #100, and at any point ask: _what was the health score here? which props changed? was React.memo effective? what did the engine recommend?_ — without re-running the component or reproducing the issue.

The replay engine is the React Render Kit's memory. Everything else is display.

---

## 3. Goals

- **G1** — Reconstruct render history from telemetry events without React runtime access
- **G2** — Expose an immutable, serializable navigation cursor compatible with `useState` and `useSyncExternalStore`
- **G3** — Support O(1) random-access navigation across 10,000+ frames
- **G4** — Provide a composable filter system reusable by all downstream consumers
- **G5** — Become the single historical data layer consumed by devtools, VSCode, and CI tools
- **G6** — Maintain API stability as downstream consumers multiply

---

## 4. Non-Goals

- **NG1** — No visualization, rendering, or JSX
- **NG2** — No browser DevTools API, no browser extension requirement
- **NG3** — No backend service, no cloud storage, no network calls
- **NG4** — No React peer dependency (the engine operates on pure data)
- **NG5** — No Redux/Zustand/MobX integration (consumers bridge this themselves)
- **NG6** — No DOM access, no `window`, no `document` (fully SSR-safe)
- **NG7** — No cross-session diffing (deferred to `render-regression-detector`)
- **NG8** — No remote storage adapter (deferred to v2 — declared as extension point)

---

## 5. Product Positioning

### Assumption Challenges

**"Replay should operate on raw telemetry events."**
False as stated. Raw events are a flat, unstructured list. The engine's core job is building a _derived_ model (frames, sessions, timelines, stats) from raw events. Raw events are the _input format_, not the _replay format_.

**"One render = one replay frame."**
Technically true, but insufficient. One render produces up to 5 events in telemetry-core (render, prop-change, frequency, score, recommendation). A `ReplayFrame` is the aggregation of all events for a single `renderNumber` within a session. This aggregation is non-trivial and belongs in the engine, not in each consumer.

**"Replay needs to reconstruct accumulated state (like Redux DevTools)."**
False. Unlike Redux state, render frames are self-contained. Frame #100 does not depend on frames #1-#99 to be understood — it carries everything the engine emitted at render #100. There is no state-reconstruction problem. This eliminates the classic delta/full-snapshot complexity and makes navigation O(1).

**"Full snapshot + delta is the right memory model."**
Wrong for this domain. Since each frame is already a complete self-contained snapshot, the memory problem is simpler: bounded storage with FIFO pruning, not snapshot reconstruction. A `maxFrames` limit with configurable pruning is the right primitive.

**"Replay is valuable only during live debugging."**
Wrong. Replay's highest value is _after_ the fact — when the developer notices a problem in production telemetry, in CI output, or in a teammate's exported session. The engine must work equally well offline (serialized JSON input) as it does live (TelemetryBuffer input).

### Competitive Landscape

| Tool | Dependency | Scope | React-specific | Offline | Perf metadata |
|------|-----------|-------|----------------|---------|---------------|
| **render-replay-engine** | None | Render history | ✅ | ✅ | ✅ |
| Replay.io | Cloud backend | Full session | ✗ | ✗ | ✗ |
| React DevTools Profiler | Browser extension | Live only | ✅ | ✗ | Partial |
| Redux DevTools | Redux | State history | ✗ (state) | Partial | ✗ |
| Chrome Perf Panel | Browser | JS/layout | ✗ | ✗ | ✗ |
| Datadog Session Replay | Datadog subscription | User journey | ✗ | ✗ | ✗ |

**Unique advantages:**
1. Works without browser extension — any environment where React runs
2. Works offline from serialized session exports
3. First-class render performance metadata (score, memo effectiveness, frequency class)
4. Designed as a data engine — any UI layer can consume it
5. TypeScript-first stable API built for downstream package composition

---

## 6. User Personas

### React Developer
- **Goals**: Understand why component X re-renders on action Y; fix performance without trial-and-error
- **Frustrations**: "I added console.log but the behavior changed"; "DevTools profiler only captures what I'm actively profiling"
- **Success criteria**: Can navigate to the exact render that caused the score drop and inspect its props/recommendations

### Senior Frontend Engineer
- **Goals**: Audit memoization effectiveness across a session; produce evidence of performance issues for code review
- **Frustrations**: Performance Profiler is live-only and browser-bound; no way to share a session with teammates
- **Success criteria**: Exports replay session JSON, shares with reviewer, reviewer opens it in devtools panel and navigates to the problematic frame

### Performance Engineer
- **Goals**: Track score degradation across feature branches; establish baseline comparisons
- **Frustrations**: "No programmatic access to render history"; "performance reviews are anecdotal"
- **Success criteria**: CI reporter consumes replay sessions and fails the build when average score drops > 10 points from baseline

### Open Source Maintainer
- **Goals**: Help library users self-diagnose render issues; accept meaningful bug reports
- **Frustrations**: Users report "it's slow" with no data
- **Success criteria**: Users export a replay session from the playground panel and include it in GitHub issues; maintainer opens it and navigates the history

### Tech Lead
- **Goals**: Standardize observability across teams; catch performance regressions before they reach production
- **Frustrations**: No systematic way to enforce render performance standards across the codebase
- **Success criteria**: CI pipeline compares replay sessions between PR and main; alerts when score degrades

---

## 7. User Stories

- **US-01** — As a React developer, I can load a TelemetryBuffer and navigate its render history frame by frame
- **US-02** — As a React developer, I can jump directly to render #47 and inspect all its metadata
- **US-03** — As a React developer, I can seek to a specific timestamp offset (relativeMs) in the session
- **US-04** — As a React developer, I can filter frames to see only renders with score < 50
- **US-05** — As a React developer, I can filter frames to show only reference-instability renders
- **US-06** — As a React developer, I can navigate to the next frame matching a filter without scanning manually
- **US-07** — As a senior engineer, I can bookmark a specific frame with a label and note
- **US-08** — As a senior engineer, I can export bookmarks as JSON for sharing
- **US-09** — As a senior engineer, I can load a serialized session JSON and replay it offline
- **US-10** — As a performance engineer, I can read session stats (average score, score delta, ineffective render count) programmatically
- **US-11** — As a performance engineer, I can read timeline segments that identify degradation periods
- **US-12** — As an open source maintainer, I can accept a serialized session from a bug report and replay it
- **US-13** — As a tech lead, I can load multiple sessions from a buffer and select the one I want to replay
- **US-14** — As a CI consumer, I can build replay sessions from raw event arrays without a TelemetryBuffer

---

## 8. Replay Domain Model

### 8.1 Core Entities

#### `ReplayFrame`
The fundamental unit of replay. Groups all telemetry events for a single `renderNumber` within a session. Self-contained — does not depend on any other frame.

```
ReplayFrame
  ├── Identity: id, frameIndex, renderNumber, sessionId, componentName
  ├── Timing: wallTimestamp, relativeMs (offset from session start)
  ├── Events: renderEvent, propChangeEvent?, frequencyEvent?, scoreEvent?, recommendationEvent?
  └── Derived: score, grade, memoClassification, frequencyClass, signalKind,
               hasUnstableProps, unstablePropCount, changedPropCount,
               recommendationCount, triggeredBy
```

`frameIndex` is 0-based position in the session's frame array (monotonically increasing).
`renderNumber` is from the telemetry-core `RenderEvent` (also monotonically increasing but may start at > 1 if session is replayed mid-lifecycle).

#### `ReplaySession`
An ordered collection of all frames for a component instance. Maps to a single `TelemetrySession` from telemetry-core.

```
ReplaySession
  ├── Identity: id (= telemetry sessionId), componentName, schemaVersion
  ├── Timing: startedAt, endedAt?, durationMs?
  ├── Frames: readonly ReplayFrame[] (ordered by frameIndex)
  ├── Derived: frameCount
  ├── timeline: ReplayTimeline
  └── stats: ReplaySessionStats
```

`endedAt` is null for active sessions (session-end event not yet received).

#### `ReplayTimeline`
A view optimized for visual scrubbing — lightweight entries without full frame data.

```
ReplayTimeline
  ├── sessionId
  ├── entries: readonly ReplayTimelineEntry[]  (one per frame, lightweight)
  ├── duration: number | null
  └── segments: readonly ReplaySegment[]  (trend analysis windows)
```

#### `ReplayTimelineEntry`
```
ReplayTimelineEntry
  ├── frameIndex, renderNumber
  ├── wallTimestamp, relativeMs
  ├── score?, grade?, severity ('ok' | 'warn' | 'critical')
  ├── hasUnstableProps, signalKind?
```

`severity`:
- `'critical'` — score < 50 or grade === 'POOR'
- `'warn'` — score 50–69 or grade === 'MODERATE'  
- `'ok'` — score >= 70 or no score

#### `ReplaySegment`
A contiguous window of frames analyzed for trend.

```
ReplaySegment
  ├── label: string                    ("Degradation", "Recovery", "Stable", "Volatile")
  ├── startFrameIndex, endFrameIndex
  ├── trend: 'improving' | 'degrading' | 'stable' | 'volatile'
  └── avgScore: number | null
```

Trend classification (within window of `segmentWindowSize` frames):
- `'degrading'` — last score < first score by > 10 points
- `'improving'` — last score > first score by > 10 points
- `'volatile'` — score range > 30 points within window
- `'stable'` — otherwise

#### `ReplaySessionStats`
Pre-computed summary statistics for the session.

```
ReplaySessionStats
  ├── totalRenders
  ├── averageScore?, minScore?, maxScore?
  ├── initialScore?, finalScore?, scoreDelta?   (finalScore - initialScore)
  ├── ineffectiveRenderCount                    (memoClassification === 'INEFFECTIVE')
  ├── highFrequencyCount                        (frequencyClass === 'HIGH')
  ├── unstablePropNames: readonly string[]      (deduplicated across all frames)
  ├── totalRecommendations
  └── uniqueRecommendations: readonly string[]
```

#### `ReplayCursor`
An immutable navigation position. Suitable for `useState<ReplayCursor>`. Never mutated — every navigation returns a new cursor.

```
ReplayCursor
  ├── sessionId
  ├── frameIndex, totalFrames
  ├── isAtStart, isAtEnd, canGoPrevious, canGoNext
  └── frame: ReplayFrame   (current frame, fully hydrated)
```

#### `ReplayFilter`
A pure specification of filtering criteria. All fields optional; unset = no constraint.

```
ReplayFilter
  ├── componentNames?: readonly string[]
  ├── minScore?, maxScore?
  ├── grades?: readonly TelemetryHealthGrade[]
  ├── memoClassifications?: readonly TelemetryMemoClassification[]
  ├── frequencyClasses?: readonly TelemetryFrequencyClass[]
  ├── signalKinds?: readonly TelemetrySignalKind[]
  ├── hasUnstablePropsOnly?: boolean
  ├── hasRecommendationsOnly?: boolean
  ├── triggeredBy?: readonly ('parent' | 'props')[]
  ├── frameIndexRange?: readonly [number, number]
  ├── timestampRange?: readonly [number, number]      (absolute wallTimestamps)
  └── relativeMsRange?: readonly [number, number]     (relative to session start)
```

#### `ReplayFilterResult`
```
ReplayFilterResult
  ├── filter: ReplayFilter                       (the applied filter — for identity)
  ├── matchingFrameIndices: readonly number[]   (sorted ascending)
  ├── matchingFrameCount, totalFrameCount
```

#### `ReplayBookmark`
An annotation on a specific frame. Stored separately from the session — bookmarks are user-created metadata, not telemetry data.

```
ReplayBookmark
  ├── id: ReplayBookmarkId
  ├── sessionId, frameIndex
  ├── label, note?
  ├── createdAt
  └── tags: readonly string[]
```

#### `ReplayEngine`
The top-level object returned by `createReplayEngine`. Owns one active `ReplaySession`, a `ReplayNavigator`, and a `ReplayBookmarkStore`.

```
ReplayEngine
  ├── session: ReplaySession
  ├── navigate: ReplayNavigator
  ├── bookmarks: ReplayBookmarkStore
  ├── applyFilter(filter) → ReplayFilterResult
  ├── applyPreset(preset) → ReplayFilterResult
  ├── getFrame(frameIndex) → ReplayFrame | null
  ├── getFrameByRenderNumber(n) → ReplayFrame | null
  └── getFrameRange(start, end) → readonly ReplayFrame[]
```

#### `ReplayNavigator`
Stateless navigation factory. Takes a session + cursor (or position), returns a new cursor. All methods are pure — no side effects.

```
ReplayNavigator
  ├── atStart() → ReplayCursor
  ├── atEnd() → ReplayCursor
  ├── at(frameIndex) → ReplayCursor | null
  ├── next(cursor) → ReplayCursor | null
  ├── previous(cursor) → ReplayCursor | null
  ├── seek(cursor, frameIndex) → ReplayCursor | null
  ├── jumpToRender(cursor, renderNumber) → ReplayCursor | null
  ├── jumpToTimestamp(cursor, relativeMs) → ReplayCursor | null
  ├── nextMatching(cursor, filter) → ReplayCursor | null
  ├── previousMatching(cursor, filter) → ReplayCursor | null
  └── jumpToBookmark(bookmarkId) → ReplayCursor | null
```

All methods return `null` when the requested position is out of bounds or has no match.

---

## 9. Replay Architecture

### 9.1 Data Flow

```
Input Source (one of):
  TelemetryBuffer  ──────────────────────┐
  readonly TelemetryEvent[]  ────────────┤──► EventPartitioner
  Serialized JSON string  ───────────────┘         │
                                                    ▼
                                          Partition by sessionId
                                                    │
                                                    ▼
                                          For each session:
                                          Sort events by sequenceNumber
                                                    │
                                                    ▼
                                          FrameBuilder
                                          (group events by renderNumber
                                           → ReplayFrame[])
                                                    │
                                                    ▼
                                          SessionBuilder
                                          (frames → ReplaySession with
                                           timeline + stats)
                                                    │
                                                    ▼
                                          ReplayEngine
                                          (session + navigator + bookmarks)
```

### 9.2 Session Lifecycle

**Phase 1: Input ingestion**
- Accept one of three source types (buffer, events array, serialized JSON)
- If buffer: extract `buffer.getSnapshot().events` inside `createReplayEngine` at construction time (the `ReplayBufferSource` stores the buffer reference; the snapshot is taken when the engine is built, not when `fromBuffer()` is called)
- If serialized: parse via `deserializeBuffer` from telemetry-core

**Phase 2: Event partitioning**
- Group all events by `sessionId`
- Each group becomes one candidate session
- Within each group: sort by `sequenceNumber` (ascending, already monotonic)

**Phase 3: Frame building**
- Scan each group for session-start → session-end bookends
- For each `render` event: create `ReplayFrame` skeleton
- Merge matching prop-change, frequency, score, recommendation events into frame by `renderNumber`
- Events without a matching render frame: silently ignored (malformed/partial sessions)
- Compute derived fields (score, grade, hasUnstableProps, etc.) from merged events

**Phase 4: Session assembly**
- Order frames by `frameIndex` (= order of render event in sequence)
- Build `ReplayTimeline` from frames
- Detect `ReplaySegment` windows via sliding window trend analysis
- Compute `ReplaySessionStats` from all frames

**Phase 5: Engine creation**
- Wrap assembled session in `ReplayEngine`
- Initialize `ReplayNavigator` (bound to session frame array and indices)
- Initialize empty `ReplayBookmarkStore`
- Apply `maxFrames` constraint (prune if needed)

### 9.3 Frame Building Algorithm

```
For each event in sorted session events:
  case 'session-start':
    record startedAt = event.wallTimestamp

  case 'render':
    create frameMap[renderNumber] = {
      id: `${sessionId}:${frameIndex}`,
      frameIndex: nextFrameIndex++,
      renderNumber: event.renderNumber,
      wallTimestamp: event.wallTimestamp,
      relativeMs: event.wallTimestamp - startedAt,
      renderEvent: event,
      propChangeEvent: null,
      frequencyEvent: null,
      scoreEvent: null,
      recommendationEvent: null,
      // derived fields computed after all events processed
    }

  case 'prop-change':
    if frameMap[event.renderNumber] exists:
      frameMap[event.renderNumber].propChangeEvent = event

  case 'frequency':
    if frameMap[event.renderNumber] exists:
      frameMap[event.renderNumber].frequencyEvent = event

  case 'score':
    if frameMap[event.renderNumber] exists:
      frameMap[event.renderNumber].scoreEvent = event

  case 'recommendation':
    if frameMap[event.renderNumber] exists:
      frameMap[event.renderNumber].recommendationEvent = event

  case 'session-end':
    record endedAt = event.wallTimestamp

After all events:
  For each frame:
    compute derived fields from merged events
    freeze frame (Object.freeze for immutability)
  
  Assemble frames[] = Object.values(frameMap).sort by frameIndex
```

### 9.4 Immutability Guarantees

Top-level frames and sessions are frozen via `Object.freeze`. TypeScript's `readonly` modifier enforces immutability of nested fields at the type level. Deep runtime freezing is intentionally omitted — deep-freezing 5,000 × ~10 nested objects would breach the < 100ms build-time target. The engine does not mutate frames or sessions after construction. Cursors are plain objects (not frozen — they're short-lived value objects).

### 9.5 Memory Management

When `maxFrames > 0` and `frames.length > maxFrames`:
- **FIFO pruning** (default): drop oldest frames (lowest frameIndex)
- **Score-weighted pruning** (optional): drop frames with highest score first (preserve worst frames)
- Pruning happens once at session build time, not incrementally
- The `stats` and `timeline` are computed _before_ pruning (reflect full session)
- After pruning, a `ReplayPruningInfo` field on the session records: `originalFrameCount`, `prunedFrameCount`, `pruningStrategy`

---

## 10. Timeline Architecture

### 10.1 Structure

```
ReplayTimeline
  entries[0..N]     — one per frame, lightweight (no full event data)
  segments[]        — derived trend windows
  duration          — session duration in ms (null if active)
```

### 10.2 Entry Computation

Each `ReplayTimelineEntry` is derived from its `ReplayFrame`:
- `severity`: `'critical'` if score < 50 OR grade === 'POOR', `'warn'` if score 50–69 OR grade === 'MODERATE', `'ok'` otherwise
- Timeline entries are ~200 bytes each vs ~2KB per full frame — consumers use entries for scrubbers/minimap, full frames only when needed

### 10.3 Segment Detection

Segments are computed via a sliding window of `segmentWindowSize` frames (default 20).

Algorithm:
1. Divide frames into windows of `segmentWindowSize`
2. For each window: compute `firstScore`, `lastScore`, `scoreRange` (max - min within window)
3. Classify trend:
   - `scoreDelta = lastScore - firstScore`
   - `'degrading'` if scoreDelta < -10
   - `'improving'` if scoreDelta > +10
   - `'volatile'` if scoreRange > 30 (regardless of delta)
   - `'stable'` otherwise
4. Merge adjacent windows with same trend into single segment
5. Label segments: `'Degradation'`, `'Recovery'`, `'Stable'`, `'Volatility'`

When scores are null (not all renders emit score events): skip trend analysis for those windows, label as `'Unknown'`.

### 10.4 Multi-View Timeline Support

The engine exposes the timeline for four consumer views:

| View | API | Purpose |
|------|-----|---------|
| Frame timeline | `session.timeline.entries` | Scrubber position |
| Segment timeline | `session.timeline.segments` | Trend overlay |
| Filtered timeline | `applyFilter(filter).matchingFrameIndices` | Highlighted frames |
| Bookmark timeline | `bookmarks.getForSession(id)` | Annotation markers |

---

## 11. Snapshot Strategy

### 11.1 Why Classic Snapshot/Delta Doesn't Apply Here

In Redux DevTools, `state at time T` requires applying all actions from t=0 to T. Without checkpointing, navigation is O(N). To support O(1) access, Redux DevTools takes periodic full snapshots and applies only the deltas from the nearest checkpoint.

**This problem does not exist in render-replay-engine.** Each `ReplayFrame` is already a complete self-contained snapshot of a single render. Frame #100 does not require frames #1-#99. Navigation is inherently O(1) — `frames[frameIndex]` is a direct array lookup.

### 11.2 Actual Memory Strategy

The memory concern is storage, not reconstruction. At ~2KB/frame worst case:

| Frame count | Memory |
|-------------|--------|
| 1,000 | ~2MB |
| 5,000 | ~10MB |
| 10,000 | ~20MB |
| 50,000 | ~100MB |

Strategy:
1. **Default cap**: `maxFrames = 5000` (configurable, `0 = unlimited`)
2. **Pruning at build time**: if input exceeds maxFrames, prune before freezing
3. **Lazy source retention**: keep raw events array alive for on-demand reconstruction (consumers can re-build the engine with different options)
4. **Timeline entries are cheap**: always keep full timeline (entries are ~10% the size of frames); consumers can render the full history minimap even when frames are pruned

### 11.3 Periodic Index Checkpoints

For `jumpToTimestamp` (binary search), maintain a sorted index:
```
timestampIndex: readonly { relativeMs: number; frameIndex: number }[]
```
This is a flat sorted array of (timestamp, frameIndex) pairs. Binary search is O(log N). Built once at session construction time, ~16 bytes per entry.

---

## 12. Event Reconstruction Design

### 12.1 Telemetry Event → Frame Mapping

| Event type | Frame field | Notes |
|-----------|-------------|-------|
| `session-start` | Session `startedAt` | Sets time origin for `relativeMs` |
| `render` | `renderEvent`, `triggeredBy`, `wallTimestamp` | Required; creates the frame |
| `prop-change` | `propChangeEvent`, `signalKind`, `changedPropCount`, `hasUnstableProps`, `unstablePropCount` | Optional per render |
| `frequency` | `frequencyEvent`, `frequencyClass` | Optional per render |
| `score` | `scoreEvent`, `score`, `grade`, `memoClassification` | Optional per render |
| `recommendation` | `recommendationEvent`, `recommendationCount` | Optional per render |
| `session-end` | Session `endedAt`, `durationMs` | Optional (active sessions won't have it) |

### 12.2 Causality Reconstruction

**Render causality** — `triggeredBy` comes directly from `RenderEvent.triggeredBy` (`'parent'` or `'props'`). No inference needed.

**Component history** — all frames in a session share the same `componentName` (from session). The sequence of frames is the complete render history.

**Recommendation history** — `ReplaySessionStats.uniqueRecommendations` deduplicates across all `recommendationEvent.recommendations` arrays. `ReplayFrame.recommendationCount` shows volume per frame.

**Score history** — `stats.initialScore`, `stats.finalScore`, `stats.scoreDelta` capture the arc. `timeline.segments` show the trend.

**Memo effectiveness history** — `stats.ineffectiveRenderCount` counts renders where `memoClassification === 'INEFFECTIVE'`. Per-frame `memoClassification` tracks the session-level classification at that point.

### 12.3 Partial Sessions

Partial sessions (e.g., session-end event not received) are valid. The engine handles:
- No `session-start`: use earliest event's `wallTimestamp` as `startedAt`; set `schemaVersion` to unknown
- No `session-end`: `endedAt = null`, `durationMs = null`
- Missing event types per frame: set corresponding field to `null`
- Out-of-order events: sort by `sequenceNumber` before processing
- Duplicate events (same sessionId + renderNumber + type): keep first occurrence

---

## 13. Navigation System

### 13.1 Navigation Methods

**Absolute positioning:**

| Method | Behavior | Out of bounds |
|--------|----------|---------------|
| `navigate.atStart()` | Cursor at `frameIndex = 0` | — |
| `navigate.atEnd()` | Cursor at `frameIndex = frameCount - 1` | — |
| `navigate.at(i)` | Cursor at `frameIndex = i` | `null` if i < 0 or i >= frameCount |

**Relative movement (from existing cursor):**

| Method | Behavior | Out of bounds |
|--------|----------|---------------|
| `navigate.next(cursor)` | `frameIndex + 1` | `null` if at end |
| `navigate.previous(cursor)` | `frameIndex - 1` | `null` if at start |
| `navigate.seek(cursor, i)` | `frameIndex = i` | `null` if out of range |
| `navigate.jumpToRender(cursor, n)` | Frame where `renderNumber === n` | `null` if not found |
| `navigate.jumpToTimestamp(cursor, ms)` | Frame nearest to `relativeMs = ms` | Always returns a cursor — engine construction guarantees ≥ 1 frame |

**Filter-aware navigation:**

| Method | Behavior |
|--------|----------|
| `navigate.nextMatching(cursor, filter)` | Next frame after cursor matching filter; `null` if none |
| `navigate.previousMatching(cursor, filter)` | Previous frame before cursor matching filter; `null` if none |

**Bookmark navigation:**

| Method | Behavior |
|--------|----------|
| `navigate.jumpToBookmark(bookmarkId)` | Frame at bookmark's `frameIndex`; `null` if bookmark not found |

### 13.2 Performance Guarantees

| Operation | Complexity |
|-----------|-----------|
| `atStart` / `atEnd` | O(1) |
| `at(i)` | O(1) — array index |
| `next` / `previous` | O(1) |
| `seek(i)` | O(1) |
| `jumpToRender(n)` | O(1) — renderNumber → frameIndex Map |
| `jumpToTimestamp(ms)` | O(log N) — binary search on timestamp index |
| `nextMatching` / `previousMatching` | O(K) where K = frames scanned before first match |

### 13.3 Cursor Immutability

Cursors are plain objects (not frozen — they're ephemeral). Each navigation call constructs a new cursor object from `session.frames[newIndex]`. Consumers can safely store cursors in React state:

```ts
const [cursor, setCursor] = useState(() => engine.navigate.atStart());
const handleNext = () => {
  const next = engine.navigate.next(cursor);
  if (next) setCursor(next);
};
```

---

## 14. Filtering System

### 14.1 Filter API

```ts
applyFilter(filter: ReplayFilter): ReplayFilterResult
applyPreset(preset: ReplayFilterPreset): ReplayFilterResult
```

Filters are evaluated as **AND** across all specified fields. Within an array field (e.g., `grades`), values are **OR** (any match).

`applyFilter` is a pure function — calling it twice with the same filter produces identical results.

### 14.2 Filter Evaluation Order (performance optimization)

Fields are evaluated cheapest-first to short-circuit early:
1. `frameIndexRange` — array index range check
2. `timestampRange` / `relativeMsRange` — numeric comparison
3. `triggeredBy` — single string comparison
4. `hasUnstablePropsOnly` — boolean field check
5. `hasRecommendationsOnly` — `> 0` check
6. `grades` — enum comparison
7. `minScore` / `maxScore` — numeric comparison
8. `memoClassifications` — enum comparison
9. `frequencyClasses` — enum comparison
10. `signalKinds` — enum comparison
11. `componentNames` — string equality (rarely needed for single-session engine)

### 14.3 Built-in Filter Presets

| Preset | Filter definition |
|--------|------------------|
| `'issues-only'` | union of two filter passes: `applyFilter(session, { maxScore: 69 })` ∪ `applyFilter(session, { hasUnstablePropsOnly: true })` — merge `matchingFrameIndices` (deduplicate, sort ascending) |
| `'score-degradation'` | Frames where `score < previousFrame.score` (sequential analysis) |
| `'reference-instability'` | `signalKinds: ['reference-only', 'mixed']` |
| `'high-frequency'` | `frequencyClasses: ['HIGH']` |
| `'ineffective-memo'` | `memoClassifications: ['INEFFECTIVE']` |
| `'prop-changes-only'` | `hasRecommendationsOnly: false` + `signalKinds: ['genuine', 'mixed', 'reference-only']` |
| `'parent-triggered-only'` | `triggeredBy: ['parent']` |

`'score-degradation'` requires sequential analysis (compare each frame to its predecessor). It returns frames where score dropped from the previous frame.

`'issues-only'` **cannot be expressed as a single `ReplayFilter`** (all fields are AND). Implement as the union of two `applyFilter` calls; deduplicate and sort the merged `matchingFrameIndices`.

### 14.4 Filter Composition

```ts
// Compose filters by AND
const mergeFilters = (a: ReplayFilter, b: ReplayFilter): ReplayFilter

// Add one constraint to existing filter
const withFilter = (base: ReplayFilter, addition: Partial<ReplayFilter>): ReplayFilter
```

Exported as pure utility functions from the public API.

---

## 15. Bookmarking System

### 15.1 BookmarkStore API

```ts
type ReplayBookmarkStore = {
  getAll: () => readonly ReplayBookmark[];
  getForSession: (sessionId: ReplaySessionId) => readonly ReplayBookmark[];
  getForFrame: (sessionId: ReplaySessionId, frameIndex: number) => readonly ReplayBookmark[];
  create: (params: ReplayBookmarkCreateParams) => ReplayBookmark;
  remove: (bookmarkId: ReplayBookmarkId) => void;
  update: (bookmarkId: ReplayBookmarkId, updates: ReplayBookmarkUpdate) => ReplayBookmark | null;
  exportBookmarks: () => readonly ReplayBookmark[];
  importBookmarks: (bookmarks: readonly ReplayBookmark[]) => void;
};
```

### 15.2 Bookmark Identity

`id` is generated via `generateId()` (from telemetry-core utils, or re-implemented in the engine). Format: `crypto.randomUUID()` with `Math.random()` fallback.

### 15.3 Export / Import

`exportBookmarks()` returns a plain JSON-serializable `readonly ReplayBookmark[]`. `importBookmarks()` merges into the store (deduplicates by `id`). This enables:
- Sharing annotations between team members
- Persisting bookmarks in a CI artifact
- Loading bookmarks from a previous session into a new replay

### 15.4 Future Extension

The `ReplayBookmarkStore` interface is designed so that future adapters can replace the in-memory implementation:
- `localStorage` adapter
- File system adapter (Node.js / VSCode extension)
- Remote adapter (team dashboard)

---

## 16. Public API

### 16.1 Factory Functions

```ts
// Create engine for a single session
createReplayEngine(
  source: ReplaySource,
  sessionId?: ReplaySessionId,  // required when source contains multiple sessions
  options?: ReplayEngineOptions
): ReplayEngine

// Build all sessions from a source (for session picker UI)
buildReplaySessions(
  source: ReplaySource,
  options?: ReplayEngineOptions
): readonly ReplaySession[]

// Source constructors
fromBuffer(buffer: TelemetryBuffer): ReplaySource
fromEvents(events: readonly TelemetryEvent[]): ReplaySource
fromSerialized(json: string): ReplaySource
```

When `createReplayEngine` is called without `sessionId` and the source contains multiple sessions, it throws `ReplayError` with `code: 'MULTIPLE_SESSIONS'` listing available session IDs. This is a design contract, not a silent fallback.

`buildReplaySessions` returns sessions sorted by `startedAt` ascending (earliest session first).

### 16.2 Filter Utilities (pure functions, exported separately)

```ts
applyFilter(session: ReplaySession, filter: ReplayFilter): ReplayFilterResult
applyPreset(session: ReplaySession, preset: ReplayFilterPreset): ReplayFilterResult
mergeFilters(a: ReplayFilter, b: ReplayFilter): ReplayFilter
withFilter(base: ReplayFilter, addition: Partial<ReplayFilter>): ReplayFilter
```

These are standalone pure functions. Consumers can use them without creating an engine (e.g., CI tools that just analyze session data).

### 16.3 Error Types

```ts
type ReplayErrorCode =
  | 'EMPTY_SOURCE'              // no events or empty buffer
  | 'MULTIPLE_SESSIONS'         // multiple sessions, sessionId required
  | 'SESSION_NOT_FOUND'         // requested sessionId not in source
  | 'INVALID_SERIALIZED_JSON'   // JSON parse failure
  | 'SCHEMA_VERSION_MISMATCH'   // incompatible telemetry-core version
  | 'NO_RENDER_EVENTS'          // session has no render events (unusable)

type ReplayError = Error & {
  readonly code: ReplayErrorCode;
  readonly detail?: string;
};
```

---

## 17. Type Definitions

All types live in `src/types/index.ts`. Full definitions:

```ts
// Identifier brands
type ReplaySessionId = string;
type ReplayFrameId = string;      // `${sessionId}:${frameIndex}`
type ReplayBookmarkId = string;

// ── ReplayFrame ─────────────────────────────────────────────────
type ReplayFrame = {
  readonly id: ReplayFrameId;
  readonly frameIndex: number;
  readonly renderNumber: number;
  readonly sessionId: ReplaySessionId;
  readonly componentName: string;
  readonly wallTimestamp: number;
  readonly relativeMs: number;

  readonly renderEvent: RenderEvent;
  readonly propChangeEvent: PropChangeEvent | null;
  readonly frequencyEvent: FrequencyEvent | null;
  readonly scoreEvent: ScoreEvent | null;
  readonly recommendationEvent: RecommendationEvent | null;

  readonly score: number | null;
  readonly grade: TelemetryHealthGrade | null;
  readonly memoClassification: TelemetryMemoClassification | null;
  readonly frequencyClass: TelemetryFrequencyClass | null;
  readonly signalKind: TelemetrySignalKind | null;
  readonly hasUnstableProps: boolean;
  readonly unstablePropCount: number;
  readonly changedPropCount: number;
  readonly recommendationCount: number;
  readonly triggeredBy: 'parent' | 'props';
};

// ── ReplaySessionStats ──────────────────────────────────────────
type ReplaySessionStats = {
  readonly totalRenders: number;
  readonly averageScore: number | null;
  readonly minScore: number | null;
  readonly maxScore: number | null;
  readonly initialScore: number | null;
  readonly finalScore: number | null;
  readonly scoreDelta: number | null;
  readonly ineffectiveRenderCount: number;
  readonly highFrequencyCount: number;
  readonly unstablePropNames: readonly string[];
  readonly totalRecommendations: number;
  readonly uniqueRecommendations: readonly string[];
};

// ── ReplayPruningInfo (populated when maxFrames exceeded) ───────
type ReplayPruningInfo = {
  readonly pruned: true;
  readonly originalFrameCount: number;
  readonly prunedFrameCount: number;
  readonly strategy: 'fifo' | 'score-weighted';
} | {
  readonly pruned: false;
};

// ── ReplaySession ───────────────────────────────────────────────
type ReplaySession = {
  readonly id: ReplaySessionId;
  readonly componentName: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly durationMs: number | null;
  readonly schemaVersion: string;

  readonly frames: readonly ReplayFrame[];
  readonly frameCount: number;

  readonly timeline: ReplayTimeline;
  readonly stats: ReplaySessionStats;
  readonly pruningInfo: ReplayPruningInfo;
};

// ── ReplayTimeline ──────────────────────────────────────────────
type ReplayTimelineEntry = {
  readonly frameIndex: number;
  readonly renderNumber: number;
  readonly wallTimestamp: number;
  readonly relativeMs: number;
  readonly score: number | null;
  readonly grade: TelemetryHealthGrade | null;
  readonly severity: 'ok' | 'warn' | 'critical';
  readonly hasUnstableProps: boolean;
  readonly signalKind: TelemetrySignalKind | null;
};

type ReplaySegment = {
  readonly label: string;
  readonly startFrameIndex: number;
  readonly endFrameIndex: number;
  readonly trend: 'improving' | 'degrading' | 'stable' | 'volatile';
  readonly avgScore: number | null;
};

type ReplayTimeline = {
  readonly sessionId: ReplaySessionId;
  readonly entries: readonly ReplayTimelineEntry[];
  readonly duration: number | null;
  readonly segments: readonly ReplaySegment[];
};

// ── ReplayCursor ────────────────────────────────────────────────
type ReplayCursor = {
  readonly sessionId: ReplaySessionId;
  readonly frameIndex: number;
  readonly totalFrames: number;
  readonly isAtStart: boolean;
  readonly isAtEnd: boolean;
  readonly canGoPrevious: boolean;
  readonly canGoNext: boolean;
  readonly frame: ReplayFrame;
};

// ── ReplayFilter ────────────────────────────────────────────────
type ReplayFilter = {
  readonly componentNames?: readonly string[];
  readonly minScore?: number;
  readonly maxScore?: number;
  readonly grades?: readonly TelemetryHealthGrade[];
  readonly memoClassifications?: readonly TelemetryMemoClassification[];
  readonly frequencyClasses?: readonly TelemetryFrequencyClass[];
  readonly signalKinds?: readonly TelemetrySignalKind[];
  readonly hasUnstablePropsOnly?: boolean;
  readonly hasRecommendationsOnly?: boolean;
  readonly triggeredBy?: readonly ('parent' | 'props')[];
  readonly frameIndexRange?: readonly [number, number];
  readonly timestampRange?: readonly [number, number];
  readonly relativeMsRange?: readonly [number, number];
};

type ReplayFilterResult = {
  readonly filter: ReplayFilter;
  readonly matchingFrameIndices: readonly number[];
  readonly matchingFrameCount: number;
  readonly totalFrameCount: number;
};

type ReplayFilterPreset =
  | 'issues-only'
  | 'score-degradation'
  | 'reference-instability'
  | 'high-frequency'
  | 'ineffective-memo'
  | 'prop-changes-only'
  | 'parent-triggered-only';

// ── Bookmarks ───────────────────────────────────────────────────
type ReplayBookmark = {
  readonly id: ReplayBookmarkId;
  readonly sessionId: ReplaySessionId;
  readonly frameIndex: number;
  readonly label: string;
  readonly note: string | null;
  readonly createdAt: number;
  readonly tags: readonly string[];
};

type ReplayBookmarkCreateParams = {
  readonly sessionId: ReplaySessionId;
  readonly frameIndex: number;
  readonly label: string;
  readonly note?: string;
  readonly tags?: readonly string[];
};

type ReplayBookmarkUpdate = {
  readonly label?: string;
  readonly note?: string | null;
  readonly tags?: readonly string[];
};

type ReplayBookmarkStore = {
  getAll: () => readonly ReplayBookmark[];
  getForSession: (sessionId: ReplaySessionId) => readonly ReplayBookmark[];
  getForFrame: (sessionId: ReplaySessionId, frameIndex: number) => readonly ReplayBookmark[];
  create: (params: ReplayBookmarkCreateParams) => ReplayBookmark;
  remove: (bookmarkId: ReplayBookmarkId) => void;
  update: (bookmarkId: ReplayBookmarkId, updates: ReplayBookmarkUpdate) => ReplayBookmark | null;
  exportBookmarks: () => readonly ReplayBookmark[];
  importBookmarks: (bookmarks: readonly ReplayBookmark[]) => void;
};

// ── Navigator ───────────────────────────────────────────────────
type ReplayNavigator = {
  atStart: () => ReplayCursor;
  atEnd: () => ReplayCursor;
  at: (frameIndex: number) => ReplayCursor | null;
  next: (cursor: ReplayCursor) => ReplayCursor | null;
  previous: (cursor: ReplayCursor) => ReplayCursor | null;
  seek: (cursor: ReplayCursor, frameIndex: number) => ReplayCursor | null;
  jumpToRender: (cursor: ReplayCursor, renderNumber: number) => ReplayCursor | null;
  jumpToTimestamp: (cursor: ReplayCursor, relativeMs: number) => ReplayCursor;
  nextMatching: (cursor: ReplayCursor, filter: ReplayFilter) => ReplayCursor | null;
  previousMatching: (cursor: ReplayCursor, filter: ReplayFilter) => ReplayCursor | null;
  jumpToBookmark: (bookmarkId: ReplayBookmarkId) => ReplayCursor | null;
};

// ── Engine ──────────────────────────────────────────────────────
type ReplayEngine = {
  readonly session: ReplaySession;
  readonly navigate: ReplayNavigator;
  readonly bookmarks: ReplayBookmarkStore;
  applyFilter: (filter: ReplayFilter) => ReplayFilterResult;
  applyPreset: (preset: ReplayFilterPreset) => ReplayFilterResult;
  getFrame: (frameIndex: number) => ReplayFrame | null;
  getFrameByRenderNumber: (renderNumber: number) => ReplayFrame | null;
  getFrameRange: (startIndex: number, endIndex: number) => readonly ReplayFrame[];
};

// ── Source ──────────────────────────────────────────────────────
type ReplayBufferSource = {
  readonly type: 'buffer';
  readonly buffer: TelemetryBuffer;
};

type ReplayEventsSource = {
  readonly type: 'events';
  readonly events: readonly TelemetryEvent[];
};

type ReplaySerializedSource = {
  readonly type: 'serialized';
  readonly json: string;
};

type ReplaySource = ReplayBufferSource | ReplayEventsSource | ReplaySerializedSource;

// ── Options ─────────────────────────────────────────────────────
type ReplayPruningStrategy = 'fifo' | 'score-weighted';

type ReplayEngineOptions = {
  readonly maxFrames?: number;                   // default: 5000, 0 = unlimited
  readonly pruningStrategy?: ReplayPruningStrategy;  // default: 'fifo'
  readonly segmentWindowSize?: number;           // default: 20 frames per segment
  readonly enableStats?: boolean;                // default: true
  readonly enableTimeline?: boolean;             // default: true
  readonly enableSegments?: boolean;             // default: true
};

// ── Error ───────────────────────────────────────────────────────
type ReplayErrorCode =
  | 'EMPTY_SOURCE'
  | 'MULTIPLE_SESSIONS'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_SERIALIZED_JSON'
  | 'SCHEMA_VERSION_MISMATCH'
  | 'NO_RENDER_EVENTS';

// ReplayError extends Error (cannot use type alias for class, use class pattern in impl)
```

---

## 18. Data Flow

```
                    createReplayEngine(source, sessionId?, options?)
                                │
              ┌─────────────────┼──────────────────┐
              │                 │                  │
        fromBuffer()       fromEvents()      fromSerialized()
              │                 │                  │
              └────────────────►│◄─────────────────┘
                                │
                         TelemetryEvent[]
                                │
                    EventPartitioner.partition()
                                │
                    Map<sessionId, TelemetryEvent[]>
                                │
                    (apply sessionId selector if provided)
                                │
                    FrameBuilder.buildFrames(events[])
                                │
                    ReplayFrame[]  (sorted by frameIndex)
                                │
                    ┌───────────┴────────────┐
                    │                        │
            SessionBuilder              SessionBuilder
            .buildStats()              .buildTimeline()
                    │                        │
            ReplaySessionStats        ReplayTimeline
                                   (entries + segments)
                    │                        │
                    └───────────┬────────────┘
                                │
                         ReplaySession (frozen)
                                │
                    ReplayEngineFactory.create(session, options)
                                │
                         ReplayEngine
                    ┌──────────┴──────────┐
                    │                     │
              ReplayNavigator      ReplayBookmarkStore
              (bound to session)    (empty, in-memory)
```

---

## 19. Configuration

```ts
type ReplayEngineOptions = {
  readonly maxFrames?: number;
  // default: 5000
  // 0 = unlimited (use with caution for long sessions)
  // Applied at session build time — excess frames are pruned before freezing

  readonly pruningStrategy?: 'fifo' | 'score-weighted';
  // default: 'fifo'
  // 'fifo': drop oldest frames (lowest frameIndex) — preserves recent history
  // 'score-weighted': drop highest-score frames first — preserves worst-performing frames

  readonly segmentWindowSize?: number;
  // default: 20 frames per segment analysis window
  // Larger = fewer, coarser segments; smaller = more granular trend analysis
  // Has no effect if enableSegments: false

  readonly enableStats?: boolean;
  // default: true
  // Set false to skip stats computation (perf optimization for large sessions)

  readonly enableTimeline?: boolean;
  // default: true
  // Set false to skip timeline + segment computation (further perf optimization)
  // Also disables segments (timeline is required for segments)

  readonly enableSegments?: boolean;
  // default: true
  // Set false to skip segment trend analysis only (timeline entries still built)
  // Has no effect if enableTimeline: false
};
```

---

## 20. Performance Requirements

### 20.1 Targets

| Operation | Input | Max latency |
|-----------|-------|-------------|
| Session build | 10,000 events | < 100ms |
| Session build | 1,000 events | < 10ms |
| `next` / `previous` | — | < 0.1ms |
| `seek(i)` | — | < 0.1ms |
| `jumpToTimestamp` | 5,000 frames | < 1ms |
| `applyFilter` | 5,000 frames | < 50ms |
| `applyPreset('score-degradation')` | 5,000 frames | < 50ms |
| `buildReplaySessions` | 50,000 events (10 sessions) | < 500ms |
| Memory per frame | worst case | < 3KB |
| Timeline entry | — | < 100 bytes |

### 20.2 Indexing

At session build time, the engine maintains:
1. `frames: readonly ReplayFrame[]` — O(1) access by frameIndex
2. `renderNumberIndex: ReadonlyMap<number, number>` — renderNumber → frameIndex (O(1) `jumpToRender`)
3. `timestampIndex: readonly { relativeMs: number; frameIndex: number }[]` — sorted array for O(log N) binary search

All three are computed once and frozen.

### 20.3 Memory Budget for 5,000 Frames (default limit)

| Component | Size |
|-----------|------|
| 5,000 frames × 2KB | ~10MB |
| Timeline entries × 100 bytes | ~0.5MB |
| Render number index | ~80KB |
| Timestamp index | ~80KB |
| Stats | ~4KB |
| **Total** | **~11MB** |

### 20.4 Large Session Strategy

For sessions exceeding `maxFrames`:
- Pruning happens at build time (not incrementally)
- `session.pruningInfo` records what was dropped
- Consumers can re-build with `maxFrames: 0` if they need the full session at the cost of memory

---

## 21. Security Considerations

- **No code execution**: The engine processes JSON-serializable data structures only. No `eval`, no dynamic code execution.
- **No network access**: Entirely offline. No URLs, no fetch, no WebSocket.
- **No sensitive data handling**: The engine processes whatever the consumer passes; it does not classify or sanitize prop values. Consumers are responsible for not passing PII through prop values (same guidance applies to telemetry-core).
- **SSR safety**: No `window`, `document`, `localStorage`, or browser-only APIs used anywhere. Safe to import in SSR/RSC environments.
- **Prototype pollution**: All assembled objects use `Object.freeze`. No dynamic property assignment after build.

---

## 22. Error Handling

All error-throwing functions throw `ReplayError` (extends `Error`) with a `code: ReplayErrorCode` field. No silent failures.

| Code | Thrown when | Recovery |
|------|-------------|----------|
| `EMPTY_SOURCE` | Buffer has no events, or events array is empty | Verify source before calling |
| `MULTIPLE_SESSIONS` | Source has > 1 session and no `sessionId` provided | Call `buildReplaySessions` first, then provide `sessionId` |
| `SESSION_NOT_FOUND` | Provided `sessionId` not in source | Call `buildReplaySessions` to list available IDs |
| `INVALID_SERIALIZED_JSON` | `fromSerialized(json)` fails JSON parse | Validate JSON before calling |
| `SCHEMA_VERSION_MISMATCH` | Events from an incompatible `render-telemetry-core` version | Align package versions |
| `NO_RENDER_EVENTS` | Session found but has no `render` events (no frames buildable) | Session is unusable; discard |

`navigate.*` methods **never throw** — they return `null` for out-of-bounds positions.

---

## 23. Testing Strategy

### 23.1 Test Files (minimum 100 tests)

| File | Coverage area | Min tests |
|------|---------------|-----------|
| `tests/frame-builder.test.ts` | Event → frame mapping, all 6 event types, partial frames, out-of-order events | 20 |
| `tests/session-builder.test.ts` | Session assembly, stats, timeline, segments, pruning | 20 |
| `tests/navigation.test.ts` | All navigate.* methods, edge cases (empty, single-frame, at-bounds) | 20 |
| `tests/filter.test.ts` | All ReplayFilter fields, all presets, mergeFilters, withFilter | 20 |
| `tests/bookmarks.test.ts` | CRUD, export/import, getForFrame, jumpToBookmark | 10 |
| `tests/sources.test.ts` | fromBuffer, fromEvents, fromSerialized, multi-session, error codes | 10 |
| `tests/engine.test.ts` | createReplayEngine full integration, getFrame, getFrameRange, buildReplaySessions | 10 |
| `tests/performance.test.ts` | 10,000 event build time, 5,000-frame filter time | 5 |
| `tests/error-handling.test.ts` | All ReplayError codes, null return contracts | 10 |
| **Total** | | **≥ 125** |

### 23.2 Test Patterns

**Frame builder tests:**
- Round-trip: build session from 5 renders with all 5 event types → verify all frame fields populated
- Missing events: render event only → propChangeEvent/frequencyEvent/scoreEvent/recommendationEvent all null
- Out-of-order events: shuffle events by random order, verify same frames result
- Duplicate events: two prop-change events for same renderNumber → first wins

**Navigation tests:**
- `atStart()` → frameIndex 0
- `atEnd()` → frameIndex frameCount - 1
- `next()` at end → null
- `previous()` at start → null
- `seek(n)` → exact frame
- `jumpToRender(n)` → frame with renderNumber === n
- `jumpToTimestamp(ms)` → nearest frame
- `nextMatching / previousMatching` skip non-matching frames correctly
- Cursor `isAtStart` / `isAtEnd` / `canGoPrevious` / `canGoNext` are accurate

**Filter tests:**
- Each filter field in isolation
- Combined filter (AND semantics)
- `'score-degradation'` preset correctly identifies declining frames
- `mergeFilters` combines constraints correctly
- Empty filter matches all frames

**Performance tests:**
- `createReplayEngine(fromEvents(10000events))` < 100ms
- `applyFilter(issuesOnly)` on 5,000 frames < 50ms
- Navigation is O(1): 1,000 `next()` calls < 5ms total

---

## 24. Documentation Strategy

- `README.md` in package root — installation, quickstart, all factory functions, navigation pattern
- Inline JSDoc on all exported functions (one line max per CLAUDE.md conventions)
- Demo page in `demo/src/features/render-replay-engine/` — minimal inspector showing session stats, frame navigation, filter application, bookmark creation
- Types are self-documenting via naming conventions — no type-level JSDoc needed

---

## 25. Release Plan

- `1.0.0` — Full implementation of all MVP features (all phases complete, 125+ tests green)
- `1.0.x` — Patch releases for bug fixes
- `1.1.0` — `score-weighted` pruning strategy, range selection API
- `2.0.0` — Remote source adapter interface (breaking: `ReplaySource` union extended)

---

## 26. Future Integration Strategy

### render-playground
The playground panel can add a "Replay" mode: when session ends, build a `ReplayEngine` from the buffer and expose navigation controls. The panel renders `cursor.frame` instead of live data.

Integration pattern:
```ts
// In render-playground
const engine = createReplayEngine(fromBuffer(buffer));
const [cursor, setCursor] = useState(() => engine.navigate.atStart());
```

### render-devtools-panel
The devtools panel is _almost entirely UI on top of this engine_. It:
1. Loads a `ReplayEngine` (from serialized file, clipboard, or live buffer)
2. Manages cursor state
3. Renders `cursor.frame` metadata
4. Exposes filter controls → `engine.applyFilter(filter)`
5. Renders timeline from `engine.session.timeline`

No replay logic in the panel — it delegates entirely to the engine.

### vscode-render-kit
The VSCode extension:
1. Reads a serialized session file from the workspace
2. Calls `createReplayEngine(fromSerialized(json))`
3. Uses the engine API to populate sidebar views
4. No architectural changes required — the extension consumes the same `ReplayEngine` type as the browser devtools panel

### render-ci-reporter
```ts
const sessions = buildReplaySessions(fromSerialized(ciArtifact));
for (const session of sessions) {
  const issues = applyPreset(session, 'issues-only');
  if (issues.matchingFrameCount > threshold) {
    // fail CI
  }
}
```

Pure node-compatible API — no browser, no React, no DevTools.

### render-regression-detector (future)
Takes two `ReplaySession` objects (baseline and PR) and compares:
- Score delta
- New ineffective renders
- Introduced recommendations

This package will import `ReplaySession`, `ReplaySessionStats`, and `ReplayFrame` types from `render-replay-engine`. The types are the stable contract.

---

## 27. Success Metrics

| Metric | Target |
|--------|--------|
| Test count | ≥ 125 |
| Test coverage (statements) | ≥ 95% |
| Bundle size (ESM, minified) | < 20KB |
| Build time for 10,000 events | < 100ms |
| Navigation latency (next/previous) | < 0.1ms |
| Zero `any` types | ✅ |
| Zero runtime dependencies | ✅ |
| TypeScript strict + exactOptionalPropertyTypes | ✅ |
| SSR-safe (no browser APIs) | ✅ |
| All downstream consumers can build without replay engine changes | ✅ |

---

## 28. Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Memory**: 10,000 frames × 2KB = 20MB in single session | Medium | `maxFrames: 5000` default; `pruningInfo` tracks what was dropped |
| **telemetry-core schema evolution**: new event types break frame builder | High | Unknown event types are **silently skipped** (not errored); `schemaVersion` recorded on session for downstream awareness |
| **Partial sessions**: missing session-start or missing session-end events | Medium | Gracefully handled: start inferred from first event timestamp; end remains null |
| **Filter performance degradation**: 50,000-frame sessions | Medium | `applyFilter` evaluated cheapest fields first; `maxFrames` defaults prevent this |
| **Type instability**: downstream consumers import from this package's types, then we rename/restructure | High | All exported types in `src/types/index.ts` only; no re-exported types from telemetry-core in public API surface |
| **Multi-session edge cases**: sessionId collision across different components | Low | sessionId is a UUID from telemetry-core; collision probability negligible |
| **SSR hydration**: cursor stored in React state with frame data | Low | Frames are plain serializable objects; no hydration mismatch risk |

---

## 29. Open Questions

1. **Should `ReplayNavigator.jumpToBookmark` take a `bookmarkId` or a `ReplayBookmark`?** Currently `bookmarkId` (string). Passing the full bookmark would be more type-safe but couples navigation to the bookmark store.

2. **Should `applyPreset('score-degradation')` compare each frame to its global predecessor or to the session average?** Current design: compare to preceding frame (local degradation). Alternative: flag frames below session average. Both have use cases.

3. **Should the engine support incremental updates (push new frames into a live session)?** Current design: point-in-time snapshot. An incremental mode would require the engine to be mutable — violates the current immutability contract. Defer to v2 or keep as a separate `ReplayLiveEngine`.

4. **Should `ReplayEngineOptions.maxFrames` apply per-session (when building multiple) or globally?** Current design: per-session. A global cap would be complex; document clearly.

5. **Should the engine expose a `subscribe` method for `useSyncExternalStore`?** The engine is currently immutable (point-in-time). If live buffer integration is added, `subscribe` would be needed. For now, consumers manage this at the source level (build new engine when buffer updates).

---

## 30. Implementation Phases

### Phase 1 — Package Scaffold [✅]

- [✅] Step 1: Create `packages/render-replay-engine/` directory with `package.json`, `tsup.config.ts`, `vitest.config.ts`, and `tsconfig.json` matching the monorepo conventions. peerDependency: `@sapanmozammel/render-telemetry-core` (no React peer dep). devDependency: `vitest@^2.1.8`, `@vitest/coverage-v8@^2.1.9`.
- [✅] Step 2: Create `src/types/index.ts` with all type definitions from Section 17. All types `readonly`. No `interface`. All arrays `readonly T[]`. Fix the `previousMatching` signature typo (`filter: ReplayFilter`).
- [✅] Step 3: Add `packages/render-replay-engine` to the workspace (pnpm-workspace.yaml already uses `packages/*` glob — no change needed).

### Phase 2 — Frame & Session Builder [✅]

- [✅] Step 4: Implement `src/builder/frame-builder.ts` — `buildFrames(events: readonly TelemetryEvent[], startedAt: number): readonly ReplayFrame[]`. Groups events by renderNumber, merges into frames, computes all derived fields. Returns frames sorted by frameIndex.
- [✅] Step 5: Implement `src/stats/session-stats.ts` — `buildSessionStats(frames: readonly ReplayFrame[]): ReplaySessionStats`. Pure function.
- [✅] Step 6: Implement `src/timeline/timeline-builder.ts` — `buildTimeline(sessionId, frames, startedAt, options): ReplayTimeline`. Builds entries and segments. Segment detection via sliding window.
- [✅] Step 7: Implement `src/builder/session-builder.ts` — `buildSession(events, options): ReplaySession`. Orchestrates frame-builder, stats, timeline. Handles pruning. Applies `Object.freeze`. Exports `buildSessions(events, options): readonly ReplaySession[]` for multi-session.

### Phase 3 — Input Sources [✅]

- [✅] Step 8: Implement `src/sources/from-events.ts` — `fromEvents(events): ReplayEventsSource`. Validates input is non-empty array.
- [✅] Step 9: Implement `src/sources/from-buffer.ts` — `fromBuffer(buffer): ReplayBufferSource`. Wraps the buffer reference. Snapshot extraction (`buffer.getSnapshot().events`) happens in `createReplayEngine` at engine construction time, not here.
- [✅] Step 10: Implement `src/sources/from-serialized.ts` — `fromSerialized(json): ReplaySerializedSource`. Wraps JSON string; parse happens in engine factory (not here).

### Phase 4 — Navigation & Engine [✅]

- [✅] Step 11: Implement `src/navigation/cursor.ts` — `createCursor(session, frameIndex): ReplayCursor`. Pure function. Computes `isAtStart`, `isAtEnd`, `canGoPrevious`, `canGoNext` from frameIndex and `session.frameCount`.
- [✅] Step 12: Implement `src/navigation/navigator.ts` — `createNavigator(session, bookmarkStore): ReplayNavigator`. All navigation methods. Binary search for `jumpToTimestamp`. `renderNumberIndex` Map for O(1) `jumpToRender`. Null return for out-of-bounds.
- [✅] Step 13: Implement `src/engine/replay-engine.ts` — `createReplayEngine(source, sessionId?, options?): ReplayEngine`. Orchestrates source ingestion, session building, navigator creation. Throws `ReplayError` with correct codes. Exports `buildReplaySessions(source, options): readonly ReplaySession[]`.

### Phase 5 — Filter System [✅]

- [✅] Step 14: Implement `src/filter/filter.ts` — `applyFilter(session, filter): ReplayFilterResult`. All filter fields. Evaluation in cheapest-first order. Also exports `mergeFilters` and `withFilter`.
- [✅] Step 15: Implement `src/filter/filter-presets.ts` — `applyPreset(session, preset): ReplayFilterResult`. All 7 presets. `'score-degradation'` uses sequential frame comparison.

### Phase 6 — Bookmarks [✅]

- [✅] Step 16: Implement `src/bookmarks/bookmark-store.ts` — `createBookmarkStore(): ReplayBookmarkStore`. In-memory. `create` uses `generateId()` (re-implement inline: `crypto.randomUUID` with `Math.random` fallback). All methods per the `ReplayBookmarkStore` type.

### Phase 7 — Error Types & Public API [✅]

- [✅] Step 17: Implement `src/errors/replay-error.ts` — `ReplayError` class extending `Error` with `code: ReplayErrorCode` and optional `detail: string`. Export `createReplayError(code, detail?)`.
- [✅] Step 18: Write `src/index.ts` — export all public APIs: factory functions, source constructors, filter utilities, type re-exports. No implementation logic in index.

### Phase 8 — Tests [✅]

- [✅] Step 18.5: Write `tests/helpers.ts` — shared fixtures for all 9 test files: `makeRenderEvent(overrides?)`, `makePropChangeEvent(overrides?)`, `makeScoreEvent(overrides?)`, `makeFrequencyEvent(overrides?)`, `makeRecommendationEvent(overrides?)`, `makeSessionStartEvent(overrides?)`, `makeSessionEndEvent(overrides?)`, `makeSessionEvents(renderCount, options?)` (full event sequence), `makeEngine(renderCount, options?)` (convenience full engine). Must be created before any test file.
- [✅] Step 19: Write `tests/frame-builder.test.ts` — ≥ 20 tests covering all event types, partial frames, out-of-order events, duplicate events, derived field computation.
- [✅] Step 20: Write `tests/session-builder.test.ts` — ≥ 20 tests covering stats accuracy, timeline entries, segment detection, pruning behavior, frozen output.
- [✅] Step 21: Write `tests/navigation.test.ts` — ≥ 20 tests covering all navigate.* methods, edge cases, cursor field accuracy.
- [✅] Step 22: Write `tests/filter.test.ts` — ≥ 20 tests covering all filter fields, all presets, mergeFilters, withFilter, empty filter.
- [✅] Step 23: Write `tests/bookmarks.test.ts` — ≥ 10 tests covering CRUD, export/import, getForFrame, jumpToBookmark.
- [✅] Step 24: Write `tests/sources.test.ts` — ≥ 10 tests covering all three source types, multi-session, all ReplayError codes.
- [✅] Step 25: Write `tests/engine.test.ts` — ≥ 10 integration tests covering full build pipeline, getFrame, getFrameRange, buildReplaySessions.
- [✅] Step 26: Write `tests/performance.test.ts` — 5 tests: 10,000-event build < 100ms, 5,000-frame filter < 50ms, navigation O(1) verification.
- [✅] Step 27: Write `tests/error-handling.test.ts` — ≥ 10 tests verifying all error codes thrown correctly, navigate.* never throws.

### Phase 9 — Quality Gate & Demo [✅]

- [✅] Step 28: Run `pnpm run test` — ≥ 125 tests green.
- [✅] Step 29: Run `tsc --noEmit` — zero errors.
- [✅] Step 30: Run `pnpm run build` — ESM + CJS + DTS artifacts generated.
- [✅] Step 31: Create `demo/src/features/render-replay-engine/` — minimal inspector demo: builds an engine from a hardcoded session JSON, renders cursor frame data, supports next/previous/filter controls, shows session stats.
- [✅] Step 32: Add `demo/src/features/render-replay-engine/scenarios.ts` with pre-built scenario sessions (JSON fixtures representing interesting render histories).
- [✅] Step 33: Add `@sapanmozammel/render-replay-engine: workspace:*` to `demo/package.json`.
- [✅] Step 34: Add registry entry in `demo/src/lib/registry/index.ts` with `status: 'stable'`.
- [✅] Step 35: Update `CLAUDE.md` with `render-replay-engine` package structure.

---

## 31. Affected Files

- `demo/package.json` — add `@sapanmozammel/render-replay-engine: workspace:*`
- `demo/src/lib/registry/index.ts` — add 9th registry entry
- `CLAUDE.md` — add `render-replay-engine` package structure
- `pnpm-lock.yaml` — updated by `pnpm install`

---

## 32. New Files

```
packages/render-replay-engine/
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  README.md
  src/
    types/index.ts                    # all public types (no logic)
    errors/replay-error.ts            # ReplayError class + createReplayError
    builder/frame-builder.ts          # events → ReplayFrame[]
    builder/session-builder.ts        # frames → ReplaySession (+ multi-session)
    stats/session-stats.ts            # pure session stats computation
    timeline/timeline-builder.ts      # frames → ReplayTimeline + segments
    navigation/cursor.ts              # createCursor pure function
    navigation/navigator.ts           # createNavigator factory
    filter/filter.ts                  # applyFilter, mergeFilters, withFilter
    filter/filter-presets.ts          # applyPreset + FILTER_PRESETS
    bookmarks/bookmark-store.ts       # createBookmarkStore in-memory impl
    sources/from-events.ts            # fromEvents constructor
    sources/from-buffer.ts            # fromBuffer constructor
    sources/from-serialized.ts        # fromSerialized constructor
    engine/replay-engine.ts           # createReplayEngine + buildReplaySessions
    index.ts                          # public re-exports
  tests/
    frame-builder.test.ts
    session-builder.test.ts
    navigation.test.ts
    filter.test.ts
    bookmarks.test.ts
    sources.test.ts
    engine.test.ts
    performance.test.ts
    error-handling.test.ts
    helpers.ts                        # shared test fixtures (makeEvent, makeSession)

demo/src/features/render-replay-engine/
  index.tsx                           # RenderReplayEngineDemo
  scenarios.ts                        # pre-built session fixtures
```

---

## 33. Verification Checklist

- [ ] `pnpm run test` in `packages/render-replay-engine/` — ≥ 125 tests green
- [ ] `pnpm run test:coverage` — runs without error; ≥ 95% statement coverage
- [ ] `tsc --noEmit` in `packages/render-replay-engine/` — zero errors
- [ ] `tsc --noEmit` in `demo/` — zero errors (demo feature type-safe)
- [ ] `pnpm run build` — ESM + CJS + DTS artifacts generated, `sideEffects: false`
- [ ] `pnpm run lint` — zero errors
- [ ] `pnpm publish --dry-run` — tarball contains only `dist/` and `README.md`
- [ ] Zero `any` types in source or tests
- [ ] Zero `interface` keywords — `type` only throughout
- [ ] Zero arrow function violations — no `function foo() {}` declarations
- [ ] All kebab-case file names
- [ ] `navigate.*` methods never throw — all out-of-bounds return `null`
- [ ] `createReplayEngine` throws `ReplayError` (not generic `Error`) for all error cases
- [ ] All assembled sessions and frames are frozen (`Object.freeze`)
- [ ] `fromBuffer` takes a point-in-time snapshot — does not hold a live reference
- [ ] Multi-session source without `sessionId` → `MULTIPLE_SESSIONS` error with list of available IDs
- [ ] `buildReplaySessions` returns sessions sorted by `startedAt` ascending
- [ ] Performance test: 10,000-event build < 100ms on CI hardware
- [ ] Demo page renders without console errors; all 4 navigation controls work
- [ ] Registry entry in demo shows `status: 'stable'`
- [ ] `CLAUDE.md` updated with package structure
