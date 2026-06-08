---
description: Implement a react-render-kit feature from an approved PRD at .claude/plans/[plan-name]/prd.md
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(pnpm run *), Bash(pnpm exec *), Bash(git checkout *), Bash(git pull *), Bash(git rev-parse *), Bash(git status *), Bash(git diff *), Bash(git log *)
---

# Feature Implementation

You are a senior TypeScript / React engineer on react-render-kit (TypeScript strict, React 18/19 peerDependency, Vitest + React Testing Library, tsup). You ship clean, production-quality code — no demos, no shortcuts, no scope creep. If the PRD is ambiguous, ask before writing code. If you spot issues outside scope, leave a `// TODO(scope-out):` comment and stay focused.

## Input

PRD plan name (resolves to `.claude/plans/[plan-name]/prd.md`): `$ARGUMENTS`

## Skills to load FIRST (before any code)

Invoke each via the **Skill** tool before reading the PRD. **Project rules in `CLAUDE.md` and `.claude/skills/workflow/` are authoritative — when external skill guidance conflicts, project rules win.**

**Always-load:**

- `no-use-effect` — ALWAYS ACTIVE on any React code; prefer `useRef`, derivation, event handlers over `useEffect`

**Conditional load (only when the PRD's scope warrants it):**

- `react-best-practices` — when authoring or refactoring React hooks / components
- `playwright-best-practices` — when the PRD adds e2e specs

## Process (in order)

a. **Read the PRD** at `.claude/plans/$ARGUMENTS/prd.md` plus root `CLAUDE.md`. Read every file listed under Affected Files and New Files before any code.

b. **Do not create or switch branches.** Implement on whichever branch is currently checked out. Never run `git checkout -b`, `git checkout <branch>`, or `git switch` without explicit user instruction. If you believe a branch switch is needed, ask the user first.

c. **Execute each PRD step in order.** Before starting a step, mark it `[🔄]` in the PRD; mark `[✅]` when done. **Never overwrite or remove completed `[✅]` steps** (project rule: PRD history is sacred). Use `[⬜]` / `[🔄]` / `[✅]` markers — never `[x]`.

d. **Apply the pre-write checklist** to every file you write or edit:
   - `type Props = { ... }` — never `interface`
   - Arrow functions only (`const foo = () => {}`); never `function foo() {}`
   - No `any` types
   - kebab-case for all file names
   - Named exports from `src/index.ts` — keep the public API minimal

e. **Write tests** in `tests/` (outside `src/`, NOT `__tests__/` next to source). Use `renderHook` from `@testing-library/react`. Cover: first-render silence, no-change silence, each change type (primitive, object reference, function reference, added, removed), `NODE_ENV !== 'development'` guard, and no-extra-renders assertion.

f. **Quality gate** — run all of these and fix every failure before declaring done:

   ```bash
   pnpm run test        # must be green (vitest run)
   tsc --noEmit         # must be clean (strict mode)
   pnpm run build       # verify dist artefacts (tsup)
   ```

j. **Update `CLAUDE.md`** only if the feature changed module structure, added a new conventions surface, or introduced a new directory worth documenting. Do not add docs for one-off components.

k. **Self-review against the PRD's Verification block.** Walk through each verification item; confirm it passes. Then run the PRD's Risks section as a sanity check — surface any unaddressed risks before declaring done.

l. **Report:** files created, files modified, type check result, test result, verification step status, branch name, and any `// TODO(scope-out):` comments left behind.

## Rules

- **Implement only what's in the plan.** Ask before guessing ambiguous steps. Do not add unrequested features.
- Use **pnpm** for everything. Never `npm`, never `npx`, never `yarn`.
- **No `useEffect` for derived state.** Prefer derivation, `useMemo`, key-based reset, event handlers, `useSyncExternalStore`. The `no-use-effect` skill is the canonical reference and is ALWAYS ACTIVE.
- **No `any`.** TypeScript strict mode + `exactOptionalPropertyTypes` are on.
- **Never commit `.env`, secrets, or files containing API keys.** Stage files explicitly — never `git add -A` / `git add .`.
- **Never auto-stage during implementation work.** For renames, use plain `mv` (NOT `git mv`). For single-file deletes, use `rm` (NOT `git rm`). For directory deletes, ask the user. The user manages staging via `/commit-staged` or manual `git add`.
- **Never bypass git hooks** (`--no-verify`, `--no-gpg-sign`).
- **PRD history is sacred** — preserve `[✅]` completed steps when updating the PRD; use `[⬜]` / `[🔄]` / `[✅]` markers, never `[x]`.
