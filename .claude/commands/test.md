---
description: Run or generate tests — Vitest unit/hook, or Playwright e2e
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(pnpm run test*), Bash(pnpm run test:watch*), Bash(pnpm run test:coverage*), Bash(pnpm exec vitest *), Bash(pnpm exec playwright *), Bash(pnpm run lint*), Bash(git diff*), Bash(git log*)
---

# Test

Two modes — the command picks based on `$ARGUMENTS`:

- **Run mode** (`unit`, `e2e`, or empty): execute the relevant test suite, analyze failures, fix them
- **Generate mode** (a file path, hook name, or feature description): produce Vitest + RTL tests for the target

## Input

`$ARGUMENTS` — one of `unit` / `e2e` / empty / `<file path or feature description>`

## Skills to load FIRST (before reading the target or running the suite)

Invoke each via the **Skill** tool. **Project rules in `CLAUDE.md` and `workflow/testing.md` override external skill guidance on conflict.**

- `react-best-practices` — React + hooks testing patterns.
- `playwright-best-practices` — load **only** when writing or running e2e specs.

## Run Mode

Determine scope from `$ARGUMENTS`:

| Argument | Action |
|---|---|
| `unit` | `pnpm run test` (Vitest, run-once) |
| `e2e` | `pnpm run test:e2e` (Playwright). Use `--project=chromium-desktop` for a fast single-browser smoke. |
| empty | `pnpm run test` (and `pnpm run test:e2e` if `e2e/` exists) |

If all pass: report summary (suites, tests, duration, coverage if `pnpm run test:coverage` was used).

If failures: for each failing test:
1. Show test name + file location.
2. Read the relevant source file.
3. Diagnose the root cause (logic bug, type mismatch, missing mock in `tests/setup.tsx`, stale snapshot, content drift from a recent rewrite).
4. Apply a fix — never delete or skip the failing test, never widen types to silence errors, never weaken assertions to make a test pass.
5. Re-run only the failed test to confirm it passes (`pnpm exec vitest tests/path/to/foo.test`).

Final report: tests fixed, tests still failing (if any), next steps.

## Generate Mode

Triggered when `$ARGUMENTS` is a file path, component name, or feature description.

### Process

1. **Read the target.** Open the file at `$ARGUMENTS` (or `Grep` for it if a name was given). Follow each import that affects behavior: hooks, helpers, types. Note every external dependency that needs mocking.

2. **Pick the test layer.**
   - Pure function / utility / `src/lib/*` module → **Vitest unit** in `tests/lib/foo.test.ts`. No DOM.
   - React component, custom hook, or Context provider → **Vitest + RTL** in `tests/components/Foo.test.tsx`. Use `render` from `tests/test-utils.tsx` (Redux-Provider-wrapped).
   - Whole route, multi-component journey, visual regression, accessibility audit → **Playwright** in `e2e/<feature>.spec.ts`.

3. **Reuse what exists.** Before writing fresh helpers:
   - Check `tests/setup.tsx` — global mocks and console spy setup. **If a new global mock is needed, extend `tests/setup.tsx` rather than adding `vi.mock(...)` per test.**
   - Check sibling tests for existing patterns and match their style.

4. **Generate the spec.** Cover the layers below — skip what genuinely doesn't apply, but don't stop at "renders without crashing".

### Coverage checklist (component / hook)

- [ ] **Hook return values** — initial state, after prop changes, after re-renders.
- [ ] **Prop variants** that change hook behavior.
- [ ] **Console output** — spy on `console.groupCollapsed` / `console.log` and assert the right data is logged.
- [ ] **No-op in production** — verify the hook is silent when `process.env.NODE_ENV === 'production'`.

### Coverage checklist (Playwright e2e)

- [ ] **Happy path** through the feature.
- [ ] **At least one edge case**.
- [ ] **Console errors asserted clean** (`page.on('console', ...)`).

5. **Place the file correctly.**

   | Type | Location | Naming |
   |------|----------|--------|
   | Vitest unit / component | `tests/components/`, `tests/lib/`, `tests/data/`, `tests/store/`, `tests/ui/` | `Foo.test.tsx` / `helper.test.ts` |
   | Playwright e2e | `e2e/` | `<feature>.spec.ts` |

   **This project keeps tests in `tests/` outside `src/`** — `vitest.config.ts` is configured with `include: ['tests/**/*.{test,spec}.{ts,tsx}']`. Never use `__tests__/` next to source.

6. **Run until green.**

   ```bash
   pnpm exec vitest tests/path/to/foo.test       # single file
   pnpm run test                                  # full suite
   pnpm exec playwright test e2e/<file>.spec.ts --project=chromium-desktop
   ```

   For visual specs verify all viewports pass; on first run create the baseline with `--update-snapshots` and review the PNGs in `e2e/screenshots/` before committing.

   Finish with `pnpm run lint`.

## Mocking rules

- Check `tests/setup.tsx` for existing global mocks. **Don't duplicate these per test** — extend `tests/setup.tsx` if a new global mock is needed.
- Spy on `console` methods via `vi.spyOn(console, 'groupCollapsed')` — restore in `afterEach`.
- **Never mock the module under test. Never mock React itself.**

## Constraints

- Use **pnpm** for everything. Never `npm` / `npx`.
- TypeScript strict — no `any`, no `@ts-nocheck` in new test files.
- Follow testing conventions in `CLAUDE.md` and `.claude/skills/workflow/testing.md`.
- Do not weaken assertions to make a test pass. If the hook is buggy, fail the test and tell the user.

## Report

When done, summarize in 4–6 lines: which file you tested, which layer (Vitest unit / Vitest+RTL / Playwright), the cases covered, the path to the new spec, and the exact command you ran with its result.
