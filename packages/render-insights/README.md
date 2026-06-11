# @sapanmozammel/render-insights

Unified React render diagnostic hook. Correlates prop changes, render frequency, memo effectiveness, and a health score into a single structured console report — dev-only, zero cost in production.

**[Live demo →](https://react-render-kit.vercel.app/render-insights)**

## Install

```bash
pnpm add @sapanmozammel/render-insights
# or
npm i @sapanmozammel/render-insights
```

Peer dependency: `react >= 18`.

## Usage

```tsx
import { useRenderInsights } from '@sapanmozammel/render-insights';

const UserCard = (props: UserCardProps) => {
  useRenderInsights('UserCard', props as Record<string, unknown>);
  return <div>{props.name}</div>;
};
```

When props change you'll see a grouped report in the DevTools console:

```
▶ [render-insights] <UserCard>

  Render Health
  -------------
    Render #    3
    Score       72 / 100
    Grade       Good
    Inferred Trigger  reference-instability

  Changed Props
  -------------
    onClick     function   new reference

  Unstable Props
  --------------
    onClick     function   new reference

  Render Frequency
  ----------------
    Total Renders   3
    Window (10s)    3 renders
    Rate            0.3 renders/sec
    Class           LOW

  Memo Effectiveness
  ------------------
    Classification  INEFFECTIVE
    This Render     reference-only
    Window          genuine: 0  reference-only: 2  mixed: 0

  Recommendation
  --------------
    Reference-only prop changes are defeating memoization. Stabilize "onClick" — wrap "onClick" with useCallback.

  [report 1 / 10 — score:v1]
```

The group is collapsed by default — click to expand.

## API

```ts
useRenderInsights(
  componentName: string,
  props: Record<string, unknown>,
  options?: RenderInsightsOptions,
): void
```

### Options

| Option              | Type                              | Default | Description                                         |
| ------------------- | --------------------------------- | ------- | --------------------------------------------------- |
| `enabled`           | `boolean`                         | `true`  | Disable without removing the call                   |
| `ignoreProps`       | `string[]`                        | `[]`    | Prop keys excluded from all analysis                |
| `maxReports`        | `number`                          | `10`    | Max grouped reports logged per instance             |
| `logOnEveryRender`  | `boolean`                         | `false` | Log a one-liner on renders with no prop changes     |
| `frequencyWindowMs` | `number`                          | `10000` | Sliding window for rate calculation (ms)            |
| `frequencyLogEvery` | `number`                          | `0`     | Log a frequency one-liner every N renders (0 = off) |
| `onReport`          | `(report: InsightReport) => void` | —       | Callback fired with each structured report          |

### `componentName`

Free-form label used in the console header and in the `InsightReport`. Typically the component's display name.

### `props`

Flat snapshot of the component's current props. You can pass `props` directly or a subset:

```tsx
useRenderInsights('UserCard', { name: props.name, onClick: props.onClick });
```

### `options.enabled`

When `false`, the hook is a no-op regardless of environment. Re-enabling shows all changes that accumulated while disabled.

### `options.onReport`

Fires once per grouped report (not on every render). Use this to pipe structured data into a custom UI or logging system:

```tsx
useRenderInsights('UserCard', props, {
  onReport: (report) => {
    console.table(report.props.changed);
  },
});
```

`render-playground` uses `onReport` to feed its visual panel.

## Report shape

```ts
type InsightReport = {
  componentName: string;
  renderNumber: number; // total renders since mount
  reportNumber: number; // reports logged so far (capped at maxReports)
  props: PropChangeSummary;
  frequency: FrequencySummary;
  memo: MemoSummary;
  score: number; // 0–100
  grade: HealthGrade;
  inferredTrigger: InferredTrigger;
  recommendations: string[];
};
```

## Health score

```
score = 100
      − frequency_penalty   (HIGH=25, MODERATE=10, else 0)
      − instability_penalty  (unstable props × 8, max 30)
      − memo_penalty         (INEFFECTIVE=30, PARTIALLY_EFFECTIVE=15, else 0)
      − mixed_signal_penalty (mixed renders × 3, max 15)
```

| Grade       | Score  |
| ----------- | ------ |
| `EXCELLENT` | 90–100 |
| `GOOD`      | 70–89  |
| `MODERATE`  | 50–69  |
| `POOR`      | 30–49  |
| `CRITICAL`  | 0–29   |

## Inferred trigger

| Value                   | Meaning                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `no-prop-change`        | All props equal by `Object.is` — parent re-render or context              |
| `genuine-prop-change`   | At least one value-type prop changed                                      |
| `reference-instability` | Only reference-type props changed (new object/function/array each render) |
| `mixed`                 | Both genuine value changes and reference instability in the same render   |

## Memo effectiveness

Tracks whether `React.memo` (if applied) would skip these re-renders:

| Classification        | Meaning                                                                      |
| --------------------- | ---------------------------------------------------------------------------- |
| `NOT_APPLICABLE`      | No re-renders observed yet                                                   |
| `EFFECTIVE`           | All re-renders were data-driven; memo would not help further                 |
| `INEFFECTIVE`         | All re-renders are reference-only; memo would skip them if props were stable |
| `PARTIALLY_EFFECTIVE` | Mix of genuine changes and reference instability                             |

## Frequency classes

Measured over a sliding `frequencyWindowMs` window (default 10 s):

| Class             | Threshold                          |
| ----------------- | ---------------------------------- |
| `NOT_ENOUGH_DATA` | Fewer than 3 renders in the window |
| `LOW`             | < 1 render/sec                     |
| `MODERATE`        | 1–5 renders/sec                    |
| `HIGH`            | > 5 renders/sec                    |

## Production safety

The hook checks `process.env.NODE_ENV !== 'development'` inline. In production:

- Returns immediately after the 5 unconditional `useRef` calls required by Rules of Hooks
- No props are diffed, no console methods called, no timestamps recorded
- Bundlers (Vite, webpack, Rollup, Next.js) statically evaluate the guard and dead-code-eliminate all downstream logic

**Silent in `NODE_ENV=test` by design** — diagnostics do not appear in automated test output.

## React Strict Mode

Strict Mode safe. React's double-invocation advances `prevPropsRef` on the first call; the second call diffs against itself and produces no output.

## Relation to other packages

`@sapanmozammel/render-insights` is the data layer. Other packages in the kit build on top of it:

- [`@sapanmozammel/render-playground`](https://www.npmjs.com/package/@sapanmozammel/render-playground) — visual panel with score gauge, timeline, and recommendations UI; uses `onReport` to receive `InsightReport` objects

## TypeScript

All types are exported:

```ts
import type { InsightReport, RenderInsightsOptions, FrequencyClass, HealthGrade, InferredTrigger } from '@sapanmozammel/render-insights';
```

## License

MIT
