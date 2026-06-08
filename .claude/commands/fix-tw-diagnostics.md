---
description: Sweep the codebase for `suggestCanonicalClasses` (legacy v3 utility names, prefix `!`, arbitrary-property hints) and `cssConflict` (duplicate-property utilities) diagnostics via the wired ESLint rules. Auto-fixes canonical migrations; reports conflicts for manual resolution.
allowed-tools: Bash(pnpm run format:all*), Bash(pnpm run lint*), Bash(pnpm run lint:fix*), Bash(pnpm run type:check*), Bash(pnpm exec eslint*), Read, Edit, Glob
---

# Fix Tailwind diagnostics

## Skills to load FIRST

- `tailwind-diagnostics` — describes the diagnostic categories and the **why** behind each rewrite; the actual detection + fix logic lives in `eslint-plugin-better-tailwindcss` wired through `.formatter/sync.js`. Read the skill so you can explain a finding to the user; do not duplicate its mapping tables into prompts.

## Input (optional scope)

Scope (optional): `$ARGUMENTS`

- **No argument** → run against `src/` (the default lint scope).
- **A file path or glob** → run `pnpm exec eslint --fix <path>` instead of the full sweep.

## Process

### Step 1 — Auto-fix `suggestCanonicalClasses`

```bash
# Full codebase
pnpm run lint:fix

# Scoped to a path/glob
pnpm exec eslint --fix '<path>'
```

This runs four `better-tailwindcss` rules with autofix in one pass:

| Rule | Sub-case | What it fixes |
|---|---|---|
| `enforce-consistent-important-position` | 1a | `!utility` → `utility!` (prefix → suffix), including variants (`sm:!h-9` → `sm:h-9!`) |
| `no-deprecated-classes` | 1b | v3 aliases removed/renamed in v4 — `bg-gradient-to-*` → `bg-linear-to-*`, `flex-shrink-0` → `shrink-0`, `bg-opacity-N` → `bg-{color}/N`, etc. **Updated automatically as Tailwind / the plugin ship new renames** |
| `enforce-canonical-classes` | 1c + extras | Arbitrary-property hints (`bg-[size:..]` → `bg-size-[..]`, `[animation:..]` → `animate-[..]`) + shorthand merges (`h-full w-full` → `size-full`, `translate-x-[-50%] translate-y-[-50%]` → `-translate-1/2`, `border-1` → `border`) |

The rules read the project's Tailwind v4 entry CSS (`src/styles/global.scss` `@theme`) — same source of truth as `bradlc.vscode-tailwindcss`. No hardcoded mapping table to maintain.

If lint:fix exits non-zero with errors remaining after the run, surface them — those are autofix-incompatible violations (e.g. opacity-utility migrations where the paired color utility is missing on the same className).

### Step 2 — Report remaining `cssConflict` warnings

```bash
pnpm run lint 2>&1 | grep -E '(\.tsx|\.ts):[0-9]+|no-conflicting-classes' | head -100
```

The `better-tailwindcss/no-conflicting-classes` rule runs at `warn` severity (report-only — intent inference required, same as the IDE). Group the output by file/line. Do NOT auto-fix; the resolution requires reading intent.

Per the `tailwind-diagnostics` skill §2, the plugin already filters intentional pairs (`bg-light dark:bg-slate-900`, `p-4 px-2`, responsive-breakpoint overrides), so any warning surfaced is a real conflict.

### Step 3 — Final gate

```bash
pnpm run format:all
pnpm run type:check
```

Settles Prettier's class sort after rewrites, then verifies types. Surface failures immediately.

## Output

1. **Step 1 (suggestCanonicalClasses autofix)** — count of files modified + per-rule breakdown (which of the four rules fired, how many fixes each). If lint:fix exited cleanly with zero errors, say so plainly.
2. **Step 2 (cssConflict)** — grouped findings list (REPORT ONLY). If none, say so.
3. **Final gate verdict** — format + type-check pass/fail.

## Rules

- The detection + fix logic lives in `eslint-plugin-better-tailwindcss` wired through `.formatter/sync.js`. Never edit `eslint.config.js` directly — change the template + run `pnpm run sync`.
- Do NOT run `pnpm dlx @tailwindcss/upgrade` here — that codemod also rewrites configs and tokens; this command is scoped to in-file class rewrites.
- Do NOT add hardcoded grep patterns or mapping tables back into this command. The whole point of the plugin is that future Tailwind renames flow in via `pnpm update eslint-plugin-better-tailwindcss`, not via skill edits.
- Use the **Edit** tool only for autofix-incompatible findings reported in Step 1's remaining errors; never Write to whole files for what the lint rule could have rewritten.
- Skip files in `.claude/skills/external/`, `node_modules/`, `.next/` — ESLint's `ignores` config already excludes them.
- Never auto-fix `cssConflict` — intent inference is required; the command only reports.
- Canonical pairs (`bg-light dark:bg-slate-900`, `text-primary dark:text-success`) are NOT conflicts; the plugin already handles variants correctly.
