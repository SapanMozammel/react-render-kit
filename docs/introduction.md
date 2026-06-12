---
title: "react-render-kit — React Render Observability SDK"
description: "12-package React observability SDK for tracing renders, detecting prop instability, time-travel replay, and static analysis."
keywords: ["react render observability", "react devtools", "render performance", "react hooks"]
canonical: "https://react-render-kit.vercel.app/docs/introduction"
---

# react-render-kit

react-render-kit is a monorepo of 12 dev-only packages that give you complete visibility into React component renders — why they happened, how often, whether `React.memo` is working, and which components are causing cascades. Install the unified `render-kit` SDK for everything pre-wired, or pick individual packages for targeted use. All instrumentation is gated on `NODE_ENV !== 'production'` so it costs nothing in production builds.

## The 12 packages

| Package | Description |
|---|---|
| [`@sapanmozammel/render-kit`](https://www.npmjs.com/package/@sapanmozammel/render-kit) | Unified SDK — one install, all 12 packages pre-wired |
| [`@sapanmozammel/why-render`](https://www.npmjs.com/package/@sapanmozammel/why-render) | Hook that logs why a component re-rendered by diffing props |
| [`@sapanmozammel/unstable-props-detector`](https://www.npmjs.com/package/@sapanmozammel/unstable-props-detector) | Detects object/array/function props that defeat `React.memo` |
| [`@sapanmozammel/render-playground`](https://www.npmjs.com/package/@sapanmozammel/render-playground) | Visual in-app panel: score, prop diffs, timeline, recommendations |
| [`@sapanmozammel/why-render-frequency`](https://www.npmjs.com/package/@sapanmozammel/why-render-frequency) | Tracks re-render rate with rolling-window observation |
| [`@sapanmozammel/render-trace`](https://www.npmjs.com/package/@sapanmozammel/render-trace) | Traces render cascade depth and root-trigger component |
| [`@sapanmozammel/memo-effect-analyzer`](https://www.npmjs.com/package/@sapanmozammel/memo-effect-analyzer) | Classifies `React.memo` effectiveness over a session |
| [`@sapanmozammel/render-insights`](https://www.npmjs.com/package/@sapanmozammel/render-insights) | Unified scored report: prop changes + frequency + memo + recommendations |
| [`@sapanmozammel/render-telemetry-core`](https://www.npmjs.com/package/@sapanmozammel/render-telemetry-core) | Typed event protocol, buffer, and transport infrastructure |
| [`@sapanmozammel/render-replay-engine`](https://www.npmjs.com/package/@sapanmozammel/render-replay-engine) | Time-travel replay: frame-by-frame navigation of recorded sessions |
| [`@sapanmozammel/render-intelligence`](https://www.npmjs.com/package/@sapanmozammel/render-intelligence) | Cross-component static analysis: bottlenecks, correlations, root causes |
| [`@sapanmozammel/render-core-schema`](https://www.npmjs.com/package/@sapanmozammel/render-core-schema) | Canonical TypeScript types and guards for the ecosystem |

## Two installation paths

**Single install — everything pre-wired:**

```bash
npm install @sapanmozammel/render-kit
```

**Modular — pick what you need:**

```bash
npm install @sapanmozammel/why-render
npm install @sapanmozammel/unstable-props-detector
```

Each package is independently installable with no required siblings.

## What it is NOT

- **Not a React DevTools replacement.** react-render-kit is programmatic — it instruments specific components you choose, not the whole tree.
- **Not a production monitoring tool.** All hooks and instrumentation are dev-only. Do not use it to collect data from production users.
- **Not a profiler.** It does not measure render duration or flame-graph your tree. Use the React Profiler tab in DevTools for timing.
- **Not automatic.** You explicitly add hooks to components you want to observe. There is no global monkey-patching.

## Next steps

- [Getting Started](getting-started.md) — install, first hook, first console output
- [Architecture](architecture.md) — how the 12 packages fit together
- [render-kit](render-kit.md) — full SDK reference
