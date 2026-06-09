# @sapanmozammel/unstable-props-detector

Detect React props that break memoization — identify inline functions, objects, and arrays causing unnecessary re-renders in `React.memo` components.

**Development-only. Zero production cost.**

---

## Install

```bash
npm install @sapanmozammel/unstable-props-detector
```

## Usage

```tsx
import { useUnstablePropsDetector } from '@sapanmozammel/unstable-props-detector';

const UserList = (props: UserListProps) => {
  useUnstablePropsDetector('UserList', props as Record<string, unknown>);
  return <ul>{props.items.map(renderItem)}</ul>;
};
```

When a parent passes inline references that change on every render, the console shows:

```
[unstable-props-detector] <UserList>

Potentially Unstable Props
--------------------------
  onItemClick    function    new reference
  filters        object      new reference
  selectedIds    array       new reference

Memoization Note
----------------
  Props above changed identity and may prevent React.memo from skipping
  re-renders of <UserList>. Wrap functions with useCallback, objects and
  arrays with useMemo.

[report 1 / 10]
```

## Options

| Option             | Type       | Default | Description                                               |
| ------------------ | ---------- | ------- | --------------------------------------------------------- |
| `enabled`          | `boolean`  | `true`  | Complete no-op when `false`                               |
| `ignoreProps`      | `string[]` | `[]`    | Prop names to exclude from detection                      |
| `maxReports`       | `number`   | `10`    | Max instability reports per component instance            |
| `logOnEveryRender` | `boolean`  | `false` | Log a stability confirmation when no instability is found |

```tsx
useUnstablePropsDetector('Modal', props as Record<string, unknown>, {
  ignoreProps: ['children', 'style'],
  maxReports: 5,
});
```

## Confirming a fix

Use `logOnEveryRender: true` to verify that `useCallback`/`useMemo` fixes are working:

```tsx
useUnstablePropsDetector('UserList', props as Record<string, unknown>, {
  logOnEveryRender: true,
});
// Console: [unstable-props-detector] <UserList> — stable
```

## Known limitations

- **Concurrent Mode:** Render functions may be discarded before commit. A discarded render that updates the internal baseline may produce one spurious report on the next committed render.
- **First render:** No comparison is performed on mount. Instability is only observable from the second render onward.
- **Observation only:** Reference identity change does not prove the change is causing a re-render. The hook reports what it sees, not what it means.

## License

MIT
