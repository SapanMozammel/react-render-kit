---
title: "Intelligence Engine — react-render-kit"
description: "Static analysis of React render telemetry: bottlenecks, correlations, root cause analysis, and recommendations."
keywords: ["react render analysis", "bottleneck detection react", "render intelligence"]
canonical: "https://react-render-kit.vercel.app/docs/intelligence"
---

# Intelligence Engine

`@sapanmozammel/render-intelligence` performs post-hoc static analysis over accumulated render telemetry. Given events from any source, it ranks performance bottlenecks, detects cross-component correlations, identifies root causes, and generates up to 15 deterministic recommendations. Framework-agnostic — no React dependency.

## `analyzeRenders(source, options?)`

Main entry point. Accepts any source type and returns a complete `IntelligenceReport`.

```ts
import { analyzeRenders } from '@sapanmozammel/render-intelligence';

const report = analyzeRenders(
  { type: 'events', events: telemetryEvents },
  { maxBottlenecks: 5, confidenceThreshold: 0.5 }
);
```

## Source types

```ts
// Raw telemetry events
analyzeRenders({ type: 'events', events: TelemetryEvent[] });

// Buffer snapshot
analyzeRenders({ type: 'snapshot', snapshot: TelemetrySnapshot });

// Replay sessions
analyzeRenders({ type: 'replay', sessions: ReplaySession[] });
```

## `IntelligenceReport` shape

```ts
type IntelligenceReport = {
  applicationHealth: ApplicationHealth;
  components: ComponentAnalysis[];
  bottlenecks: Bottleneck[];
  correlations: CorrelationPair[];
  rootCauses: RootCause[];
  recommendations: string[];
};
```

### `applicationHealth`

```ts
report.applicationHealth.score          // 0–100
report.applicationHealth.grade          // HealthGrade
report.applicationHealth.componentCount
report.applicationHealth.healthyCount
report.applicationHealth.degradedCount
report.applicationHealth.criticalCount
```

### `components`

Per-component analysis:

```ts
report.components[0].componentName
report.components[0].sessionCount
report.components[0].totalRenders
report.components[0].grade
report.components[0].memoClassification
report.components[0].unstablePropNames   // string[]
report.components[0].scoreTrend          // 'improving' | 'degrading' | 'stable'
report.components[0].recommendations     // string[]
```

### `bottlenecks`

Ranked by impact score (highest first):

```ts
report.bottlenecks[0].componentName
report.bottlenecks[0].category           // 'frequency' | 'instability' | 'memo' | 'cascade'
report.bottlenecks[0].impact             // 0–1
report.bottlenecks[0].evidence           // string[]
```

### `correlations`

Pairs of components that co-render within `correlationWindowMs`:

```ts
report.correlations[0].componentA
report.correlations[0].componentB
report.correlations[0].coRenderCount
report.correlations[0].windowMs
```

### `rootCauses`

Highest-confidence root cause per component (4 detectors: prop-instability, memo-defeat, frequency, cascade):

```ts
report.rootCauses[0].componentName
report.rootCauses[0].detector           // 'prop-instability' | 'memo-defeat' | 'frequency' | 'cascade'
report.rootCauses[0].confidence         // 0–1
report.rootCauses[0].description
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `maxBottlenecks` | `number` | `10` | Maximum bottlenecks in the report |
| `maxRecommendations` | `number` | `20` | Maximum recommendations returned |
| `confidenceThreshold` | `number` | `0.3` | Minimum root-cause confidence (0–1) |
| `correlationWindowMs` | `number` | `16` | Window for co-render detection |
| `includeWellOptimized` | `boolean` | `false` | Include healthy components in `components[]` |
| `plugins` | `AnalysisPlugin[]` | `[]` | Custom analysis plugins |

## Plugin API

```ts
import { createPlugin } from '@sapanmozammel/render-intelligence';

const plugin = createPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  analyze: (components, context) => ({
    bottlenecks: [],
    rootCauses: [],
    recommendations: ['Consider splitting components > 500 renders'],
    correlations: [],
  }),
});

analyzeRenders(source, { plugins: [plugin] });
```

## Additional exports

```ts
analyzeComponents(source, options?)   // ComponentAnalysis[] only — no app-level aggregation
rankBottlenecks(components, options?) // Bottleneck[] sorted by impact
```

## Error handling

`analyzeRenders` throws `IntelligenceError` with `.code`:

| Code | Condition |
|---|---|
| `EMPTY_SOURCE` | Source contains no events |
| `ANALYSIS_FAILED` | Internal analysis error |
