# @sapanmozammel/memo-effect-analyzer

Development-only React hook that classifies the effectiveness of `React.memo` by analyzing prop change history.

## Install

```sh
npm install @sapanmozammel/memo-effect-analyzer
```

## Usage

```ts
import { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';

const UserCard = React.memo((props: UserCardProps) => {
  useMemoEffectAnalyzer('UserCard', props as Record<string, unknown>);
  // ...
});
```

## Options

| Option             | Type       | Default | Description                                      |
| ------------------ | ---------- | ------- | ------------------------------------------------ |
| `enabled`          | `boolean`  | `true`  | Disable the hook without removing it             |
| `ignoreProps`      | `string[]` | `[]`    | Prop keys excluded from analysis                 |
| `maxReports`       | `number`   | `10`    | Maximum grouped console entries per instance     |
| `logOnEveryRender` | `boolean`  | `false` | Emit a single `console.log` on stable re-renders |

## Session classifications (`MemoClassification`)

| Classification        | Meaning                                                                         |
| --------------------- | ------------------------------------------------------------------------------- |
| `EFFECTIVE`           | All observed re-renders were data-driven; props are compatible with memoization |
| `INEFFECTIVE`         | Under current prop stability, `React.memo` would not skip these re-renders      |
| `PARTIALLY_EFFECTIVE` | Mix of genuine data changes and reference instability                           |
| `NOT_APPLICABLE`      | No re-renders observed yet                                                      |

## Per-render signal (`SignalKind`)

Each render produces a `RenderSignal` describing what changed:

| `SignalKind`     | Meaning                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `genuine`        | Props changed by value — `React.memo` correctly triggered a re-render                    |
| `reference-only` | Only reference identity changed, values are equivalent — memo was bypassed unnecessarily |
| `mixed`          | Some props changed by value, others only by reference                                    |

`RenderSignal` shape:

```ts
type RenderSignal = {
  kind: SignalKind; // 'genuine' | 'reference-only' | 'mixed'
  genuineKeys: string[]; // prop names with real value changes
  unstableProps: PropInstability[]; // props with reference-only churn
};
```

## Extended example

```tsx
import React from 'react';
import { useMemoEffectAnalyzer } from '@sapanmozammel/memo-effect-analyzer';

const ProductCard = React.memo((props: ProductCardProps) => {
  useMemoEffectAnalyzer('ProductCard', props as Record<string, unknown>, {
    ignoreProps: ['style'], // exclude stable layout props
    maxReports: 20,
  });
  return <div>{props.name}</div>;
});
```

Console output after 10 renders:

```
▶ [memo-effect-analyzer] <ProductCard> — PARTIALLY_EFFECTIVE (10 renders)

  Genuine changes (6):  name, price
  Reference-only (4):   onAddToCart, tags
```

## Zero production cost

The hook is a no-op when `NODE_ENV !== 'development'`.
