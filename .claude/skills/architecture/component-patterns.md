# Architecture — Component Patterns

## Server vs Client Components

| | Server (default) | Client |
|---|---|---|
| Directive | none | `'use client'` at top |
| Hooks / state | ✗ | ✓ |
| `memo()` | ✗ | ✓ + set `displayName` |
| Event handlers | ✗ | ✓ |
| When to use | Purely presentational | Needs interactivity, hooks, or events |

**Rules:**
- Server Component by default — add `'use client'` only when hooks/events are required
- Server CAN import Client. Client CANNOT import Server.
- `memo()` + `ComponentName.displayName = 'ComponentName'` mandatory on every Client Component

## Component Templates

### Server Component
```tsx
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

const ComponentName = ({ className }: Props) => {
  return (
    <div className={cn('base-classes', className)}>
      {/* content */}
    </div>
  )
}

export default ComponentName
```

### Client Component
```tsx
'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

const ComponentName = memo(({ className }: Props) => {
  return (
    <div className={cn('base-classes', className)}>
      {/* content */}
    </div>
  )
})

ComponentName.displayName = 'ComponentName'

export default ComponentName
```

## cn() Utility

Always use `cn()` from `@/lib/utils` for all className composition — never string-concatenate:

```tsx
import { cn } from '@/lib/utils'

// ✓ correct
cn('base-class', isActive && 'active-class', className)

// ✗ wrong
`base-class ${isActive ? 'active-class' : ''}`
```

## Common UI Patterns

### Border
```
border border-solid border-secondary-200/50 dark:border-secondary-700/50
```

### Shadow
```
shadow-lg shadow-black/5 dark:shadow-white/5
```

### Hover (card/panel)
```
hover:-translate-y-1 hover:shadow-lg transition-all duration-300
```

### Active / Selected State
```
bg-primary/10 text-primary dark:bg-success/10 dark:text-success
```

### Focus State (form inputs)
```
focus:border-primary dark:focus:border-success focus:outline-none
```

### Error State
```
border-danger text-danger
```

### Disabled State
```
opacity-50 cursor-not-allowed
```

---

## Section Structure

Every landing page section follows this exact pattern:

```tsx
<SectionSeparator lts rts lbs rbs bl ll rl>
  <div className="container flex w-full grow flex-col">
    <SectionTitle
      title="Section Title"
      subtitle="SECTION SUBTITLE"
      watermark="Watermark"
    />
    {/* Section content */}
  </div>
</SectionSeparator>
```

### SectionSeparator Props (decorative corners/edges)
- `lts` / `rts` / `lbs` / `rbs` — Left/Right Top/Bottom Stars (IconPlus corners)
- `tl` / `bl` / `ll` / `rl` — Top/Bottom/Left/Right Lines

### SectionTitle Props
- `title` — Main heading (`font-cg`)
- `subtitle` — Small caps label (secondary color)
- `watermark` — Large background text (very low opacity)

---

## Button System

Located at `src/components/layout/common/Button.tsx`, variants in `Button/variants.ts`.

### Props
- `fill: boolean` — filled vs outlined
- `gradient: boolean` — gradient vs solid
- `loading: boolean` — loading spinner
- `to: string` — renders as Link instead of button

### 8 Variants
1. `link-fill-gradient` — Gradient-filled link
2. `link-fill-solid` — Solid-filled link
3. `link-outline-gradient` — Gradient-outlined link
4. `link-outline-solid` — Solid-outlined link
5. `button-fill-gradient` — Gradient-filled button
6. `button-fill-solid` — Solid-filled button
7. `button-outline-gradient` — Gradient-outlined button
8. `button-outline-solid` — Solid-outlined button

### Gradient Stops
- Light: `var(--color-info)` → `var(--color-primary)`
- Dark: `var(--color-primary)` → `var(--color-success)`

---

## Decorative Glow Blobs

Full-page status/error pages use a centered radial glow blob for visual depth. Named `@utility` classes in `src/styles/utilities.scss` keep JSX clean and guarantee CSS generation — no inline `style`, no Tailwind arbitrary-value classes.

### Available utilities

| Class | Size | Color |
|---|---|---|
| `glow-blob-primary` | 640×260px | `--color-primary` at 28% |
| `glow-blob-danger` | 640×260px | `--color-danger` at 18% |
| `glow-blob-primary-sm` | 600×220px | `--color-primary` at 22% |

```tsx
<div className='glow-blob-primary pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full' />
```

