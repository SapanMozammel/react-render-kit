# PRD: `unstable-props-detector` v2.0

**Package:** `@sapanmozammel/unstable-props-detector`
**Monorepo:** react-render-kit
**Status:** v2.0 — Implementation Ready
**Companion packages:** `@sapanmozammel/why-render`, `@sapanmozammel/why-render-frequency`, `@sapanmozammel/render-trace`
**Supersedes:** v1.0 draft

---

## 1. Product Overview

### 1.1 What it is

`unstable-props-detector` is a development-only React hook that identifies props whose reference identity changes between renders, classifying each as a function, object, or array. It logs a structured console diagnostic to help developers discover why `React.memo` optimizations are failing.

### 1.2 What it is not

It is not a linter, a profiler, or a static analyzer. It does not perform deep equality comparisons. It does not prove that a flagged prop *caused* a re-render — it reports observations about reference identity, not causation. It does not modify code, integrate with React DevTools, or measure render timing.

### 1.3 Problem it solves

`React.memo`, `useMemo`, and `useCallback` are the primary tools for preventing unnecessary re-renders. They all rely on reference stability: a memoized child only skips re-rendering if every prop satisfies `Object.is(prev, next) === true`.

The most common failure pattern is an inline reference type passed as a prop:

```tsx
// Every parent render creates a new function reference — memo is defeated
<UserList onSelect={() => setSelected(id)} filters={{ active: true }} />
```

`why-render` tells the developer *which* props changed. `unstable-props-detector` tells the developer *which changed props are reference types* — the specific category where `useCallback` and `useMemo` apply. The two packages are complementary, not redundant.

### 1.4 Positioning within the toolkit

| Package | Question | Output |
|---|---|---|
| `why-render` | Why did this component re-render? | All changed props with prev/next values |
| `why-render-frequency` | How often does this component re-render? | Count, rate, observation |
| `render-trace` | How did the re-render cascade? | Propagation chain, root trigger, depth |
| `unstable-props-detector` | Which props are breaking memoization? | Reference-type props that changed identity |

---

## 2. Goals

1. Detect **function props** that arrive as new references between renders.
2. Detect **object props** (non-null, non-array) that arrive as new references between renders.
3. Detect **array props** that arrive as new references between renders.
4. Log a structured console diagnostic with prop name, type, and report count.
5. Support an **ignore list** for known-stable or intentionally recreated props.
6. Support a **report cap** to prevent console saturation in high-frequency components.
7. Support a **stable-confirmation mode** (`logOnEveryRender`) for verifying that fixes worked.
8. Be a **complete no-op in production** with zero bundle impact.
9. Remain composable with all other toolkit hooks — no shared state, no provider.

---

## 3. Non-Goals

- No deep equality comparisons. Identity checks (`Object.is`) only.
- No automatic code modifications or fix suggestions.
- No AST transforms or Babel plugins.
- No React DevTools integration.
- No performance timing or render duration measurement.
- No automatic `useMemo` / `useCallback` wrapping.
- No linting rules or ESLint plugin.
- No tracking of *why* a prop's reference changed — only *that* it changed and *what type* it is.
- No shared state with other toolkit packages.

---

## 4. Behavior Model

### 4.1 Instability definition

A prop observation is emitted when all four conditions hold simultaneously:

