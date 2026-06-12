---
title: "Getting Started — react-render-kit"
description: "Install render-kit and start observing React component renders in under 5 minutes."
keywords: ["react render observability", "install render-kit", "useWhyRender", "react devtools hooks"]
canonical: "https://react-render-kit.vercel.app/docs/getting-started"
---

# Getting Started

## Prerequisites

- React >= 18
- Node >= 18
- TypeScript recommended (all packages are fully typed)

## Installation

```bash
npm install @sapanmozammel/render-kit
# or
pnpm add @sapanmozammel/render-kit
```

## Provider setup

Create a `RenderKit` instance and wrap your app with `RenderKitProvider`. In Next.js App Router this goes in a Client Component:

```tsx
// app/providers.tsx
'use client';
import { createRenderKit, RenderKitProvider } from '@sapanmozammel/render-kit';

const kit = createRenderKit();

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <RenderKitProvider kit={kit}>{children}</RenderKitProvider>
);
```

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

## First hook — `useWhyRender`

Add one line to any component:

```tsx
import { useWhyRender } from '@sapanmozammel/render-kit';

const UserCard = (props: UserCardProps) => {
  useWhyRender('UserCard', props);
  return <div>{props.user.name}</div>;
};
```

## Reading the output

On every re-render, the browser console shows a grouped entry:

```
▶ [why-render] <UserCard>

  Primitive Changes
  -----------------
    name    "Alice" → "Bob"

  Reference Changes
  -----------------
    onEdit  function reference changed
```

The group is collapsed by default — click to expand. Nothing is logged when props are identical.

## Enabling telemetry

Attach a transport to receive structured events from all instrumented components:

```ts
import { createMemoryTransport } from '@sapanmozammel/render-kit';

const transport = createMemoryTransport();
const deregister = kit.telemetry.registerTransport(transport);

// Later:
const emitted = transport.getEmitted();  // TelemetryEvent[]
deregister();  // stop receiving events
```

## Viewing insights

`useRenderInsights` adds per-component scoring on top of the raw hooks:

```tsx
import { useRenderInsights } from '@sapanmozammel/render-kit';

const UserCard = (props: UserCardProps) => {
  const report = useRenderInsights('UserCard', props);
  // report.score (0–100), report.grade, report.recommendations
  return <div>{props.user.name}</div>;
};
```

Or use the visual panel:

```tsx
import { useRenderPlayground, RenderPlaygroundPanel } from '@sapanmozammel/render-kit';

const UserCard = (props: UserCardProps) => {
  useRenderPlayground('UserCard', props);
  return (
    <div>
      {props.user.name}
      <RenderPlaygroundPanel />
    </div>
  );
};
```

## Next steps

- [Architecture](architecture.md) — how the 12 packages fit together
- [render-kit](render-kit.md) — full config reference and subsystem APIs
- [FAQ](faq.md) — production safety, Next.js App Router, memory usage
