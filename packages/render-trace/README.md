# @sapanmozammel/render-trace

Trace React render propagation — identify which component triggered a cascade, how many levels it propagated, and which components were dragged along.

**Development-only. Zero production cost.**

---

## Install

```bash
npm install @sapanmozammel/render-trace
```

## Usage

```tsx
import { useTraceRender } from '@sapanmozammel/render-trace';

const Dashboard = (props) => {
  useTraceRender('Dashboard');
  return <UserList />;
};

const UserList = () => {
  useTraceRender('UserList');
  return users.map((u) => <UserCard key={u.id} user={u} />);
};

const UserCard = ({ user }) => {
  useTraceRender(`UserCard-${user.id}`);
  return <div>{user.name}</div>;
};
```

Each time a state update triggers a render cascade, `render-trace` logs:

```
▼ [render-trace] cycle-1 · 3 renders · root: <Dashboard> · 2ms
  └── <Dashboard>
      └── <UserList>
          └── <UserCard-42>
```

## Programmatic API

```ts
import { createRenderTrace } from '@sapanmozammel/render-trace';

const trace = createRenderTrace({ logMode: 'silent' });

// Use the instance in components:
useTraceRender('MyComponent', { instance: trace });

// Inspect results:
const cycles = trace.getRenderChains();
const root = trace.getRootCause(); // → 'Dashboard'
```

## Options

### `createRenderTrace(options?)`

| Option      | Type                           | Default  | Description                         |
| ----------- | ------------------------------ | -------- | ----------------------------------- |
| `enabled`   | `boolean`                      | `true`   | Enable or disable tracing           |
| `maxCycles` | `number`                       | `50`     | Max retained cycles (FIFO eviction) |
| `logMode`   | `'tree' \| 'flat' \| 'silent'` | `'tree'` | Console output format               |

### `useTraceRender(componentName, options?)`

| Option     | Type            | Default        | Description                     |
| ---------- | --------------- | -------------- | ------------------------------- |
| `enabled`  | `boolean`       | `true`         | Per-call override               |
| `instance` | `TraceInstance` | `defaultTrace` | Custom instance (for isolation) |

## List components

Components rendered in lists must use unique names:

```tsx
items.map((item) => {
  useTraceRender(`ListItem-${item.id}`);
});
```

## Known limitations

- **Strict Mode:** depth values may be off by one in the initial mount cycle. Root trigger is always correct.
- **Concurrent Mode:** features using `startTransition` or `useDeferredValue` may cause cycle discards with a console warning.
- **Non-instrumented intermediaries:** components not wrapped with `useTraceRender` break the parent chain. Their children appear as separate roots.

See the [PRD](.claude/plans/render-trace/prd.md) §7 for the full constraints reference.

## License

MIT
