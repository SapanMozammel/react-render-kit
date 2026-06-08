# @sapanmozammel/why-render

A tiny React + TypeScript hook that tells you **why** a component re-rendered by diffing its previous and current props. Dev-only, zero runtime cost in production builds.

**[Live demo →](https://react-render-kit.vercel.app/why-render)**

## Install

```bash
pnpm add @sapanmozammel/why-render
# or
npm i @sapanmozammel/why-render
```

Peer dependency: `react >= 18`.

## Usage

```tsx
import { useWhyRender } from '@sapanmozammel/why-render';

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
    name      "Alice" → "Bob"

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

When `enabled` is `false`, the hook neither diffs props nor advances its internal reference snapshot. Re-enabling shows all changes that accumulated while disabled.

## Production safety

The hook checks `process.env.NODE_ENV !== 'development'` inline. When in production:

- The hook returns immediately after `useRef` (the one unconditional call required by Rules of Hooks)
- No props are diffed, no console methods are called
- Bundlers (Vite, webpack, Rollup) statically evaluate the `NODE_ENV` check and dead-code-eliminate all downstream logic — minimal overhead (one `useRef` call per render)

**The hook is silent in `NODE_ENV=test` by design.** Diagnostics should not appear in automated test output.

## React Strict Mode

The hook is Strict Mode safe. When React double-invokes component logic, `prevRef` advances on the first invocation; the second invocation diffs the prop snapshot against itself and produces no output.

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
import type { WhyRenderOptions } from '@sapanmozammel/why-render';
```

## License

MIT
