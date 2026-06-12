# react-render-kit — React Render Observability SDK

A monorepo of 12 dev-only packages for observing, debugging, and analyzing React component renders. Install the unified SDK for everything pre-wired, or pick individual packages for targeted use. Zero production cost — all instrumentation is gated on `NODE_ENV !== 'production'`.

**[Live demo →](https://react-render-kit.vercel.app/)**

---

## Packages

| Package | Version | What it does |
|---|---|---|
| [`@sapanmozammel/render-kit`](packages/render-kit) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/render-kit) | Unified SDK — one install, all 12 packages pre-wired |
| [`@sapanmozammel/why-render`](packages/why-render) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/why-render) | Hook that logs why a component re-rendered by diffing props |
| [`@sapanmozammel/unstable-props-detector`](packages/unstable-props-detector) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/unstable-props-detector) | Detects object/array/function props that defeat `React.memo` |
| [`@sapanmozammel/render-playground`](packages/render-playground) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/render-playground) | Visual in-app panel: score, prop diffs, timeline, recommendations |
| [`@sapanmozammel/why-render-frequency`](packages/why-render-frequency) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/why-render-frequency) | Tracks re-render rate with rolling-window observation |
| [`@sapanmozammel/render-trace`](packages/render-trace) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/render-trace) | Traces render cascade depth and root-trigger component |
| [`@sapanmozammel/memo-effect-analyzer`](packages/memo-effect-analyzer) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/memo-effect-analyzer) | Classifies `React.memo` effectiveness over a session |
| [`@sapanmozammel/render-insights`](packages/render-insights) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/render-insights) | Unified scored report: prop changes + frequency + memo + recommendations |
| [`@sapanmozammel/render-telemetry-core`](packages/render-telemetry-core) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/render-telemetry-core) | Typed event protocol, buffer, and transport infrastructure |
| [`@sapanmozammel/render-replay-engine`](packages/render-replay-engine) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/render-replay-engine) | Time-travel replay: frame-by-frame navigation of recorded sessions |
| [`@sapanmozammel/render-intelligence`](packages/render-intelligence) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/render-intelligence) | Cross-component static analysis: bottlenecks, correlations, root causes |
| [`@sapanmozammel/render-core-schema`](packages/render-core-schema) | ![npm](https://img.shields.io/npm/v/@sapanmozammel/render-core-schema) | Canonical TypeScript types and guards for the ecosystem |

---

## Install

### Unified (recommended)

```bash
npm install @sapanmozammel/render-kit
```

One package. All 12 packages bundled. Single config object. Pre-wired telemetry, replay, and intelligence pipeline.

### Modular (pick what you need)

```bash
npm install @sapanmozammel/why-render
npm install @sapanmozammel/unstable-props-detector
# etc.
```

Each package is independently installable with no required siblings.

---

## Quick start

```tsx
import { createRenderKit, RenderKitProvider, useWhyRender } from '@sapanmozammel/render-kit';

const kit = createRenderKit();

export const App = () => (
  <RenderKitProvider kit={kit}>
    <MyApp />
  </RenderKitProvider>
);

// In any component:
const UserCard = (props: UserCardProps) => {
  useWhyRender('UserCard', props);
  return <div>{props.user.name}</div>;
};
```

Console output on every re-render shows exactly which props changed and how.

---

## Development

This repo is a [pnpm](https://pnpm.io/) workspace.

```bash
pnpm install          # install all dependencies
pnpm -r build         # build all 12 packages
pnpm -r test          # run all test suites
pnpm run type:check   # workspace-wide tsc --noEmit
pnpm run lint         # ESLint across all packages
```

Single-package workflow:

```bash
pnpm --filter @sapanmozammel/why-render build
pnpm --filter @sapanmozammel/why-render test
```

---

## Documentation

| Page | Contents |
|---|---|
| [Introduction](docs/introduction.md) | What react-render-kit is and isn't |
| [Getting Started](docs/getting-started.md) | Install, first hook, reading output |
| [Architecture](docs/architecture.md) | 12-package dependency graph + event pipeline |
| [render-kit](docs/render-kit.md) | Full SDK reference |
| [Telemetry](docs/telemetry.md) | Buffer, events, transports, serialization |
| [Replay Engine](docs/replay-engine.md) | Time-travel navigation, filters, bookmarks |
| [Intelligence Engine](docs/intelligence.md) | Bottleneck ranking, correlations, root cause |
| [Render Playground](docs/playground.md) | Visual panel, provider, hooks |
| [Core Schema](docs/core-schema.md) | Type definitions and guards |
| [useWhyRender](docs/why-render.md) | Prop diff hook reference |
| [useUnstablePropsDetector](docs/unstable-props-detector.md) | Reference instability detection |
| [useMemoEffectAnalyzer](docs/memo-effect-analyzer.md) | Memo effectiveness classification |
| [render-trace](docs/render-trace.md) | Cascade tracing hook reference |
| [FAQ](docs/faq.md) | Real engineering questions answered |

---

## License

MIT
