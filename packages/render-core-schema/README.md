# @sapanmozammel/render-core-schema

Canonical TypeScript type definitions and protocol contracts for the react-render-kit ecosystem. Zero runtime code — pure types and type guards used as the shared vocabulary across all 12 packages.

**[Live demo →](https://react-render-kit.vercel.app/render-core-schema)**

## Install

```bash
npm install @sapanmozammel/render-core-schema
```

No peer dependencies. No runtime dependencies.

## Type groups

| Group | Key types |
|---|---|
| Identity | `ComponentId`, `SessionId`, `ComponentMeta` |
| Lifecycle | `RenderPhase`, `RenderTrigger`, `InferredTrigger` |
| Props | `PropRefType`, `PropChangeKind`, `PropChangeEntry`, `PropInstability`, `PropDiffSnapshot` |
| Frequency | `FrequencyClass`, `FrequencyMeasurement` |
| Memo | `SignalKind`, `MemoClassification`, `RenderSignal`, `MemoSessionSummary` |
| Scoring | `HealthGrade`, `ScoreBreakdown` |
| Events | `TelemetryEvent`, `EventBase`, all 7 event variants |
| Session | `SessionStatus`, `RenderSession`, `TelemetrySnapshot` |
| Replay | `ReplayFrame`, `ReplaySession`, `ReplayCursor`, `ReplayNavigator`, `ReplayEngine`, `ReplayFilter`, `ReplayBookmark` |
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

isHealthGrade('EXCELLENT')     // true
isHealthGrade('unknown')       // false
isEventType('render')          // true
```

## Version utilities

```ts
import {
  compareSchemaVersions,
  isSchemaVersionAtLeast,
  CURRENT_SCHEMA_VERSION,
} from '@sapanmozammel/render-core-schema';

CURRENT_SCHEMA_VERSION         // '1.0.0'
isSchemaVersionAtLeast('1.0.0', '1.0.0')  // true
compareSchemaVersions('1.1.0', '1.0.0')   // 1  (positive = first is newer)
```

## Usage pattern

Import only types — they are erased at compile time and add zero bytes to your bundle:

```ts
import type { ReplaySession, HealthGrade, TelemetryEvent } from '@sapanmozammel/render-core-schema';
```

Import runtime values (guards, constants) when needed at the boundary:

```ts
import { isHealthGrade, CURRENT_SCHEMA_VERSION } from '@sapanmozammel/render-core-schema';
```

## Zero runtime note

This package has no logic beyond type guards and the `CURRENT_SCHEMA_VERSION` constant. It is intentionally the lowest-level package in the ecosystem — no React dependency, no side effects.