- `background: color-mix(in oklab, var(--color-TOKEN) N%, transparent)` — reads the CSS variable directly, works in both light and dark mode without `dark:` variants; this is the only raw CSS property in the utility (no Tailwind equivalent)
- Dimensions and blur use `@apply w-* h-* blur-*` inside the `@utility` block — Tailwind scale values preferred over arbitrary pixels
- To add a new variant: add a `@utility glow-blob-*` block in `src/styles/utilities.scss` with `@apply` for size/blur and raw CSS for `background`
- The parent must be `relative overflow-hidden`; content sits in `relative z-10`

## Animation Library Selection

| Interaction | Duration | Library |
|---|---|---|
| Hover | 150ms | CSS transition |
| Button | 200ms | Framer Motion |
| Card / panel | 300ms | Framer Motion |
| Section entrance | 500ms | Framer Motion |
| Page transition | 800ms | Framer Motion |
| Scroll sequences | variable | GSAP + ScrollTrigger |
| 3D | — | Three.js / R3F |

### CSS Keyframe Classes
| Class | Duration | Use |
|---|---|---|
| `animate-noise` | 1s infinite | Background texture |
| `animate-spin-slow` | 10s infinite | Slow rotation |
| `animate-faq-border-shift` | 3s infinite | Gradient border shift |
| `animate-overlay-in` | 0.3s forwards | Modal fade in |
| `animate-overlay-out` | 0.3s forwards | Modal fade out |
| `animate-slide-in-from-{direction}` | 0.3s forwards | Slide in |
| `animate-slide-out-to-{direction}` | 0.3s forwards | Slide out |

---

## File Organization

| What | Where |
|---|---|
| Page sections | `src/components/layout/{section-name}/index.tsx` |
| Sub-components | `src/components/layout/{section-name}/{sub-component}.tsx` |
| Shared layout pieces | `src/components/layout/common/` |
| Base UI (shadcn + custom) | `src/components/ui/` |
| Custom icons | `src/components/icons/` (`projects/<brand>/logo.tsx` for project logos) |
| Static content | `src/data/content/` |
| App config | `src/data/config/` |
| Type definitions | `src/types/` |
| Utilities | `src/lib/utils/` |
| Styles | `src/styles/` |

**Filename casing.** Every file and folder name is **kebab-case** (`hero-background.tsx`, `cta-logo.tsx`, `notification-x/logo.tsx`, `use-contact-form.ts`, `locale-slice.ts`). React component identifiers (the exported symbol) stay PascalCase. `index.tsx` is the entry file inside any folder unit. Locale folders (`pt-BR`, `zh-CN`) follow BCP-47 and are exempt; Next.js route segments (`[locale]`, `[slug]`, `(landing)`) follow App Router syntax and are exempt.

---

## Pre-write Checklist

Before writing or modifying any component:

- [ ] `cn()` from `@/lib/utils` for all classNames — never string-concatenate
- [ ] Design system tokens only — no hardcoded colors or hex values
- [ ] `dark:` variant on every color class
- [ ] Mobile-first breakpoints (`sm:`, `md:`, `lg:`)
- [ ] Server Component by default — `'use client'` only when hooks/events required
- [ ] If Client: `memo()` + `ComponentName.displayName = 'ComponentName'`
- [ ] Navigation: use `import NextLink from 'next/link'` for any links.
- [ ] All imports use `@/` alias
- [ ] `type Props = { ... }` — never `interface`
- [ ] No `any` types
- [ ] `export default ComponentName` at the bottom — never both `export const` and `export default` for the same component

---

## See also

For e2e enforcement of server/client boundaries (reduced-motion default, RSC routes don't await client JS for first paint), see [`../workflow/e2e.md`](../workflow/e2e.md).

### External reference

Project rules in this file are authoritative; external references are framework-level guidance — load when project rules don't cover the case.

- [`workflow/no-use-effect.md`](../workflow/no-use-effect.md) — strict no-direct-`useEffect` rule (ALWAYS ACTIVE; the 6-rule guide for derived state, event handlers, `useMemo`, `useSyncExternalStore`, key-based reset, `useMountEffect`)
- [`external/react/react-best-practices/`](../external/react/react-best-practices/) — TSX quality checklist (component structure, hooks, a11y, perf, TS)
- [`external/nextjs/nextjs-app-router-patterns/`](../external/nextjs/nextjs-app-router-patterns/) — advanced patterns (Server Components, streaming, parallel routes)
