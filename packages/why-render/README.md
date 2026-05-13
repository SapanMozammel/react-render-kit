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
import { useWhyDidYouRender } from 'why-render';

function Profile(props) {
	useWhyDidYouRender('Profile', props);
	return <div>{props.user.name}</div>;
}
```

When a prop changes, you'll see in the console:

```
[Profile] re-rendered because:
- prop "value" changed: 1 → 2
- prop "user" reference changed
```

## API

```ts
useWhyDidYouRender(
	componentName: string,
	props: Record<string, unknown>,
	options?: WhyDidYouRenderOptions,
): void
```

### Options

| Option         | Type                                  | Default     | Description                                                  |
| -------------- | ------------------------------------- | ----------- | ------------------------------------------------------------ |
| `isEqual`      | `(a: unknown, b: unknown) => boolean` | `Object.is` | Custom comparator. Pass a deep-equal to ignore shape-stable object identity flips. |
| `logUnchanged` | `boolean`                             | `false`     | Also list the props that did not change.                     |

## Behavior

- **Dev-only.** In production builds (`process.env.NODE_ENV === 'production'`) the effect early-returns. The hook itself stays callable so the rules of hooks are not violated.
- **First render does not log** — there is nothing to compare against.
- **Shallow comparison by default.** Primitives compared by value, objects/functions by reference.
- **Reference vs. value changes are distinguished**, so you can spot identity churn (new objects/functions every render) — the most common cause of unnecessary re-renders.
- **No re-renders caused by the hook** — `useRef` holds previous props, `useEffect` reads them after commit.

## Why distinguish reference vs. value?

`onClick={() => ...}` and `user={{ id: 1 }}` create a new function/object every render. They look "the same" to humans but are different to React. Calling those out as `reference changed` (vs. a printable `value changed: A → B`) tells you to wrap them in `useMemo` / `useCallback` or lift them to a stable scope.

## Recipes

### Tracking only one prop

Pass a subset:

```ts
useWhyDidYouRender('Profile', { user: props.user });
```

### Deep equality

```ts
import { useWhyDidYouRender } from 'why-render';
import isEqualDeep from 'fast-deep-equal';

useWhyDidYouRender('Profile', props, { isEqual: isEqualDeep });
```

### Tracking state too

Pass a synthetic object that bundles state in alongside props:

```ts
useWhyDidYouRender('Profile', { ...props, count, query });
```

## License

MIT
