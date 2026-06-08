# why-render

A tiny React + TypeScript hook that tells you **why** a component re-rendered by diffing its previous and current props. Dev-only, zero runtime cost in production builds.

## Install

```bash
pnpm add why-render
# or
npm i why-render
```

Peer dependency: `react >= 18`.

## Usage

```tsx
import { useWhyRender } from 'why-render';

const Profile = (props: ProfileProps) => {
  useWhyRender('Profile', props);
  return <div>{props.user.name}</div>;
};
```

When props change you'll see a grouped, sectioned output in the console:

```
▶ [why-render] <Profile>

  Primitive Changes
  -----------------
    name      Alice → Bob

  Reference Changes
  -----------------
    user      object reference changed
    onClick   function reference changed

  Added Props
  -----------
    loading

  Removed Props
  -------------
    avatar
```

The group is collapsed by default in DevTools — click to expand.

## API

```ts
useWhyRender(
  componentName: string,
  props: Record<string, unknown>,
  options?: WhyRenderOptions,
): void

type WhyRenderOptions = {
  enabled?: boolean;
};
```

### `componentName`

Free-form label used in the console header. Typically the component's display name.

### `props`

Flat snapshot of the component's current props. You can pass `props` directly or a subset:

```tsx
useWhyRender('Profile', { user: props.user, role: props.role });
```

### `options.enabled`

When explicitly `false`, the hook is a no-op regardless of environment. Useful for toggling diagnostics without removing the call:

```tsx
useWhyRender('Profile', props, { enabled: process.env.NEXT_PUBLIC_DEBUG === '1' });
```

Defaults to `true`.

## Production safety

The hook checks `process.env.NODE_ENV === 'development'` via an internal `isDev` constant. When `isDev` is `false`:

- The hook returns immediately after `useRef` (the one unconditional call required by Rules of Hooks)
- No props are diffed, no console methods are called
- Bundlers (Vite, webpack, Rollup) can dead-code-eliminate all downstream logic when `NODE_ENV` is statically set to `'production'`

**The hook is silent in `NODE_ENV=test` by design.** Diagnostics should not appear in automated test output.

## React Strict Mode

The hook is safe under React Strict Mode. Strict Mode may invoke component logic multiple times during development, which can produce duplicate diagnostic logs. This is acceptable for v1 and does not indicate a bug.

## Change classification

| Change type | Trigger | Console line |
|---|---|---|
| Primitive | `string`, `number`, `boolean`, `null`, `undefined`, `Symbol`, `BigInt` — value differs | `propName   prev → next` |
| Object reference | `typeof === 'object'`, non-null, reference differs | `propName   object reference changed` |
| Function reference | `typeof === 'function'`, reference differs | `propName   function reference changed` |
| Added | Key absent in previous render, present now | `propName` |
| Removed | Key present in previous render, absent now | `propName` |

Equality is determined by `Object.is`, which correctly handles `NaN` (equal to itself) and `+0`/`-0` (unequal).

Arrays are compared by reference — a new array literal on each render appears as an object reference change.

## TypeScript

The package ships full `.d.ts` declarations. All types are exported:

```ts
import type { WhyRenderOptions } from 'why-render';
```

## License

MIT
