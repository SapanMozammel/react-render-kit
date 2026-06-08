---
description: Run the project formatter — organize-imports + Prettier + ESLint --fix. Tailwind canonical-class rewrites (including `!utility` → `utility!`) ride along via the wired ESLint rules.
allowed-tools: Bash(pnpm run format:all*), Bash(pnpm run lint*), Bash(pnpm run type:check*), Bash(git status:*), Bash(git diff:*), Read, Edit, Glob
---

# Format

## Skills to load FIRST

- `tailwind-v4-syntax` — reference for the `!utility` → `utility!` syntax. The autofix is performed by `better-tailwindcss/enforce-consistent-important-position`; load the skill to explain a finding to the user if they ask.
- `tailwind-diagnostics` — overview of the four ESLint Tailwind rules that run inside `format:all`.

## Process

1. **Run the formatter pipeline.** Handles organize-imports, Prettier (with `prettier-plugin-tailwindcss` class sorting), and ESLint `--fix` in order. ESLint `--fix` invokes the four `better-tailwindcss/*` rules — so `!utility` → `utility!`, v3-alias → v4-canonical rewrites (e.g. `bg-gradient-to-*` → `bg-linear-to-*`), and arbitrary-property-hint → named-utility rewrites all land in this single step.

   ```bash
   pnpm run format:all
   ```

   If it errors on any file, fix the underlying issue and rerun.

2. **Final gate** — verify nothing regressed.

   ```bash
   pnpm run type:check
   pnpm run lint
   ```

   The lint pass will surface any `better-tailwindcss/no-conflicting-classes` warnings (report-only — intent inference required); flag those to the user but do not auto-resolve.

## Output

Report what landed:
- `pnpm run format:all` — summary line (pass/fail; how many files prettier/ESLint touched).
- Tailwind canonical-class rewrites — count per rule if any landed (`no-deprecated-classes`, `enforce-canonical-classes`, `enforce-consistent-important-position`).
- Final gate verdict (lint + type-check).

If nothing was rewritten, say so plainly — no need to invent work.

## Rules

- Do NOT add grep-based sweeps for `!utility` patterns or v3 aliases. The ESLint rules cover every case the IDE flags, and they read the project's Tailwind v4 entry CSS — far more exhaustive than a hand-maintained regex. If the user wants a wider sweep (scope, file-list, etc.), invoke `/fix-tw-diagnostics`.
- Do NOT run `pnpm dlx @tailwindcss/upgrade` here — that codemod also rewrites configs and tokens; this command is scoped to in-file class rewrites.
- Use the **Edit** tool only for autofix-incompatible findings reported in Step 1's remaining errors; never Write to whole files for what the lint rule could have rewritten.
