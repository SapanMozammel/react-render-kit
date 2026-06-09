# CLAUDE.md

## Commands

```bash
pnpm run test        # Vitest (run once)
pnpm run build       # tsup — ESM + CJS + .d.ts
tsc --noEmit         # Type check (strict)
pnpm publish --dry-run  # Verify tarball before publish
```

## Stack

TypeScript strict · React 18/19 peerDependency · Vitest + React Testing Library · tsup

## Project Structure

### `packages/why-render` (library)
```
src/
  diff/diff-props.ts   # pure diff algorithm
  hook/use-why-render.ts
  logger/console-logger.ts
  types/index.ts
  index.ts            # public re-export
tests/
dist/                 # build output (gitignored)
```

### `packages/why-render-frequency` (library)
```
src/
  hook/use-render-frequency.ts
  logger/frequency-logger.ts  # pure logger — rate + observation
  types/index.ts
  index.ts            # public re-export
tests/
dist/                 # build output (gitignored)
```

### `packages/render-trace` (library)
```
src/
  engine/engine.ts    # createEngine factory — stack, cycle, flush
  hook/use-trace-render.ts
  logger/trace-logger.ts  # tree + flat console output
  types/index.ts
  index.ts            # public re-export + createRenderTrace factory
tests/
dist/                 # build output (gitignored)
```

### `packages/unstable-props-detector` (library)
```
src/
  detector/detector.ts   # pure detection — no React dependency
  hook/use-unstable-props-detector.ts
  logger/unstable-logger.ts
  types/index.ts
  index.ts               # public re-export
tests/
dist/                    # build output (gitignored)
```

### `demo` (Next.js demo site — `src/` layout)
```
app/                  # routing only
components/           # shared UI (console-panel, tool-card)
features/             # tool demo modules (one folder per tool)
  why-render/
    index.tsx         # demo component
    scenarios.ts      # scenario data
hooks/                # custom React hooks (use-prop-log)
lib/                  # data / config (registry)
  registry/
types/                # TS declarations
```

## Code Conventions

- Arrow functions only — never `function foo() {}`
- `type` only — never `interface`
- kebab-case for all file names
- No `any`, no `@ts-nocheck`
- TypeScript strict mode (`strict: true`, `exactOptionalPropertyTypes: true`)

## Slash Commands

| Command                 | Purpose                                                           |
| ----------------------- | ----------------------------------------------------------------- |
| `/implement why-render` | Execute the PRD at `.claude/plans/why-render/prd.md` step by step |
| `/implement why-render-frequency` | Execute the PRD at `.claude/plans/why-render-frequency/prd.md` step by step |
| `/implement render-trace` | Execute the PRD at `.claude/plans/render-trace/prd.md` step by step |
| `/implement unstable-props-detector` | Execute the PRD at `.claude/plans/unstable-props-detector/prd.md` step by step |
