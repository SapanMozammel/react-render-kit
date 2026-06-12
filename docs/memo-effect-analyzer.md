---
title: "useMemoEffectAnalyzer — react-render-kit"
description: "Hook that classifies React.memo effectiveness by analyzing prop change patterns over time."
keywords: ["react memo effectiveness", "useMemoEffectAnalyzer", "react memo analyzer"]
canonical: "https://react-render-kit.vercel.app/docs/memo-effect-analyzer"
---

# useMemoEffectAnalyzer

`@sapanmozammel/memo-effect-analyzer` classifies the effectiveness of `React.memo` over a render session. Rather than reporting individual prop changes, it accumulates signals across renders and produces a verdict: is memo actually helping this component?

## Install

```bash
npm install @sapanmozammel/memo-effect-analyzer
```

Peer dependency: `react >= 18`

## API

```ts
useMemoEffectAnalyzer(
  componentName: string,
  props: Record<string, unknown>,
  options?: MemoEffectAnalyzerOptions
): MemoAnalysisResult
```

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `NODE_ENV === 'development'` | Disable without removing the call |
| `ignoreProps` | `string[]` | `[]` | Prop keys excluded from analysis |
| `maxReports` | `number` | `10` | Maximum grouped console entries |
| `logOnEveryRender` | `boolean` | `false` | Log on every render |

## `MemoClassification` values

| Value | Meaning |
|---|---|
| `NOT_APPLICABLE` | Insufficient data (first render, or no re-renders observed) |
| `EFFECTIVE` | All re-renders were caused by genuine value changes — `React.memo` is working |
| `INEFFECTIVE` | All re-renders were caused by reference instability — `React.memo` is bypassed every time |
| `PARTIALLY_EFFECTIVE` | Mix of genuine and reference-only re-renders |

## `SignalKind` values

Each individual render produces a `RenderSignal`:

| `SignalKind` | Meaning |
|---|---|
| `genuine` | Props changed by value — a re-render was warranted |
| `reference-only` | Only reference identity changed — memo was bypassed unnecessarily |
| `mixed` | Some props changed by value, others only by reference |

## `RenderSignal` shape

```ts
type RenderSignal = {
  kind: SignalKind;
  genuineKeys: string[];          // props with real value changes
  unstableProps: PropInstability[]; // props with reference-only churn
};
```

## Example

```tsx
import React from 'react';
import { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';

const ProductCard = React.memo((props: ProductCardProps) => {
  useMemoEffectAnalyzer('ProductCard', props as Record<string, unknown>);
  return <div>{props.name}</div>;
});
```

Console output after 10 renders:

```
▶ [memo-effect-analyzer] <ProductCard> — PARTIALLY_EFFECTIVE (10 renders)

  Genuine changes (6):     name, price
  Reference-only (4):      onAddToCart, tags
```

## When to use

Use `useMemoEffectAnalyzer` when:
- A component is wrapped in `React.memo` and you want to verify it's actually helping
- You've added `useCallback`/`useMemo` and want to confirm reference stability improved
- `useWhyRender` shows reference changes but you want a session-level verdict

For a combined score, frequency, and memo verdict in one hook, use `useRenderInsights` instead.
