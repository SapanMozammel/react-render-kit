# @sapanmozammel/why-render-frequency

A tiny React + TypeScript hook that tells you **how often** a component re-renders. Dev-only, zero runtime cost in production builds.

**[Live demo →](https://react-render-kit.vercel.app/why-render-frequency)**

## Install

```bash
pnpm add @sapanmozammel/why-render-frequency
# or
npm i @sapanmozammel/why-render-frequency
```

Peer dependency: `react >= 18`.

## Usage

```tsx
import { useRenderFrequency } from '@sapanmozammel/why-render-frequency';

const UserCard = (props: UserCardProps) => {
  useRenderFrequency('UserCard');
  return <div>{props.user.name}</div>;
};
```

Open the browser console and you'll see a grouped entry every 10 renders (by default):

```
▼ [why-render-frequency] <UserCard>

  Total Renders
  -------------
  10

  Window (last 10s)
  -----------------
  10 renders

  Rate
  ----
  1.0 renders/sec

  Observation
  -----------
  Low render activity
```

The group is collapsed by default in DevTools — click to expand.

## API

```ts
useRenderFrequency(
  componentName: string,
  options?: RenderFrequencyOptions,
): void

type RenderFrequencyOptions = {
  enabled?: boolean;
  windowMs?: number;
  sampleEvery?: number;
};
```

### `componentName`

Free-form label used in the console header. Typically the component's display name.

### `options.enabled`

When explicitly `false`, the hook is a complete no-op — no counting, no logging. Useful for toggling diagnostics at runtime without removing the call:

```tsx
useRenderFrequency('UserCard', { enabled: process.env.NEXT_PUBLIC_DEBUG === '1' });
```

Defaults to `true`.

When `enabled` switches back to `true`, counting resumes from where it left off — the counter does not reset.

### `options.windowMs`

The rolling time window used to calculate render count and rate. Renders older than `windowMs` are excluded from the window count.

Default: `10000` (10 seconds). Values less than 1 are clamped to 1.

```tsx
useRenderFrequency('UserCard', { windowMs: 5000 }); // 5-second window
```

### `options.sampleEvery`

Controls how often a log is emitted. A log fires when `renderCount % sampleEvery === 0`. The render counter and timestamp tracking advance on every render regardless of this setting.

Default: `10` (log every 10th render). Set to `1` to log on every render.

```tsx
useRenderFrequency('UserCard', { sampleEvery: 1 }); // log every render
```

## Console output

### Observation thresholds

The Observation field is descriptive only — it tells you what is happening, not what to do.

| Rate             | Observation                      |
| ---------------- | -------------------------------- |
| > 10 renders/sec | `High render frequency detected` |
| > 2 renders/sec  | `Moderate render activity`       |
| ≤ 2 renders/sec  | `Low render activity`            |

## Production safety

The hook checks `process.env.NODE_ENV !== 'development'` inline. When in production:

- The hook returns immediately after the two `useRef` calls (required by Rules of Hooks)
- No counting, no timestamp tracking, no console output
- Bundlers (Vite, webpack, Rollup) statically evaluate the `NODE_ENV` check and dead-code-eliminate all downstream logic

## React Strict Mode

React Strict Mode may invoke component logic multiple times during development. Render counts and frequency metrics may appear inflated relative to production behavior. This is expected — the package remains safe and
deterministic under Strict Mode.

## Companion package

| Package                                                                                | Answers                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`@sapanmozammel/why-render`](https://www.npmjs.com/package/@sapanmozammel/why-render) | _Why_ did this component re-render?         |
| `@sapanmozammel/why-render-frequency`                                                  | _How often_ is this component re-rendering? |

## License

MIT
