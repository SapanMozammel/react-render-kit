---
title: "Render Playground — react-render-kit"
description: "In-app render observability panel with score gauge, timeline, prop diffs, and recommendations."
keywords: ["react render playground", "render score gauge", "react devtools panel"]
canonical: "https://react-render-kit.vercel.app/docs/playground"
---

# Render Playground

`@sapanmozammel/render-playground` is a visual in-app render observatory. It renders a self-contained panel next to your component showing the current health score, prop diff table, render timeline, memo classification, frequency, and structured recommendations — all updated in real time as your component re-renders.

## Install

```bash
npm install @sapanmozammel/render-playground @sapanmozammel/render-insights
```

Peer dependencies: `react >= 18`, `@sapanmozammel/render-insights`

## Provider setup

```tsx
import { PlaygroundProvider } from '@sapanmozammel/render-playground';

const App = () => (
  <PlaygroundProvider>
    <MyApp />
  </PlaygroundProvider>
);
```

## `useRenderPlayground(componentName, props)`

Instruments a component and pushes `InsightReport` entries to the shared store. Returns the latest `InsightReport | null`.

```tsx
import { useRenderPlayground, RenderPlaygroundPanel } from '@sapanmozammel/render-playground';

const UserCard = (props: UserCardProps) => {
  const report = useRenderPlayground('UserCard', props);

  return (
    <div>
      <div>{props.user.name}</div>
      <RenderPlaygroundPanel />
    </div>
  );
};
```

`RenderPlaygroundPanel` renders all sub-components: score gauge (SVG arc), prop diff table, render timeline (horizontal pills), memo classification badge, frequency meter, and the top-3 recommendations with a "+N more" toggle.

## `useInsightCapture(componentName, props)`

Headless variant — no `PlaygroundProvider` required. Returns `InsightReport | null`.

```tsx
import { useInsightCapture } from '@sapanmozammel/render-playground';

const MyComponent = (props: Props) => {
  const report = useInsightCapture('MyComponent', props);
  // Use report.score, report.grade, etc. in your own UI
  return <div />;
};
```

## Store access

```ts
import { usePlaygroundStore, createPlaygroundStore } from '@sapanmozammel/render-playground';

// In a component (requires PlaygroundProvider):
const store = usePlaygroundStore();
store.getReports()          // InsightReport[] (FIFO, latest last)
store.getLatest()           // InsightReport | undefined
store.subscribe(listener)   // returns unsubscribe fn

// Create a standalone store (for testing or custom providers):
const store = createPlaygroundStore();
```

## Computation utilities

```ts
import {
  computeRecommendations,
  computeScoreBreakdown,
  computeSessionStats,
} from '@sapanmozammel/render-playground';

computeRecommendations(report)       // Recommendation[] — 10 deterministic rules
computeScoreBreakdown(report)        // ScoreBreakdown — score decomposition
computeSessionStats(reports)         // SessionStats — window-based trend analysis
```

## When to use

- **Dev overlays**: drop `RenderPlaygroundPanel` next to any component during development for instant observability
- **CI snapshots**: use `useInsightCapture` to collect reports and assert on score thresholds in tests
- **Regression detection**: compare `report.score` across renders to catch degradation
</content>
