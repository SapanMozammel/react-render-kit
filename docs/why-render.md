---
title: "useWhyRender — react-render-kit"
description: "Development hook that logs why a React component re-rendered by diffing previous vs current props."
keywords: ["useWhyRender", "why did react component re-render", "react prop diff hook"]
canonical: "https://react-render-kit.vercel.app/docs/why-render"
---

# useWhyRender

`@sapanmozammel/why-render` is the most direct tool for answering "why did this re-render?" It diffs props between renders and logs exactly what changed — grouped by change type — to the browser console.

## Install

```bash
npm install @sapanmozammel/why-render
```

Peer dependency: `react >= 18`

## API

```ts
useWhyRender(
  componentName: string,
  props: Record<string, unknown>,
  options?: { enabled?: boolean }
): void
```

| Parameter | Description |
|---|---|
| `componentName` | Free-form label shown in the console header |
| `props` | Current props snapshot — pass the whole props object or a subset |
| `options.enabled` | Defaults to `NODE_ENV === 'development'`. Pass `false` to silence without removing the call |

## Example

```tsx
import { useWhyRender } from '@sapanmozammel/why-render';

const UserCard = ({ user, onEdit, loading }: UserCardProps) => {
  useWhyRender('UserCard', { user, onEdit, loading });
  return <div>{user.name}</div>;
};
```

Console output on a re-render where `user.name` changed and `onEdit` was recreated:

```
▶ [why-render] <UserCard>

  Primitive Changes
  -----------------
    name    "Alice" → "Bob"

  Reference Changes
  -----------------
    onEdit  function reference changed
```

The group is collapsed by default in DevTools. Nothing is logged when props are identical.

## Prop change kinds

| Kind | Trigger | What to look for |
|---|---|---|
| Primitive change | A string, number, boolean, or `null`/`undefined` value changed | Expected re-render — data was updated |
| Reference change | An object, array, or function has a new identity but may be value-equal | Common source of unnecessary re-renders; add `useMemo`/`useCallback` |
| Added | A prop key appeared that didn't exist before | Component interface change or conditional prop |
| Removed | A prop key that existed is now absent | Same as above |

## Passing a subset of props

You can narrow the observation to specific props:

```tsx
useWhyRender('UserCard', {
  userId: props.user.id,
  role: props.role,
});
```

## When to use vs `render-insights`

Use `useWhyRender` when you want a quick one-liner to see what changed. Use `useRenderInsights` when you also want frequency tracking, memo classification, a health score, and actionable recommendations — `render-insights` includes `useWhyRender` internally.