1. The prop key is present in `curr` (current render's props).
2. The prop key is **not** in `ignoreProps`.
3. `Object.is(prev[key], curr[key]) === false` — reference or value changed.
4. `curr[key]` is a **reference type** — function, non-null object, or array.

**Why `Object.is` and not `!==`:** `Object.is` is the same predicate React uses internally for prop comparison. Using `!==` would mishandle `NaN` (where `NaN !== NaN` is true but `Object.is(NaN, NaN)` is false, meaning a `NaN` prop appearing to "change" on every render would be falsely flagged). `Object.is` also correctly distinguishes `+0` and `-0`. This matches the comparison strategy in `@sapanmozammel/why-render`'s `diffProps`.

**Why only reference types:** Primitive changes (`string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint`) are expected and desirable — they carry the actual data update and there is no `useCallback`-equivalent stabilization for them. `React.memo` correctly re-renders when a primitive prop changes value. Flagging primitive changes as "instability" would produce noise with no actionable fix.

**Observation, not verdict:** The output uses "potentially unstable" throughout. Reference identity change does not prove a bug. A new array from the server is a legitimate data update. The hook reports *what it sees*, not *what it means*.

### 4.2 Type classification

Classification is applied to `curr[key]` only, and evaluated in this exact priority order:

| Priority | Classification | Predicate | Example |
|---|---|---|---|
| 1 | `function` | `typeof value === 'function'` | `onClick={() => {}}` |
| 2 | `array` | `Array.isArray(value)` | `items={[1, 2, 3]}` |
| 3 | `object` | `typeof value === 'object' && value !== null` | `config={{ theme: 'dark' }}` |

Arrays are checked before objects because arrays satisfy `typeof value === 'object'`. Only one classification is assigned per prop. Priority 1–3 exhausts all reference types; any value not matched by these predicates is a primitive and is not classified or reported.

**Intentional deviation from `why-render`:** `@sapanmozammel/why-render` classifies both objects and arrays under the single `refType: 'object'` label. `unstable-props-detector` distinguishes arrays explicitly because they have a distinct stabilization remedy (`useMemo([], deps)`) and are a common separate category of instability. This deviation is intentional and documented.

### 4.3 `ignoreProps` precedence

When `ignoreProps: ['onClick', 'children']` is provided, the check `ignoreProps.includes(key)` is evaluated **before** any comparison. No `Object.is` call is made for ignored keys. This is a pure filtering step at the iteration level, not a post-comparison suppression.

Consequence: ignored props do not affect the report count, do not appear in log output, and do not consume `maxReports` budget.

### 4.4 First render skip

On the first render of a component instance, `prevPropsRef.current === null`. No comparison is performed, the ref is set to `props`, and the hook returns without logging. This matches `@sapanmozammel/why-render`'s first-render behavior exactly.

Instability can only be observed from the **second render onward**.

### 4.5 Report lifecycle

Each component instance tracks an independent `reportCountRef`. When `reportCountRef.current >= maxReports`, console output is suppressed but the comparison continues — `prevPropsRef.current` is still updated every render so that if logging is re-enabled (possible via `enabled` toggle), the baseline remains accurate.

**`maxReports` counts only instability reports, not stable-render logs.** When `logOnEveryRender: true` and no instability is detected, a stable-confirmation line is emitted unconditionally — it does not decrement the remaining budget. The cap is exclusively for instability noise control.

The final report (when `reportCountRef.current + 1 === maxReports`) appends a suppression notice so the developer knows logging has stopped.

---

## 5. System Design

### 5.1 Module architecture

```
src/
  detector/
    detector.ts           # pure detection — no React import
  hook/
    use-unstable-props-detector.ts
  logger/
    unstable-logger.ts
  types/
    index.ts
  index.ts
```

`detector.ts` has zero React imports. It is a pure function over two plain objects. This separation allows unit-testing the detection logic without a React test environment and keeps the classification logic free of framework coupling — the same architectural pattern as `diff-props.ts` in `@sapanmozammel/why-render`.

### 5.2 Detector (`detector/detector.ts`)

```ts
export const detectUnstableProps = (
  prev: Record<string, unknown>,
  curr: Record<string, unknown>,
  ignoreProps: string[],
): PropInstability[] => { ... };
```

**Algorithm:**

1. Initialize `result: PropInstability[] = []`.
2. For each `key` in `Object.keys(curr)`:
   a. If `ignoreProps.includes(key)`: `continue`.
   b. If `Object.is(prev[key], curr[key])`: `continue` (unchanged).
   c. Classify `curr[key]` by priority order (§4.2). If no classification matches (primitive): `continue`.
   d. Push `{ name: key, type }` to `result`.
3. Return `result`.

**Removed props are not iterated.** The algorithm iterates `Object.keys(curr)` only. Props present in `prev` but absent in `curr` are removals — not instability — and are out of scope. This differs from `diffProps` in `why-render`, which uses `new Set([...Object.keys(prev), ...Object.keys(curr)])` to also detect added/removed props. `unstable-props-detector` has a narrower concern.

**Complexity:** O(n × m) where n = number of current props, m = length of `ignoreProps`. For typical components (under 30 props, under 10 ignored keys), this is negligible. No nested iteration, no recursion, no object cloning.

### 5.3 Hook (`hook/use-unstable-props-detector.ts`)

```ts
export const useUnstablePropsDetector = (
  componentName: string,
  props: Record<string, unknown>,
  options?: UnstablePropsOptions,
): void => {
  const prevPropsRef = useRef<Record<string, unknown> | null>(null);
  const reportCountRef = useRef(0);

  if (process.env.NODE_ENV !== 'development') return;

  const {
    enabled = true,
    ignoreProps = [],
    maxReports = 10,
    logOnEveryRender = false,
  } = options ?? {};

  if (!enabled) return;

  const prev = prevPropsRef.current;

  if (prev !== null) {
    const unstable = detectUnstableProps(prev, props, ignoreProps);

    if (unstable.length > 0 && reportCountRef.current < maxReports) {
      const isLastReport = reportCountRef.current + 1 === maxReports;
      reportCountRef.current += 1;
      logInstability(componentName, unstable, reportCountRef.current, maxReports, isLastReport);
    } else if (unstable.length === 0 && logOnEveryRender) {
      logStable(componentName);   // never capped — see §4.5
    }
  }

  prevPropsRef.current = props;
};
```

**Rules of Hooks compliance:**
- Both `useRef` calls are unconditional — they appear before every early return.
- The production early return falls after the two `useRef` calls and before any conditional logic.
- No other hooks (`useEffect`, `useLayoutEffect`, `useCallback`) are called anywhere in the hook body.
- The hook remains statically valid even when the production guard short-circuits, because the ref calls above it are the only React hook calls in the function.

**Ref updated during the render phase:** `prevPropsRef.current = props` is the last line of the hook, executing synchronously during render. This is the same pattern used by `@sapanmozammel/why-render`. The alternative — updating in `useLayoutEffect` — introduces a one-render lag: `useLayoutEffect` from render N runs after commit, meaning render N+1 compares against render N−1's props. That is a worse tradeoff. See §8.3 for the Concurrent Mode consequence of this choice.

**No `useLayoutEffect`, no cleanup.** Unlike `@sapanmozammel/render-trace`, this hook requires no stack management and no post-render cleanup. The entire implementation is synchronous render-phase code and two refs.

### 5.4 Logger (`logger/unstable-logger.ts`)

Two exported functions:

```ts
export const logInstability = (
  componentName: string,
  unstable: PropInstability[],
  reportCount: number,
  maxReports: number,
  isLastReport: boolean,
): void => { ... };

export const logStable = (componentName: string): void => { ... };
```

`logInstability` uses `console.groupCollapsed` (collapsed by default in DevTools). `logStable` uses a single `console.log` — no group, no nesting. This distinction is intentional: instability output has structured detail worth expanding; stability confirmation is a one-line signal.

---

## 6. API Design

### 6.1 `useUnstablePropsDetector(componentName, props, options?)`

```ts
const useUnstablePropsDetector: (
  componentName: string,
  props: Record<string, unknown>,
  options?: UnstablePropsOptions,
) => void;
```

**Return value:** `void`. No programmatic data API in v1 — observations are console-only. See §6.4 for the deferred `onDetect` callback design.

**Minimal usage:**

```tsx
const UserList = (props: UserListProps) => {
  useUnstablePropsDetector('UserList', props as Record<string, unknown>);
  return <ul>{props.items.map(renderItem)}</ul>;
};
```

The `as Record<string, unknown>` widening is unavoidable: TypeScript cannot express "any typed props shape with unknown per-key value types" without an explicit cast. This is identical to the usage contract of `@sapanmozammel/why-render`.

### 6.2 Types

```ts
export type PropType = 'function' | 'array' | 'object';

export type PropInstability = {
  name: string;
  type: PropType;
};

export type UnstablePropsOptions = {
  enabled?:          boolean;
  ignoreProps?:      string[];
  maxReports?:       number;
  logOnEveryRender?: boolean;
};
```

No `interface` keyword. No `any`. All fields optional with documented defaults. `PropType` is a union in priority-check order to match the classifier (§4.2).

### 6.3 Options reference

**`enabled`** (`boolean`, default `true`)

`false` is a complete no-op — all comparisons, logging, and ref updates are skipped. The `prevPropsRef` is not updated when `enabled: false`, meaning the next render with `enabled: true` will compare against the last render where the hook was active, not the immediately prior render.

Implication: if `enabled` is toggled off and then on, the first report after re-enabling will compare against a potentially stale baseline. This is acceptable — it is the developer's responsibility when toggling enabled dynamically.

**`ignoreProps`** (`string[]`, default `[]`)

Keys in this list are excluded from comparison entirely (§4.3). The array is re-evaluated on every render — passing a new array literal each render does not cause instability in the detector itself (the array is consumed synchronously, not stored).

Common candidates:
- `'children'` — almost always a new JSX reference; not a memoization fix target in most cases (see §8.5)
- `'style'` — when intentionally accepting new style objects every render (e.g., animated styles)
- `'ref'` — forwarded refs rarely stabilized

**`maxReports`** (`number`, default `10`)

Caps the number of instability log entries for this component instance. Comparisons continue after the cap is reached — only console output stops. Does not affect stable-confirmation lines from `logOnEveryRender`. The cap resets on component unmount and remount.

`Infinity` disables the cap. Not recommended in demo environments or tight render loops.

**`logOnEveryRender`** (`boolean`, default `false`)

When `true` and no instability is detected, emits a single `console.log` confirming stability. Useful for verifying that `useCallback`/`useMemo` fixes are working. Never capped by `maxReports`. When instability *is* detected with `logOnEveryRender: true`, the normal grouped instability log is emitted (not the stable-confirmation line).

### 6.4 Deferred API extensions (v2+)

The following are designed but not implemented in v1. They are documented here to prevent v1 design decisions from making v2 infeasible.

**`onDetect?: (results: PropInstability[], componentName: string) => void`**

A callback invoked with the instability results instead of (or in addition to) console logging. Enables custom reporting pipelines, test assertions without console spying, and integration with external observability tools. When provided alongside the default logging, both fire.

Design constraint: `onDetect` fires on every detection, not subject to `maxReports`. The report cap is a console-noise concern; programmatic consumers should decide their own throttling.

**`label?: string`**

An ergonomic alias for `componentName`. When both are provided, `label` takes precedence in log output. Useful when the component function name and the desired log label diverge (e.g., HOC-wrapped components, components named `Component` by convention).

Neither extension changes the v1 public API. They are additive options — v1 code requires zero migration.

---

## 7. Console Output Format

All output uses plain ASCII separators with no decorative Unicode or emoji. This matches the established style of `@sapanmozammel/why-render` and `@sapanmozammel/why-render-frequency`. The group header format `[package-name] <ComponentName>` is consistent across all toolkit packages.

### 7.1 Instability detected

```
[unstable-props-detector] <UserList>
  (collapsed group — expanded below)

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

[report 4 / 10]
```

The outer group is `console.groupCollapsed('[unstable-props-detector] <UserList>')`. Section headers use `'-'.repeat(headerText.length)` for the separator, matching `@sapanmozammel/why-render-frequency`. Prop name column is padded to `maxKeyLen + 2` using `String.padEnd`, matching `@sapanmozammel/why-render`'s column alignment.

### 7.2 Report limit (final entry)

```
[unstable-props-detector] <UserList>

Potentially Unstable Props
--------------------------
  onItemClick    function    new reference
  config         object      new reference

Memoization Note
----------------
  ...

[report 10 / 10 — further reports suppressed for this instance]
```

The suppression notice replaces the normal `[report N / maxReports]` line. It is the last log entry the hook produces for this instance.

### 7.3 Stable render (`logOnEveryRender: true`)

```
[unstable-props-detector] <UserList> — stable
```

Single `console.log` call. No `console.groupCollapsed`, no nesting. This is a one-line signal, not a structured diagnostic — it does not warrant an expandable group.

### 7.4 Silent (default)

When `unstable.length === 0` and `logOnEveryRender: false`, nothing is logged. The hook is silent. This matches the silence contracts of `why-render` (silent when `changes.length === 0`) and `why-render-frequency` (always logs — but `unstable-props-detector` defaults to diagnostic silence).

### 7.5 Format rules summary

| Rule | Value |
|---|---|
| Group prefix | `[unstable-props-detector]` |
| Component name format | `<ComponentName>` (angle brackets, no quotes) |
| Section separator | `'-'.repeat(sectionTitle.length)` |
| Prop column indent | 2 spaces |
| Prop name padding | `padEnd(maxKeyLen + 2)` |
| Emoji / decorative Unicode | None |
| `console.group` vs `console.groupCollapsed` | Always `groupCollapsed` for instability; plain `log` for stable |

---

## 8. React 18 Constraints

### 8.1 Strict Mode double-invocation

**Mechanism:** React 18 Strict Mode invokes render functions twice per render. Both invocations execute against the same fiber — `useRef` state is shared between them.

**Trace through first mount:**
- Invocation 1: `prevPropsRef.current === null` → skip comparison, set `prevPropsRef.current = props`.
- Invocation 2: `prevPropsRef.current === props` (set by invocation 1, same object reference) → all `Object.is(prev[key], curr[key])` comparisons return `true` → no instability reported.

**Trace through update:**
- Invocation 1: `prevPropsRef.current = A` (last committed props), `props = B` → compare A vs B → detect instability → log once → set `prevPropsRef.current = B`.
- Invocation 2: `prevPropsRef.current === B`, `props = B` → compare B vs B → no instability.

**Guarantee:** Strict Mode produces exactly one instability report per actual prop change. No false positives, no duplicate reports.

**One preserved risk:** React does not reset `useRef.current` between Strict Mode double-invocations today. If a future React version changes this behavior, invocation 2 would see `prevPropsRef.current === null` and skip its comparison. This degrades gracefully — a skipped comparison is not a false report.

### 8.2 Concurrent Mode render interruption

**Mechanism:** Under Concurrent Mode features (`useTransition`, `useDeferredValue`), render functions may execute to completion and then be discarded before commit. If a discarded invocation reaches `prevPropsRef.current = props`, the ref is updated to props from an uncommitted render.

**Consequence:** On the next committed render, the baseline (`prevPropsRef.current`) reflects props from the discarded render, not the last committed render. For props that change independently of the discarded render, this produces no error. For props that were stable across committed renders but changed during the discarded one, this may produce a false positive — one spurious report for that prop.

**v2 stance:** This is a known limitation of updating refs during the render phase. It is the same tradeoff accepted by `@sapanmozammel/why-render`. The alternative (updating in `useLayoutEffect`) introduces a render N-2 → N-1 comparison lag that is a worse and more systematic error. One occasional false positive in Concurrent Mode is preferable to systematically off-by-one comparisons in all modes.

**Mitigation for developers:** If unexpected instability reports appear on props inside `startTransition` or `useDeferredValue` subtrees, the reports may be Concurrent Mode artifacts. Add those props to `ignoreProps` or validate by temporarily removing `useTransition` to confirm.

### 8.3 `children` prop

`children` is almost always a new JSX element reference on each parent render. `React.memo` does compare `children` by reference identity, but `children` instability is usually intentional — the parent genuinely wants the child to render new content.

The hook does not auto-ignore `children`. A component that explicitly wraps children in its own `memo` and relies on children stability for that optimization needs to know when children is unstable. Silently hiding it would be incorrect.

**Usage guidance:** Add `'children'` to `ignoreProps` in most instrumentation contexts where the component does not memoize based on children.

### 8.4 Props spread from parent

When a parent spreads an object literal: `<Child {...computedProps} />`, the JSX transform creates a new props object on every parent render. From the child's perspective, every prop in the spread has a new identity — even if the individual values are stable references. The hook cannot distinguish "parent spread a new object" from "individual prop values changed". All non-primitive, non-ignored props in the spread will be flagged.

This is a **correct observation** — the spread pattern is itself a source of instability. The fix is to stabilize the spread source object with `useMemo` or to destructure and stabilize individual props.

### 8.5 `null` and `undefined` prop values

`null` satisfies `typeof null === 'object'` but is explicitly excluded from the `'object'` classification (the predicate requires `value !== null`). `undefined` satisfies no reference-type predicate. Neither is classified or reported.

A prop transitioning from a function reference to `null` or `undefined` is treated as a removed reference — not an instability. The `Object.is(prev[key], curr[key])` check correctly detects the change, but the `null`/`undefined` classifier short-circuits it. No report is emitted.

---

## 9. Performance Model

### 9.1 Production cost

Zero. The production early return fires after the two `useRef` calls:

```ts
// Everything below this line is dead code in production builds
if (process.env.NODE_ENV !== 'development') return;
```

Modern bundlers (Vite, Webpack, tsup) statically analyze `process.env.NODE_ENV`, eliminate the false branch, and tree-shake the entire `detector.ts` and `unstable-logger.ts` modules when no production path imports them.

What survives in production per instrumented component:
```ts
useRef<Record<string, unknown> | null>(null); // 1 hook call
useRef(0);                                    // 1 hook call
// immediate return
```

Two `useRef` calls with stable initial values. Negligible.

### 9.2 Development cost

Per render, per instrumented component, when props are stable:

- 2 ref reads (`prevPropsRef.current`, `reportCountRef.current`)
- 1 `Object.keys(curr)` call — O(n)
- n `Array.prototype.includes` calls for `ignoreProps` — O(n × m), m = ignoreProps.length
- n `Object.is` comparisons — O(n)
- 1 ref write (`prevPropsRef.current = props`)

When instability is detected (additional cost):
- 1 `console.groupCollapsed` + associated `console.log` calls — proportional to number of unstable props

For components with up to 50 props and 10 ignored keys, this is unmeasurable in profiling. The hook allocates no closures, traverses no prototype chains, and performs no O(n²) operations.

**`ignoreProps.includes` optimization:** The inner loop uses `Array.prototype.includes` — O(m) per key. If `ignoreProps` grows large (>20 keys), callers may convert it to a `Set` externally and pass the `.has` predicate instead. This is an API v2 concern; v1 accepts the array form only.

### 9.3 No deep comparison

`Object.is(prev[key], curr[key])` is a single-pointer comparison. No `JSON.stringify`, no `lodash.isEqual`, no recursive object traversal. This is a deliberate constraint, not an oversight.

Deep comparison would change the semantics from "reference instability" to "value instability" — a fundamentally different (and more expensive) concern. It would require decisions about circular references, class instances, Proxies, and DOM nodes. It is also unnecessary: React's own memoization uses reference identity, so reference identity is the correct level of analysis.

---

## 10. Integration Model

### 10.1 Composing with toolkit packages

All four hooks are independent and composable. No imports between packages. No shared module-level state.

```tsx
const UserCard = (props: UserCardProps) => {
  useWhyRender('UserCard', props as Record<string, unknown>);
  useRenderFrequency('UserCard');
  useTraceRender('UserCard');
  useUnstablePropsDetector('UserCard', props as Record<string, unknown>);
  return <div>{props.user.name}</div>;
};
```

**Console output coordination:** Each package opens a separate `console.groupCollapsed` group. Groups from `why-render` and `unstable-props-detector` may appear interleaved — they are independent and have no ordering contract with each other.

**Complementary workflow:** `why-render` reports that `onItemClick` changed and shows its previous and current values. `unstable-props-detector` reports that `onItemClick` is a function that changed reference — implying an inline declaration. Together: the developer sees *that* a prop changed, *what* its values were, *what type* it is, and *whether stabilization applies*.

### 10.2 No `render-core` dependency in v1

v1 has no dependency on any shared abstraction layer. If a `render-core` package is introduced, this package will migrate shared types there. The public API (`useUnstablePropsDetector`, `UnstablePropsOptions`, `PropInstability`) will not change.

---

## 11. Production Reality & Misuse Prevention

This section exists because the tool is easy to misuse in ways that lead to wrong conclusions.

### 11.1 This tool cannot prove a memoization bug

Unstable props are a **necessary but not sufficient** condition for memoization failure. `React.memo` skips when all props are stable — but a component may re-render for reasons unrelated to props: a context change, a state update inside the component, a parent that is not memoized and re-renders the child unconditionally regardless of prop stability.

**Safe interpretation rule:** Flagged props are *candidates* for stabilization. They are not confirmed causes of the re-renders you observe. Use `@sapanmozammel/render-trace` to confirm that a re-render actually cascaded to the suspect component before concluding that prop instability is the root cause.

### 11.2 Reference instability is not always a bug

An array prop that arrives as a new reference because its contents changed is correct behavior. An object prop created by a selector that computes new results on every call is a data delivery mechanism, not a mistake. This tool flags all reference changes — it has no knowledge of whether the change was intentional.

**Safe interpretation rule:** Before stabilizing a prop, verify that its reference changes correlate with renders you actually want to prevent. Stabilizing a prop that carries real data changes will suppress legitimate re-renders.

### 11.3 Stabilizing a prop does not guarantee a re-render savings

`React.memo` performs a shallow comparison of **all** props. If one prop is stabilized but another remains unstable, the component still re-renders. The tool reports per-prop observations; the fix requires all props to be stable simultaneously.

**Safe interpretation rule:** Treat the report as a list of *candidates*, not a repair checklist. Stabilize all flagged props together and verify the re-render stops before declaring victory.

### 11.4 This tool is not a lint substitute

Static analysis tools (ESLint rules `react/jsx-no-bind`, `no-unstable-nested-components`) detect unstable references at the definition site before runtime. `unstable-props-detector` observes them at runtime in a specific component. Both have value; neither replaces the other. This tool is for runtime investigation of specific memoization failures, not a general codebase quality gate.

### 11.5 `maxReports` is a noise control, not a correctness control

When the report cap is reached, comparisons continue. The developer is not told "this component is now stable" — they are told "this component stopped logging". A component that is still unstable after 10 reports will continue changing references silently. Use `maxReports: Infinity` during active debugging sessions and reset to default when done.

---

## 12. Test Strategy

### 12.1 Unit tests — detector (`tests/detector.test.ts`)

Pure function tests. No React environment required.

| Test | Assertion |
|---|---|
| Function prop changes reference | `detectUnstableProps({fn: f1}, {fn: f2}, [])` returns `[{name:'fn', type:'function'}]` |
| Array prop changes reference | `detectUnstableProps({ids: a1}, {ids: a2}, [])` returns `[{name:'ids', type:'array'}]` |
| Object prop changes reference | `detectUnstableProps({cfg: o1}, {cfg: o2}, [])` returns `[{name:'cfg', type:'object'}]` |
| Array classified before object | `detectUnstableProps({v: []}, {v: []}, [])` returns `type: 'array'`, not `'object'` |
| Primitive change not reported | `detectUnstableProps({n: 1}, {n: 2}, [])` returns `[]` |
| Stable reference not reported | `const fn = () => {}; detectUnstableProps({fn}, {fn}, [])` returns `[]` |
| `null` prop not classified | `detectUnstableProps({v: {}}, {v: null}, [])` returns `[]` |
| `undefined` prop not classified | `detectUnstableProps({v: {}}, {v: undefined}, [])` returns `[]` |
| `ignoreProps` suppresses key | `detectUnstableProps({fn: f1}, {fn: f2}, ['fn'])` returns `[]` |
| Removed prop not reported | `detectUnstableProps({fn: f1, x: 1}, {x: 1}, [])` returns `[]` |
| `Object.is(NaN, NaN)` not flagged | `detectUnstableProps({n: NaN}, {n: NaN}, [])` returns `[]` (same-value NaN) |
| Multiple unstable props | Three changed reference props → three entries in results |

### 12.2 Hook behavior tests (`tests/use-unstable-props-detector.test.tsx`)

React Testing Library + `renderHook`. Spy on `console.groupCollapsed` and `console.log` before each test; restore after.

| Test | Setup | Assertion |
|---|---|---|
| No log on first render | `renderHook` with any props | `console.groupCollapsed` not called |
| Instability logged on second render | Re-render with new function reference | `console.groupCollapsed` called once |
| No log on stable re-render | Re-render with same references | `console.groupCollapsed` not called |
| `ignoreProps` suppresses key | Re-render with changed key in ignore list | `console.groupCollapsed` not called |
| `enabled: false` is silent | Any re-render | Neither `console.groupCollapsed` nor `console.log` called |
| `maxReports: 3` stops at cap | Re-render 5 times with instability | `console.groupCollapsed` called exactly 3 times |
| `logOnEveryRender: true` logs stable | Re-render with stable props | `console.log` called once (not `groupCollapsed`) |
| `logOnEveryRender: true` caps not applied to stable | Re-render 15 times stably with `maxReports: 10` | `console.log` called 15 times |
| Suppression notice on final report | `maxReports: 2`, re-render 3 times with instability | Second log call includes suppression text |

### 12.3 Strict Mode tests (`tests/use-unstable-props-detector.test.tsx`)

Within the same file, using `<StrictMode>` wrapper in `render`:

| Test | Setup | Assertion |
|---|---|---|
| No false positive on mount | Mount inside `<StrictMode>` | `console.groupCollapsed` not called |
| Single report per update under Strict Mode | Re-render once with new function reference inside `<StrictMode>` | `console.groupCollapsed` called exactly once (not twice) |

### 12.4 Logger output tests (`tests/unstable-logger.test.ts`)

Spy on console methods. Verify output structure, not exact strings.

| Test | Assertion |
|---|---|
| Group header format | First arg to `groupCollapsed` matches `[unstable-props-detector] <Name>` |
| Prop type appears in output | `console.log` call includes `'function'` / `'array'` / `'object'` |
| Report counter displayed | `console.log` call includes `[report N / M]` |
| Suppression notice on last report | Final `console.log` call includes `further reports suppressed` |
| `logStable` uses `console.log` not `groupCollapsed` | Stable confirmation does not call `console.groupCollapsed` |

### 12.5 Production guard tests (`tests/use-unstable-props-detector.prod.test.tsx`)

```ts
beforeEach(() => { vi.stubEnv('NODE_ENV', 'production'); });
afterEach(() => { vi.unstubAllEnvs(); });
```

| Test | Assertion |
|---|---|
| No comparison performed | Spy on `detectUnstableProps` — confirm it is never called |
| No console output | Neither `groupCollapsed` nor `console.log` called |
| No throw | Hook does not throw in production |

---

## 13. Success Criteria

| Criterion | Verification |
|---|---|
| Functions flagged when reference changes | `detector.test.ts`: two different function references → `type: 'function'` |
| Arrays classified before objects | `detector.test.ts`: array value → `type: 'array'`, not `'object'` |
| Objects flagged when reference changes | `detector.test.ts`: two `{}` literals → `type: 'object'` |
| Primitives never flagged | `detector.test.ts`: `count: 1 → 2` → empty result |
| `null`/`undefined` never flagged | `detector.test.ts`: `v: {} → null` → empty result |
| `ignoreProps` prevents comparison | `detector.test.ts`: ignored key → empty result, `Object.is` not called |
| No log on first render | `hook.test.tsx`: single mount → no console calls |
| Exactly one log per update under Strict Mode | `hook.test.tsx`: `<StrictMode>` wrapper → `groupCollapsed` called once |
| `maxReports` stops logging at cap | `hook.test.tsx`: 5 renders × instability, `maxReports: 3` → 3 logs |
| `maxReports` does not cap stable logs | `hook.test.tsx`: 15 stable renders, `maxReports: 10` → 15 `console.log` calls |
| Suppression notice on final instability report | `hook.test.tsx`: assert last group contains suppression text |
| `logOnEveryRender: true` uses `console.log` not `groupCollapsed` | `logger.test.ts`: stable confirmation path → no `groupCollapsed` call |
| Production: complete no-op | `prod.test.tsx`: `vi.stubEnv('NODE_ENV', 'production')` → no detector call, no console output |
| Production bundle contains no detection code | Build verification: grep production bundle for `[unstable-props-detector]` → no match |

---

## 14. Package Structure

```
packages/unstable-props-detector/
  package.json
  tsup.config.ts
  vitest.config.ts
  README.md
  src/
    detector/
      detector.ts                      # pure classification — no React import
    hook/
      use-unstable-props-detector.ts
    logger/
      unstable-logger.ts
    types/
      index.ts
    index.ts                           # public re-export
  tests/
    detector.test.ts
    unstable-logger.test.ts
    use-unstable-props-detector.test.tsx
    use-unstable-props-detector.prod.test.tsx
```

Demo integration (Phase 6, after library ships):

```
demo/src/features/unstable-props-detector/
  index.tsx
  scenarios.ts
demo/src/lib/registry/index.ts     (modified)
demo/package.json                  (modified)
demo/next.config.ts                (modified)
```

---

## 15. Implementation Phases

### Phase 1 — Types + Detector [✅]

`types/index.ts`, `detector/detector.ts`. Pure TypeScript, zero React imports. Algorithm: iterate `Object.keys(curr)`, check `ignoreProps`, use `Object.is` for comparison, classify by priority order. Tests in `detector.test.ts` covering all cases in §12.1.

### Phase 2 — Hook [✅]

`hook/use-unstable-props-detector.ts`. Two unconditional `useRef` calls before all early returns. Production guard after refs, `enabled` guard after production guard. First-render skip via `prev === null`. `maxReports` cap on instability only. `logOnEveryRender` stable branch uncapped. Tests in `use-unstable-props-detector.test.tsx` and `use-unstable-props-detector.prod.test.tsx`.

### Phase 3 — Logger [✅]

`logger/unstable-logger.ts`. `logInstability`: `console.groupCollapsed` → section headers with dash separators → padded prop columns → memoization note → report counter → optional suppression notice → `console.groupEnd()`. `logStable`: single `console.log`. Tests in `unstable-logger.test.ts`. No emoji, no Unicode decorators.

### Phase 4 — Public API + Package Config [✅]

`src/index.ts`: export `useUnstablePropsDetector`, re-export `PropInstability`, `PropType`, `UnstablePropsOptions`. `package.json` (mirrors `render-trace` structure), `tsup.config.ts` (ESM + CJS + `.d.ts`), `vitest.config.ts` (jsdom, `NODE_ENV=development`), `README.md`. Dry-run publish check.

### Phase 5 — Quality Gate [✅]

All tests green. `tsc --noEmit` clean. `pnpm run build` clean. `pnpm run lint` exits with 0 errors. Production bundle grep for `[unstable-props-detector]` returns no matches.

### Phase 6 — Demo Integration [✅]

Four scenarios in `demo/src/features/unstable-props-detector/`:

| Scenario | Badge | What it demonstrates |
|---|---|---|
| Inline Props | `warn` | `memo`'d child receives inline `() => {}`, `{}`, `[]` — all flagged every parent render |
| Stable Props | `ok` | Same setup; parent uses `useCallback`/`useMemo` — hook confirms stability via `logOnEveryRender: true` |
| Mixed Props | `warn` | One function stabilized, one not — partial stabilization does not stop re-renders |
| Ignore List | `ok` | `children` + one intentional inline function in `ignoreProps` — suppression confirmed |

Registry entry, `next.config.ts` `transpilePackages`, demo CSS additions.

---

## Key Improvements in v2.0

1. **`Object.is` replaces `!==`** — matches React's own comparison predicate and `why-render`'s `diffProps`, correctly handles `NaN` identity.
2. **`maxReports` cap scoped to instability only** — stable-confirmation lines from `logOnEveryRender` are never capped, separating noise control from diagnostic confirmation.
3. **Console format aligned with ecosystem** — no `▼`, no `──────`, no emoji; plain dashes (`'-'.repeat(n)`) and 2-space indentation match `why-render` and `why-render-frequency` exactly.
4. **Strict Mode guarantee formalized** — traced through both invocations proving zero false positives; remaining risk (React future ref-reset) documented as graceful degradation.
5. **`isLastReport` flag added to hook** — enables the logger to append the suppression notice on exactly the final report without a second pass over the count.
6. **`null`/`undefined` edge case formalized** — §8.5 documents why `null` (despite `typeof null === 'object'`) is correctly excluded, and what happens to props transitioning to `null`.
7. **"Production Reality & Misuse Prevention" section (§11)** — five named failure modes covering false causation, intentional instability, multi-prop dependency, lint-substitute misuse, and cap semantics.
8. **Test strategy expanded and categorized** — §12 splits into five discrete test files with deterministic assertions; `Object.is(NaN, NaN)` edge case added; Strict Mode double-invocation verified in isolation.
9. **Deferred API extensions specified (§6.4)** — `onDetect` and `label` designed at the API contract level so v1 decisions do not foreclose them.
10. **Structural deduplication** — Core Concepts and System Design merged so each decision (comparison predicate, type priority, ref timing) is stated once with its rationale, not repeated across multiple sections.

---

*End of PRD — `unstable-props-detector` v2.0*
