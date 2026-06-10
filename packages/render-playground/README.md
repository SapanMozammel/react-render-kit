# @sapanmozammel/render-playground

Visual render observatory for React. Wrap any component with a real-time diagnostics panel showing health score, render timeline, prop changes, memo effectiveness, and actionable recommendations — dev-only, zero cost in production.

**[Live demo →](https://react-render-kit.vercel.app/render-playground)**

## Install

```bash
pnpm add @sapanmozammel/render-playground @sapanmozammel/render-insights
# or
npm i @sapanmozammel/render-playground @sapanmozammel/render-insights
```

Peer dependencies: `react >= 18`, `@sapanmozammel/render-insights >= 1.0.0`.

## Quick start

Wrap your app (or a subtree) with `PlaygroundProvider`, call `useRenderPlayground` inside the component you want to observe, then drop `RenderPlaygroundPanel` anywhere in the tree.

```tsx
import {
  PlaygroundProvider,
  RenderPlaygroundPanel,
  useRenderPlayground,
} from '@sapanmozammel/render-playground';

// 1. Add the provider once near the top of your tree
const App = () => (
  <PlaygroundProvider>
    <UserCard id={1} name="Alice" />
    <RenderPlaygroundPanel />
  </PlaygroundProvider>
);

// 2. Instrument the component you want to observe
const UserCard = (props: UserCardProps) => {
  useRenderPlayground('UserCard', props as Record<string, unknown>);
  return <div>{props.name}</div>;
};
```

The panel updates in real time as the component renders.

## API

### `<PlaygroundProvider>`

Provides the shared store to all descendants. Mount once near the root of the subtree you want to observe.

```tsx
<PlaygroundProvider
  maxEntries={50}   // max reports kept in memory (default: 50)
  store={myStore}   // inject a custom store — useful for testing
>
  {children}
</PlaygroundProvider>
```

### `useRenderPlayground(componentName, props, options?)`

Drop inside the component being observed. Dev-only — no-ops in production without any code removal needed.

```ts
useRenderPlayground(
  componentName: string,
  props: Record<string, unknown>,
  options?: RenderPlaygroundOptions,
): void
```

`options` is passed through to `@sapanmozammel/render-insights` — see that package for the full list. The `onReport` callback is reserved; use `useInsightCapture` if you need programmatic access.

### `<RenderPlaygroundPanel>`

Renders the diagnostics panel. Place it anywhere inside `<PlaygroundProvider>`.

```tsx
<RenderPlaygroundPanel
  maxVisible={50}       // max timeline pills shown (default: 50)
  onClear={() => {}}    // called after the user clears history
  className="my-panel"  // forwarded to the outer div
/>
```

Returns `null` in production (`NODE_ENV !== 'development'`).

### `useInsightCapture(options?)`

Headless alternative — captures reports without a `<PlaygroundProvider>`. Use this when you want programmatic access to the raw `InsightReport` stream (custom UI, test assertions, Storybook integrations).

```tsx
import { useInsightCapture } from '@sapanmozammel/render-playground';
import { useRenderInsights } from '@sapanmozammel/render-insights';

const MyObserver = (props: MyProps) => {
  const { onReport, reports, clearReports } = useInsightCapture({ maxEntries: 20 });
  useRenderInsights('MyObserver', props, { onReport });

  return <pre>{JSON.stringify(reports.at(-1), null, 2)}</pre>;
};
```

### `createPlaygroundStore(maxEntries?)`

Factory for a `PlaygroundStore` — the `useSyncExternalStore`-compatible object backing the panel. Use this to create an isolated store for testing or to share state across multiple panels.

```ts
import { createPlaygroundStore, PlaygroundProvider } from '@sapanmozammel/render-playground';

const store = createPlaygroundStore(100);

// In tests:
render(
  <PlaygroundProvider store={store}>
    <ComponentUnderTest />
  </PlaygroundProvider>
);
```

## Panel anatomy

```
┌─ [render-playground] <UserCard> ──────────────── [Clear] ─┐
│  ▓▓▓▓▓░░░ improving ↑ · avg 84 · R2 most unstable         │
├───────────────────────────────────────────────────────────┤
│  ██ ██ ██ ██ ██ ██  ← render timeline (color = grade)     │
├──────────────┬────────────────────────────────────────────┤
│  Score gauge │  Render #6 · PROPS_CHANGED                  │
│              │  Frequency  ████░  LOW                      │
│   84 / 100   │  Memo       PARTIALLY_EFFECTIVE             │
│  [Why 84?]   │  ┌ Props ──────────────────────────────┐   │
│              │  │ ~ name     "Alice" → "Bob"           │   │
│              │  │ ⚡ onClick  function reference        │   │
│              │  └─────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────┤
│  Recommendations                                           │
│  ▲ Stabilize onClick with useCallback                      │
│  + 1 more recommendation                                   │
├───────────────────────────────────────────────────────────┤
│  [render #6 of 6 — score:v1]                               │
└───────────────────────────────────────────────────────────┘
```

**Timeline pills** — one per render, colored by health grade (A → green, F → red). Click "Clear" to reset.

**Score gauge** — 0–100 health score. Tap "Why NN?" to expand penalty breakdown.

**Session strip** — appears after 3 renders; shows score trend, average, and the most unstable prop.

**Prop diff table** — `~` primitive change, `⚡` unstable reference, `+` added, `-` removed.

**Recommendations** — up to 3 shown inline; overflow count links to the full list.

## Health score

```
score = 100
      − frequency_penalty   (0–40)
      − instability_penalty (0–30)
      − memo_penalty        (0–20)
      − mixed_signal_penalty(0–10)
```

| Grade | Range |
|-------|-------|
| A     | 90–100 |
| B     | 75–89  |
| C     | 55–74  |
| D     | 35–54  |
| F     | 0–34   |

## Advanced: engine utilities

The scoring, breakdown, and session-analysis engines are exported for external tooling:

```ts
import {
  computeRecommendations,
  computeScoreBreakdown,
  computeSessionStats,
} from '@sapanmozammel/render-playground';
```

These are pure functions — no React dependency — making them safe to call in non-component contexts (Node.js scripts, test assertions, Storybook decorators).

## Production safety

Every public export guards on `process.env.NODE_ENV !== 'development'`:

- `useRenderPlayground` — returns immediately (hooks still called, no side effects)
- `<PlaygroundProvider>` — renders a plain `Fragment`, no context value set
- `<RenderPlaygroundPanel>` — returns `null`
- `useInsightCapture` — returns stable no-op functions and an empty array

Bundlers (Vite, webpack, Rollup, Next.js) statically evaluate the `NODE_ENV` guard and tree-shake all panel code from production bundles.

## TypeScript

All types are exported:

```ts
import type {
  InsightReport,
  PlaygroundStore,
  RenderPlaygroundOptions,
  CaptureOptions,
  Recommendation,
  ScoreBreakdown,
  SessionStats,
} from '@sapanmozammel/render-playground';
```

## License

MIT
