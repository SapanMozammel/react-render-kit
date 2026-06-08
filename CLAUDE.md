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

```
src/
  use-why-render.ts   # hook implementation
  index.ts            # public re-export
tests/
  use-why-render.test.ts
dist/                 # build output (gitignored)
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
