# @sapanmozammel/render-intelligence

Post-hoc analysis engine for React render telemetry. Given accumulated telemetry events, ranks performance bottlenecks, traces root causes, detects cross-component correlations, and generates 15 deterministic recommendations. Framework-agnostic — no React peer dependency.

**[Live demo →](https://react-render-kit.vercel.app/render-intelligence)**

## Install

```bash
npm install @sapanmozammel/render-intelligence @sapanmozammel/render-core-schema
```

Peer dependency: `@sapanmozammel/render-core-schema >= 1.0.0`

## Quick start

```ts
import { analyzeRenders } from '@sapanmozammel/render-intelligence';

const report = analyzeRenders({
  type: 'events',
  events: telemetryEvents,
});

console.log(report.applicationHealth.score);   // 0–100
console.log(report.bottlenecks[0].componentName);
console.log(report.recommendations[0]);
```

## Source types

```ts
// From a raw event array
analyzeRenders({ type: 'events', events: TelemetryEvent[] });

// From a buffer snapshot
analyzeRenders({ type: 'snapshot', snapshot: TelemetrySnapshot });

// From replay sessions
analyzeRenders({ type: 'replay', sessions: ReplaySession[] });
```

## `IntelligenceReport` shape

| Field | Type | Description |
|---|---|---|
| `applicationHealth` | `ApplicationHealth` | Overall score (0–100), grade, component counts by health tier |
| `components` | `ComponentAnalysis[]` | Per-component: renders, grade, memo classification, unstable prop names, score trend |
| `bottlenecks` | `Bottleneck[]` | Ranked by impact — category, component name, impact score, evidence |
| `correlations` | `CorrelationPair[]` | Pairs of components that co-render within `correlationWindowMs` |
| `rootCauses` | `RootCause[]` | Highest-confidence cause per component (4 detectors) |
| `recommendations` | `string[]` | Ranked, deduplicated across all components |

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `maxBottlenecks` | `number` | `10` | Maximum bottlenecks returned |
| `maxRecommendations` | `number` | `20` | Maximum recommendations returned |
| `confidenceThreshold` | `number` | `0.3` | Minimum root-cause confidence (0–1) |
| `correlationWindowMs` | `number` | `16` | Window for co-render detection |
| `includeWellOptimized` | `boolean` | `false` | Include healthy components in report |
| `plugins` | `AnalysisPlugin[]` | `[]` | Custom analysis plugins |

## Plugin API

```ts
import { createPlugin, analyzeRenders } from '@sapanmozammel/render-intelligence';

const myPlugin = createPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  analyze: (components, context) => ({
    bottlenecks: [],
    rootCauses: [],
    recommendations: ['Consider splitting large components'],
    correlations: [],
  }),
});

analyzeRenders(source, { plugins: [myPlugin] });
```

## Additional exports

```ts
analyzeComponents(source, options?)  // ComponentAnalysis[] only — no app-level aggregation
rankBottlenecks(components, options?) // Bottleneck[] sorted by impact
```

## Error handling

`analyzeRenders` throws `IntelligenceError` with `.code`:
- `EMPTY_SOURCE` — source contains no events
- `ANALYSIS_FAILED` — internal analysis error
