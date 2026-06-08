# Workflow — Feature Planning

## Plan File Location

`.claude/plans/[plan-name]/prd.md`

One folder per feature. The folder name is kebab-case (e.g. `contact-form-redesign`, `services-section`).

## Planning Rules

1. **Read before write** — explore all affected files before proposing any changes
2. **Reuse over create** — check if an existing component, hook, or utility can be extended
3. **Minimal footprint** — touch only what's needed; no cleanup of unrelated code
4. **No speculative features** — plan only what was asked, nothing extra
5. **Explicit Server vs Client decision** — state the reason, not just the answer

## Task Status Convention

| Symbol | Meaning |
|---|---|
| `- [⬜]` | Pending — not started |
| `- [🔄]` | Running — in progress |
| `- [✅]` | Done — complete |

Subtasks are indented two spaces under their parent. Claude adds subtasks inline when a step needs breakdown:

```markdown
- [🔄] Step 1: Build the component
  - [✅] Create index.tsx
  - [🔄] Add props type
  - [⬜] Wire translations
- [⬜] Step 2: Add data file
```

**PRD history is sacred:** When updating a PRD (e.g. after a re-audit), always preserve completed tasks (`[✅]`). Add new steps in a new "Round N" section — never overwrite done steps.

## Plan File Format

```markdown
# Feature: [Name]

## Context
What this feature does and why it's needed.

## Component Type Decision
- Server or Client? — [answer + reason]
- Placement: src/components/layout/[Section]/ or src/components/ui/[name]/

## Affected Files
- src/path/to/file.tsx — what changes and why

## New Files
- src/path/to/new-file.tsx — what it contains

## Data & Types
- New types: src/types/[name].ts
- New data: src/data/content/[name].ts or src/data/config/[name].ts

## Design System
- Colors: exact tokens (e.g. text-primary dark:text-success)
- Typography: font classes + where used
- Spacing: container/section patterns
- Animations: library + duration

## Implementation Steps
- [⬜] Step 1: ...
- [⬜] Step 2: ...
- [⬜] Step 3: ...

## Verification
- [⬜] pnpm run dev → navigate to...
- [⬜] Check dark mode
- [⬜] Check mobile at 375px
- [⬜] pnpm run type:check
- [⬜] pnpm run test (if logic/utilities were added or changed)
```

---

## See also (external reference)

Project rules in this file are authoritative; external references are framework-level guidance — load when project rules don't cover the case.

- [`external/nextjs/next-best-practices/`](../external/nextjs/next-best-practices/) — Next.js conventions, RSC boundaries, data patterns, route handlers, image/font optimization. Loaded automatically by `/plan` for any feature that touches Next.js routes or layouts.
