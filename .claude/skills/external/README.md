# External Skills Library

Framework-level reference skills curated from upstream skill libraries (Anthropic, Vercel Engineering, currents.dev, community). **Project rules in `CLAUDE.md` and `.claude/skills/{architecture,workflow}/` are authoritative — when external guidance conflicts with project rules, project rules win.**

These skills auto-trigger or load on demand via the Claude Code Skill tool. Most are project-agnostic; load them for general framework wisdom, then defer to project-specific rules for conventions.

## Authority gradient

```
Project rules (architecture/, workflow/)   ← authoritative, project-canonical
        ↓
External skills (this directory)   ← framework-level reference; lower priority on conflict
```

When in doubt during code authoring or review: read the project skill first, then load the relevant external skill for deeper coverage if a specific case isn't documented in project rules. Never let an external skill override `CLAUDE.md`.

## Categories

### `react/` (2 skills) — React + hooks discipline

| Skill | Source | When to use |
|---|---|---|
| `react-best-practices` | Anthropic | **Auto-trigger on TSX edits** — runs a condensed quality checklist (component structure, hooks usage, a11y, perf, TypeScript). Reviewer-style. |
| `vercel-react-best-practices` | Vercel Engineering | 67-rule perf reference for React. Load before judging performance findings. Heavier than `react-best-practices`; reach for it when perf is the focus. |

**Overlap note:** `react-best-practices` is the auto-trigger reviewer; `vercel-react-best-practices` is the deep perf reference.

**Moved to project-canonical:** the `no-use-effect` skill lives at [`workflow/no-use-effect.md`](../workflow/no-use-effect.md). The rule is "ALWAYS ACTIVE" project-wide; treating it as authoritative project rule is more honest than framing it as external reference.

### `typescript/` (2 skills) — TypeScript depth

| Skill | Source | When to use |
|---|---|---|
| `typescript-expert` | Anthropic | Deep problem-solving — type-level programming, performance optimization, monorepo management, migration strategies. Load when stuck on a complex type or refactoring across modules. |
| `typescript-advanced-types` | Anthropic | Advanced type system — generics, conditional types, mapped types, template literals, utility types. Load when designing reusable type utilities. |

**Overlap note:** `typescript-expert` is deep problem-solving; `typescript-advanced-types` is the type-system deep dive. Use `typescript-expert` first for unfamiliar problems.

### `testing/` (2 skills) — Playwright + e2e patterns

| Skill | Source | When to use |
|---|---|---|
| `playwright-best-practices` | currents.dev | Comprehensive Playwright reference — POM, mocking via `page.route()`, axe-core a11y, visual regression, console-error monitoring, multi-tab flows, file uploads, mobile/responsive, performance budgets, security. **Load when writing or debugging e2e specs.** |
| `e2e-testing-patterns` | currents.dev / R&D drop | Patterns reference — selector strategy, fixture composition, network mocking, parallelism, flake mitigation. Pair with `playwright-best-practices` when designing a new spec or refactoring an existing one. |

**Overlap note:** `workflow/testing.md` (Vitest unit/hook conventions) is authoritative for test placement (`tests/` outside `src/`, NOT `__tests__/`).

## Loading priority

1. **Project skills first** — applicable `workflow/*.md` and `architecture/*.md`. These are project-canonical.
2. **External skills here** — only when a specific case isn't covered by project skills.

## How to update this library

External skills should be refreshed periodically from upstream. To update one:

1. Fetch from the upstream source directly.
2. Re-apply any project-specific trims.
3. Verify `Skill` tool can still load it.
4. Note the upstream version in this README if it materially changed.
