---
description: Review staged or recent react-render-kit changes for security, effects/state, and project code conventions. Auto-writes a follow-up PRD on Critical/Warning findings.
allowed-tools: Read, Grep, Glob, Bash(git diff*), Bash(git diff --cached*), Bash(git log*), Bash(git status*), Bash(git rev-parse*), Bash(pnpm run lint*), Bash(pnpm run test*), Bash(pnpm run type:check*)
---

# Code Review

Review the current react-render-kit changes for quality, security, and convention compliance.

## Input

Scope (optional): `$ARGUMENTS`

- **No argument** → review staged changes (`git diff --cached`); if empty, fall back to working tree (`git diff`)
- **A file path** (e.g. `src/components/layout/Hero/index.tsx`) → review that file as a single-scope target
- **A glob pattern** (e.g. `src/components/layout/**/index.tsx`) → review all matching files
- **A commit hash or branch ref** → review that commit's diff (`git show $ARGUMENTS`) or `git diff $ARGUMENTS`

## Skills to load FIRST (before the gate or diff)

Invoke each via the **Skill** tool. **Project rules in `CLAUDE.md` override external skill guidance on conflict.**

- `no-use-effect` — load before judging Priority 3 (Effects & State).
- `react-best-practices` — React quality checklist (hooks, a11y, perf, TS).

## Flags

Parse `$ARGUMENTS` for these flags (remove them before using the rest as scope):

- `--skip-build` — skip the lint + type-check gate (use only for doc-only diffs)
- `--skip-tests` — skip the test gate (use only for doc-only diffs)

## Pre-Review (Quality Gate)

Run BEFORE reading the diff. Stop and surface failures immediately — no review of broken trees.

```bash
# Types (skip if --skip-build)
tsc --noEmit

# Tests (skip if --skip-tests)
pnpm run test
```

Then identify changed files:

```bash
git diff --cached --name-only   # or git diff --name-only when nothing staged
git diff --cached                # full patch for review
```

## Checklist

Apply checks **only to changed code**. Report issues only when >80% confident. Do not flag style preferences that Prettier/ESLint already handle.

### Priority 1: Security (Critical)

- Hardcoded secrets, API keys, tokens in source
- `dangerouslySetInnerHTML` with unsanitized input

### Priority 2: Effects & State (Warning)

- `useEffect` for derived state — project rule: **no-direct-useEffect** — prefer derivation, `useMemo`, event handlers, key-based reset, `useSyncExternalStore`
- Missing or excess deps in remaining effects
- Cleanup function missing for subscriptions, listeners, intervals, or timeouts
- `useMemo` / `useCallback` overused (no dep on heavy compute) or underused (passed to memoized children)

### Priority 3: Conventions & Readability (Suggestion / Warning)

**Project rules** (per `CLAUDE.md` Code Conventions):

- `any` type, `// @ts-ignore`, `// @ts-nocheck` introduced in new code (strict mode forbids)
- `interface` keyword used for type definitions — project uses `type` only
- `function foo() {}` declaration — project uses arrow functions only (`const foo = () => {}`)
- camelCase file names — project uses kebab-case
- Vitest test missing for new logic (tests live in `tests/` outside `src/`, NOT `__tests__/` next to source)
- PRD update overwriting `[✅]` history — PRD history is sacred, preserve completed steps
- `[x]` markers used in PRD checklists — use `[⬜]` / `[🔄]` / `[✅]` only

## What NOT to Flag

- **Formatting issues** — Prettier handles via PostToolUse hook in `.claude/settings.json`
- **Pre-existing issues in untouched files** unless they pose a critical security risk
- **Stylistic preferences** with no rule backing
- **Adding type hints to code outside the diff** (scope creep)
- **<80% confidence findings** (better to under-flag than over-flag)

## Output Format

Group findings by file, ordered by severity (Critical → Warning → Suggestion):

```
### `src/components/layout/Hero/index.tsx`

- **Line 42** | **Critical** | Icon-only `<button>` missing `aria-label`
  **Fix:** Add `aria-label="Close menu"` (or similar descriptive text); the icon child does not provide an accessible name.

- **Line 67** | **Warning** | `useEffect` derives `displayName` from `firstName + lastName`
  **Fix:** Derive directly: `const displayName = firstName + ' ' + lastName` — no effect needed.
```

## Verdict

End every review with one of:

| Verdict | Criteria |
|---|---|
| **APPROVE** | No Critical or Warning issues found |
| **APPROVE WITH WARNINGS** | Warning issues exist but non-blocking — list them |
| **REQUEST CHANGES** | Any Critical issue, or multiple Warnings that compound |

### Summary Table

```
| Severity   | Count |
|------------|-------|
| Critical   | 0     |
| Warning    | 0     |
| Suggestion | 0     |

**Verdict: APPROVE**
```

## Auto-PRD-on-violations (NOT opt-in)

When the review finds **any Critical or Warning** issues, write or update a follow-up PRD at `.claude/plans/[scope-slug]-review/prd.md` so the user can run `/implement [scope-slug]-review` to apply fixes.

**Slug derivation:**

- File-scoped review → kebab-case from the file path (e.g., `src/use-why-render.ts` → `use-why-render-review`)
- Diff-scoped review → kebab-case from the feature/branch name
- Multi-file review with no obvious feature → `code-review-{YYYY-MM-DD}` (today's date)

**PRD structure:**

- Context, Affected Files, Implementation Steps, Verification, Risks
- Each violation is a separate `[⬜] Step N: <fix description>` entry under Implementation Steps
- Severity prefixes the step description: `[Critical]` or `[Warning]`
- Quote the original line + the suggested fix verbatim
- **Preserve `[✅]` markers** if the PRD already exists — never overwrite completed history
- End with a Verification block listing the items to re-check after fixes ship

**Final prompt to user:** "Ready? Run `/implement [scope-slug]-review`"
