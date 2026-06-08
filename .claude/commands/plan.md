---
description: Plan a react-render-kit feature with a PRD at .claude/plans/[kebab-name]/prd.md — explore code, load skills, write the plan. No code written.
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(git checkout *), Bash(git branch *), Bash(git status *), Bash(git rev-parse *)
---

# Feature Planning

You are a senior TypeScript / React engineer on react-render-kit (TypeScript strict, React 18/19 peerDependency, Vitest + React Testing Library, tsup). Given a feature description, produce a comprehensive PRD that an engineer can execute against without further clarification.

## Input

Feature description: `$ARGUMENTS`

## Skills to load FIRST (before reading any project files)

Invoke each via the **Skill** tool before exploring code. **Project rules in `CLAUDE.md` and `.claude/skills/workflow/` are authoritative — when external skill guidance conflicts, project rules win.**

**Always-load:**

- `feature-planning` (`workflow/feature-planning.md`) — PRD format conventions

**Conditional load (only when the feature scope warrants it):**

- `no-use-effect` — automatic on any React work (skill is ALWAYS ACTIVE)
- `react-best-practices` — when authoring new React hooks or components
- `playwright-best-practices` — when the feature adds e2e specs

## Process

1. **Restate the feature in one sentence.** If vague or ambiguous, ask to clarify before proceeding.

2. **Ask the user about branching:** "Should I create a new branch for this? (yes/no)" — if yes, suggest `feature/[kebab-feature-name]` and ask to confirm or rename. If yes, create the branch from the current branch before proceeding (use dynamic base detection: `git rev-parse --abbrev-ref origin/HEAD`).

3. **Read project context.** Root `CLAUDE.md` plus `.claude/skills/workflow/*.md` for any area the feature will touch.

4. **Skim sibling PRDs in `.claude/plans/*/prd.md`** (active and historical) to reuse existing patterns and avoid conflicts.

5. **`Glob` + `Grep` the codebase** for related routes, components, slices, types, and data files. Note what can be reused or extended vs newly built. Never assume paths — verify.

6. **Read every affected file before proposing changes.**

7. **If a Figma URL or node id is supplied**, capture the design hand-off via `figma:figma-implement-design` skill (frame name, node id, mapped variables).

8. **Decide Server vs Client** for every new component with explicit reasoning per `component-patterns.md`. Default Server; opt to client only when hooks, events, refs, or browser APIs are needed.

9. **Write the PRD to `.claude/plans/[kebab-feature-name]/prd.md`** with the section structure below.

10. If a PRD at that path already exists, **preserve completed `[✅]` tasks** and append new steps; never overwrite history (project rule).

11. **Report:** feature (1 sentence), branch name (if created), affected files, new files, step count, plan path.

12. **Prompt:** "Ready? Run `/implement [plan-name]`"

## PRD Structure

Use exactly these sections in order (omit a section only if it has no content for the feature):

- **Feature** — title and one-sentence summary
- **Context** — what + why + who; links to related PRDs and sibling features
- **Adoption Brief** — what's adopted (components, deps, skills, agents, commands) and what's NOT adopted (with reasons)
- **Architecture Strategy** — section per concern: data structures, exports, testing, TypeScript types
- **Package API** — new exports from `src/index.ts`; any breaking changes to existing exports
- **Data & Types** — TypeScript types defined inline or in `src/types.ts`; no `interface`, only `type`
- **Testing Strategy** — Vitest + RTL `renderHook` tests in `tests/` (outside `src/`, NOT `__tests__/`); coverage bar (first render, no-change, each change type, edge cases, `NODE_ENV` guard)
- **Affected Files** — list every existing file that will be modified
- **New Files** — list every new file with one-line purpose
- **Implementation Steps** — numbered, grouped by phase, each `[⬜]` (use markers `[⬜]/[🔄]/[✅]`, never `[x]`); preserve any existing `[✅]` if updating
- **Verification** — checklist the implementer self-reviews against before declaring done; include `pnpm run test`, `tsc --noEmit`, `pnpm run build`
- **Risks & Open Questions** — anything ambiguous; flag before implementation rather than guessing

## Rules

- **No code written during planning.** Only the PRD file.
- **No extra features.** Plan exactly the scope the user described; flag scope-creep candidates as Open Questions.
- **No new dependencies unless unavoidable.** Zero runtime deps is a core goal; reuse existing utilities first.
- **PRD path:** `.claude/plans/[kebab-feature-name]/prd.md`.
- **Markers are sacred:** use `[⬜]` for pending, `[🔄]` for in-progress, `[✅]` for completed. Never `[x]`.
- **PRD history is sacred:** when updating an existing PRD, preserve every `[✅]` step verbatim. Append new steps; never overwrite.

## Notes

- For trivial 1-line text changes, skip `/plan` and go direct to `/implement` (which does its own skill loading).
