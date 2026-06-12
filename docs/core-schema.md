---
title: "Core Schema — react-render-kit"
description: "Canonical TypeScript type definitions and protocol contracts for the react-render-kit ecosystem."
keywords: ["react render types", "telemetry schema typescript", "render observability types"]
canonical: "https://react-render-kit.vercel.app/docs/core-schema"
---

# Core Schema

`@sapanmozammel/render-core-schema` is the type foundation for the react-render-kit ecosystem. It defines every shared type, type guard, and the current schema version. Zero runtime code beyond guards and constants — no React dependency, no side effects.

## Install

```bash
npm install @sapanmozammel/render-core-schema
```

## Type groups

| Group | Key types |
|---|---|
| Identity | `ComponentId`, `SessionId`, `ComponentMeta` |
| Lifecycle | `RenderPhase`, `RenderTrigger`, `InferredTrigger` |
| Props | `PropRefType`, `PropChangeKind`, `PropChangeEntry`, `PropInstability`, `PropDiffSnapshot` |
| Frequency | `FrequencyClass`, `FrequencyMeasurement` |
| Memo | `SignalKind`, `MemoClassification`, `RenderSignal`, `MemoSessionSummary` |
| Scoring | `HealthGrade`, `ScoreBreakdown` |
| Events | `TelemetryEvent`, `EventBase`, `SessionStartEvent`, `RenderEvent`, `PropChangeEvent`, `FrequencyEvent`, `ScoreEvent`, `RecommendationEvent`, `SessionEndEvent` |
| Session | `SessionStatus`, `RenderSession`, `TelemetrySnapshot` |
| Replay | `ReplayFrame`, `ReplaySession`, `ReplaySessionStats`, `ReplayTimeline`, `ReplayCursor`, `ReplayNavigator`, `ReplayEngine`, `ReplayFilter`, `ReplayFilterResult`, `ReplayBookmark` |
| Transport | `TransportEmitFn`, `TelemetryTransport` |

## Type guards

```ts
import {
  isSchemaVersion,
  isEventType,
  isHealthGrade,
  isFrequencyClass,
  isMemoClassification,
  isSignalKind,
  isRenderTrigger,
  isInferredTrigger,
} from '@sapanmozammel/render-core-schema';

isHealthGrade('EXCELLENT')        // true
isHealthGrade('UNKNOWN')          // false
isEventType('render')             // true
isFrequencyClass('HIGH')          // true
isMemoClassification('EFFECTIVE') // true
```

## Version utilities

```ts
import {
  compareSchemaVersions,
  isSchemaVersionAtLeast,
  CURRENT_SCHEMA_VERSION,
} from '@sapanmozammel/render-core-schema';

CURRENT_SCHEMA_VERSION                           // '1.0.0'
isSchemaVersionAtLeast('1.0.0', '1.0.0')        // true
isSchemaVersionAtLeast('0.9.0', '1.0.0')        // false
compareSchemaVersions('1.1.0', '1.0.0')         // 1   (positive = first is newer)
compareSchemaVersions('1.0.0', '1.0.0')         // 0
compareSchemaVersions('0.9.0', '1.0.0')         // -1  (negative = first is older)
```

## Usage pattern

Import only types — erased at compile time, zero bundle cost:

```ts
import type {
  ReplaySession,
  HealthGrade,
  TelemetryEvent,
  MemoClassification,
} from '@sapanmozammel/render-core-schema';
```

Import runtime values only when needed at system boundaries (transport validation, deserialization):

```ts
import {
  isHealthGrade,
  isEventType,
  CURRENT_SCHEMA_VERSION,
} from '@sapanmozammel/render-core-schema';

const validateEvent = (raw: unknown): raw is TelemetryEvent => {
  if (typeof raw !== 'object' || raw === null) return false;
  return isEventType((raw as { type: unknown }).type);
};
```

## `HealthGrade` values

`'EXCELLENT'` (90–100) · `'GOOD'` (75–89) · `'MODERATE'` (50–74) · `'POOR'` (25–49) · `'CRITICAL'` (0–24)

## `FrequencyClass` values

`'LOW'` · `'MODERATE'` · `'HIGH'`

## `MemoClassification` values

`'EFFECTIVE'` · `'INEFFECTIVE'` · `'PARTIALLY_EFFECTIVE'` · `'NOT_APPLICABLE'`

## `EventType` values

`'session-start'` · `'render'` · `'prop-change'` · `'frequency'` · `'score'` · `'recommendation'` · `'session-end'`
