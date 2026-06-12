---
title: "useUnstablePropsDetector — react-render-kit"
description: "Hook that detects object, array, and function props that are re-created every render, defeating React.memo."
keywords: ["unstable props react", "react memo defeated", "useUnstablePropsDetector"]
canonical: "https://react-render-kit.vercel.app/docs/unstable-props-detector"
---

# useUnstablePropsDetector

`@sapanmozammel/unstable-props-detector` identifies props whose reference identity changes on every render while the value remains equivalent. These are the props that silently defeat `React.memo` — a function recreated inline, an array literal in JSX, an object built inside the component body.

## Install

```bash
npm install @sapanmozammel/unstable-props-detector
```

Peer dependency: `react >= 18`

## API

```ts
useUnstablePropsDetector(
  componentName: string,
  props: Record<string, unknown>,
  options?: UnstablePropsDetectorOptions
): PropInstability[]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `NODE_ENV === 'development'` | Disable without removing the call |
| `ignoreProps` | `string[]` | `[]` | Prop keys excluded from detection |
| `maxReports` | `number` | `10` | Maximum grouped console entries |
| `logOnEveryRender` | `boolean` | `false` | Log on every render, not only when instability is detected |

Returns `PropInstability[]` — the list of unstable props detected in the current render. Empty array when nothing is unstable.

## `PropInstability` shape

```ts
type PropInstability = {
  name: string;               // prop key
  type: 'function' | 'array' | 'object';
};
```

## Example

```tsx
import React from 'react';
import { useUnstablePropsDetector } from '@sapanmozammel/unstable-props-detector';

const List = React.memo(({ items, onSelect, style }: ListProps) => {
  useUnstablePropsDetector('List', { items, onSelect, style }, {
    ignoreProps: ['style'],  // exclude a prop you know changes intentionally
  });
  return <ul>{items.map(i => <li key={i.id}>{i.label}</li>)}</ul>;
});
```

Console output when `onSelect` is recreated on every parent render:

```
▶ [unstable-props-detector] <List> — 1 unstable prop

  onSelect  function  (reference changed every render)
```

## What "unstable" means

A prop is flagged as unstable when:
1. Its reference identity changed between the previous and current render (`prev !== current`)
2. It is a non-primitive type: `object`, `array`, or `function`

Primitive values (`string`, `number`, `boolean`, `null`, `undefined`) are always compared by value and are never flagged.

## Difference from `useWhyRender`

`useWhyRender` reports all prop changes — including expected value changes. `useUnstablePropsDetector` focuses exclusively on reference churn: props that change identity every render despite no real value difference. Use the detector when you are specifically debugging `React.memo` bypass issues.
