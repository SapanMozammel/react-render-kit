---
title: "FAQ — react-render-kit"
description: "Answers to real engineering questions about react-render-kit: production safety, Next.js compatibility, memory usage, and plugin authoring."
keywords: ["react render observability faq", "render-kit production", "react devtools questions"]
canonical: "https://react-render-kit.vercel.app/docs/faq"
---

# FAQ

## Do I need all 12 packages?

No. Install `@sapanmozammel/render-kit` to get everything wired automatically, or install individual packages for targeted use. `@sapanmozammel/why-render` has zero other dependencies — it is the minimal starting point.

## Is it safe to leave in production?

All hooks guard on `NODE_ENV !== 'production'` by default. When disabled, the hooks return immediately before any computation. `createRenderKit({ enabled: false })` allocates nothing — the buffer, replay engine, and intelligence pipeline are never instantiated. The shared `DISABLED_BUFFER` constant is a frozen module-scope object, not a new allocation.

## Can I disable everything in one place?

Yes. `createRenderKit({ enabled: false })` produces a disabled kit — all subsystems become no-ops. For individual hooks without `render-kit`, pass `enabled: false` in their options or tie it to an env variable:

```ts
useWhyRender('MyComponent', props, {
  enabled: process.env.NODE_ENV === 'development',
});
```

## How much memory does the telemetry buffer use?

The default `maxEvents: 1000` ring buffer holds at most 1000 events. Each event is a small plain object — roughly 200–500 bytes serialized. Worst case: ~500 KB. Reduce it with `createRenderKit({ telemetry: { maxEvents: 200 } })` or empty it with `kit.telemetry.clear()`.

## Does it work with Next.js App Router?

Yes. `createRenderKit()` must be called in a Client Component — mark the file `'use client'`. All hooks are Client-only. The `RenderKitProvider` must also be a Client Component. A common pattern is a `providers.tsx` file:

```tsx
'use client';
import { createRenderKit, RenderKitProvider } from '@sapanmozammel/render-kit';
const kit = createRenderKit();
export const Providers = ({ children }) => (
  <RenderKitProvider kit={kit}>{children}</RenderKitProvider>
);
```

## Does it work with React 19 and concurrent features?

Yes. The buffer uses `useSyncExternalStore` for external state subscriptions — this is the React-recommended API for concurrent-safe external stores. Hooks hold no internal state that would be discarded by React's concurrent scheduler.

## Does replay send data to a server?

No. Replay data lives in the `TelemetryBuffer` in memory. The only way data leaves the browser is via an explicit transport you register (`createLocalStorageTransport`, `createCustomTransport`). Nothing is sent anywhere by default.

## Can I extend the intelligence engine with custom analysis?

Yes. `createPlugin({ id, name, version, analyze })` produces a plugin. Pass it via `createRenderKit({ intelligence: { plugins: [myPlugin] } })` or directly to `analyzeRenders(source, { plugins: [myPlugin] })`. Kit-level plugins run before call-site plugins in all cases.

## What is the difference between `render-insights` and `render-intelligence`?

`render-insights` (`useRenderInsights`) instruments a **single component in real time** — per-render score, grade, prop changes, frequency, memo classification — as the component renders. `render-intelligence` (`analyzeRenders`) performs **cross-component, cross-session static analysis** over accumulated telemetry: bottleneck ranking, correlation detection, root cause classification across your entire component tree. They are complementary; `render-playground` uses `render-insights` for the real-time panel, while `render-kit`'s `kit.analyze()` delegates to `render-intelligence`.

## Can I use `render-kit` inside a library (not an application)?

The kit is designed for applications — it maintains a shared buffer and transport registry. For library authors, use the individual packages directly (e.g., `render-telemetry-core`) and let the consuming application control the buffer lifecycle. Avoid calling `createRenderKit()` inside a library, as multiple instances from library + application would produce separate uncoordinated buffers.

## How do I export telemetry for CI or offline analysis?

```ts
// Export
const json = kit.telemetry.serialize();  // JSON string of full buffer snapshot

// Import in a separate session / CI script
import { deserializeBuffer } from '@sapanmozammel/render-telemetry-core';
const snapshot = deserializeBuffer(json);

// Or pass directly to render-replay-engine
import { buildReplaySessions } from '@sapanmozammel/render-replay-engine';
const sessions = buildReplaySessions({ type: 'snapshot', snapshot });
```

Use `createLocalStorageTransport` to automatically persist between page reloads.

## What does the health score (0–100) represent?

The score starts at 100 and applies penalties for 4 signals:

| Signal | Penalty condition | Max penalty |
|---|---|---|
| Frequency | `FrequencyClass === 'HIGH'` | −30 |
| Instability | ≥1 unstable prop reference | −25 |
| Memo defeat | `MemoClassification === 'INEFFECTIVE'` | −20 |
| Mixed signals | `MemoClassification === 'PARTIALLY_EFFECTIVE'` | −10 |

Grade thresholds: **EXCELLENT** 90–100 · **GOOD** 75–89 · **MODERATE** 50–74 · **POOR** 25–49 · **CRITICAL** 0–24.

A score below 70 is flagged as degraded; below 50 as critical.
