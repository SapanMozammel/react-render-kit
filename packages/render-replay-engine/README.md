# @sapanmozammel/render-replay-engine

Time-travel debugging engine for React Render Kit. Transforms raw telemetry events into a navigable, queryable render history — no browser extension, no backend, no React runtime access required.

## Installation

```bash
pnpm add @sapanmozammel/render-replay-engine @sapanmozammel/render-telemetry-core
```

## Quick Start

```ts
import { createReplayEngine, fromBuffer, fromEvents, fromSerialized } from '@sapanmozammel/render-replay-engine';

// From a live TelemetryBuffer
const engine = createReplayEngine(fromBuffer(buffer));

// From a raw events array
const engine = createReplayEngine(fromEvents(events));

// From serialized JSON (offline / CI)
const engine = createReplayEngine(fromSerialized(jsonString));
```

## Navigation

```ts
// Cursor is a plain immutable object — safe to store in React state
let cursor = engine.navigate.atStart();

cursor = engine.navigate.next(cursor) ?? cursor;
cursor = engine.navigate.previous(cursor) ?? cursor;
cursor = engine.navigate.jumpToRender(cursor, 42) ?? cursor;
cursor = engine.navigate.jumpToTimestamp(cursor, 5000); // always returns cursor

// Access full frame data
console.log(cursor.frame.score, cursor.frame.grade, cursor.frame.changedPropCount);
```

## Filtering

```ts
import { applyFilter, applyPreset, mergeFilters } from '@sapanmozammel/render-replay-engine';

// Built-in presets
const issues = applyPreset(engine.session, 'issues-only');
const degrading = applyPreset(engine.session, 'score-degradation');

// Custom filter
const result = applyFilter(engine.session, { minScore: 0, maxScore: 69, hasUnstablePropsOnly: true });

// Navigate to next matching frame
const next = engine.navigate.nextMatching(cursor, { maxScore: 50 });
```

## Session Stats

```ts
const { averageScore, scoreDelta, ineffectiveRenderCount, unstablePropNames } = engine.session.stats;
```

## Bookmarks

```ts
const bm = engine.bookmarks.create({ sessionId: engine.session.id, frameIndex: 10, label: 'Score drop' });
const cursor = engine.navigate.jumpToBookmark(bm.id) ?? cursor;

const exported = engine.bookmarks.exportBookmarks();
engine.bookmarks.importBookmarks(exported);
```

## Multiple Sessions

```ts
import { buildReplaySessions } from '@sapanmozammel/render-replay-engine';

const sessions = buildReplaySessions(fromBuffer(buffer)); // sorted by startedAt ascending
const engine = createReplayEngine(fromBuffer(buffer), sessions[0].id);
```

## Error Handling

```ts
import { ReplayError } from '@sapanmozammel/render-replay-engine';

try {
  const engine = createReplayEngine(fromEvents([]));
} catch (err) {
  if (err instanceof ReplayError) {
    console.log(err.code); // 'EMPTY_SOURCE' | 'MULTIPLE_SESSIONS' | ...
  }
}
```
