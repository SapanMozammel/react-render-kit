---
title: "Replay Engine — react-render-kit"
description: "Time-travel debugging for React renders. Build navigable replay sessions from telemetry events."
keywords: ["react render replay", "time travel debugging react", "render history navigation"]
canonical: "https://react-render-kit.vercel.app/docs/replay-engine"
---

# Replay Engine

`@sapanmozammel/render-replay-engine` is a pure TypeScript engine for navigating recorded render sessions frame by frame. It groups telemetry events into `ReplaySession[]`, supports immutable cursor navigation, 7 built-in filter presets, and an in-memory bookmark store. No React dependency.

## Source adapters

```ts
import { fromEvents, fromBuffer, fromSerialized } from '@sapanmozammel/render-replay-engine';

// From a raw event array
const source = fromEvents(events);

// From a live TelemetryBuffer (lazy snapshot)
const source = fromBuffer(buffer);

// From serialized JSON (offline / CI use)
const source = fromSerialized(json);
```

## `buildReplaySessions(source, options?)`

```ts
import { buildReplaySessions } from '@sapanmozammel/render-replay-engine';

const sessions = buildReplaySessions(source, {
  maxFrames: 100,
  pruningStrategy: 'fifo',
});
// sessions: ReplaySession[]
```

## `createReplayEngine(source, sessionId?, options?)`

```ts
import { createReplayEngine } from '@sapanmozammel/render-replay-engine';

const engine = createReplayEngine(source);
// engine.session   — current ReplaySession
// engine.cursor    — ReplayCursor
// engine.navigator — ReplayNavigator
```

### `ReplayCursor`

```ts
engine.cursor.frameIndex   // number — current position
engine.cursor.atStart      // boolean
engine.cursor.atEnd        // boolean
```

### `ReplayNavigator`

```ts
engine.navigator.next()                  // advance one frame
engine.navigator.prev()                  // go back one frame
engine.navigator.first()                 // jump to frame 0
engine.navigator.last()                  // jump to last frame
engine.navigator.jumpTo(index)           // jump to specific frame index
engine.navigator.jumpToTimestamp(ms)     // binary search to nearest frame
```

## Filtering

```ts
import {
  applyFilter,
  mergeFilters,
  withFilter,
  applyPreset,
} from '@sapanmozammel/render-replay-engine';

// Apply a filter to a session
const result = applyFilter(session, { minScore: 0, maxScore: 50 });
// result.frames — filtered frames
// result.matchCount

// Combine multiple filters (AND semantics)
const combined = mergeFilters(filterA, filterB);

// Create a new engine scoped to the filtered frames
const filtered = withFilter(engine, { hasUnstableProps: true });
```

### Filter presets

```ts
import { applyPreset } from '@sapanmozammel/render-replay-engine';
import type { ReplayFilterPreset } from '@sapanmozammel/render-replay-engine';

applyPreset(session, 'issues-only')         // frames with score < 75 OR unstable props (OR semantics)
applyPreset(session, 'score-degradation')   // frames where score dropped vs previous
applyPreset(session, 'high-frequency')      // frames with FrequencyClass === 'HIGH'
applyPreset(session, 'unstable-props')      // frames with hasUnstableProps === true
applyPreset(session, 'ineffective-memo')    // frames with MemoClassification === 'INEFFECTIVE'
applyPreset(session, 'no-change-renders')   // frames with no prop changes
applyPreset(session, 'score-threshold')     // frames with score < 70
```

## Bookmarks

```ts
import { createBookmarkStore } from '@sapanmozammel/render-replay-engine';

const store = createBookmarkStore();

const id = store.add({
  sessionId: session.sessionId,
  frameIndex: 5,
  label: 'High frequency spike',
  note: 'onClick handler recreated every render',
});

store.get(id)                    // ReplayBookmark | undefined
store.update(id, { label: 'Updated label' })
store.remove(id)
store.list()                     // ReplayBookmark[]

const json = store.exportBookmarks()    // JSON string
store.importBookmarks(json)             // restore from export
```

## `ReplaySession` shape

```ts
type ReplaySession = {
  sessionId: string;
  componentName: string;
  frames: ReplayFrame[];
  frameCount: number;
  startedAt: number;
  stats: ReplaySessionStats;
  timeline: ReplayTimeline;
};
```

## `ReplayFrame` shape

```ts
type ReplayFrame = {
  frameIndex: number;
  wallTimestamp: number;
  relativeMs: number;         // ms since session start
  renderEvent: RenderEvent;
  propChangeEvent?: PropChangeEvent;
  scoreEvent?: ScoreEvent;
  grade?: HealthGrade;
  memoClassification?: MemoClassification;
  hasUnstableProps: boolean;
};
```

## Error handling

`createReplayEngine` and `buildReplaySessions` throw `ReplayError` with `.code`:

| Code | Condition |
|---|---|
| `EMPTY_SOURCE` | Source contains no events |
| `MULTIPLE_SESSIONS` | Source contains events from multiple sessions and no `sessionId` filter was specified |
| `FRAME_NOT_FOUND` | `jumpTo()` given an index out of range |
| `INVALID_SOURCE` | Malformed serialized JSON |
