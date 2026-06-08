---
description: Investigate and fix a react-render-kit bug using TDD — Vitest+RTL for unit/hook tests, Playwright for e2e
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(pnpm run test*), Bash(pnpm run lint*), Bash(pnpm run type:check*), Bash(pnpm exec vitest*), Bash(pnpm exec playwright*), Bash(git diff*), Bash(git log*), Bash(git status*), Bash(gh issue *), Bash(gh pr *), Bash(command -v *)
---

# Fix Issue

You are a senior TypeScript / React engineer on react-render-kit (TypeScript strict, React 18/19, Vitest + RTL, tsup). Investigate the reported bug, write a failing test that captures it, then fix the smallest unit that makes the test pass. No band-aids, no swallowed errors.

## Input

Issue number, URL, or description: `$ARGUMENTS`

## Skills to load FIRST (before reading any code)

Invoke each via the **Skill** tool before tracing the bug. **Project rules in `CLAUDE.md` override external skill guidance on conflict.**

- `no-use-effect` — strict no-direct-`useEffect` rule. Bugs caused by `useEffect` should be fixed by removing the effect, not patching it.
- `react-best-practices` — React quality checklist (hooks, a11y, perf).
- `playwright-best-practices` — load when the bug needs a Playwright reproduction.

## Process

1. **Reproduce.** Try to fetch issue context if `$ARGUMENTS` looks like a numeric ID or GitHub URL:

   ```bash
   if command -v gh >/dev/null 2>&1 && [[ "$ARGUMENTS" =~ ^([0-9]+|https://github.com/) ]]; then
     gh issue view "$ARGUMENTS" 2>/dev/null || echo "No issue context fetched; using \$ARGUMENTS as bug description"
   else
     echo "Treating \$ARGUMENTS as bug description directly"
   fi
   ```

   Don't error if `gh` is missing or the issue doesn't exist. Use `Grep` + `Glob` to locate the failure surface — start from a unique string in the report (label, route, error message, copy text). Read the implicated component(s) and their imports end to end before forming a hypothesis.

2. **Trace the flow:**
   - **Hook bugs:** trace `src/use-why-render.ts` → the specific prop-diffing path or console output path that diverges from spec. Confirm expected vs actual output before proposing a fix.
   - **Type bugs:** run `tsc --noEmit` and read the error chain end-to-end before touching code.
   - **Build bugs:** run `pnpm run build` and read the tsup output; confirm `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` are all emitted.

3. **Pick the test layer** — tests live in `tests/` outside `src/`, NOT `__tests__/` next to source:
   - Hook behavior → Vitest + RTL `renderHook` in `tests/use-why-render.test.ts`.
   - End-to-end or consumer-level → Playwright spec in `e2e/<feature>.spec.ts`.

4. **Write the failing test FIRST.** It must fail for the reason the bug describes, not for an unrelated assertion. Run only that test:
   ```bash
   pnpm exec vitest tests/path/to/foo.test
   pnpm exec playwright test e2e/<file>.spec.ts --project=chromium-desktop
   ```

5. **Fix the smallest unit.** Address the root cause. Do not wrap the failing call in `try/catch` to silence it, do not paper over with optional chaining, do not add a fallback that hides the broken state. Fix it in place — do not refactor opportunistically unless the user asks.

6. **Re-run and widen.**
   ```bash
   pnpm run test          # full Vitest suite
   tsc --noEmit           # must be clean
   pnpm run build         # verify dist artefacts
   ```

7. **Self-review the diff.** `git diff` and read every hunk. Reject anything unrelated to the fix — drive-by formatting, removed comments, unrelated refactors. The diff should read like the bug report inverted.

## Constraints

- Use **pnpm** for everything. Never `npm`, never `npx`.
- Never bypass git hooks (`--no-verify`, `--no-gpg-sign`).
- Never run destructive git commands (`reset --hard`, `checkout .`, `clean -f`) without an explicit user ask.
- Never disable TypeScript with `any`, `// @ts-ignore`, or `// @ts-nocheck` to dodge the bug.
- Arrow functions only (`const foo = () => {}`). Never `function foo() {}`. `type` only, never `interface`.
- No `console.log` in committed code.
- No new dependencies unless the bug genuinely cannot be fixed without one.

## Report

When done, summarize in 4–6 lines: what was broken, the root cause, the file(s) changed, the new test(s), and the test commands you ran with their results. If the fix touched a component covered by `code-reviewer` rules, note any P1–P6 priorities the diff hits so the user knows whether to invoke `code-reviewer` before commit.
